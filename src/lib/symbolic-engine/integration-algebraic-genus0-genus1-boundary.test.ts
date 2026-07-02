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

describe('algebraic genus-0 genus-1 boundary', () => {
  it('reports cubic and quartic radical curves as deferred elliptic/genus-1 territory', () => {
    const cubic = expectIntegrationError(resolveSymbolicIntegralFromLatex('\\sqrt{x^3+x+1}'));
    expect(cubic.error).toContain('genus-1');
    expect(cubic.error).toContain('elliptic');
    expect(cubic.candidate.blockedPrerequisites).toContain('risch-liouville');
    expect(cubic.candidate.readinessNotes.join(' ')).toContain('cubic or quartic square-root curve');

    const reciprocalCubic = expectIntegrationError(
      resolveSymbolicIntegralFromLatex('\\frac{1}{\\sqrt{x^3-x+1}}'),
    );
    expect(reciprocalCubic.error).toContain('genus-1');
    expect(reciprocalCubic.error).toContain('elliptic');

    const quartic = expectIntegrationError(resolveSymbolicIntegralFromLatex('\\sqrt{x^4+x+1}'));
    expect(quartic.error).toContain('genus-1');
    expect(quartic.error).toContain('elliptic');
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
