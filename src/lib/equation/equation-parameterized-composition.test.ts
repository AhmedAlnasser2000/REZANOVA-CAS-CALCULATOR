import { describe, expect, it } from 'vitest';
import { solveParameterizedCompositionEquation } from './equation-parameterized-composition';

function expectSuccess(latex: string, target: string) {
  const result = solveParameterizedCompositionEquation(latex, target, 'rad');
  if (result.kind !== 'success') {
    throw new Error(`Expected success, received ${result.reason}: ${result.message}`);
  }
  expect(result.kind).toBe('success');
  return result;
}

function expectUnsupported(latex: string, target: string) {
  const result = solveParameterizedCompositionEquation(latex, target, 'rad');
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected unsupported, received ${result.exactLatex}`);
  }
  expect(result.kind).toBe('unsupported');
  return result;
}

describe('solveParameterizedCompositionEquation', () => {
  it('hands square-root compositions to bounded selected-target solvers', () => {
    const result = expectSuccess('\\sqrt{z^2+a}=b', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('4b^2-4a');
    expect(result.exactSupplementLatex).toEqual(['b\\ge0', '4b^2-4a\\ge0']);
    expect(result.generatedEquationLatex).toEqual(['z^2+a=b^2']);
    expect(result.detailSections.some((section) =>
      section.title === 'Parameterized Composition Handoff')).toBe(true);
  });

  it('branches absolute-value compositions', () => {
    const result = expectSuccess('\\left|z^2-a\\right|=b', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('4a+4b');
    expect(result.exactLatex).toContain('4a-4b');
    expect(result.exactSupplementLatex).toContain('b\\ge0');
    expect(result.generatedEquationLatex).toEqual(['z^2-a=b', 'z^2-a=-b']);
  });

  it('hands logarithmic and exponential outer compositions to selected-target solvers', () => {
    const logarithmic = expectSuccess('\\ln\\left(z^2+a\\right)=b', 'z');
    expect(logarithmic.exactLatex).toContain('z\\in');
    expect(logarithmic.exactLatex).toContain('\\exponentialE^{b}');
    expect(logarithmic.exactSupplementLatex).toContain('z^2+a>0');

    const exponential = expectSuccess('e^{z^2+a}=b', 'z');
    expect(exponential.exactLatex).toContain('z\\in');
    expect(exponential.exactLatex).toContain('\\ln(b)');
    expect(exponential.exactSupplementLatex).toContain('b>0');
  });

  it('generates periodic handoff branches for trig compositions', () => {
    const sine = expectSuccess('\\sin\\left(z^2+a\\right)=b', 'z');

    expect(sine.exactLatex).toContain('z\\in');
    expect(sine.exactLatex).toContain('\\arcsin(b)');
    expect(sine.generatedEquationLatex.join(' ')).toContain('2\\pi n');
    expect(sine.exactSupplementLatex).toContain('-1\\le b\\le1');
    expect(sine.exactSupplementLatex).toContain('n\\in\\mathbb{Z}');

    const cosine = expectSuccess('\\cos\\left((z-a)(z-b)\\right)=c', 'z');
    expect(cosine.exactLatex).toContain('z\\in');
    expect(cosine.exactLatex).toContain('\\arccos(c)');
    expect(cosine.exactSupplementLatex).toContain('-1\\le c\\le1');
  });

  it('keeps nested or mixed carriers out of the one-layer slice', () => {
    expect(expectUnsupported('\\sqrt{\\left|z-a\\right|}=b', 'z').reason).toBe('mixed-carriers');
    expect(expectUnsupported('\\sin(z)+\\sqrt{z}=a', 'z').reason).toBe('mixed-carriers');
    expect(expectUnsupported('\\sin(\\sqrt{z+a})=b', 'z').reason).toBe('mixed-carriers');
  });

  it('rejects target appearances outside the one outer carrier and raw adjacent products', () => {
    expect(expectUnsupported('z+\\sin(z^2)=a', 'z').reason).toBe('target-outside-carrier');
    expect(expectUnsupported('az=1', 'z').reason).toBe('ambiguous-adjacent-product');
  });
});
