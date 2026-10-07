import { describe as group, expect, it } from 'vitest';
import { DEFAULT_EQUATION_LIMITS } from '../../../../new-equation/types';
import { lowerEquation } from '../../service/input';
import { rational, rAdd, rCompare, rSubtract, type Rational } from '../algebra/rational';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { EquationAlgebraError, ExecutionContext } from '../execution';
import { enclose } from '../representation/enclosure';
import { ExpressionStore } from '../representation/expression';
import { valueExpression, type EquationOutcome, type Point } from '../representation/solution-set';

// Systems that exact elimination reduces to one certified numeric root (EQUATION-CERTIFIED-NUMERICS1 PR B, B0).
// References: mpmath findroot at 30 digits (truncated to 25).
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
function points(o: EquationOutcome): readonly Point[] {
  if (o.kind !== 'solved' || o.set.kind !== 'finite') throw new Error(`${o.kind}: ${'reason' in o ? o.reason : ''}`);
  return o.set.points;
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

group('systems eliminated to one certified numeric root', () => {
  it('y = sin x, x + eʸ = 2: decided and verified (no endless refinement)', () => {
    const { store, problem, outcome } = solve(['y=\\sin x', 'x+e^y=2'], ['x', 'y']);
    verifyEquationOutcome(problem, outcome);
    const ps = points(outcome);
    expect(ps).toHaveLength(1);
    near(store, ps[0], ['0.4521282492006645982919857', '0.4368809234145809116203440']);
  }, 60_000);

  it('a third target defined by the others is eliminated after distributing −(y − z)', () => {
    const { store, problem, outcome } = solve(['x+e^y=2', 'y=\\sin x', 'z=x+y'], ['x', 'y', 'z']);
    verifyEquationOutcome(problem, outcome);
    const ps = points(outcome);
    expect(ps).toHaveLength(1);
    near(store, ps[0], ['0.4521282492006645982919857', '0.4368809234145809116203440', '0.8890091726152455099123297']);
  }, 60_000);

  it('x² + y² = 4, eˣ = y: both points', () => {
    const { store, problem, outcome } = solve(['x^2+y^2=4', 'e^x=y'], ['x', 'y']);
    verifyEquationOutcome(problem, outcome);
    const ps = points(outcome);
    expect(ps).toHaveLength(2);
    near(store, ps[0], ['-1.995373170063196022752720', '0.1359629074121019357257651']);
    near(store, ps[1], ['0.6392630748084188960038968', '1.895083829593426145719074']);
  }, 60_000);

  it('rejects a point whose eliminated coordinate was moved', () => {
    const { store, problem, outcome } = solve(['y=\\sin x', 'x+e^y=2'], ['x', 'y']);
    const [p] = points(outcome);
    const moved: Point = [{ kind: 'expression', id: store.add(valueExpression(store, p[0]), store.number(rational(store.ctx, 1n, 1000n))) }, p[1]];
    let caught: unknown;
    try { verifyEquationOutcome(problem, { ...(outcome as Extract<EquationOutcome, { kind: 'solved' }>), set: { kind: 'finite', variables: ['x', 'y'], points: [moved] } }); } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(EquationAlgebraError);
    expect((caught as EquationAlgebraError).reason).toMatch(/does not satisfy/);
  }, 60_000);
});
