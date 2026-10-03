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

function setup(json: unknown, store = new ExpressionStore(context())) {
  const r = readRelations(store, json);
  if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
  const problem = relationProblem(store, { domain: 'complex', targets: ['z'], relations: r.value });
  return { store, problem, outcome: decideEquation(problem) };
}
const eq = (a: unknown, b: unknown = 0) => ['Equal', a, b];
const exp = (a: unknown) => ['Exp', a], I = 'ImaginaryUnit';

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

group('verifier rejects tampering with complex families', () => {
  it('rejects a wrong residue, a wrong period and a non-minimal period', () => {
    const { store: s, problem, outcome } = setup(eq(exp('z'), 2));
    const { set, proof } = solved(outcome);
    if (set.kind !== 'periodic') throw new Error(set.kind);
    const k = s.symbol('k'), twoPiI = s.mul(s.integer(2), s.constant('pi'), s.constant('i'));
    const family = (value: number) => ({ ...set, values: [value as never] });
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', proof, set: family(s.add(s.log(s.integer(3)), s.mul(twoPiI, k))) }), /family member does not satisfy/);
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', proof, set: family(s.add(s.log(s.integer(2)), s.mul(s.constant('pi'), s.constant('i'), k))) }), /family member does not satisfy/);
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', proof, set: family(s.add(s.log(s.integer(2)), s.mul(s.integer(2), twoPiI, k))) }), /differs/);
  });

  it('rejects a missing k ≠ 0 constraint and a family claimed for an empty problem', () => {
    const a = setup(['And', eq(exp('z'), 1), ['NotEqual', 'z', 0]]);
    const as = solved(a.outcome), aset = as.set;
    if (aset.kind !== 'periodic') throw new Error(aset.kind);
    rejects(() => verifyEquationOutcome(a.problem, { kind: 'solved', proof: as.proof, set: { ...aset, constraints: [] } }), /family member does not satisfy/);

    const b = setup(eq(['Ln', 'z'], ['Multiply', 2, 'Pi', I]));
    expect(b.outcome.kind).toBe('empty');
    const s = b.store, value = s.add(s.exp(s.mul(s.integer(2), s.constant('pi'), s.constant('i'))), s.mul(s.integer(0), s.symbol('k')));
    const proof = (b.outcome as { proof: ProofLog }).proof;
    rejects(() => verifyEquationOutcome(b.problem, { kind: 'solved', proof, set: { kind: 'periodic', variables: ['z'], values: [value], integerParameters: ['k'], constraints: [] } }), /does not satisfy|differs/);
    rejects(() => verifyEquationOutcome(a.problem, { kind: 'empty', proof: as.proof }), /claimed empty/);
  });

  it('rejects a proof without its log-domain step', () => {
    const { problem, outcome } = setup(eq(['Ln', 'z'], 1));
    const { set, proof } = solved(outcome);
    const k = proof.records.findIndex(r => r.rule === 'complex-log-domain');
    expect(k).toBeGreaterThanOrEqual(0);
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', set, proof: { ...proof, records: proof.records.filter((_, i) => i !== k) } }), /discontinuity/);
  });
});

group('complex wire replay', () => {
  it('round-trips families, constraints, several parameters and points, and verifies the replay', () => {
    const cases = [
      eq(['Add', exp(['Multiply', 2, 'z']), ['Multiply', -5, exp('z')], 6]),
      ['And', eq(exp('z'), 1), ['NotEqual', 'z', 0]],
      eq(exp(exp('z')), 1),
      eq(['Sin', 'z'], 2),
      eq(['Multiply', ['Add', exp('z'), -1], ['Add', 'z', -2]]),
      eq(['Ln', 'z'], ['Add', 1, I]),
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

group('resources over ℂ', () => {
  it('reports typed work and cancellation stops, never partial answers', () => {
    const sin2z = eq(['Sin', ['Multiply', 2, 'z']], ['Cos', 'z']);
    expect(setup(sin2z, new ExpressionStore(context({ work: 20_000 }))).outcome).toEqual({ kind: 'resource', stop: 'work' });
    let polls = 0;
    expect(setup(sin2z, new ExpressionStore(context({}, () => ++polls > 20_000))).outcome).toEqual({ kind: 'resource', stop: 'cancelled' });
    expect(setup(sin2z).outcome.kind).toBe('solved');
  }, 60_000);
});
