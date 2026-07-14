import { describe, expect, it } from 'vitest';

import {
  normalizeNotebookAccentColor,
  NOTEBOOK_ACCENT_PRESETS,
  notebookAccentContrastRatio,
  notebookSectionIsCollapsible,
  notebookSemanticIsCollapsible,
} from './structured-blocks';

describe('Notebook structured-block appearance', () => {
  it('normalizes exact six-digit accents and rejects other color forms', () => {
    expect(normalizeNotebookAccentColor(' #B8A0E6 ')).toBe('#b8a0e6');
    expect(normalizeNotebookAccentColor('#abc')).toBeNull();
    expect(normalizeNotebookAccentColor('violet')).toBeNull();
    expect(NOTEBOOK_ACCENT_PRESETS.map((preset) => preset.color)).toEqual([
      '#b8d49c',
      '#84bfe8',
      '#b8a0e6',
      '#d3ad63',
      '#e8997c',
      '#75c7bc',
    ]);
  });

  it('applies collapse defaults and honors explicit overrides', () => {
    expect(notebookSemanticIsCollapsible('hint')).toBe(true);
    expect(notebookSemanticIsCollapsible('answer')).toBe(true);
    expect(notebookSemanticIsCollapsible('theorem')).toBe(false);
    expect(notebookSemanticIsCollapsible('theorem', true)).toBe(true);
    expect(notebookSemanticIsCollapsible('hint', false)).toBe(false);
    expect(notebookSectionIsCollapsible()).toBe(true);
    expect(notebookSectionIsCollapsible(false)).toBe(false);
  });

  it('reports low custom-accent contrast without rejecting the color', () => {
    expect(notebookAccentContrastRatio('#000000')).toBeLessThan(3);
    expect(notebookAccentContrastRatio('#ffffff')).toBeGreaterThanOrEqual(3);
  });
});
