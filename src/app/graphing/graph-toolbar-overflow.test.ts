import { describe, expect, it } from 'vitest';
import { graphToolbarLevel, graphToolbarRequiredWidth, type GraphToolbarWidths } from './graph-toolbar-overflow';

const widths: GraphToolbarWidths = {
  fixed: [40, 1, 190], history: [40, 40, 1], context: 160, theme: 150, colors: 130, equal: 50, grid: 120,
  autofit: 100, autofitIcon: 40, analyze: 110, analyzeIcon: 40, more: 44, gap: 8, padding: 20,
};

describe('Graph toolbar overflow (GRAPHING-UI1)', () => {
  it('shows everything when it fits and hides in order as the bar narrows', () => {
    const full = graphToolbarRequiredWidth(widths, 0);
    expect(graphToolbarLevel(widths, full)).toBe(0);
    expect(graphToolbarLevel(widths, full - 1)).toBe(1);
    expect(graphToolbarLevel(widths, 0)).toBe(7);
    expect(graphToolbarRequiredWidth(widths, 6) - graphToolbarRequiredWidth(widths, 7)).toBe(40 + 40 + 1 + 3 * widths.gap);
  });

  it('is monotonic in the width and changes only at thresholds, so it cannot flip back and forth', () => {
    let previous = Infinity;
    const changes: number[] = [];
    for (let available = 200; available <= 1400; available += 1) {
      const level = graphToolbarLevel(widths, available);
      expect(level).toBeLessThanOrEqual(previous);
      if (level !== previous && previous !== Infinity) changes.push(available);
      previous = level;
    }
    // Each level change happens exactly where that level's required width is reached.
    for (const at of changes) expect(graphToolbarRequiredWidth(widths, graphToolbarLevel(widths, at))).toBeLessThanOrEqual(at);
    // The answer for a width never depends on what was shown before.
    expect(graphToolbarLevel(widths, 900)).toBe(graphToolbarLevel(widths, 900));
  });

  it('skips the view chip while an auto-switch notice replaces it', () => {
    const withNotice = { ...widths, context: 0, fixed: [...widths.fixed, 170] };
    expect(graphToolbarRequiredWidth(withNotice, 0)).toBe(graphToolbarRequiredWidth(withNotice, 1));
  });

  it('adds the … button once something moves into it', () => {
    expect(graphToolbarRequiredWidth(widths, 1) - graphToolbarRequiredWidth(widths, 2)).toBe(widths.theme - widths.more);
  });
});
