import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';

type IntegrationResult = ReturnType<typeof resolveSymbolicIntegralFromLatex>;
type IntegrationError = Extract<IntegrationResult, { kind: 'error' }>;

function expectIntegrationError(result: IntegrationResult): IntegrationError {
  expect(result.kind).toBe('error');
  if (result.kind !== 'error') {
    throw new Error('Expected integration error');
  }
  return result;
}

function expectGenusBoundary(result: IntegrationResult) {
  if (result.kind === 'success') {
    expect(JSON.stringify(result)).toContain('elliptic');
    expect(result.exactLatex).toContain('\\operatorname{Elliptic');
    return;
  }
  expect(result.error).toContain('genus-1');
  expect(result.error).toContain('elliptic');
}

describe('algebraic genus-0 genus-1 boundary', () => {
  it('classifies cubic and quartic radical curves as bounded elliptic/genus-1 territory', () => {
    expectGenusBoundary(resolveSymbolicIntegralFromLatex('\\sqrt{x^3+x+1}'));

    expectGenusBoundary(
      resolveSymbolicIntegralFromLatex('\\frac{1}{\\sqrt{x^3-x+1}}'),
    );

    expectGenusBoundary(resolveSymbolicIntegralFromLatex('\\sqrt{x^4+x+1}'));
  });

  it('keeps non-genus-1 radical stops and live genus-0 families on their existing paths', () => {
    const nested = expectIntegrationError(resolveSymbolicIntegralFromLatex('\\sqrt{x+\\sqrt{x+1}}'));
    expect(nested.error).toContain('could not be determined symbolically');
    expect(nested.error).not.toContain('genus-1');

    const affine = resolveSymbolicIntegralFromLatex('\\sqrt{x+1}');
    expect(affine.kind).toBe('success');
    if (affine.kind === 'success') {
      expect(affine.strategy).toBe('u-substitution');
      expect(affine.verification.status).toBe('verified-exact');
    }
  });
});
