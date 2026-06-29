import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';

function success(latex: string, variable = 'x') {
  const result = resolveSymbolicIntegralFromLatex(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('expected integration success');
  }
  return result;
}

describe('symbolic quadratic rational integration', () => {
  it('keeps reciprocal symbolic quadratics readable with explicit arctan multiplication', () => {
    const result = success('\\frac{1}{a x^2+b x+c}');

    expect(result.strategy).toBe('partial-fractions');
    expect(result.exactLatex).toContain('\\cdot \\arctan');
    expect(result.exactSupplementLatex?.join(' ')).toContain('a\\ne0');
    expect(result.exactSupplementLatex?.join(' ')).toContain('4ac-b^{2}>0');
  });

  it('integrates degree-one numerators over one symbolic quadratic denominator', () => {
    const result = success('\\frac{A x+B}{a x^2+b x+c}');

    expect(result.strategy).toBe('partial-fractions');
    expect(result.verification.reason).toContain('linear-numerator decomposition');
    expect(result.exactLatex).toContain('\\ln');
    expect(result.exactLatex).toContain('\\cdot \\arctan');
    expect(result.exactSupplementLatex?.join(' ')).toContain('a\\ne0');
    expect(result.exactSupplementLatex?.join(' ')).toContain('4ac-b^{2}>0');
  });

  it('keeps derivative-numerator symbolic quadratics in the log branch', () => {
    const result = success('\\frac{2a x+b}{a x^2+b x+c}');

    expect(result.strategy).toBe('partial-fractions');
    expect(result.verification.reason).toContain('derivative-numerator');
    expect(result.exactLatex).toContain('\\ln');
    expect(result.exactLatex).not.toContain('\\arctan');
  });

  it('honors arbitrary selected variables for symbolic quadratic numerators', () => {
    const result = success('\\frac{A t+B}{a t^2+b t+c}', 't');

    expect(result.strategy).toBe('partial-fractions');
    expect(result.exactLatex).toContain('at^2+bt+c');
    expect(result.exactLatex).toContain('\\cdot \\arctan');
  });
});
