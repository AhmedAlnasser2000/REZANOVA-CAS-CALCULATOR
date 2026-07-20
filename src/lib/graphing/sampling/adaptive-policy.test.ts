import { describe, expect, it } from 'vitest';
import {
  deriveGraphAdaptiveQualityPolicy,
  graphViewportReuseKind,
  overscannedGraphViewport,
} from './adaptive-policy';

const viewport = {
  coordinateSystem: 'cartesian' as const,
  xMin: -10,
  xMax: 10,
  yMin: -5,
  yMax: 5,
};

describe('Graph adaptive viewport sampling policy', () => {
  it('derives the locked CSS-pixel quality ladder without DPR multiplication', () => {
    const movement = { panVelocityX: 0, panVelocityY: 0, zoomRatio: 1 };
    expect(deriveGraphAdaptiveQualityPolicy({ quality: 'preview', cssSize: { width: 1_440, height: 940 }, movement, route: 'explicit' })).toMatchObject({
      seedSpacingPixels: 32,
      midpointTolerancePixels: 1.5,
      implicitCellPixels: 32,
    });
    expect(deriveGraphAdaptiveQualityPolicy({ quality: 'settled', cssSize: { width: 1_440, height: 940 }, movement, route: 'implicit' })).toMatchObject({
      seedSpacingPixels: 16,
      midpointTolerancePixels: 0.35,
      implicitCellPixels: 12,
    });
    expect(deriveGraphAdaptiveQualityPolicy({ quality: 'polish', cssSize: { width: 1_440, height: 940 }, movement, route: 'parametric' })).toMatchObject({
      midpointTolerancePixels: 0.2,
      implicitCellPixels: 6,
    });
  });

  it('bounds predictive overscan toward motion and resets cache reuse after major view changes', () => {
    const predicted = overscannedGraphViewport(viewport, {
      panVelocityX: 2_000,
      panVelocityY: 0,
      zoomRatio: 1,
    });
    expect(predicted.xMin).toBeCloseTo(-12.4);
    expect(predicted.xMax).toBeCloseTo(17);
    expect(graphViewportReuseKind(predicted, { ...viewport, xMin: -9, xMax: 11 })).toBe('reused');
    expect(graphViewportReuseKind(viewport, { ...viewport, xMin: -30, xMax: 30 })).toBe('miss');
  });
});
