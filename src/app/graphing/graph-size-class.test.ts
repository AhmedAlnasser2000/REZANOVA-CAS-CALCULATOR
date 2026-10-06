import { describe, expect, it } from 'vitest';
import { graphSizeClass } from './graph-size-class';

describe('Graph window size classes (GRAPHING-UI1, Material 3 widths)', () => {
  it('classifies CSS widths at the Material 3 breakpoints', () => {
    expect([320, 599, 600, 839, 840, 1199, 1200, 1599, 1600, 2560].map(graphSizeClass)).toEqual([
      'compact', 'compact', 'medium', 'medium', 'expanded', 'expanded', 'large', 'large', 'extra-large', 'extra-large',
    ]);
  });

  it('moves a window down a class as the UI scale grows (native zoom gives fewer CSS pixels)', () => {
    expect([100, 150, 200].map((scale) => graphSizeClass(1440 / (scale / 100)))).toEqual(['large', 'expanded', 'medium']);
    expect(graphSizeClass(1180 / 2)).toBe('compact');
  });
});
