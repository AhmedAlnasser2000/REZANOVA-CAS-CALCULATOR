import { describe, expect, it } from 'vitest';
import { buildGraphGridScene } from './grid';

const viewport = {
  coordinateSystem: 'cartesian' as const,
  xMin: -10,
  xMax: 10,
  yMin: -6,
  yMax: 6,
};

describe('Graph renderer-neutral adaptive grid', () => {
  it('uses finite 1-2-5 Cartesian spacing with bounded labels', () => {
    const grid = buildGraphGridScene({
      viewport,
      cssSize: { width: 1_280, height: 800 },
      policy: {
        kind: 'cartesian', major: true, minor: true,
        axisNumbers: true, angleLabels: false, unitCircle: false,
      },
    });
    expect(grid.kind).toBe('cartesian');
    expect(grid.version).toBe(2);
    expect(grid.lines.some((line) => line.role === 'major')).toBe(true);
    expect(grid.lines.some((line) => line.role === 'minor')).toBe(true);
    expect(grid.labels.length).toBeLessThanOrEqual(28);
    expect(grid.lines.every((line) => [line.x1, line.y1, line.x2, line.y2].every(Number.isFinite))).toBe(true);
    expect(grid.hysteresisKey).toMatch(/^cartesian:/u);
    const nearThreshold = buildGraphGridScene({
      viewport: { ...viewport, xMax: 10.2 },
      cssSize: { width: 1_280, height: 800 },
      policy: {
        kind: 'cartesian', major: true, minor: true,
        axisNumbers: true, angleLabels: false, unitCircle: false,
      },
      previousHysteresisKey: grid.hysteresisKey,
    });
    expect(nearThreshold.hysteresisKey.split(':')[1]).toBe(grid.hysteresisKey.split(':')[1]);
  });

  it('emits adaptive rings, spokes, one angle-label ring, and one radial-label ray', () => {
    const grid = buildGraphGridScene({
      viewport: { ...viewport, coordinateSystem: 'polar' },
      cssSize: { width: 1_200, height: 760 },
      policy: {
        kind: 'polar', major: true, minor: true,
        axisNumbers: true, angleLabels: true, unitCircle: false,
      },
    });
    expect(grid.kind).toBe('polar');
    expect(grid.circles.length).toBeGreaterThan(2);
    expect(grid.lines.filter((line) => line.role === 'spoke').length).toBeGreaterThanOrEqual(8);
    expect(grid.labels.filter((label) => label.labelId.startsWith('grid:theta:')).length)
      .toBeLessThanOrEqual(12);
    expect(grid.labels.filter((label) => label.labelId.startsWith('grid:r:')).every(
      (label) => label.anchor.y === 0,
    )).toBe(true);
  });
});
