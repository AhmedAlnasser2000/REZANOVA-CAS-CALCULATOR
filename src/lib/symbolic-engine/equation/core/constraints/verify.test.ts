import { describe as group, expect, it } from 'vitest';
import { EquationAlgebraError } from '../execution';
import { rational } from '../algebra/rational';
import { context } from '../test-support';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { describe } from '../decision/test-helpers';
import { ExpressionStore } from '../representation/expression';
import { readRelations } from '../representation/mathjson';
import { relationProblem } from '../representation/relation';
import type { EquationOutcome, Interval, PointValue, SolutionSet } from '../representation/solution-set';
import type { ProofLog } from '../representation/transform';
import { decodeOutcome, encodeOutcome } from '../representation/wire';

function setup(json: unknown, store = new ExpressionStore(context())) {
  const r = readRelations(store, json);
  if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
  const problem = relationProblem(store, { domain: 'real', targets: ['x'], relations: r.value });
  return { store, problem, outcome: decideEquation(problem) };
}
const eq = (a: unknown, b: unknown = 0) => ['Equal', a, b];
const abs = (a: unknown) => ['Abs', a];
const sqrt = (a: unknown) => ['Sqrt', a];
const add = (...a: unknown[]) => ['Add', ...a];
const S1 = eq(sqrt(add('x', 1)), add('x', -2));
const S4 = eq(add(sqrt('x'), sqrt(add('x', 1)), sqrt(add('x', 2))), 5);

function solved(o: EquationOutcome): { set: SolutionSet; proof: ProofLog } {
  if (o.kind !== 'solved') throw new Error(o.kind);
  return o;
}

function rejects(f: () => void, reason: RegExp) {
  let caught: unknown;
  try { f(); } catch (e) { caught = e; }
  expect(caught).toBeInstanceOf(EquationAlgebraError);
  expect((caught as EquationAlgebraError).code).toBe('verification-failed');
  expect((caught as EquationAlgebraError).reason).toMatch(reason);
}

group('verifier rejects tampering', () => {
  it('rejects the unconfirmed candidate (5 − √13)/2 of S1 by exact substitution', () => {
    const { store: s, problem, outcome } = setup(S1);
    const { set, proof } = solved(outcome);
    if (set.kind !== 'finite') throw new Error(set.kind);
    // √(x + 1) > 0 > x − 2 there: the squared equation's second root.
    const spurious: PointValue = { kind: 'expression', id: s.div(s.sub(s.integer(5), s.sqrt(s.integer(13))), s.integer(2)) };
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', proof, set: { ...set, points: [...set.points, [spurious]] } }), /does not satisfy a relation exactly/);
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', proof, set: { ...set, points: [[spurious]] } }), /does not satisfy a relation exactly/);
    rejects(() => verifyEquationOutcome(problem, { kind: 'empty', proof }), /claimed empty/);
  });

  it('rejects a point outside the radical domain', () => {
    const { problem, outcome } = setup(eq(sqrt(['Power', 'x', 2]), 1));
    const { set, proof } = solved(outcome);
    if (set.kind !== 'finite') throw new Error(set.kind);
    const r = setup(eq(sqrt('x'), 1));
    const minusOne: PointValue = { kind: 'rational', value: rational(r.store.ctx, -1n) };
    rejects(() => verifyEquationOutcome(r.problem, { kind: 'solved', proof: solved(r.outcome).proof, set: { kind: 'finite', variables: ['x'], points: [[minusOne]] } }), /outside the domain/);
    verifyEquationOutcome(problem, { kind: 'solved', proof, set }); // √(x²) = |x| = 1 keeps both signs
    expect(describe(problem.store, outcome)).toBe('{-1, 1}');
  });

  it('rejects a wrong zero-interval endpoint and a dropped piece', () => {
    const z = setup(eq(abs('x'), 'x'));
    const zs = solved(z.outcome), zset = zs.set;
    if (zset.kind !== 'intervals') throw new Error(zset.kind);
    const widened: Interval = { ...zset.intervals[0], lo: { kind: 'rational', value: rational(z.store.ctx, -1n) } };
    rejects(() => verifyEquationOutcome(z.problem, { kind: 'solved', proof: zs.proof, set: { ...zset, intervals: [widened] } }), /closed endpoint does not satisfy a relation exactly/);
    const shrunk: Interval = { ...zset.intervals[0], lo: { kind: 'rational', value: rational(z.store.ctx, 1n) } };
    rejects(() => verifyEquationOutcome(z.problem, { kind: 'solved', proof: zs.proof, set: { ...zset, intervals: [shrunk] } }), /differs/);

    const p = setup(['Greater', add(abs(add('x', -1)), abs(add('x', 1))), 2]);
    const ps = solved(p.outcome), pset = ps.set;
    if (pset.kind !== 'intervals') throw new Error(pset.kind);
    rejects(() => verifyEquationOutcome(p.problem, { kind: 'solved', proof: ps.proof, set: { ...pset, intervals: [pset.intervals[1]] } }), /differs/);
    rejects(() => verifyEquationOutcome(p.problem, { kind: 'solved', proof: ps.proof, set: { ...pset, intervals: [{ ...pset.intervals[0], hiClosed: true }, pset.intervals[1]] } }), /closed endpoint does not satisfy a relation exactly/);
  });

  it('rejects a proof without its radical-domain step or with a tampered measure', () => {
    const { problem, outcome } = setup(S1);
    const { set, proof } = solved(outcome);
    const k = proof.records.findIndex(r => r.rule === 'radical-domain');
    expect(k).toBeGreaterThanOrEqual(0);
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', set, proof: { ...proof, records: proof.records.filter((_, i) => i !== k) } }), /discontinuity/);
    const measured = proof.records.map((r, i) => (i === k ? { ...r, measure: { ...r.measure, after: [r.measure.before[0]] } } : r));
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', set, proof: { ...proof, records: measured } }), /did not decrease|rejected its step/);
  });
});

group('wire replay', () => {
  it('round-trips radical points with forms, RootOf points and zero intervals, and verifies the replay', () => {
    for (const json of [S1, eq(abs('x'), 'x'), ['LessEqual', ['Exp', abs('x')], 2], eq(add(sqrt('x'), sqrt(add('x', 1))), 3)]) {
      const { store, outcome } = setup(json);
      const wire = JSON.parse(JSON.stringify(encodeOutcome(store, outcome)));
      const back = decodeOutcome(context(), wire);
      const replayed = back.outcome as Extract<EquationOutcome, { kind: 'solved' }>;
      verifyEquationOutcome(replayed.proof.states.get(replayed.proof.root)!, replayed);
      expect(describe(back.store, replayed)).toBe(describe(store, outcome));
    }
  }, 60_000);
});

group('resources', () => {
  it('reports typed work and cancellation stops, never partial answers', () => {
    const tiny = new ExpressionStore(context({ work: 40_000 }));
    expect(setup(S4, tiny).outcome).toEqual({ kind: 'resource', stop: 'work' });
    let polls = 0;
    const cancelled = new ExpressionStore(context({}, () => ++polls > 30_000));
    expect(setup(S4, cancelled).outcome).toEqual({ kind: 'resource', stop: 'cancelled' });
    expect(setup(S4).outcome.kind).toBe('solved');
  }, 60_000);
});
