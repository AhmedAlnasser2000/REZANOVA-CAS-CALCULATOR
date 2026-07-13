import { describe, expect, it } from 'vitest';

import {
  NOTEBOOK_KEYBOARD_ENTRIES,
  NOTEBOOK_KEYBOARD_TABS,
  isNotebookLatexRunnable,
  notebookKeyboardEntries,
  notebookLatexSupport,
  notebookMatrixLatex,
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
    expect(NOTEBOOK_KEYBOARD_ENTRIES.every((entry) => entry.visualKeycap.length > 0)).toBe(true);
  });

  it('builds square-bracket matrices for every supported dimension', () => {
    for (let rows = 1; rows <= 8; rows += 1) {
      for (let columns = 1; columns <= 8; columns += 1) {
        const latex = notebookMatrixLatex(rows, columns);
        expect(latex).toMatch(/^\\begin\{bmatrix\}/u);
        expect(latex).toMatch(/\\end\{bmatrix\}$/u);
        const body = latex
          .replace(/^\\begin\{bmatrix\}/u, '')
          .replace(/\\end\{bmatrix\}$/u, '');
        const matrixRows = body.split('\\\\');
        expect(matrixRows).toHaveLength(rows);
        expect(matrixRows.every((row) => row.split('&').length === columns)).toBe(true);
      }
    }
    expect(() => notebookMatrixLatex(9, 1)).toThrow(/1 by 1 through 8 by 8/u);
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
    expect(notebookLatexSupport('\\cancel{x}')).toBe('document-only');
    expect(isNotebookLatexRunnable('\\xcancel{x+y}')).toBe(false);
  });
});
