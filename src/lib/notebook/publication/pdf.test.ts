import { convertLatexToMarkup } from 'mathlive';
import { describe, expect, it, vi } from 'vitest';

import type { NotebookRichBlockNode } from '../document/types';
import { notebookPdfCompatibilityFindings } from './pdf';

vi.mock('mathlive', () => ({
  convertLatexToMarkup: vi.fn((latex: string) => latex === 'broken'
    ? '<span class="ML__error">broken</span>'
    : `<span>${latex}</span>`),
}));

describe('Notebook PDF compatibility preflight', () => {
  it('reports only equations that cannot use static MathLive markup', () => {
    const content: NotebookRichBlockNode[] = [
      {
        type: 'paragraph',
        id: 'prose',
        content: [
          { type: 'text', text: 'A limit ' },
          { type: 'inlineMath', id: 'inline-ok', latex: 'x+1', sourceText: 'x+1', workspaceTarget: 'calculate' },
          { type: 'inlineMath', id: 'inline-bad', latex: 'broken', sourceText: 'broken', workspaceTarget: 'calculate' },
        ],
      },
      { type: 'displayMath', id: 'display-ok', latex: 'x^2', sourceText: 'x^2', workspaceTarget: 'calculate' },
    ];

    expect(notebookPdfCompatibilityFindings(content)).toEqual([{
      kind: 'equation-fallback',
      nodeId: 'inline-bad',
      message: 'This inline equation will be printed as its source text because static conversion failed.',
    }]);
    expect(convertLatexToMarkup).toHaveBeenCalledTimes(3);
  });
});
