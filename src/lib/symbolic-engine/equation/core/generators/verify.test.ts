import { describe as group, expect, it } from 'vitest';
import { EquationAlgebraError } from '../execution';
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
const exp = (a: unknown) => ['Exp', a];
const E1 = eq(['Add', exp(['Multiply', 2, 'x']), ['Multiply', -5, exp('x')], 6]);

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
  it('rejects perturbed closed forms and wrong Lambert branches', () => {
    const { store: s, problem, outcome } = setup(E1);
    const { set, proof } = solved(outcome);
    if (set.kind !== 'finite') throw new Error(set.kind);
    const ln5: PointValue = { kind: 'expression', id: s.log(s.integer(5)) };
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', proof, set: { ...set, points: [set.points[0], [ln5]] } }), /differs/);
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', proof, set: { ...set, points: [set.points[0]] } }), /differs/);
    rejects(() => verifyEquationOutcome(problem, { kind: 'empty', proof }), /claimed empty/);

    const w = setup(eq(['Multiply', 'x', exp('x')], 1));
    const ws = solved(w.outcome);
    const branch: PointValue = { kind: 'expression', id: w.store.lambertW(w.store.integer(1), -1) };
    let caught: unknown;
    try { verifyEquationOutcome(w.problem, { kind: 'solved', proof: ws.proof, set: { kind: 'finite', variables: ['x'], points: [[branch]] } }); } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(EquationAlgebraError); // W₋₁(1) is not a real number: rejected
  });

  it('rejects wrong interval endpoints and closedness', () => {
    const { store: s, problem, outcome } = setup(['Greater', exp('x'), 2]);
    const { set, proof } = solved(outcome);
    if (set.kind !== 'intervals') throw new Error(set.kind);
    const moved: Interval = { ...set.intervals[0], lo: { kind: 'expression', id: s.log(s.integer(3)) } };
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', proof, set: { ...set, intervals: [moved] } }), /differs/);
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', proof, set: { ...set, intervals: [{ ...set.intervals[0], loClosed: true }] } }), /differs/);
  });

  it('rejects a log without its domain step, a tampered measure and a foreign proof', () => {
    const { store: s, problem, outcome } = setup(eq(['Add', ['Ln', 'x'], ['Ln', ['Add', 'x', 1]]], ['Ln', 6]));
    const { set, proof } = solved(outcome);
    expect(proof.records[0].rule).toBe('log-domain');
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', set, proof: { ...proof, records: proof.records.slice(1) } }), /discontinuity/);
    const measured = proof.records.map((r, i) => (i === 0 ? { ...r, measure: { ...r.measure, after: [r.measure.before[0]] } } : r));
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', set, proof: { ...proof, records: measured } }), /did not decrease|rejected its step/);
    const other = relationProblem(s, { domain: 'real', targets: ['x'], relations: [{ op: 'eq', lhs: s.exp(s.symbol('x')), rhs: s.integer(7) }] });
    rejects(() => verifyEquationOutcome(other, outcome), /does not start from the problem/);
  });
});

group('wire replay', () => {
  it('round-trips closed forms, Lambert values and intervals, and verifies the replay', () => {
    const cases = [
      eq(['Add', ['Power', ['Ln', 'x'], 6], ['Multiply', -5, ['Power', ['Ln', 'x'], 3]], 4]),
      eq(['Multiply', 'x', exp('x')], ['Divide', -1, ['Multiply', 2, 'ExponentialE']]),
      ['Less', ['Multiply', 'x', exp('x')], 1],
    ];
    for (const json of cases) {
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
    expect(setup(E1, tiny).outcome).toEqual({ kind: 'resource', stop: 'work' });
    let polls = 0;
    const cancelled = new ExpressionStore(context({}, () => ++polls > 30_000));
    expect(setup(E1, cancelled).outcome).toEqual({ kind: 'resource', stop: 'cancelled' });
    expect(setup(E1).outcome.kind).toBe('solved');
  });
});
