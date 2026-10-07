import { describe as group, expect, it } from 'vitest';
import { DEFAULT_EQUATION_LIMITS } from '../../../../new-equation/types';
import { autoTargets, checkRows, parseRow } from '../../../../new-equation/parse';
import { rational } from '../algebra/rational';
import { lowerEquation } from '../../service/input';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { EquationAlgebraError, ExecutionContext } from '../execution';
import { ExpressionStore } from '../representation/expression';
import type { EquationOutcome } from '../representation/solution-set';
import { describe } from '../decision/test-helpers';

// Quantifier elimination (EQUATION-SEMIALGEBRAIC1 PR B, B1): free names outermost, bound levels decided over stacks.
function solve(rows: readonly string[], targets?: readonly string[]) {
  const ctx = new ExecutionContext({ ...DEFAULT_EQUATION_LIMITS });
  const store = new ExpressionStore(ctx);
  const chosen = targets ?? autoTargets(rows.map(parseRow));
  const { problem } = lowerEquation(store, { rows: [...rows], targets: [...chosen], domain: 'real', limits: { ...DEFAULT_EQUATION_LIMITS }, digits: 6 });
  const outcome = decideEquation(problem);
  return { store, problem, outcome, text: describe(store, outcome) };
}
function rejects(f: () => void, reason: RegExp) {
  let caught: unknown;
  try { f(); } catch (e) { caught = e; }
  expect(caught).toBeInstanceOf(EquationAlgebraError);
  expect((caught as EquationAlgebraError).reason).toMatch(reason);
}

group('quantified rows', () => {
  it('eliminates ∀ and ∃ into regions of the free names, which are the unknowns', () => {
    const cases: [string[], string][] = [
      [['\\forall x: x^2+ax+1>0'], '(-2, 2)'],
      [['\\exists y: x^2+y^2<1'], '(-1, 1)'],
      [['\\exists x: x^2+bx+1=0'], '(-inf, -2] ∪ [2, +inf)'],
      [['\\forall y: \\left(x-y\\right)^2\\ge0'], '(-inf, +inf)'],
      [['\\forall x,\\exists y: y^2=x+a'], 'empty'],
      [['\\exists x,\\forall y: y^2\\ge a+x^2'], '(-inf, 0]'],
    ];
    for (const [rows, text] of cases) {
      const r = solve(rows);
      expect(r.text).toBe(text);
      verifyEquationOutcome(r.problem, r.outcome);
    }
  });

  it('gives a region in two free names (∃z: x² + y² + z² < 1 is the open disc)', () => {
    const r = solve(['\\exists z: x^2+y^2+z^2<1']);
    expect(r.problem.targets).toEqual(['x', 'y']);
    expect(r.text).toMatch(/^x ∈ \(-1, 1\) ∧ y ∈ \(/);
    verifyEquationOutcome(r.problem, r.outcome);
  });

  it('decides statements whose every name is quantified: True or False, with no unknowns', () => {
    const rows = ['\\forall x: x^2+1>0'];
    expect(autoTargets(rows.map(parseRow))).toEqual([]);
    expect(checkRows(rows.map(parseRow), [], 'real').ready).toBe(true);
    for (const [r, text] of [[rows, 'True'], [['\\exists x: x^2<0'], 'False'], [['\\forall x,\\exists y: y>x^2'], 'True'], [['\\exists x,\\forall y: y>x'], 'False']] as const) {
      const s = solve(r, []);
      expect(s.text).toBe(text);
      verifyEquationOutcome(s.problem, s.outcome);
    }
  });

  it('rejects a wrong region and a wrong truth value', () => {
    const r = solve(['\\forall x: x^2+ax+1>0']), solved = r.outcome as Extract<EquationOutcome, { kind: 'solved' }>;
    const q = (n: bigint) => ({ kind: 'rational' as const, value: rational(r.store.ctx, n) });
    const wide: EquationOutcome = { ...solved, set: { kind: 'intervals', variables: ['a'], intervals: [{ lo: q(-3n), hi: q(2n), loClosed: false, hiClosed: false }] } };
    rejects(() => verifyEquationOutcome(r.problem, wide), /does not satisfy|another variable order/);
    const t = solve(['\\forall x: x^2+1>0'], []), ts = t.outcome as Extract<EquationOutcome, { kind: 'solved' }>;
    rejects(() => verifyEquationOutcome(t.problem, { ...ts, set: { kind: 'truth', value: false } }), /truth differs/);
  });
});
