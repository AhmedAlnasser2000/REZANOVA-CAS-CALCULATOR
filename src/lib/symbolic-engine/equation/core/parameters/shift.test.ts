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
