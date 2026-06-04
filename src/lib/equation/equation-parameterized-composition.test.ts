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

  it('solves two-layer nonperiodic selected-target composition chains', () => {
    const rootAbs = expectSuccess('\\sqrt{\\left|z-a\\right|}=b', 'z');
    expect(rootAbs.exactLatex).toContain('z\\in');
    expect(rootAbs.exactLatex).toContain('b^2+a');
    expect(rootAbs.exactLatex).toContain('a-b^2');
    expect(rootAbs.exactSupplementLatex).toContain('b\\ge0');
    const handoff = rootAbs.detailSections.find((section) => section.title === 'Parameterized Composition Handoff');
    const handoffMathParts = handoff?.lineParts?.[0]?.filter((part) => part.kind === 'math') ?? [];
    expect(handoffMathParts).toHaveLength(2);
    expect(handoffMathParts[0]).toHaveProperty('latex', '\\sqrt{\\vert z-a\\vert}');
    expect(handoffMathParts[1]).toHaveProperty('latex', '\\vert z-a\\vert');

    const logAbs = expectSuccess('\\ln\\left(\\left|z-a\\right|\\right)=b', 'z');
    expect(logAbs.exactLatex).toContain('a+\\exponentialE^{b}');
    expect(logAbs.exactLatex).toContain('a-\\exponentialE^{b}');
    expect(logAbs.exactSupplementLatex).toContain('\\vert z-a\\vert>0');

    const expRoot = expectSuccess('e^{\\sqrt{z+a}}=b', 'z');
    expect(expRoot.exactLatex).toBe('z=\\ln(b)^2-a');
    expect(expRoot.exactSupplementLatex).toContain('b>0');
    expect(expRoot.exactSupplementLatex).toContain('\\ln(b)\\ge0');
  });

  it('solves two-layer rational and trig selected-target composition chains', () => {
    const rationalRoot = expectSuccess('\\sqrt{\\frac{1}{z-a}}=b', 'z');
    expect(rationalRoot.exactLatex).toBe('z=\\frac{ab^2+1}{b^2}');
    expect(rationalRoot.exactSupplementLatex).toContain('z-a\\ne0');

    const sineRoot = expectSuccess('\\sin\\left(\\sqrt{z+a}\\right)=b', 'z');
    expect(sineRoot.exactLatex).toContain('(2\\pi n+\\arcsin(b))^2-a');
    expect(sineRoot.exactSupplementLatex).toContain('-1\\le b\\le1');
    expect(sineRoot.exactSupplementLatex).toContain('n\\in\\mathbb{Z}');

    const rootSine = expectSuccess('\\sqrt{\\sin\\left(z+a\\right)}=b', 'z');
    expect(rootSine.exactLatex).toContain('\\arcsin(b^2)');
    expect(rootSine.exactSupplementLatex).toContain('b\\ge0');
    expect(rootSine.exactSupplementLatex).toContain('-1\\le b^2\\le1');
  });

  it('solves capped two-periodic selected-target composition chains with distinct integer parameters', () => {
    const result = expectSuccess('\\sin\\left(\\tan\\left(z\\right)\\right)=a', 'z');

    expect(result.exactLatex).toContain('\\arctan(2\\pi n+\\arcsin(a))');
    expect(result.exactLatex).toContain('\\pi m');
    expect(result.exactSupplementLatex).toContain('n\\in\\mathbb{Z}');
    expect(result.exactSupplementLatex).toContain('m\\in\\mathbb{Z}');
  });

  it('keeps depth-three or additive mixed carriers out of the two-layer slice', () => {
    expect(expectUnsupported('\\sin\\left(\\sqrt{\\left|z-a\\right|}\\right)=b', 'z').reason).toBe('nested-composition');
    expect(expectUnsupported('\\sin(z)+\\sqrt{z}=a', 'z').reason).toBe('mixed-carriers');
  });

  it('rejects target appearances outside the one outer carrier and raw adjacent products', () => {
    expect(expectUnsupported('z+\\sin(z^2)=a', 'z').reason).toBe('target-outside-carrier');
    expect(expectUnsupported('az=1', 'z').reason).toBe('ambiguous-adjacent-product');
  });
});
