import { describe, expect, it } from 'vitest';

import {
  buildNotebookOutline,
  NOTEBOOK_SEMANTIC_DEFINITIONS,
  notebookSemanticDefinition,
  notebookSemanticTitle,
} from './semantics';

describe('Notebook academic semantics', () => {
  it('catalogs every approved container and only Hint/Answer collapse', () => {
    expect(NOTEBOOK_SEMANTIC_DEFINITIONS.map((item) => item.kind)).toEqual([
      'theorem',
      'definition',
      'lemma',
      'corollary',
      'proof',
      'example',
      'solution',
      'exercise',
      'hint',
      'answer',
      'note',
      'warning',
    ]);
    expect(NOTEBOOK_SEMANTIC_DEFINITIONS.filter((item) => item.collapsible)
      .map((item) => item.kind)).toEqual(['hint', 'answer']);
    expect(notebookSemanticDefinition('theorem').tone).toBe('concept');
  });

  it('builds a stable top-level outline from headings and academic containers', () => {
    expect(buildNotebookOutline([
      {
        type: 'heading',
        id: 'heading.1',
        level: 2,
        content: [{ type: 'text', text: 'Limit Laws' }],
      },
      { type: 'paragraph', id: 'paragraph.1' },
      {
        type: 'semanticBlock',
        id: 'theorem.1',
        variant: 'theorem',
        number: '2.3.2',
        label: 'Limit Laws',
        content: [{ type: 'paragraph', id: 'paragraph.2' }],
      },
    ])).toEqual([
      {
        id: 'heading.1',
        label: 'Limit Laws',
        nodeType: 'heading',
        topLevelIndex: 0,
      },
      {
        id: 'theorem.1',
        label: 'Theorem 2.3.2 Limit Laws',
        nodeType: 'semanticBlock',
        semanticKind: 'theorem',
        topLevelIndex: 2,
      },
    ]);
    expect(notebookSemanticTitle('warning')).toBe('Warning');
  });
});
