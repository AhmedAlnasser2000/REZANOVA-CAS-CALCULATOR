import { describe as group, expect, it } from 'vitest';
import { DEFAULT_EQUATION_LIMITS } from '../../../../new-equation/types';
import { autoTargets, parseRow } from '../../../../new-equation/parse';
import { lowerEquation } from '../../service/input';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { ExecutionContext } from '../execution';
import { ExpressionStore } from '../representation/expression';
import { shiftPlan } from './shift';

// EQUATION-RECONSTRUCTION-CLOSEOUT1: the shift test (decomposition P = f∘(x + s)) and closed forms of binomial roots.
function decide(latex: string) {
  const ctx = new ExecutionContext({ ...DEFAULT_EQUATION_LIMITS }), store = new ExpressionStore(ctx);
  const row = parseRow(latex);
  if (row.kind === 'error') throw new Error(row.message);
  const { problem } = lowerEquation(store, { rows: [latex], targets: autoTargets([row]), domain: 'real', limits: { ...DEFAULT_EQUATION_LIMITS }, digits: 6 });
  const outcome = decideEquation(problem);
  if (outcome.kind === 'solved' || outcome.kind === 'empty') verifyEquationOutcome(problem, outcome);
  return { problem, outcome };
}
const valueKinds = (o: ReturnType<typeof decide>['outcome']): string[] => {
  if (o.kind !== 'solved') return [o.kind];
  const walk = (s: { kind: string; points?: readonly (readonly { kind: string }[])[]; cases?: readonly { set: unknown }[] }): string[] =>
    s.kind === 'finite' ? (s.points ?? []).map(p => p[0].kind) : s.kind === 'case-tree' ? (s.cases ?? []).flatMap(c => walk(c.set as never)) : [s.kind];
  return walk(o.set as never);
};

group('shift test and binomial roots', () => {
  it.each([
    ['(x+a)^{13}=b'],
    ['(2x+a)^{5}=b'],
    ['(x+a)^{4}=b'],
    ['x^{13}=b'],
    ['2x^{5}+3=b'],
  ])('%s has closed-form values and verifies', latex => {
    expect(valueKinds(decide(latex).outcome).every(k => k === 'expression')).toBe(true);
  });

  it('keeps a root value when the shifted polynomial is not a binomial', () => {
    expect(valueKinds(decide('(x-a)^3+2(x-a)=b').outcome)).toEqual(['root']);
  });

  it('applies only when at most one parameter remains', () => {
    expect(shiftPlan(decide('(x+a)^{13}=b').problem)?.sub.parameters).toEqual(['b']);
    expect(shiftPlan(decide('x^3+a x^2+b=0').problem)).toBeUndefined();
  });
});

group('zero-product split (factor first)', () => {
  it.each([
    ['(z-a)(z-b)(z-c)(z-d)(z-f)=0', 'real', 5],
    ['(z-a)(z-b)(z-c)(z-d)(z-f)(z-g)(z-h)(z-j)(z-k)(z-l)(z-m)(z-n)(z-p)=0', 'real', 13],
    ['(z-a)(z-b)(z-c)(z-d)(z-f)(z-g)(z-h)(z-j)(z-k)(z-l)(z-m)(z-n)(z-p)=0', 'complex', 13],
  ] as const)('%s over %s: one value per factor, verified', (latex, domain, count) => {
    const ctx = new ExecutionContext({ ...DEFAULT_EQUATION_LIMITS }), store = new ExpressionStore(ctx);
    const row = parseRow(latex);
    if (row.kind === 'error') throw new Error(row.message);
    const { problem } = lowerEquation(store, { rows: [latex], targets: ['z'], domain, limits: { ...DEFAULT_EQUATION_LIMITS }, digits: 6 });
    const outcome = decideEquation(problem);
    expect(outcome.kind).toBe('solved');
    verifyEquationOutcome(problem, outcome);
    expect(outcome.kind === 'solved' && outcome.set.kind === 'finite' ? outcome.set.points.length : -1).toBe(count);
  }, 60_000);

  it('quadratic factors bring their own cases: 2⁴ sign cases for four parameters under roots', () => {
    const { outcome } = decide('(z^2-a)(z-b)(z^2-c)(z-d)(z^2-m)(z-f)(z^2-g)(z-h)=0');
    expect(outcome.kind === 'solved' && outcome.set.kind === 'case-tree' ? outcome.set.cases.length : -1).toBe(16);
  }, 60_000);
});

group('exclusion splitting (denominators beside one equation, several parameters)', () => {
  it.each([
    ['\\frac{z-a}{z-b}=k'],
    ['\\frac{z^2-a}{z-b}=c'],
    ['\\frac{\\frac{z-a}{z+b}}{\\frac{z+c}{z-d}}=k'],
  ])('%s: the complete case list, verified', latex => {
    const { outcome } = decide(latex);
    expect(outcome.kind).toBe('solved');
    expect(outcome.kind === 'solved' ? outcome.set.kind : '').toBe('case-tree');
  }, 60_000);
});

group('outer-power decomposition u(x)ⁿ = b (several parameters)', () => {
  it.each([
    ['\\left(\\frac{z-a}{z-m}\\right)^3=b', 'solved'],
    ['\\left(\\frac{z-a}{z-m}\\right)^2=b', 'solved'],
    // The inner equation u = w is a cubic with two parameters: its typed refusal arrives in seconds.
    ['\\left(\\frac{z^3+z+1}{z-m}\\right)^3=b', 'incomplete-implementation'],
    ['\\left(\\frac{z^4+z+1}{z-m}\\right)^2=b', 'incomplete-implementation'],
  ])('%s', (latex, kind) => {
    expect(decide(latex).outcome.kind).toBe(kind);
  }, 60_000);
});
