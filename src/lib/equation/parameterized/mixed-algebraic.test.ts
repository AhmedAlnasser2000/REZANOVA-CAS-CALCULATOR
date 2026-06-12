import { describe, expect, it } from 'vitest';
import { solveParameterizedMixedAlgebraicEquation } from './mixed-algebraic';

function expectSuccess(latex: string, target: string) {
  const result = solveParameterizedMixedAlgebraicEquation(latex, target);
  if (result.kind !== 'success') {
    throw new Error(`Expected success, received ${result.reason}: ${result.message}`);
  }
  expect(result.kind).toBe('success');
  return result;
}

function expectUnsupported(latex: string, target: string) {
  const result = solveParameterizedMixedAlgebraicEquation(latex, target);
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected unsupported, received ${result.exactLatex}`);
  }
  expect(result.kind).toBe('unsupported');
  return result;
}

describe('solveParameterizedMixedAlgebraicEquation', () => {
  it('solves one square-root carrier mixed with a polynomial target companion', () => {
    const result = expectSuccess('\\sqrt{z+a}+z=b', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('4a+4b+1');
    expect(result.exactSupplementLatex).toContain('b-z\\ge0');
    expect(result.generatedEquationLatex).toEqual(['a+z=b^2+z^2-2bz']);
  });

  it('solves one absolute-value carrier mixed with a polynomial target companion', () => {
    const result = expectSuccess('\\left|z-a\\right|+z=b', 'z');

    expect(result.exactLatex).toContain('z=');
    expect(result.exactLatex).toContain('\\frac{a+b}{2}');
    expect(result.exactSupplementLatex).toContain('b-z\\ge0');
    expect(result.generatedEquationLatex).toEqual(['z-a=b-z', 'z-a=z-b']);
  });

  it('solves two square-root carriers under the branch cap', () => {
    const result = expectSuccess('\\sqrt{z+a}+\\sqrt{z+b}=c', 'z');

    expect(result.exactLatex).toContain('z=');
    expect(result.exactLatex).toContain('c^4');
    expect(result.exactSupplementLatex?.join(' ')).toContain('c-\\sqrt{b+z}\\ge0');
    expect(result.generatedEquationLatex.length).toBeGreaterThanOrEqual(2);
  });

  it('solves mixed absolute-value and square-root carriers', () => {
    const result = expectSuccess('\\left|z-a\\right|+\\sqrt{z+b}=c', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactSupplementLatex?.join(' ')).toContain('c-\\sqrt{b+z}\\ge0');
    expect(result.generatedEquationLatex.length).toBeGreaterThanOrEqual(2);
  });

  it('solves two absolute-value carriers by branching both carriers', () => {
    const result = expectSuccess('\\left|z-a\\right|+\\left|z-b\\right|=c', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('\\frac{a+b+c}{2}');
    expect(result.generatedEquationLatex.length).toBe(4);
  });

  it('preserves denominator exclusions when generated branches stay rational-capped', () => {
    const result = expectSuccess('\\sqrt{z+a}+\\frac{1}{b}=c', 'z');

    expect(result.exactLatex).toContain('z=');
    expect(result.exactSupplementLatex).toContain('b\\ne0');
    expect(result.exactSupplementLatex?.join(' ')).toContain('c-\\frac{1}{b}\\ge0');
  });

  it('stops additive trig, exp-log, and raw adjacent-product mixed cases', () => {
    expect(expectUnsupported('\\sin(z)+\\sqrt{z}=a', 'z').reason).toBe('mixed-carriers');
    expect(expectUnsupported('z+e^z=a', 'z').reason).toBe('no-mixed-algebraic');
    expect(expectUnsupported('\\ln(z)+\\sqrt{z}=a', 'z').reason).toBe('mixed-carriers');
    expect(expectUnsupported('az=1', 'z').reason).toBe('ambiguous-adjacent-product');
  });
});
