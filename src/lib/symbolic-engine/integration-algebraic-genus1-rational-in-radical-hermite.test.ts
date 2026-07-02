import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';

function success(latex: string) {
  const result = resolveSymbolicIntegralFromLatex(latex);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected genus-1 rational-in-radical Hermite integration for ${latex}`);
  }
  return result;
}

describe('algebraic genus-1 rational-in-radical Hermite reduction', () => {
  it('reduces even numerators over the first-kind Legendre radical into F/E basis', () => {
    const result = success('\\frac{x^2}{\\sqrt{(1-x^2)(1-m*x^2)}}');

    expect(result.strategy).toBe('u-substitution');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.verification.reason).toContain('Hermite reduction');
    expect(result.exactLatex).toContain('EllipticF');
    expect(result.exactLatex).toContain('EllipticE');
    expect(result.exactSupplementLatex?.join('\n')).toContain('m\\ne0');
  });

  it('handles exact-rational constant plus even numerator terms over the first-kind radical', () => {
    const result = success('\\frac{1+2*x^2}{\\sqrt{(1-x^2)(1-m*x^2)}}');

    expect(result.exactLatex).toContain('EllipticF');
    expect(result.exactLatex).toContain('EllipticE');
    expect(result.exactSupplementLatex?.join('\n')).toContain('1-mx^2');
  });

  it('reduces even numerators over the third-kind Legendre denominator into Pi/F basis', () => {
    const result = success('\\frac{x^2}{(1-n*x^2)\\sqrt{(1-x^2)(1-m*x^2)}}');

    expect(result.strategy).toBe('u-substitution');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toContain('EllipticPi');
    expect(result.exactLatex).toContain('EllipticF');
    expect(result.exactSupplementLatex?.join('\n')).toContain('n\\ne0');
    expect(result.exactSupplementLatex?.join('\n')).toContain('1-nx^2');
  });

  it('leaves odd numerator and generic cubic radical cases outside this Hermite slice', () => {
    const odd = resolveSymbolicIntegralFromLatex('\\frac{x}{\\sqrt{(1-x^2)(1-m*x^2)}}');
    const cubic = resolveSymbolicIntegralFromLatex('\\sqrt{x^3-x}');

    expect(odd.kind).toBe('error');
    expect(cubic.kind).toBe('error');
  });
});
