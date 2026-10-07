import { describe as group, expect, it } from 'vitest';
import { DEFAULT_EQUATION_LIMITS } from '../../../../new-equation/types';
import { lowerEquation } from '../../service/input';
import { rational, rAdd, rCompare, rSubtract, type Rational } from '../algebra/rational';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { EquationAlgebraError, ExecutionContext } from '../execution';
import { enclose } from '../representation/enclosure';
import { ExpressionStore } from '../representation/expression';
import { normalizeSet, valueExpression, type EquationOutcome, type Point, type SolutionSet } from '../representation/solution-set';

// Certified square systems (EQUATION-CERTIFIED-NUMERICS1 PR B). References: mpmath findroot from a grid of
// starts, each solution then polished at 60 digits with residuals below 10⁻⁶⁰ (truncated to 25 digits).
function solve(rows: readonly string[], targets: readonly string[]) {
  const ctx = new ExecutionContext({ ...DEFAULT_EQUATION_LIMITS });
  const store = new ExpressionStore(ctx);
  const { problem } = lowerEquation(store, { rows: [...rows], targets: [...targets], domain: 'real', limits: { ...DEFAULT_EQUATION_LIMITS }, digits: 6 });
  return { ctx, store, problem, outcome: decideEquation(problem) };
}
const decimal = (ctx: ExecutionContext, s: string): Rational => {
  const negative = s.startsWith('-'), [whole, frac = ''] = s.replace('-', '').split('.');
  const q = rational(ctx, BigInt(whole + frac), 10n ** BigInt(frac.length));
  return negative ? rational(ctx, -q.numerator, q.denominator) : q;
};
function solvedSet(store: ExpressionStore, o: EquationOutcome): Extract<SolutionSet, { kind: 'finite' }> {
  if (o.kind !== 'solved') throw new Error(`${o.kind}: ${'reason' in o ? o.reason : ''}`);
  const s = normalizeSet(store, o.set, 'real');
  if (s.kind !== 'finite') throw new Error(s.kind);
  return s;
}
function near(store: ExpressionStore, p: Point, refs: readonly string[]) {
  const ctx = store.ctx, slack = rational(ctx, 1n, 10n ** 24n);
  p.forEach((v, i) => {
    const b = enclose(store, valueExpression(store, v), 90);
    if (b.kind !== 'bounds') throw new Error(b.kind);
    const ref = decimal(ctx, refs[i]);
    expect(rCompare(ctx, rSubtract(ctx, b.lo, slack), ref)).toBeLessThanOrEqual(0);
    expect(rCompare(ctx, ref, rAdd(ctx, b.hi, slack))).toBeLessThanOrEqual(0);
  });
}
function rejects(f: () => void, reason: RegExp) {
  let caught: unknown;
  try { f(); } catch (e) { caught = e; }
  expect(caught).toBeInstanceOf(EquationAlgebraError);
  expect((caught as EquationAlgebraError).reason).toMatch(reason);
}

const EXP_SIN = ['e^x+\\sin y=1', 'e^y-\\sin x=1', '-5\\le x\\le1', '-5\\le y\\le1'];

group('certified square systems against 30-digit references', () => {
  it('eˣ + sin y = 1, eʸ − sin x = 1 on [−5, 1]²: the exact (0, 0) and two certified points', () => {
    const { store, problem, outcome } = solve(EXP_SIN, ['x', 'y']);
    verifyEquationOutcome(problem, outcome);
    const ps = solvedSet(store, outcome).points;
    expect(ps).toHaveLength(3);
    expect(ps[0].map(v => v.kind)).toEqual(['rational', 'rational']);
    near(store, ps[1], ['-1.751785103171875706187156', '-4.114518188074636135334440']);
    near(store, ps[2], ['-1.377801608244018255831984', '-3.986436968952929409799460']);
  }, 60_000);

  it('sin(x + y) = x, cos(x − y) = y: bounded by contraction, no range rows needed', () => {
    const { store, problem, outcome } = solve(['\\sin(x+y)=x', '\\cos(x-y)=y'], ['x', 'y']);
    verifyEquationOutcome(problem, outcome);
    const ps = solvedSet(store, outcome).points;
    expect(ps).toHaveLength(1);
    near(store, ps[0], ['0.9350820641231039350725929', '0.9980200581600989796630611']);
  }, 60_000);

  it('three unknowns with no isolable one: x² + y² + z² = 3, eˣ − yz = 1, sin y + xz = 1/2', () => {
    const { store, problem, outcome } = solve(['x^2+y^2+z^2=3', 'e^x-yz=1', '\\sin y+xz=\\frac{1}{2}'], ['x', 'y', 'z']);
    verifyEquationOutcome(problem, outcome);
    const ps = solvedSet(store, outcome).points;
    expect(ps).toHaveLength(2);
    near(store, ps[0], ['-0.2236851337688652058724408', '0.1169689460917147096537138', '-1.713558644044900617036407']);
    near(store, ps[1], ['0.2117331376431243728597517', '0.1376201480269751739867344', '1.713543046812898479458039']);
  }, 60_000);

  it('refuses honestly: unbounded unknowns (naming them) and a tangent solution', () => {
    const open = solve(['e^x+\\sin y=1', 'e^y+\\sin x=1'], ['x', 'y']).outcome;
    expect(open.kind).toBe('incomplete-implementation');
    expect('reason' in open && open.reason).toMatch(/not bounded in x and y; add range rows for x and y/);
    // At (0, 0) the Jacobian is [[1, 1], [1, 1]]: the equations touch there, so no Krawczyk test can prove it.
    const tangent = solve(['e^x+\\sin y=1', 'e^y+\\sin x=1', '-1\\le x\\le1', '-1\\le y\\le1'], ['x', 'y']).outcome;
    expect('reason' in tangent && tangent.reason).toMatch(/tangent \(singular\) solution/);
  }, 60_000);

  it('rejects a dropped point, a point moved into a box without a solution, and two points in one box', () => {
    const { store, problem, outcome } = solve(EXP_SIN, ['x', 'y']);
    const set = solvedSet(store, outcome), proof = (outcome as Extract<EquationOutcome, { kind: 'solved' }>).proof;
    const claim = (points: readonly Point[]) => () => verifyEquationOutcome(problem, { kind: 'solved', proof, set: { ...set, points } });
    rejects(claim(set.points.slice(0, 2)), /unclaimed solution|differs/);
    const [x, y] = set.points[1].map(v => store.node(valueExpression(store, v)) as Extract<ReturnType<ExpressionStore['node']>, { kind: 'isolated-point' }>);
    const q = (n: bigint, d = 1n) => rational(store.ctx, n, d);
    const empty = [{ lo: q(-1n, 2n), hi: q(-1n, 4n) }, { lo: q(-1n, 2n), hi: q(-1n, 4n) }];
    const moved: Point = [0, 1].map(i => ({ kind: 'expression' as const, id: store.isolatedPoint(x.system, ['ξ1', 'ξ2'], empty, i) }));
    rejects(claim([set.points[0], moved, set.points[2]]), /Krawczyk test does not prove|lost its solution/);
    const wide = [{ lo: q(-2n), hi: q(-1n) }, { lo: q(-9n, 2n), hi: q(-7n, 2n) }];
    const both: Point = [0, 1].map(i => ({ kind: 'expression' as const, id: store.isolatedPoint(y.system, ['ξ1', 'ξ2'], wide, i) }));
    rejects(claim([set.points[0], both]), /Krawczyk test does not prove|lost its solution/);
  }, 60_000);
});
