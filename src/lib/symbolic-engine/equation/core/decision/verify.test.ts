import { describe as group, expect, it } from 'vitest';
import { EquationAlgebraError } from '../execution';
import { sturmRealRootCount } from '../algebraic/real-roots';
import { ALGEBRAIC_RING } from '../algebraic/root-of';
import { context, seeded } from '../test-support';
import { ExpressionStore } from '../representation/expression';
import type { EquationOutcome, Interval, SolutionSet } from '../representation/solution-set';
import type { ProofLog } from '../representation/transform';
import { decodeOutcome, encodeOutcome } from '../representation/wire';
import { decidePolynomialProblem } from './solve';
import { describe, problemOf, solve } from './test-helpers';
import { verifyOutcome } from './verify';

const store = () => new ExpressionStore(context());
const eq = (lhs: unknown, rhs: unknown = 0) => ['Equal', lhs, rhs];
const poly = (coefficients: readonly (number | bigint)[]) => ['Add', ...coefficients.map((c, k) => {
  const v = typeof c === 'bigint' ? { num: c.toString() } : c;
  return k === 0 ? v : ['Multiply', v, ['Power', 'x', k]];
})];

function rejects(f: () => void, reason: RegExp) {
  let caught: unknown;
  try { f(); } catch (e) { caught = e; }
  expect(caught).toBeInstanceOf(EquationAlgebraError);
  expect((caught as EquationAlgebraError).code).toBe('verification-failed');
  expect((caught as EquationAlgebraError).reason).toMatch(reason);
}

function solved(o: EquationOutcome): { set: SolutionSet; proof: ProofLog } {
  if (o.kind !== 'solved') throw new Error(o.kind);
  return o;
}

group('verifier rejects tampering', () => {
  it('rejects added, removed and perturbed points', () => {
    const s = store();
    const { problem, outcome } = solve(s, eq(['Power', 'x', 2], 2));
    const { set, proof } = solved(outcome);
    if (set.kind !== 'finite') throw new Error(set.kind);
    const [minus, plus] = set.points;
    const five = [{ kind: 'rational' as const, value: { numerator: 5n, denominator: 1n } }];
    rejects(() => verifyOutcome(problem, { kind: 'solved', proof, set: { ...set, points: [...set.points, five] } }), /differs/);
    rejects(() => verifyOutcome(problem, { kind: 'solved', proof, set: { ...set, points: [plus] } }), /differs/);
    rejects(() => verifyOutcome(problem, { kind: 'solved', proof, set: { ...set, points: [plus, plus.map(v => ({ ...v, form: undefined }))] } }), /differs/);
    rejects(() => verifyOutcome(problem, { kind: 'empty', proof }), /claimed empty/);
    // A forged form: the form of −√2 attached to +√2.
    const forged = { ...plus[0], form: (minus[0] as unknown as { form: never }).form };
    rejects(() => verifyOutcome(problem, { kind: 'solved', proof, set: { ...set, points: [minus, [forged]] } }), /radical form/);
  });

  it('rejects wrong interval endpoints and closedness', () => {
    const s = store();
    const { problem, outcome } = solve(s, ['GreaterEqual', ['Divide', ['Subtract', 'x', 1], ['Add', 'x', 2]], 0]);
    const { set, proof } = solved(outcome);
    if (set.kind !== 'intervals') throw new Error(set.kind);
    const flip = (i: Interval, k: number): Interval => (k === 1 ? { ...i, loClosed: false } : i);
    rejects(() => verifyOutcome(problem, { kind: 'solved', proof, set: { ...set, intervals: set.intervals.map(flip) } }), /differs/);
    const closedPole = set.intervals.map((i, k) => (k === 0 ? { ...i, hiClosed: true } : i));
    rejects(() => verifyOutcome(problem, { kind: 'solved', proof, set: { ...set, intervals: closedPole } }), /differs/);
  });

  it('rejects a log that drops the exclusions or a tampered measure, and a claim of solutions for an empty problem', () => {
    const s = store();
    const { problem, outcome } = solve(s, eq(['Divide', ['Subtract', ['Power', 'x', 2], 1], ['Subtract', 'x', 1]], 2));
    if (outcome.kind !== 'empty') throw new Error(outcome.kind);
    const proof = outcome.proof;
    expect(proof.records[0].rule).toBe('natural-domain');
    rejects(() => verifyOutcome(problem, { kind: 'empty', proof: { ...proof, records: proof.records.slice(1) } }), /discontinuity/);
    const forged = proof.records.map((r, i) => (i === proof.records.length - 1 ? { ...r, from: proof.root } : r));
    rejects(() => verifyOutcome(problem, { kind: 'empty', proof: { ...proof, records: forged } }), /rejected its step|bookkeeping/);
    const measure = proof.records.map((r, i) => (i === 0 ? { ...r, measure: { ...r.measure, after: [1n] } } : r));
    rejects(() => verifyOutcome(problem, { kind: 'empty', proof: { ...proof, records: measure } }), /did not decrease|rejected its step/);
    rejects(() => verifyOutcome(problem, { kind: 'solved', proof, set: { kind: 'finite', variables: ['x'], points: [[{ kind: 'rational', value: { numerator: 1n, denominator: 1n } }]] } }), /leaf is empty/);
    const other = problemOf(s, eq('x', 3));
    rejects(() => verifyOutcome(other, outcome), /does not start from the problem/);
  });

  it('round-trips outcomes through the wire and verifies the replay', () => {
    const s = store();
    const { outcome } = solve(s, ['And', ['Less', ['Power', 'x', 2], 3], ['NotEqual', ['Multiply', ['Sqrt', 2], 'x'], 1]]);
    expect(describe(s, outcome)).toBe('(≈-1.732051, ≈0.707107) ∪ (≈0.707107, ≈1.732051)');
    const wire = JSON.parse(JSON.stringify(encodeOutcome(s, outcome)));
    const back = decodeOutcome(context(), wire);
    const replayed = back.outcome as Extract<EquationOutcome, { kind: 'solved' }>;
    verifyOutcome(replayed.proof.states.get(replayed.proof.root)!, replayed);
    expect(describe(back.store, replayed)).toBe(describe(s, outcome));
  });
});

group('scale', () => {
  it('degree 100 with 100 rational roots, and a degree-50 inequality', () => {
    const s = store();
    const factors = ['Multiply', ...Array.from({ length: 100 }, (_, k) => ['Subtract', 'x', k + 1])];
    const r = solve(s, eq(factors));
    expect(describe(s, r.outcome)).toBe(`{${Array.from({ length: 100 }, (_, k) => k + 1).join(', ')}}`);
    const fifty = ['Multiply', ...Array.from({ length: 50 }, (_, k) => ['Subtract', 'x', k + 1])];
    const ineq = solve(s, ['Less', fifty, 0]);
    const set = solved(ineq.outcome).set;
    expect(set.kind === 'intervals' && set.intervals.length).toBe(25);
  }, 120_000);

  it('random dense degree-50 polynomial: every real root, matching an independent Sturm count', () => {
    const rand = seeded(50), s = store();
    const coefficients = Array.from({ length: 51 }, (_, k) => (k === 50 ? 1n : rand.big(24)));
    const r = solve(s, eq(poly(coefficients)));
    const count = sturmRealRootCount(s.ctx, ALGEBRAIC_RING, ALGEBRAIC_RING.make(s.ctx, coefficients));
    const set = r.outcome.kind === 'solved' ? r.outcome.set : undefined;
    expect(set?.kind === 'finite' ? set.points.length : 0).toBe(count);
    expect(count).toBeGreaterThan(0);
  }, 120_000);

  it('degree 20 over ℂ has 20 distinct roots', () => {
    const s = store();
    const r = solve(s, eq(['Subtract', ['Power', 'x', 20], 1]), 'complex');
    const set = solved(r.outcome).set;
    expect(set.kind === 'finite' && set.points.length).toBe(20);
  }, 120_000);
});

group('resources', () => {
  it('reports typed work and cancellation stops, never partial answers', () => {
    const tiny = new ExpressionStore(context({ work: 20_000 }));
    const problem = problemOf(tiny, eq(poly([1, -3, 0, 0, 0, 0, 0, 1])));
    expect(decidePolynomialProblem(problem)).toEqual({ kind: 'resource', stop: 'work' });
    let polls = 0;
    const cancelled = new ExpressionStore(context({}, () => ++polls > 5_000));
    expect(decidePolynomialProblem(problemOf(cancelled, eq(poly([1, -3, 0, 0, 0, 0, 0, 1]))))).toEqual({ kind: 'resource', stop: 'cancelled' });
    const roomy = store();
    expect(solve(roomy, eq(poly([1, -3, 0, 0, 0, 0, 0, 1]))).outcome.kind).toBe('solved');
  });
});
