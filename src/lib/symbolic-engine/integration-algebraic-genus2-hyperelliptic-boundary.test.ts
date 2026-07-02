import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { tryAlgebraicHyperellipticBoundaryStop } from './integration/algebraic-genus1/hyperelliptic-boundary';

function error(latex: string, variable = 'x') {
  const result = resolveSymbolicIntegralFromLatex(latex, variable);
  expect(result.kind).toBe('error');
  if (result.kind !== 'error') {
    throw new Error(`expected hyperelliptic boundary for ${latex}`);
  }
  return result;
}

describe('algebraic genus-2 and hyperelliptic boundary stops', () => {
  it('classifies square-root degree-five radicals as hyperelliptic boundary cases', () => {
    const result = error('\\sqrt{x^5+x+1}');

    expect(result.error).toContain('hyperelliptic/genus-2');
    expect(result.candidate.controlledFailureClass).toBe('unsupported-family');
    expect(result.candidate.readinessNotes.join('\n')).toContain('hyperelliptic');
    expect(result.candidate.requiredPrerequisites).toContain('resultants');
  });

  it('classifies reciprocal degree-five radicals as hyperelliptic boundary cases', () => {
    const result = error('\\frac{1}{\\sqrt{x^5+x+1}}');

    expect(result.error).toContain('degree-5-or-higher');
    expect(result.candidate.readinessNotes.join('\n')).toContain('genus-2 layer');
  });

  it('classifies higher-degree radicals even when the polynomial parser reaches its cap first', () => {
    const result = error('\\sqrt{x^6+x+1}');

    expect(result.error).toContain('hyperelliptic/genus-2');
    expect(result.candidate.verificationStatus).toBe('not-attempted');
  });

  it('preserves selected variables on the boundary route', () => {
    const boundary = tryAlgebraicHyperellipticBoundaryStop(
      ['Sqrt', ['Add', ['Power', 't', 5], 't', 1]],
      't',
    );

    expect(boundary?.error).toContain('hyperelliptic/genus-2');
    expect(boundary?.candidate.readinessNotes.join('\n')).toContain('radicand beyond cubic/quartic');
  });

  it('does not steal existing genus-1 reciprocal radical successes', () => {
    const result = resolveSymbolicIntegralFromLatex('\\frac{1}{\\sqrt{x^3-x}}');

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.exactLatex).toContain('EllipticF');
      expect(result.strategy).toBe('u-substitution');
    }
  });

  it('keeps deferred cubic radicals on the genus-1 boundary rather than genus-2', () => {
    const result = error('\\sqrt{x^3-x}');

    expect(result.error).toContain('elliptic/genus-1 analysis');
    expect(result.error).not.toContain('hyperelliptic');
  });
});
