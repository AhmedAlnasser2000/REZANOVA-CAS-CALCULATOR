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

  it('builds a stable recursive outline from sections, headings, and academic containers', () => {
    expect(buildNotebookOutline([
      {
        type: 'heading',
        id: 'heading.1',
        level: 2,
        content: [{ type: 'text', text: 'Limit Laws' }],
      },
      { type: 'paragraph', id: 'paragraph.1' },
      {
        type: 'section',
        id: 'section.1',
        title: 'Applications',
        collapsed: true,
        content: [{
          type: 'semanticBlock',
          id: 'theorem.1',
          variant: 'theorem',
          number: '2.3.2',
          label: 'Limit Laws',
          content: [{ type: 'paragraph', id: 'paragraph.2' }],
        }],
      },
    ])).toEqual([
      {
        id: 'heading.1',
        label: 'Limit Laws',
        nodeType: 'heading',
        parentId: null,
        depth: 0,
        path: ['Limit Laws'],
        childCount: 0,
        collapsed: false,
        topLevelIndex: 0,
      },
      {
        id: 'section.1',
        label: 'Applications',
        nodeType: 'section',
        parentId: null,
        depth: 0,
        path: ['Applications'],
        childCount: 1,
        collapsed: true,
        topLevelIndex: 2,
      },
      {
        id: 'theorem.1',
        label: 'Theorem 2.3.2 Limit Laws',
        nodeType: 'semanticBlock',
        semanticKind: 'theorem',
        parentId: 'section.1',
        depth: 1,
        path: ['Applications', 'Theorem 2.3.2 Limit Laws'],
        childCount: 1,
        collapsed: false,
        topLevelIndex: 2,
      },
    ]);
    expect(notebookSemanticTitle('warning')).toBe('Warning');
  });
});
