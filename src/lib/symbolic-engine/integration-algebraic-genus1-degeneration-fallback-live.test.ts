import { describe, expect, it } from 'vitest';
import { tryAlgebraicFunctionFieldOrchestrator } from './integration/algebraic-function-field-orchestrator';
import { resolveSymbolicIntegralFromLatex } from './integration';

function success(latex: string) {
  const result = resolveSymbolicIntegralFromLatex(latex);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected degeneration fallback for ${latex}`);
  }
  return result;
}

describe('algebraic genus-1 degeneration fallback live route', () => {
  it('collapses perfect-square quartic radicals with nonnegative square factors to genus-0 polynomial answers', () => {
    const shifted = success('\\sqrt{x^4+2*x^2+1}');
    expect(shifted.strategy).toBe('u-substitution');
    expect(shifted.verification.status).toBe('verified-exact');
    expect(shifted.verification.reason).toContain('genus-0 degeneration collapse');
    expect(shifted.exactLatex).toBe('\\frac{x^{3}}{3}+x');
    expect(shifted.exactSupplementLatex?.join('\n')).toContain('x^2+1\\ge0');
    expect(shifted.detailSections?.some((section) =>
      section.title === 'Genus-1 Degeneration Fallback')).toBe(true);

    const monomial = success('\\sqrt{x^4}');
    expect(monomial.exactLatex).toBe('\\frac{x^{3}}{3}');
    expect(monomial.exactSupplementLatex?.join('\n')).toContain('x^2\\ge0');
  });

  it('collapses reciprocal perfect-square quartic radicals to rational genus-0 answers', () => {
    const shifted = success('\\frac{1}{\\sqrt{x^4+2*x^2+1}}');
    expect(shifted.strategy).toBe('partial-fractions');
    expect(shifted.verification.status).toBe('verified-exact');
    expect(shifted.exactLatex).toBe('\\arctan\\left(x\\right)');
    expect(shifted.exactSupplementLatex?.join('\n')).toContain('x^2+1\\ne0');

    const monomial = success('\\frac{1}{\\sqrt{x^4}}');
    expect(monomial.exactLatex).toBe('-\\frac{1}{x}');
    expect(monomial.exactSupplementLatex?.join('\n')).toContain('x^2\\ne0');
  });

  it('keeps branch-changing perfect-square quartics on the controlled boundary', () => {
    const result = resolveSymbolicIntegralFromLatex('\\sqrt{x^4-2*x^2+1}');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error).toContain('elliptic/genus-1 analysis');
    }
  });

  it('exposes the fallback as an internal algebraic function-field family', () => {
    const result = tryAlgebraicFunctionFieldOrchestrator(
      ['Sqrt', ['Add', ['Power', 'x', 4], ['Multiply', 2, ['Power', 'x', 2]], 1]],
      'x',
    );

    expect(result?.family).toBe('genus1-degeneration-fallback');
    expect(result?.resolution.kind).toBe('success');
  });
});
