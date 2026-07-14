import { describe, expect, it } from 'vitest';

import {
  NOTEBOOK_MARGIN_PRESETS_PT,
  NOTEBOOK_PAPER_DIMENSIONS_PT,
  notebookEffectiveImagePlacement,
  notebookMarginPreset,
  notebookPageGeometry,
} from './page-layout';

const pageCases = (['a4', 'letter', 'legal'] as const).flatMap((paperSize) =>
  (['portrait', 'landscape'] as const).flatMap((orientation) =>
    Object.entries(NOTEBOOK_MARGIN_PRESETS_PT).map(([preset, marginsPt]) => ({
      marginsPt,
      orientation,
      paperSize,
      preset,
    }))));

describe('Notebook page geometry', () => {
  it('derives canonical portrait and landscape geometry from point values', () => {
    expect(notebookPageGeometry({
      paperSize: 'a4',
      orientation: 'portrait',
      marginsPt: { ...NOTEBOOK_MARGIN_PRESETS_PT.normal },
    })).toMatchObject({ width: 595.28, height: 841.89, usableWidth: 451.28, usableHeight: 697.89 });
    expect(notebookPageGeometry({
      paperSize: 'legal',
      orientation: 'landscape',
      marginsPt: { ...NOTEBOOK_MARGIN_PRESETS_PT.narrow },
    })).toEqual({ width: 1008, height: 612, usableWidth: 936, usableHeight: 540 });
  });

  it('recognizes presets without serializing a derived preset name', () => {
    expect(notebookMarginPreset({ ...NOTEBOOK_MARGIN_PRESETS_PT.wide })).toBe('wide');
    expect(notebookMarginPreset({ top: 40, right: 41, bottom: 42, left: 43 })).toBe('custom');
  });

  it('falls back to normal flow when a square image would starve the text column', () => {
    const setup = {
      paperSize: 'a4' as const,
      orientation: 'portrait' as const,
      marginsPt: { ...NOTEBOOK_MARGIN_PRESETS_PT.normal },
    };
    expect(notebookEffectiveImagePlacement(setup, 'square-left', 50)).toBe('square-left');
    expect(notebookEffectiveImagePlacement(setup, 'square-right', 75)).toBe('normal');
    expect(notebookEffectiveImagePlacement(setup, 'square-left', 50, 480)).toBe('normal');
    expect(notebookEffectiveImagePlacement(setup, 'square-left', 50, 560)).toBe('square-left');
    expect(notebookEffectiveImagePlacement(setup, 'top-and-bottom', 100))
      .toBe('top-and-bottom');
  });

  it.each(pageCases)(
    'derives usable geometry for $paperSize $orientation with $preset margins',
    ({ marginsPt, orientation, paperSize }) => {
      const geometry = notebookPageGeometry({ paperSize, orientation, marginsPt });
      const canonical = NOTEBOOK_PAPER_DIMENSIONS_PT[paperSize];
      expect(geometry.width).toBe(orientation === 'portrait' ? canonical.width : canonical.height);
      expect(geometry.height).toBe(orientation === 'portrait' ? canonical.height : canonical.width);
      expect(geometry.usableWidth).toBeGreaterThanOrEqual(72);
      expect(geometry.usableHeight).toBeGreaterThanOrEqual(72);
    },
  );
});
