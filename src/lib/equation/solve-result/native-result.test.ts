import { describe, expect, it } from 'vitest';
import { resolveCanonicalResultForStorage } from '../../result-contract';
import { createEquationFiniteRootSuccessOutcome } from './finite-root-producer';
import { retainCompatibleNativeEquationResult } from './native-result';

describe('Equation native result parity', () => {
  it('retains matching documents and drops them after legacy enrichment changes the result', () => {
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
    expect(retainCompatibleNativeEquationResult(native)).toBe(native);

    const enriched = {
      ...native,
      exactSupplementLatex: ['x\\ne 0'],
    };
    const retained = retainCompatibleNativeEquationResult(enriched);
    if (retained.kind === 'prompt') {
      throw new Error('Expected an Equation result outcome');
    }
    expect(retained.canonicalResult).toBeUndefined();
    expect(resolveCanonicalResultForStorage(retained)).toMatchObject({
      ok: true,
      source: 'compatibility',
    });
  });
});
