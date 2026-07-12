import { describe, expect, it } from 'vitest';
import { resolveCanonicalResultForStorage } from '../../result-contract';
import { createEquationFiniteRootSuccessOutcome } from './finite-root-producer';
import { requireNativeEquationResult } from './native-result';

describe('Equation native result parity', () => {
  it('retains matching documents and rejects stale legacy enrichment', () => {
    const native = createEquationFiniteRootSuccessOutcome({
      title: 'Solve',
      exactLatex: 'x=1',
      canonicalMath: {
        version: 1,
        canonicalLatex: 'x=1',
        mathJson: ['Equal', 'x', 1],
      },
      warnings: [],
      resultOrigin: 'symbolic',
    });
    expect(requireNativeEquationResult(native)).toBe(native);

    const enriched = {
      ...native,
      exactSupplementLatex: ['x\\ne 0'],
    };
    expect(resolveCanonicalResultForStorage(enriched)).toMatchObject({
      ok: false,
      omissionReason: 'invalid',
      message: 'Native canonical result does not match the typed compatibility projection.',
    });
    expect(() => requireNativeEquationResult(enriched)).toThrow(
      'missing native canonical authority',
    );
  });
});
