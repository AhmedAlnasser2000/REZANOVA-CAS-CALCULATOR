import { describe, expect, it } from 'vitest';
import { createEquationSelectedTargetSearchTrace } from '../equation-target-shape';
import { solveParameterizedCarrierEliminationEquation } from './carrier-elimination';

function expectSuccess(latex: string, target: string) {
  const result = solveParameterizedCarrierEliminationEquation(latex, target);
  if (result.kind !== 'success') {
    throw new Error(`Expected success, received ${result.reason}: ${result.message}`);
  }
  expect(result.kind).toBe('success');
  return result;
}

function expectUnsupported(latex: string, target: string) {
  const result = solveParameterizedCarrierEliminationEquation(latex, target);
  expect(result.kind).toBe('unsupported');
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected unsupported, received ${result.exactLatex}`);
  }
  return result;
}

describe('solveParameterizedCarrierEliminationEquation', () => {
  it('solves quadratic equations in algebraic selected-target carriers', () => {
    const result = expectSuccess('(x^2+a)^2-5(x^2+a)+4=0', 'x');

    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('\\sqrt{16-4a}');
    expect(result.exactLatex).toContain('\\sqrt{4-4a}');
    expect(result.exactSupplementLatex).toEqual(['16-4a\\ge0', '4-4a\\ge0']);
    expect(result.branchEquations).toEqual(['x^2+a=4', 'x^2+a=1']);
    expect(result.detailSections.flatMap((section) => section.lines).join(' '))
      .toContain('explicit algebraic carrier');
  });

  it('normalizes affine-power carriers before solving the reduced equation', () => {
    const result = expectSuccess('(x+a)^4-5(x+a)^2+4=0', 'x');

    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toMatch(/2-a|-a\+2/);
    expect(result.exactLatex).toMatch(/1-a|-a\+1/);
    expect(result.exactLatex).toMatch(/\(-1\)-a|-a-1/);
    expect(result.exactLatex).toMatch(/\(-2\)-a|-a-2/);
    expect(result.branchEquations).toEqual(['(a+x)^2=4', '(a+x)^2=1']);
    expect(result.detailSections.flatMap((section) => section.lines).join(' '))
      .toContain('Total selected-target degree: 4');
  });

  it('back-substitutes square-root carriers through existing carrier branches', () => {
    const result = expectSuccess('\\left(\\sqrt{x+a}\\right)^2-5\\sqrt{x+a}+4=0', 'x');

    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('16-a');
    expect(result.exactLatex).toContain('1-a');
    expect(result.branchEquations).toEqual(['\\sqrt{a+x}=4', '\\sqrt{a+x}=1']);
  });

  it('records generated branch trace evidence for carrier back-substitution', () => {
    const trace = createEquationSelectedTargetSearchTrace();
    const result = solveParameterizedCarrierEliminationEquation('(x^2+a)^2-5(x^2+a)+4=0', 'x', {
      searchTrace: trace.record,
    });

    expect(result.kind).toBe('success');
    expect(trace.events).toContainEqual({
      kind: 'family-attempted',
      phase: 'generated-handoff',
      family: 'polynomial',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'polynomial',
    });
  });

  it('keeps symbolic coefficients and transcendental carriers out of v1', () => {
    const symbolic = expectUnsupported('(x^2+a)^2-b*(x^2+a)+4=0', 'x');
    const periodic = expectUnsupported('\\sin\\left(x\\right)^2-5\\sin\\left(x\\right)+4=0', 'x');

    expect(symbolic.reason).toBe('symbolic-coefficients');
    expect(periodic.reason).toBe('unsupported-carrier');
  });

  it('keeps carrier elimination bounded by total selected-target degree', () => {
    const result = expectUnsupported('(x^7+a)^2-5(x^7+a)+4=0', 'x');

    expect(result.reason).toBe('degree-limit');
    expect(result.message).toContain('12');
  });
});
