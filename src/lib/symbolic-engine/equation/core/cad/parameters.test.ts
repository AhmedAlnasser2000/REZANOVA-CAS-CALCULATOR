import { describe as group, expect, it } from 'vitest';
import { DEFAULT_EQUATION_LIMITS } from '../../../../new-equation/types';
import { lowerEquation } from '../../service/input';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { ExecutionContext } from '../execution';
import { ExpressionStore } from '../representation/expression';
import type { EquationOutcome } from '../representation/solution-set';
import { assumeOutcome } from '../parameters/assume';
import { conditionsSatisfiable } from './feasible';

// Parameters through the decomposition (EQUATION-SEMIALGEBRAIC1 PR B, B2).
function solve(rows: readonly string[], targets: readonly string[]) {
  const ctx = new ExecutionContext({ ...DEFAULT_EQUATION_LIMITS });
  const store = new ExpressionStore(ctx);
  const { problem, assumptions } = lowerEquation(store, { rows: [...rows], targets: [...targets], domain: 'real', limits: { ...DEFAULT_EQUATION_LIMITS }, digits: 6 });
  return { store, problem, assumptions, outcome: decideEquation(problem) };
}
const caseCount = (o: EquationOutcome) => (o.kind === 'solved' && o.set.kind === 'case-tree' ? o.set.cases.length : 0);

group('parameters as outer levels', () => {
  it('decides what the sign-condition tree refused, as verified case trees', () => {
    // Root order across polynomials, a depressed cubic, and a parametric region in two unknowns.
    for (const [rows, targets, cases] of [
      [['x^2<a', 'x>b'], ['x'], 4],
      [['x^3+ax+b=0'], ['x'], 6],
      [['x^2+y^2<a', 'y>x'], ['x', 'y'], 2],
    ] as const) {
      const r = solve(rows, targets);
      expect(caseCount(r.outcome)).toBe(cases);
      verifyEquationOutcome(r.problem, r.outcome);
    }
  });

  it('gives a plain set when no condition on the parameters is needed', () => {
    const r = solve(['x+y<a', 'x-y>b'], ['x', 'y']);
    expect(r.outcome.kind === 'solved' && r.outcome.set.kind).toBe('cylindrical');
    verifyEquationOutcome(r.problem, r.outcome);
  });

  it('joins c > 0 and c < 0 cases with one answer into c ≠ 0, and splits off powers of the unknown', () => {
    const r = solve(['x^2yc+x^3=axy', 'a<0'], ['x']);
    const o = assumeOutcome(r.problem, r.assumptions, r.outcome);
    // Every case is decided against the coupled assumption: no "could not be checked" note.
    expect(o.complete).toBe(true);
    const cases = o.outcome.kind === 'solved' && o.outcome.set.kind === 'case-tree' ? o.outcome.set.cases : [];
    expect(cases.some(c => c.conditions.some(k => k.kind === 'nonzero'))).toBe(true);
    verifyEquationOutcome(r.problem, r.outcome);
  });
});

group('feasibility of coupled conditions', () => {
  it('decides conjunctions in several parameters exactly', () => {
    const { store } = solve(['x=1'], ['x']);
    const a = store.symbol('a'), b = store.symbol('b');
    const disc = store.sub(store.mul(b, b), store.mul(store.integer(4), a));
    expect(conditionsSatisfiable(store, [{ kind: 'positive', expr: a }, { kind: 'positive', expr: store.neg(disc) }, { kind: 'positive', expr: b }])).toBe(true);
    // a·b > 0, a > 0 and b < 0 cannot hold together.
    expect(conditionsSatisfiable(store, [{ kind: 'positive', expr: store.mul(a, b) }, { kind: 'positive', expr: a }, { kind: 'positive', expr: store.neg(b) }])).toBe(false);
  });
});
