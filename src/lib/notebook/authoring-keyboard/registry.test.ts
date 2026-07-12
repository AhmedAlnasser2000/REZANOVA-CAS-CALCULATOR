import { describe, expect, it } from 'vitest';

import {
  NOTEBOOK_KEYBOARD_ENTRIES,
  NOTEBOOK_KEYBOARD_TABS,
  isNotebookLatexRunnable,
  notebookKeyboardEntries,
  notebookLatexSupport,
} from './registry';

describe('Notebook authoring keyboard registry', () => {
  it('keeps the approved tab order and unique entry ids', () => {
    expect(NOTEBOOK_KEYBOARD_TABS.map((tab) => tab.id)).toEqual([
      'core',
      'algebra',
      'relations',
      'greek',
      'calculus',
      'discrete',
      'structures',
    ]);
    expect(new Set(NOTEBOOK_KEYBOARD_ENTRIES.map((entry) => entry.id)).size)
      .toBe(NOTEBOOK_KEYBOARD_ENTRIES.length);
  });

  it('searches across tabs while keeping hidden commands out of authoring UI', () => {
    expect(notebookKeyboardEntries({ query: 'root' }).map((entry) => entry.id)).toEqual([
      'square-root',
      'nth-root',
    ]);
    expect(notebookKeyboardEntries({ query: 'html' })).toEqual([]);
    expect(notebookKeyboardEntries({ tab: 'calculus' }).map((entry) => entry.id))
      .toContain('integral');
  });

  it('separates runnable, document-only, and unsafe LaTeX', () => {
    expect(isNotebookLatexRunnable('x^2-5x+6=0')).toBe(true);
    expect(notebookLatexSupport('\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}'))
      .toBe('document-only');
    expect(notebookLatexSupport('\\href{https://example.com}{x}')).toBe('hidden');
  });
});
