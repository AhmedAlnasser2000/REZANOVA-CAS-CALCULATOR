import { describe as group, expect, it } from 'vitest';
import { EquationAlgebraError } from '../execution';
import { context } from '../test-support';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { describe } from '../decision/test-helpers';
import { ExpressionStore } from '../representation/expression';
import { readRelations } from '../representation/mathjson';
import { relationProblem } from '../representation/relation';
import type { EquationOutcome, SolutionSet } from '../representation/solution-set';
import type { ProofLog } from '../representation/transform';
import { decodeOutcome, encodeOutcome } from '../representation/wire';
import { rational } from '../algebra/rational';

function setup(json: unknown, store = new ExpressionStore(context())) {
  const r = readRelations(store, json);
  if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
  const problem = relationProblem(store, { domain: 'real', targets: ['x'], relations: r.value });
  return { store, problem, outcome: decideEquation(problem) };
}
const sin = (a: unknown) => ['Sin', a], exp = (a: unknown) => ['Exp', a];

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

group('verifier rejects tampering with composition answers', () => {
  it('rejects a moved piece end, a wrong piece truth and a missing monotone root', () => {
    const a = setup(['GreaterEqual', ['Multiply', ['Add', 'x', -1], ['Add', 'x', sin('x')]], 0]);
    const as = solved(a.outcome), s = a.store, aset = as.set;
    if (aset.kind !== 'intervals') throw new Error(aset.kind);
    const [first, second] = aset.intervals;
    rejects(() => verifyEquationOutcome(a.problem, { kind: 'solved', proof: as.proof, set: { ...aset, intervals: [{ ...first, hi: { kind: 'rational', value: rational(s.ctx, 1n, 2n) } }, second] } }), /does not satisfy|differs/);
    rejects(() => verifyEquationOutcome(a.problem, { kind: 'solved', proof: as.proof, set: { ...aset, intervals: [second] } }), /differs/);
    const b = setup(['Equal', ['Add', 'x', sin('x')], 0]);
    rejects(() => verifyEquationOutcome(b.problem, { kind: 'empty', proof: (b.outcome as { proof: ProofLog }).proof }), /claimed empty/);
  });

  it('rejects a wrong family k-range and overlapping members', () => {
    const { store: s, problem, outcome } = setup(['Greater', sin(exp('x')), ['Rational', 1, 2]]);
    const { set, proof } = solved(outcome);
    if (set.kind !== 'interval-family') throw new Error(set.kind);
    // From k = −1: the member at k = −1 has no real ends (log of a negative number).
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', proof, set: { ...set, from: -1n } }), /./);
    // Members widened to [lo(k), lo(k + 1)): samples outside sin(eˣ) > 1/2.
    const next = s.substitute(set.lo, new Map([['k', s.add(s.symbol('k'), s.integer(1))]]));
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', proof, set: { ...set, hi: next } }), /does not satisfy|differs/);
  }, 60_000);

  it('rejects a set claimed for an injective cancellation without its domain', () => {
    const { store: s, problem, outcome } = setup(['Equal', ['Ln', ['Add', ['Power', 'x', 2], 1]], ['Ln', ['Multiply', 2, 'x']]]);
    const { set, proof } = solved(outcome);
    if (set.kind !== 'finite') throw new Error(set.kind);
    // Also claim x = −1, outside the log domain.
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', proof, set: { ...set, points: [...set.points, [{ kind: 'expression', id: s.integer(-1) }]] } }), /outside the domain|does not satisfy|differs/);
  });
});

group('wire replay', () => {
  it('round-trips interval families, range answers and injective answers, and verifies the replay', () => {
    const cases = [
      ['Greater', sin(exp('x')), ['Rational', 1, 2]],
      ['Greater', sin(exp(['Negate', 'x'])), 0],
      ['Greater', ['Add', 'x', sin('x')], 0],
      ['Equal', exp(sin('x')), exp(['Cos', 'x'])],
    ];
    for (const json of cases) {
      const { store, outcome } = setup(json);
      const wire = JSON.parse(JSON.stringify(encodeOutcome(store, outcome)));
      const back = decodeOutcome(context(), wire);
      const replayed = back.outcome as Extract<EquationOutcome, { kind: 'solved' }>;
      verifyEquationOutcome(replayed.proof.states.get(replayed.proof.root)!, replayed);
      expect(describe(back.store, replayed)).toBe(describe(store, outcome));
    }
  }, 120_000);
});

group('resources', () => {
  it('reports typed work and cancellation stops, never partial answers', () => {
    const json = ['GreaterEqual', ['Multiply', ['Add', 'x', -1], ['Add', 'x', sin('x')]], 0];
    expect(setup(json, new ExpressionStore(context({ work: 3_000 }))).outcome).toEqual({ kind: 'resource', stop: 'work' });
    let polls = 0;
    expect(setup(json, new ExpressionStore(context({}, () => ++polls > 4_000))).outcome).toEqual({ kind: 'resource', stop: 'cancelled' });
    expect(setup(json).outcome.kind).toBe('solved');
  }, 60_000);
});
