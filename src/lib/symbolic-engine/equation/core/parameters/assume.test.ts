import { describe as group, expect, it } from 'vitest';
import { context } from '../test-support';
import { decideEquation } from '../decide';
import { EquationAlgebraError } from '../execution';
import { ExpressionStore } from '../representation/expression';
import { readRelations } from '../representation/mathjson';
import { canonicalRelation, relationProblem, type Relation } from '../representation/relation';
import { setKey, type EquationOutcome } from '../representation/solution-set';
import { assumeOutcome, assumptionsSatisfiable, verifyAssumedOutcome } from './assume';

function setup(json: unknown, assumed: unknown[], targets = ['x']) {
  const store = new ExpressionStore(context());
  const read = (j: unknown) => { const r = readRelations(store, j); if (r.kind !== 'ok') throw new Error(JSON.stringify(r)); return r.value; };
  const problem = relationProblem(store, { domain: 'real', targets, relations: read(json) });
  const assumptions: Relation[] = assumed.flatMap(a => read(a).map(r => canonicalRelation(store, r)));
  const full = decideEquation(problem);
  return { store, problem, assumptions, full, ...assumeOutcome(problem, assumptions, full) };
}
const cases = (o: EquationOutcome) => (o.kind === 'solved' && o.set.kind === 'case-tree' ? o.set.cases.length : o.kind === 'solved' ? 1 : 0);
const rejects = (f: () => void, reason: RegExp) => {
  let caught: unknown;
  try { f(); } catch (e) { caught = e; }
  expect(caught).toBeInstanceOf(EquationAlgebraError);
  expect((caught as EquationAlgebraError).reason).toMatch(reason);
};
const sq = ['Equal', ['Power', 'x', 2], 'a'];

group('assumptions', () => {
  it('drop ruled-out cases and implied conditions (one parameter)', () => {
    const s = setup(sq, [['Greater', 'a', 0]]);
    expect(cases(s.full)).toBe(2);
    expect(s.outcome.kind).toBe('solved');
    expect(s.outcome.kind === 'solved' && s.outcome.set.kind).toBe('finite');
    expect(s.complete).toBe(true);
    verifyAssumedOutcome(s.problem, s.assumptions, s.full, s.outcome);
  });

  it('keep cases the assumptions allow', () => {
    const s = setup(sq, [['Greater', 'a', -1]]);
    expect(cases(s.outcome)).toBe(2);
    verifyAssumedOutcome(s.problem, s.assumptions, s.full, s.outcome);
  });

  it('give no solution when only empty cases remain', () => {
    const s = setup(sq, [['Less', 'a', 0]]);
    expect(s.outcome.kind).toBe('empty');
    verifyAssumedOutcome(s.problem, s.assumptions, s.full, s.outcome);
  });

  it('decide monomials over several parameters by signs', () => {
    const s = setup(['Equal', ['Power', 'x', 2], ['Multiply', 'a', 'b']], [['Greater', 'a', 0], ['Greater', 'b', 0]]);
    expect(s.outcome.kind === 'solved' && s.outcome.set.kind).toBe('finite');
    expect(s.complete).toBe(true);
    verifyAssumedOutcome(s.problem, s.assumptions, s.full, s.outcome);
  });

  it('keep what they cannot decide, and say so', () => {
    const s = setup(sq, [['Greater', 'a', 'Pi']]);
    expect(s.complete).toBe(false);
    expect(cases(s.outcome)).toBe(cases(s.full));
  });

  it('leave answers without cases unchanged', () => {
    const s = setup(['Equal', ['Add', 'x', 'a'], 0], [['Greater', 'a', 0]]);
    expect(s.outcome).toBe(s.full);
  });

  it('detect contradictions', () => {
    const s = setup(sq, [['Greater', 'a', 1], ['Less', 'a', 0]]);
    expect(assumptionsSatisfiable(s.problem, s.assumptions)).toBe(false);
    expect(assumptionsSatisfiable(s.problem, s.assumptions.slice(0, 1))).toBe(true);
  });

  it('reject a tampered pruning', () => {
    const s = setup(sq, [['Greater', 'a', -1]]);
    if (s.outcome.kind !== 'solved' || s.outcome.set.kind !== 'case-tree') throw new Error('expected cases');
    const dropped: EquationOutcome = { ...s.outcome, set: { kind: 'case-tree', cases: s.outcome.set.cases.slice(0, 1) } };
    rejects(() => verifyAssumedOutcome(s.problem, s.assumptions, s.full, dropped), /no assumed case covers a sample|re-deriving/);
    const swapped: EquationOutcome = { ...s.outcome, set: { kind: 'case-tree', cases: s.outcome.set.cases.map((c, i, all) => ({ conditions: c.conditions, set: all[1 - i].set })) } };
    rejects(() => verifyAssumedOutcome(s.problem, s.assumptions, s.full, swapped), /kept case|differs/);
    expect(setKey(s.store, s.outcome.set)).toBeTruthy();
  });
});
