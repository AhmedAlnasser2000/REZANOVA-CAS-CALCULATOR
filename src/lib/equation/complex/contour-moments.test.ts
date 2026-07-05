import { describe, expect, it } from 'vitest';
import { createComplexNumericEvaluator } from './numeric-evaluator';
import { computeComplexContourMomentSeeds } from './contour-moments';
import { findComplexNewtonCandidates } from './seed-grid-newton';

describe('Complex contour moment seeds', () => {
  it('generates Delves-Lyness seeds for two roots in a safe rectangle', () => {
    const evaluator = createComplexNumericEvaluator({ expressionLatex: 'z^2+1=0', target: 'z' });
    const region = { reMin: -2, reMax: 2, imMin: -2, imMax: 2 };

    const moments = computeComplexContourMomentSeeds({
      evaluator,
      region,
      rootCount: 2,
      samplesPerEdge: 96,
    });

    expect(moments.kind).toBe('seeds');
    if (moments.kind !== 'seeds') {
      throw new Error('Expected contour moments to generate seeds');
    }
    expect(moments.seeds).toHaveLength(2);
    expect(moments.momentCountError).toBeLessThan(1e-2);
    const roundedImaginary = moments.seeds
      .map((seed) => Math.round(seed.im))
      .sort((left, right) => left - right);
    expect(roundedImaginary).toEqual([-1, 1]);

    const refined = findComplexNewtonCandidates({
      evaluator,
      region,
      includeDefaultSeeds: false,
      contourMomentSeeds: moments.seeds,
    });
    expect(refined.diagnostics.contourMomentSeedCount).toBe(2);
    expect(refined.candidates).toHaveLength(2);
    expect(refined.candidates.every((candidate) => candidate.source === 'contour-moment')).toBe(true);
  });

  it('stops honestly when the requested cell has too many roots for this moment seed slice', () => {
    const evaluator = createComplexNumericEvaluator({ expressionLatex: String.raw`\sin(z)=0`, target: 'z' });

    const moments = computeComplexContourMomentSeeds({
      evaluator,
      region: { reMin: -4, reMax: 4, imMin: -1, imMax: 1 },
      rootCount: 3,
    });

    expect(moments.kind).toBe('inconclusive');
    if (moments.kind !== 'inconclusive') {
      throw new Error('Expected contour moments to stop for three roots');
    }
    expect(moments.reason).toContain('one or two roots');
  });
});
