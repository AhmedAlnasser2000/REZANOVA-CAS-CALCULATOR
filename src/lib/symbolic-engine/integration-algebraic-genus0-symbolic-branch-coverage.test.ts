import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';

type IntegrationResult = ReturnType<typeof resolveSymbolicIntegralFromLatex>;
type IntegrationSuccess = Extract<IntegrationResult, { kind: 'success' }>;

function success(latex: string, variable = 'x'): IntegrationSuccess {
  const result = resolveSymbolicIntegralFromLatex(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected integration success for ${latex}`);
  }
  return result;
}

function compact(value: string | undefined) {
  return (value ?? '').replace(/\s+/g, '');
}

describe('algebraic genus-0 symbolic branch coverage', () => {
  it('makes symbolic affine radical families live with explicit facts', () => {
    const radical = success('\\sqrt{a*x+b}');
    expect(radical.strategy).toBe('u-substitution');
    expect(radical.verification.status).toBe('verified-exact');
    expect(compact(radical.exactLatex)).toContain('\\frac{2\\left(ax+b\\right)^{\\frac{3}{2}}}{3a}');
    expect(compact(radical.exactSupplementLatex?.join('\n'))).toContain('a\\ne0');
    expect(compact(radical.exactSupplementLatex?.join('\n'))).toContain('ax+b\\ge0');

    const reciprocal = success('\\frac{1}{\\sqrt{a*x+b}}');
    expect(reciprocal.strategy).toBe('u-substitution');
    expect(reciprocal.verification.status).toBe('verified-exact');
    expect(reciprocal.exactLatex).toContain('\\sqrt{ax+b}');
    expect(compact(reciprocal.exactLatex)).toContain('\\frac{2}{a}\\sqrt{ax+b}');
    expect(compact(reciprocal.exactLatex)).not.toContain('2\\frac{1}{a}');
    expect(compact(reciprocal.exactSupplementLatex?.join('\n'))).toContain('a\\ne0');
  });

  it('makes centered symbolic circle radical variants live', () => {
    const reciprocal = success('\\frac{1}{\\sqrt{a^2-x^2}}');
    expect(reciprocal.strategy).toBe('u-substitution');
    expect(reciprocal.verification.status).toBe('verified-exact');
    expect(reciprocal.exactLatex).toContain('\\arcsin');
    expect(compact(reciprocal.exactSupplementLatex?.join('\n'))).toContain('a^2>0');
    expect(compact(reciprocal.exactSupplementLatex?.join('\n'))).toContain('a^2-x^2\\ge0');

    const radical = success('\\sqrt{a^2-x^2}');
    expect(radical.strategy).toBe('u-substitution');
    expect(radical.verification.status).toBe('verified-exact');
    expect(radical.exactLatex).toContain('\\arcsin');
  });

  it('makes centered symbolic plus and outside radical variants live', () => {
    const plus = success('\\sqrt{x^2+a^2}');
    expect(plus.strategy).toBe('u-substitution');
    expect(plus.verification.status).toBe('verified-exact');
    expect(plus.exactLatex).toContain('arsinh');
    expect(compact(plus.exactSupplementLatex?.join('\n'))).toContain('a^2>0');

    const outside = success('\\sqrt{x^2-a^2}');
    expect(outside.strategy).toBe('u-substitution');
    expect(outside.verification.status).toBe('verified-exact');
    expect(outside.exactLatex).toContain('arcosh');
    expect(compact(outside.exactSupplementLatex?.join('\n'))).toContain('x^2-a^2\\ge0');
  });

  it('keeps general symbolic completed-square quadratics deferred', () => {
    const reciprocal = resolveSymbolicIntegralFromLatex('\\frac{1}{\\sqrt{a*x^2+b*x+c}}');
    expect(reciprocal.kind).toBe('error');

    const radical = resolveSymbolicIntegralFromLatex('\\sqrt{a*x^2+b*x+c}');
    expect(radical.kind).toBe('error');
  });
});
