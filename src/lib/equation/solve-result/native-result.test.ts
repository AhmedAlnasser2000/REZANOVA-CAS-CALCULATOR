import { describe, expect, it } from 'vitest';
import { createEquationFiniteRootSuccessOutcome } from './finite-root-producer';
import { requireNativeEquationResult } from './native-result';

describe('Equation native result parity', () => {
  it('fails optional MathJSON proof closed without changing the visible result', () => {
    const native = createEquationFiniteRootSuccessOutcome({
      title: 'Solve',
      exactLatex: 'x=1',
      primaryMath: {
        canonicalLatex: 'x=1',
        mathJson: ['Equal', 'x', 2],
      },
      warnings: [],
      resultOrigin: 'symbolic',
      mathJsonRouteId: 'equation.linear',
      mathJsonSource: 'native-result-test:mismatched-tree',
    });

    expect(native.exactLatex).toBe('x=1');
    expect(native.primaryMath).toBeUndefined();
    expect(native.canonicalResult?.primaryMath).toEqual({ canonicalLatex: 'x=1' });
  });

  it('retains matching documents without consulting stale draft enrichment', () => {
    const native = createEquationFiniteRootSuccessOutcome({
      title: 'Solve',
      exactLatex: 'x=1',
      primaryMath: {
        canonicalLatex: 'x=1',
        mathJson: ['Equal', 'x', 1],
      },
      warnings: [],
      resultOrigin: 'symbolic',
      mathJsonRouteId: 'equation.linear',
      mathJsonSource: 'native-result-test',
    });
    expect(requireNativeEquationResult(native)).toStrictEqual(native);

    const enriched = {
      ...native,
      exactSupplementLatex: ['x\\ne 0'],
    };
    expect(requireNativeEquationResult(enriched)).toMatchObject({
      canonicalResult: native.canonicalResult,
    });
  });
});
