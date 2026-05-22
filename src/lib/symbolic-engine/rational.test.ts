import { describe, expect, it } from 'vitest';
import { normalizeExactRationalLatex } from './rational';

describe('normalizeExactRationalLatex', () => {
  it('combines exact fractions into a single bounded rational form', () => {
    const result = normalizeExactRationalLatex('\\frac{1}{3}+\\frac{1}{6x}', 'simplify');

    expect(result).not.toBeNull();
    expect(result?.normalizedLatex).toBe('\\frac{2x+1}{6x}');
    expect(result?.exactSupplementLatex).toEqual(['\\text{Exclusions: } x\\ne0']);
    expect(result?.assumptionFacts?.[0]).toMatchObject({
      kind: 'domain-exclusion',
      source: 'rational-function-core',
      trust: 'proved',
      scope: 'result',
      expressionLatex: 'x',
    });
  });

  it('preserves exact exclusions from original denominators', () => {
    const result = normalizeExactRationalLatex('\\frac{1}{x+1}+\\frac{1}{x-1}', 'simplify');

    expect(result).not.toBeNull();
    expect(result?.normalizedLatex).toContain('\\frac{2x}');
    expect(result?.normalizedLatex).toContain('(x-1)(x+1)');
    expect(result?.exactSupplementLatex[0]).toContain('x-1\\ne0');
    expect(result?.exactSupplementLatex[0]).toContain('x+1\\ne0');
  });

  it('factors numerator and denominator separately without cancellation in factor mode', () => {
    const result = normalizeExactRationalLatex('\\frac{x^2-1}{x^2-x}', 'factor');

    expect(result).not.toBeNull();
    expect(result?.normalizedLatex).toBe('\\frac{(x-1)(x+1)}{x(x-1)}');
    expect(result?.exactSupplementLatex[0]).toContain('x\\ne0');
    expect(result?.exactSupplementLatex[0]).toContain('x-1\\ne0');
  });

  it('supports binomial denominator factors in LCD mode', () => {
    const result = normalizeExactRationalLatex('\\frac{1}{x^2+1}+\\frac{1}{x-1}', 'lcd');

    expect(result).not.toBeNull();
    expect(result?.normalizedLatex).toContain('(x-1)(x^2+1)');
    expect(result?.exactSupplementLatex[0]).toContain('x^2+1\\ne0');
    expect(result?.exactSupplementLatex[0]).toContain('x-1\\ne0');
  });

  it('keeps monomial power denominators compact in rendered latex', () => {
    const result = normalizeExactRationalLatex('\\frac{1}{6x^2}+4', 'simplify');

    expect(result).not.toBeNull();
    expect(result?.normalizedLatex).toBe('\\frac{24x^2+1}{6x^{2}}');
    expect(result?.denominatorLatex).toBe('6x^{2}');
  });

  it('keeps higher-power LCD summaries compact instead of repeating the variable', () => {
    const result = normalizeExactRationalLatex('\\frac{1}{3x^5}+\\frac{1}{6x^4}', 'simplify');

    expect(result).not.toBeNull();
    expect(result?.normalizedLatex).toBe('\\frac{x+2}{6x^5}');
    expect(result?.denominatorLatex).toBe('6x^5');
  });

  it('rejects multivariable rational expressions for this bounded milestone', () => {
    const result = normalizeExactRationalLatex('\\frac{1}{x}+\\frac{1}{y}', 'simplify');

    expect(result).toBeNull();
  });

  it('rejects decimal-driven rational inputs outside the exact-safe path', () => {
    const result = normalizeExactRationalLatex('0.5+\\frac{1}{x}', 'simplify');

    expect(result).toBeNull();
  });
});
