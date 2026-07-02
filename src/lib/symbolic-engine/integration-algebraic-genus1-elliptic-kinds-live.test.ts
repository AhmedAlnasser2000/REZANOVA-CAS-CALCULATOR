import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';

function success(latex: string) {
  const result = resolveSymbolicIntegralFromLatex(latex);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected live genus-1 elliptic integration for ${latex}`);
  }
  return result;
}

describe('algebraic genus-1 live Legendre elliptic kinds', () => {
  it('adopts canonical first-kind Legendre templates', () => {
    const result = success('\\frac{1}{\\sqrt{(1-x^2)(1-m*x^2)}}');

    expect(result.strategy).toBe('u-substitution');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toBe('\\operatorname{EllipticF}\\left(\\arcsin(x),m\\right)');
    expect(result.exactSupplementLatex?.join('\n')).toContain('1-x^2');
    expect(result.exactSupplementLatex?.join('\n')).toContain('1-mx^2');
  });

  it('adopts canonical second-kind Legendre templates', () => {
    const result = success('\\sqrt{\\frac{1-m*x^2}{1-x^2}}');

    expect(result.strategy).toBe('u-substitution');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toBe('\\operatorname{EllipticE}\\left(\\arcsin(x),m\\right)');
  });

  it('adopts canonical third-kind Legendre templates', () => {
    const result = success('\\frac{1}{(1-n*x^2)\\sqrt{(1-x^2)(1-m*x^2)}}');

    expect(result.strategy).toBe('u-substitution');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toBe('\\operatorname{EllipticPi}\\left(n,\\arcsin(x),m\\right)');
    expect(result.exactSupplementLatex?.join('\n')).toContain('1-nx^2');
  });

  it('keeps generic exact cubic radicals on the deferred genus-1 boundary', () => {
    const result = resolveSymbolicIntegralFromLatex('\\sqrt{x^3-x}');

    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error).toContain('elliptic/genus-1 analysis');
    }
  });
});
