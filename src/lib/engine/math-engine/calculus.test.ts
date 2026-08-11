import { describe, expect, it } from 'vitest';
import { runExpressionAction } from '../math-engine';
import { request } from './test-support';

describe('runExpressionAction calculus execution', () => {
  it('evaluates symbolic derivatives in Calculus Core', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\frac{d}{dx}x^2' } },
      'evaluate',
    );

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toBe('2x');
  });

  it('evaluates textbook partial derivatives through the symbolic engine', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\frac{\\partial}{\\partial x}\\left(x^2y+y^3\\right)' } },
      'evaluate',
    );

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('symbolic-engine');
    expect(result.exactLatex?.replaceAll(' ', '')).toContain('2xy');
  });

  it('evaluates derivative-at-point expressions', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\left.\\frac{d}{dx}x^2\\right|_{x=3}' } },
      'evaluate',
    );

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toBe('6');
  });

  it('uses the symbolic derivative engine for chain-rule derivatives', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\frac{d}{dx}\\sin\\left(x^2\\right)' } },
      'evaluate',
    );

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('symbolic-engine');
    expect(result.exactLatex).toContain('2x');
    expect(result.exactLatex).toContain('\\cos');
  });

  it('falls back numerically for supported definite integrals', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\int_0^1 \\sin(x^2) \\, dx' } },
      'evaluate',
    );

    expect(result.error).toBeUndefined();
    expect(result.warnings).toContain('Symbolic integral unavailable; showing a numeric definite integral.');
    expect(Number(result.exactLatex)).toBeCloseTo(0.310268, 4);
    expect(result.detailSections?.[0]?.title).toBe('Integral Method');
    expect(result.detailSections?.[1]?.title).toBe('Interval Safety');
  });

  it('uses exact verified antiderivatives for safe definite integrals', () => {
    const polynomial = runExpressionAction(
      { ...request, document: { latex: '\\int_0^1 2x \\, dx' } },
      'evaluate',
    );
    const inverseTrig = runExpressionAction(
      { ...request, document: { latex: '\\int_0^1 \\frac{1}{1+x^2} \\, dx' } },
      'evaluate',
    );

    expect(polynomial.error).toBeUndefined();
    expect(polynomial.exactLatex).toBe('1');
    expect(polynomial.resultOrigin).toBe('rule-based-symbolic');
    expect(polynomial.detailSections?.[0]?.lines.join(' ')).toContain('verified antiderivative');

    expect(inverseTrig.error).toBeUndefined();
    expect(inverseTrig.resultOrigin).toBe('rule-based-symbolic');
    expect(Number(inverseTrig.approxText)).toBeCloseTo(Math.PI / 4, 5);
  });

  it('blocks unsafe definite integrals before numeric fallback', () => {
    const pole = runExpressionAction(
      { ...request, document: { latex: '\\int_{-1}^{1} \\frac{1}{x} \\, dx' } },
      'evaluate',
    );
    const logEndpoint = runExpressionAction(
      { ...request, document: { latex: '\\int_0^1 \\ln(x) \\, dx' } },
      'evaluate',
    );

    expect(pole.error).toContain('outside the real domain');
    expect(pole.detailSections?.[0]?.title).toBe('Interval Safety');
    expect(logEndpoint.error).toContain('outside the real domain');
  });

  it('uses the rule-based antiderivative layer for supported indefinite integrals', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\int (2x+1)^3 \\, dx' } },
      'evaluate',
    );

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.exactLatex).toContain('2x+1');
  });

  it('uses bounded partial fractions for supported rational indefinite integrals', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\int \\frac{1}{x^2-1} \\, dx' } },
      'evaluate',
    );

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.calculusStrategy).toBe('partial-fractions');
    expect(result.exactLatex).toContain('\\ln');
    expect(result.exactLatex).toContain('x-1');
    expect(result.exactLatex).toContain('x+1');
  });

  it('uses broader substitution and parts rules for stronger indefinite integrals', () => {
    const substitution = runExpressionAction(
      { ...request, document: { latex: '\\int (3x^2+2x)e^{x^3+x^2} \\, dx' } },
      'evaluate',
    );
    const parts = runExpressionAction(
      { ...request, document: { latex: '\\int x^2\\sin(x) \\, dx' } },
      'evaluate',
    );
    const highDegreeParts = runExpressionAction(
      { ...request, document: { latex: '\\int x^5e^x \\, dx' } },
      'evaluate',
    );
    const compositionSubstitution = runExpressionAction(
      { ...request, document: { latex: '\\int 2x\\sqrt{x^2+1} \\, dx' } },
      'evaluate',
    );
    const inverseTrig = runExpressionAction(
      { ...request, document: { latex: '\\int \\frac{1}{\\sqrt{4-x^2}} \\, dx' } },
      'evaluate',
    );

    expect(substitution.error).toBeUndefined();
    expect(['compute-engine', 'rule-based-symbolic']).toContain(substitution.resultOrigin);
    expect(substitution.exactLatex === undefined).toBe(false);
    expect(substitution.exactLatex?.includes('e^{') || substitution.exactLatex?.includes('\\exp')).toBe(true);

    expect(parts.error).toBeUndefined();
    expect(['compute-engine', 'rule-based-symbolic']).toContain(parts.resultOrigin);
    expect(parts.exactLatex).toContain('\\cos');

    expect(highDegreeParts.error).toBeUndefined();
    expect(highDegreeParts.resultOrigin).toBe('rule-based-symbolic');
    expect(highDegreeParts.exactLatex).toMatch(/e\^\{x\}|\\exponentialE\^\{x\}/);

    expect(compositionSubstitution.error).toBeUndefined();
    expect(compositionSubstitution.resultOrigin).toBe('rule-based-symbolic');
    expect(compositionSubstitution.calculusStrategy).toBe('u-substitution');
    expect(compositionSubstitution.exactLatex)
      .toBe('\\frac{2\\left(x^{2}+1\\right)^{\\frac{3}{2}}}{3}+C');

    expect(inverseTrig.error).toBeUndefined();
    expect(['compute-engine', 'rule-based-symbolic']).toContain(inverseTrig.resultOrigin);
    expect(inverseTrig.exactLatex).toContain('\\arcsin');
  });

  it('repairs Calculate editor integral and natural-log paste shapes before evaluating', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\int_{}^{} 2x ln\\left(x^2+1\\right) \\, dx' } },
      'evaluate',
    );

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.calculusStrategy).toBe('u-substitution');
    expect(result.exactLatex).toContain('\\ln');
  });

  it('fails cleanly for unsupported indefinite integrals', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\int \\sin(x^3) \\, dx' } },
      'evaluate',
    );

    expect(result.error).toContain('could not be determined symbolically');

    const substitutionGap = runExpressionAction(
      { ...request, document: { latex: '\\int \\sqrt{x+\\sqrt{x+1}} \\, dx' } },
      'evaluate',
    );
    expect(substitutionGap.error).toContain('could not be determined symbolically');
  });

  it('uses rule-based symbolic resolution for supported known-form limits', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\lim_{x\\to 0} \\frac{\\sin(x)}{x}' } },
      'evaluate',
    );

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.warnings).toEqual([]);
    expect(result.exactLatex).toBe('1');
    expect(result.detailSections?.[0]?.title).toBe('Limit Method');
  });

  it('resolves CALC-LIM3 local rational and equivalent-form limits with details', () => {
    const rational = runExpressionAction(
      { ...request, document: { latex: '\\lim_{x\\to 0^-} \\frac{3x}{x+x^2}' } },
      'evaluate',
    );
    const equivalent = runExpressionAction(
      { ...request, document: { latex: '\\lim_{x\\to 0} \\frac{\\ln(1+x)\\sin(x)}{x^2}' } },
      'evaluate',
    );

    expect(rational.error).toBeUndefined();
    expect(rational.exactLatex).toBe('3');
    expect(rational.resultOrigin).toBe('rule-based-symbolic');
    expect(rational.detailSections?.[0]?.lines.join(' ')).toContain('rational normalizer');
    expect(equivalent.error).toBeUndefined();
    expect(equivalent.exactLatex).toBe('1');
    expect(equivalent.detailSections?.[0]?.lines.join(' ')).toContain('local orders');
  });

  it('evaluates left-hand and right-hand limits through calculus options', () => {
    const left = runExpressionAction(
      {
        ...request,
        document: { latex: '\\lim_{x\\to 0} \\frac{\\left|x\\right|}{x}' },
        calculusOptions: { limitDirection: 'left' },
      },
      'evaluate',
    );
    const right = runExpressionAction(
      {
        ...request,
        document: { latex: '\\lim_{x\\to 0} \\frac{\\left|x\\right|}{x}' },
        calculusOptions: { limitDirection: 'right' },
      },
      'evaluate',
    );

    expect(left.error).toBeUndefined();
    expect(left.exactLatex).toBe('-1');
    expect(left.warnings).toEqual([]);
    expect(right.error).toBeUndefined();
    expect(right.exactLatex).toBe('1');
    expect(right.warnings).toEqual([]);
  });

  it('returns a controlled error for mismatched two-sided limits', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\lim_{x\\to 0} \\frac{\\left|x\\right|}{x}' } },
      'evaluate',
    );

    expect(result.error).toContain('do not agree');
  });

  it('returns a controlled mismatch for two-sided signed asymptotes', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\lim_{x\\to 0} \\frac{1}{x}' } },
      'evaluate',
    );

    expect(result.error).toContain('do not agree');
  });

  it('normalizes free-form directional limit targets before evaluation', () => {
    const right = runExpressionAction(
      { ...request, document: { latex: '\\lim_{x\\to 0^+} \\frac{1}{x}' } },
      'evaluate',
    );
    const left = runExpressionAction(
      { ...request, document: { latex: '\\lim_{x\\to 0^{-}} \\frac{1}{x}' } },
      'evaluate',
    );

    expect(right.error).toBeUndefined();
    expect(right.exactLatex).toBe('\\infty');
    expect(right.resultOrigin).toBe('rule-based-symbolic');
    expect(left.error).toBeUndefined();
    expect(left.exactLatex).toBe('-\\infty');
  });

  it('supports common rational limits at positive infinity', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\lim_{x\\to \\infty} \\left(\\frac{3x^2+1}{2x^2-5}\\right)' } },
      'evaluate',
    );

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.exactLatex).toBe('\\frac{3}{2}');
  });

  it('returns signed infinities for rational dominance at infinity', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\lim_{x\\to -\\infty} \\left(x^2+x\\right)' } },
      'evaluate',
    );
    const rational = runExpressionAction(
      { ...request, document: { latex: '\\lim_{x\\to -\\infty} \\left(\\frac{x^2+1}{x+5}\\right)' } },
      'evaluate',
    );

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toBe('\\infty');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('infinity scale');
    expect(rational.error).toBeUndefined();
    expect(rational.exactLatex).toBe('-\\infty');
  });
});
