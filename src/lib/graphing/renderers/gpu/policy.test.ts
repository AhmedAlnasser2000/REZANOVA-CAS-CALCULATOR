import { describe, expect, it } from 'vitest';
import {
  GRAPH_GPU_MIN_RENDER_SCALE, graphGpuFrameCostMs, graphGpuViewportIsFloat32Safe, nextGraphGpuRenderScale,
} from './policy';

describe('Graph GPU policies', () => {
  it('keeps ordinary and far-from-origin views on the GPU but hands float32-unsafe depths to the CPU', () => {
    const size = { width: 1000, height: 600 };
    expect(graphGpuViewportIsFloat32Safe({ xMin: -10, xMax: 10, yMin: -6, yMax: 6 }, size)).toBe(true);
    expect(graphGpuViewportIsFloat32Safe({ xMin: 1e-6, xMax: 2e-6, yMin: -5e-7, yMax: 5e-7 }, size)).toBe(true);
    // Deep zoom far from the origin: each pixel spans only a few float32 steps.
    expect(graphGpuViewportIsFloat32Safe({ xMin: 1000, xMax: 1000.001, yMin: 0, yMax: 0.0006 }, size)).toBe(false);
    expect(graphGpuViewportIsFloat32Safe({ xMin: 0, xMax: 0.0006, yMin: 5000, yMax: 5000.0006 }, size)).toBe(false);
    expect(graphGpuViewportIsFloat32Safe({ xMin: 1000, xMax: 1001, yMin: 0, yMax: 0.6 }, size)).toBe(true);
  });

  it('lowers render scale only while interacting and recovers when frames are cheap', () => {
    expect(nextGraphGpuRenderScale({ scale: 0.5, interacting: false }, 50)).toBe(1);
    expect(nextGraphGpuRenderScale({ scale: 1, interacting: true }, 30)).toBeCloseTo(0.8);
    expect(nextGraphGpuRenderScale({ scale: GRAPH_GPU_MIN_RENDER_SCALE, interacting: true }, 90)).toBe(GRAPH_GPU_MIN_RENDER_SCALE);
    expect(nextGraphGpuRenderScale({ scale: 0.5, interacting: true }, 5)).toBeCloseTo(0.55);
    expect(nextGraphGpuRenderScale({ scale: 0.95, interacting: true }, 5)).toBe(1);
    expect(nextGraphGpuRenderScale({ scale: 0.7, interacting: true }, 14)).toBe(0.7);
  });

  it('reads frame cost from timer queries, else from the delay to the next frame', () => {
    expect(graphGpuFrameCostMs(7, 40, 12)).toBe(7);
    expect(graphGpuFrameCostMs(null, null, 12)).toBeNaN();
    // SwiftShader at full scale pushes the next frame to ~28 ms: scale down.
    expect(nextGraphGpuRenderScale({ scale: 1, interacting: true }, graphGpuFrameCostMs(null, 28, 12), 12)).toBeCloseTo(0.8);
    // A GPU that keeps up returns at vsync: recover toward full scale.
    expect(nextGraphGpuRenderScale({ scale: 0.5, interacting: true }, graphGpuFrameCostMs(null, 16.7, 12), 12)).toBeCloseTo(0.55);
    // Between the two, hold steady instead of oscillating.
    expect(nextGraphGpuRenderScale({ scale: 0.7, interacting: true }, graphGpuFrameCostMs(null, 19.5, 12), 12)).toBe(0.7);
  });
});
