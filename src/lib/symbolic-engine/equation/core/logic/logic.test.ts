import { describe as group, expect, it } from 'vitest';
import { DEFAULT_EQUATION_LIMITS } from '../../../../new-equation/types';
import { checkRows, parseRow } from '../../../../new-equation/parse';
import { lowerEquation } from '../../service/input';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { EquationAlgebraError, ExecutionContext } from '../execution';
import { ExpressionStore } from '../representation/expression';
import { formulaKey } from '../representation/formula';
import { decodeProblem, encodeProblem } from '../representation/wire';
import { finiteSet, type EquationOutcome } from '../representation/solution-set';
import { describe } from '../decision/test-helpers';

// Rows with ∧, ∨ and ¬ (EQUATION-SEMIALGEBRAIC1 PR A, A1).
function solve(rows: readonly string[], targets: readonly string[] = ['x'], domain: 'real' | 'complex' = 'real') {
  const ctx = new ExecutionContext({ ...DEFAULT_EQUATION_LIMITS });
  const store = new ExpressionStore(ctx);
  const { problem } = lowerEquation(store, { rows: [...rows], targets: [...targets], domain, limits: { ...DEFAULT_EQUATION_LIMITS }, digits: 6 });
  const outcome = decideEquation(problem);
  return { store, problem, outcome, text: describe(store, outcome) };
}

group('logic rows: reading', () => {
  it('reads ∨, ∧, ¬ and quantifiers, and names bound variables', () => {
    const or = parseRow('x<0\\lor y>1');
    expect(or.kind === 'relation' && or.logic && or.symbols).toEqual(['x', 'y']);
    const q = parseRow('\\forall x: x^2+ax+1>0');
    expect(q.kind === 'relation' && [q.symbols, q.bound]).toEqual([['a'], ['x']]);
    const chain = parseRow('1<x<3');
    expect(chain.kind === 'relation' && chain.logic).toBeFalsy();
  });

  it('refuses ¬ on an expression, a quantified unknown and a bound name used freely elsewhere', () => {
    expect(parseRow('\\lnot x<1')).toEqual({ kind: 'error', message: 'Put ¬ before a parenthesized relation, such as ¬(x < 1).' });
    const rows = ['\\forall x: x^2+ax+1>0', 'x>a'].map(parseRow);
    expect(checkRows(rows, ['a'], 'real').rows[1]).toEqual({ kind: 'error', message: 'x is quantified in row 1; use another name here.' });
    expect(checkRows([rows[0]], ['x'], 'real').rows[0]).toEqual({ kind: 'error', message: 'x is quantified here, so it cannot be an unknown.' });
  });

  it('pushes ¬ onto relations (De Morgan, flipped orders) and keeps formulas canonical', () => {
    const a = solve(['\\neg\\left(x<0\\land x>3\\right)']), b = solve(['x\\ge0\\lor x\\le3']);
    expect(a.problem.formulas.map(f => formulaKey(a.store, f))).toEqual(b.problem.formulas.map(f => formulaKey(b.store, f)));
    expect(a.problem.hash).toBe(b.problem.hash);
  });
});

group('logic rows: deciding by disjuncts', () => {
  it('unites the disjuncts, joining intervals and the points inside them', () => {
    expect(solve(['x<0\\lor x>3']).text).toBe('(-inf, 0) ∪ (3, +inf)');
    expect(solve(['x<0\\lor x<1']).text).toBe('(-inf, 1)');
    expect(solve(['x^2<4\\lor x=1']).text).toBe('(-2, 2)');
    expect(solve(['x^2=1\\lor x^2=4']).text).toBe('{-2, -1, 1, 2}');
    expect(solve(['\\neg\\left(x^2\\le1\\right)']).text).toBe('(-inf, -1) ∪ (1, +inf)');
  });

  it('works for any slice (trig with a range row) and over ℂ', () => {
    const r = solve(['\\sin x=0\\lor x^2=1', '-4\\le x\\le4']);
    verifyEquationOutcome(r.problem, r.outcome);
    expect(r.outcome.kind === 'solved' && r.outcome.set.kind).toBe('finite');
    const c = solve(['x^2=-1\\lor x=2'], ['x'], 'complex');
    verifyEquationOutcome(c.problem, c.outcome);
    expect(c.text).toMatch(/2/);
  });

  it('is empty when every disjunct is, and refuses quantifiers until the second part', () => {
    expect(solve(['x^2<0\\lor x^2=-1']).outcome.kind).toBe('empty');
    const q = solve(['\\forall y: y^2+x>0'], ['x']).outcome;
    expect(q.kind === 'incomplete-implementation' && q.reason).toMatch(/EQUATION-SEMIALGEBRAIC1: quantifiers/);
  });

  it('verifies each disjunct and rejects an answer that is not their union', () => {
    const r = solve(['x<0\\lor x=5']);
    verifyEquationOutcome(r.problem, r.outcome);
    const tampered: EquationOutcome = { ...(r.outcome as Extract<EquationOutcome, { kind: 'solved' }>), set: finiteSet(['x'], [[{ kind: 'rational', value: { numerator: 5n, denominator: 1n } as never }]]) };
    let caught: unknown;
    try { verifyEquationOutcome(r.problem, tampered); } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(EquationAlgebraError);
    expect((caught as EquationAlgebraError).reason).toMatch(/union of its disjuncts/);
  });

  it('round-trips problems with formulas through the wire', () => {
    const r = solve(['x<0\\lor x>3', 'x\\ne5']);
    const back = decodeProblem(new ExecutionContext({ ...DEFAULT_EQUATION_LIMITS }), encodeProblem(r.problem));
    expect(back.hash).toBe(r.problem.hash);
    expect(back.formulas).toHaveLength(1);
  });
});
