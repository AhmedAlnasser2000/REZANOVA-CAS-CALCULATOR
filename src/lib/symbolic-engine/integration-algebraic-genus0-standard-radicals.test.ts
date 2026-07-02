import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';

type IntegrationResult = ReturnType<typeof resolveSymbolicIntegralFromLatex>;
type IntegrationSuccess = Extract<IntegrationResult, { kind: 'success' }>;

function expectIntegrationSuccess(result: IntegrationResult): IntegrationSuccess {
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('Expected integration success');
  }
  return result;
}

describe('algebraic genus-0 standard radical integration', () => {
  it('makes affine radical families live through u-substitution', () => {
    const radical = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\sqrt{x+1}'));
    expect(radical.strategy).toBe('u-substitution');
    expect(radical.verification.status).toBe('verified-exact');
    expect(radical.exactLatex).toContain('^{\\frac{3}{2}}');

    const reciprocal = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{1}{\\sqrt{x+1}}'));
    expect(reciprocal.strategy).toBe('u-substitution');
    expect(reciprocal.verification.status).toBe('verified-exact');
    expect(reciprocal.exactLatex).toContain('2\\sqrt{x+1}');
  });

  it('makes plus and outside quadratic reciprocal radicals live through u-substitution', () => {
    const plus = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{1}{\\sqrt{x^2+1}}'));
    expect(plus.strategy).toBe('u-substitution');
    expect(plus.verification.status).toBe('verified-exact');
    expect(plus.exactLatex).toContain('arsinh');

    const outside = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{1}{\\sqrt{x^2-4}}'));
    expect(outside.strategy).toBe('u-substitution');
    expect(outside.verification.status).toBe('verified-exact');
    expect(outside.exactLatex).toContain('arcosh');
  });

  it('keeps inverse-trig precedence for reciprocal circle radical primitives', () => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{1}{\\sqrt{4-x^2}}'));
    expect(result.strategy).toBe('inverse-trig');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toContain('\\arcsin');
  });
});
