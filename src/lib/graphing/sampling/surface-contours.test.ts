import { describe, expect, it } from 'vitest';
import { graphSurfaceContourStep } from './surface-contours';

describe('graphSurfaceContourStep', () => {
  it('picks a 1/2/5 step giving about six bands, and none for flat surfaces', () => {
    expect(graphSurfaceContourStep(-1, 1)).toBeCloseTo(0.5);
    expect(graphSurfaceContourStep(0, 200)).toBe(50);
    expect(graphSurfaceContourStep(0, 6)).toBe(1);
    expect(graphSurfaceContourStep(3, 3)).toBe(0);
  });
});
