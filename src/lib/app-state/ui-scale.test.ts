import { describe, expect, it } from 'vitest';
import { nextUiScale, normalizeUiScale, UI_SCALE_STEPS } from './ui-scale';

describe('UI scale steps (GRAPHING-UI1)', () => {
  it('maps saves from before the native scale to the nearest step', () => {
    expect([100, 115, 130, 145].map(normalizeUiScale)).toEqual([100, 110, 125, 150]);
    expect(normalizeUiScale('large')).toBe(100);
    expect(normalizeUiScale(500)).toBe(200);
  });

  it('steps up and down through the browser-like levels and stops at the ends', () => {
    expect(UI_SCALE_STEPS).toEqual([80, 90, 100, 110, 125, 150, 175, 200]);
    expect(nextUiScale(100, 1)).toBe(110);
    expect(nextUiScale(125, -1)).toBe(110);
    expect(nextUiScale(200, 1)).toBe(200);
    expect(nextUiScale(80, -1)).toBe(80);
    expect(nextUiScale(175, 0)).toBe(100);
  });
});
