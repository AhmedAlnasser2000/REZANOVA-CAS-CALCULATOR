import { describe, expect, it } from 'vitest';
import type { GraphViewportV1 } from '../../lib/graphing';
import { isMeasurableGraphPane, isSquareGraphViewport, squareGraphViewport } from './graph-equal-axes';

const viewport: GraphViewportV1 = { coordinateSystem: 'cartesian', xMin: -10, xMax: 10, yMin: -6, yMax: 6 };
const scale = (view: GraphViewportV1, size: { width: number; height: number }) => (
  [(view.xMax - view.xMin) / size.width, (view.yMax - view.yMin) / size.height]);

describe('Graph equal axes', () => {
  it('squares the viewport around its centre without cropping either axis', () => {
    const size = { width: 1000, height: 400 };
    const squared = squareGraphViewport({ ...viewport, xMin: -8, xMax: 12 }, size);
    const [x, y] = scale(squared, size);
    expect(x).toBeCloseTo(y, 12);
    expect((squared.xMin + squared.xMax) / 2).toBeCloseTo(2, 12);
    expect((squared.yMin + squared.yMax) / 2).toBeCloseTo(0, 12);
    // Coarser scale wins: the 20 x-units over 1000 px (0.02) and 12 y-units over 400 px (0.03).
    expect(y).toBeCloseTo(0.03, 12);
    expect(squared.xMax - squared.xMin).toBeGreaterThanOrEqual(20);
    expect(squared.yMax - squared.yMin).toBeGreaterThanOrEqual(12);
  });

  it('recognises a square viewport and leaves it alone', () => {
    const size = { width: 800, height: 600 };
    const squared = squareGraphViewport(viewport, size);
    expect(isSquareGraphViewport(squared, size)).toBe(true);
    expect(isSquareGraphViewport(viewport, size)).toBe(false);
    expect(squareGraphViewport(squared, size)).toEqual(squared);
  });

  it('keeps the scale when a window widens, showing more of the plane', () => {
    const before = { width: 800, height: 600 };
    const squared = squareGraphViewport(viewport, before);
    const after = { width: 1200, height: 600 };
    const widened = squareGraphViewport(squared, after);
    expect(scale(widened, after)[0]).toBeCloseTo(scale(squared, before)[0], 12);
    expect(widened.xMax - widened.xMin).toBeGreaterThan(squared.xMax - squared.xMin);
  });

  it('ignores panes that are hidden or not laid out', () => {
    expect(isMeasurableGraphPane(null)).toBe(false);
    expect(isMeasurableGraphPane({ width: 0, height: 500 })).toBe(false);
    expect(isMeasurableGraphPane({ width: 500, height: 12 })).toBe(false);
    expect(isMeasurableGraphPane({ width: 500, height: 400 })).toBe(true);
  });
});
