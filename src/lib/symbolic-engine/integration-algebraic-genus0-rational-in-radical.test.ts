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

describe('algebraic genus-0 rational-in-radical integration', () => {
  it('keeps derivative-present quadratic radical quotients live', () => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{x}{\\sqrt{x^2+1}}'));

    expect(result.strategy).toBe('u-substitution');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toContain('\\sqrt{x^2+1}');
  });

  it('integrates degree-two numerators over plus quadratic radicals', () => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{x^2}{\\sqrt{x^2+1}}'));

    expect(result.strategy).toBe('u-substitution');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toContain('x\\sqrt{x^2+1}');
    expect(result.exactLatex).toContain('arsinh');
    expect(result.exactSupplementLatex?.join('\n')).toContain('x^2+1\\ge0');
  });

  it('integrates degree-two numerators over circle radicals', () => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{x^2}{\\sqrt{4-x^2}}'));

    expect(result.strategy).toBe('u-substitution');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toContain('x\\sqrt{4-x^2}');
    expect(result.exactLatex).toContain('\\arcsin');
    expect(result.exactSupplementLatex?.join('\n')).toContain('4-x^2\\ge0');
    expect(result.exactSupplementLatex?.join('\n')).not.toContain('t\\ne0');
  });

  it('integrates degree-two numerators over outside quadratic radicals', () => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{x^2}{\\sqrt{x^2-4}}'));

    expect(result.strategy).toBe('u-substitution');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toContain('x\\sqrt{x^2-4}');
    expect(result.exactLatex).toContain('arcosh');
    expect(result.exactSupplementLatex?.join('\n')).toContain('x^2-4\\ge0');
  });

  it('combines bounded polynomial numerators over plus quadratic radicals', () => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{2x^2+3x+4}{\\sqrt{x^2+1}}'));

    expect(result.strategy).toBe('u-substitution');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toContain('x\\sqrt{x^2+1}');
    expect(result.exactLatex).toContain('3\\sqrt{x^2+1}');
    expect(result.exactLatex).toContain('arsinh');
  });

  it('leaves unsupported broader rational-in-radical quotients controlled', () => {
    const result = resolveSymbolicIntegralFromLatex('\\frac{x+\\sqrt{x^2+1}}{x-1}');

    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error).toContain('could not be determined symbolically');
    }
  });
});
