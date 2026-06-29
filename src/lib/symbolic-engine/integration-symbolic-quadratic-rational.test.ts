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

function error(latex: string, variable = 'x') {
  const result = resolveSymbolicIntegralFromLatex(latex, variable);
  expect(result.kind).toBe('error');
  if (result.kind !== 'error') {
    throw new Error('expected integration error');
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

  it('keeps symbolic quadratic branch facts generic and visible', () => {
    const result = success('\\frac{A x+B}{a x^2+b x+c}');
    const facts = result.exactSupplementLatex?.join(' ') ?? '';

    expect(facts).toContain('a\\ne0');
    expect(facts).toContain('4ac-b^{2}>0');
    expect(facts).not.toContain('4ac-b^{2}<0');
    expect(facts).not.toContain('4ac-b^{2}=0');
  });

  it('preserves exact-rational branch precedence outside the generic symbolic branch', () => {
    const reducible = success('\\frac{1}{x^2-1}');
    expect(reducible.strategy).toBe('partial-fractions');
    expect(reducible.exactLatex).toContain('\\ln');
    expect(reducible.exactLatex).not.toContain('\\arctan');

    const positive = success('\\frac{1}{x^2+1}');
    expect(positive.strategy).toBe('inverse-trig');
    expect(positive.exactLatex).toContain('\\arctan');
  });

  it('stops symbolic quadratic shapes outside the power-one branch baseline', () => {
    expect(error('\\frac{A x+B}{(a x^2+b x+c)^2}').candidate.method).toBe('unsupported');
    expect(error('\\frac{A x+B}{a x^2+b x+c+d x^3}').candidate.method).toBe('unsupported');
  });
});
