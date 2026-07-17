import { describe, expect, it } from 'vitest';

import {
  isNotebookRichDocument,
} from './model';
import { isNotebookRichDocumentV5 } from './compatibility';
import { migrateNotebookDocumentV5 } from './migrate-v5';
import type { NotebookRichDocumentV5 } from './compatibility';
import { NOTEBOOK_RICH_DOCUMENT_VERSION } from './types';

describe('Notebook rich document V5 migration', () => {
  it('preserves visible behavior and removes ignored collapse flags recursively', () => {
    const version5: NotebookRichDocumentV5 = {
      version: 5,
      id: 'notebook.v5',
      title: 'Structured draft',
      createdAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T01:00:00.000Z',
      selectedNodeId: 'theorem.1',
      content: [{
        type: 'section',
        id: 'section.1',
        title: 'Nested blocks',
        collapsed: true,
        content: [{
          type: 'semanticBlock',
          id: 'theorem.1',
          variant: 'theorem',
          collapsed: true,
          content: [{ type: 'paragraph', id: 'paragraph.1' }],
        }, {
          type: 'bulletList',
          id: 'list.1',
          content: [{
            type: 'listItem',
            id: 'item.1',
            content: [{
              type: 'semanticBlock',
              id: 'hint.1',
              variant: 'hint',
              collapsed: true,
              content: [{ type: 'paragraph', id: 'paragraph.2' }],
            }],
          }],
        }],
      }],
    };

    expect(isNotebookRichDocumentV5(version5)).toBe(true);
    const migrated = migrateNotebookDocumentV5(version5);
    expect(migrated.version).toBe(NOTEBOOK_RICH_DOCUMENT_VERSION);
    expect(migrated.content[0]).toMatchObject({
      type: 'section',
      id: 'section.1',
      collapsed: true,
    });
    const section = migrated.content[0];
    expect(section.type).toBe('section');
    if (section.type !== 'section') throw new Error('Expected migrated section');
    expect(section.content[0]).toEqual({
      type: 'semanticBlock',
      id: 'theorem.1',
      variant: 'theorem',
      content: [{ type: 'paragraph', id: 'paragraph.1' }],
    });
    expect(section.content[1]).toEqual(
      version5.content[0].type === 'section' ? version5.content[0].content[1] : null,
    );
    expect(isNotebookRichDocument(migrated)).toBe(true);
  });

  it('strictly rejects V6-only structured attributes in a V5 document', () => {
    const version5: NotebookRichDocumentV5 = {
      version: 5,
      id: 'notebook.v5.invalid',
      title: 'Invalid future attribute',
      createdAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T01:00:00.000Z',
      selectedNodeId: 'semantic.1',
      content: [{
        type: 'semanticBlock',
        id: 'semantic.1',
        variant: 'hint',
        accentColor: '#b8d49c',
        content: [{ type: 'paragraph', id: 'paragraph.1' }],
      }],
    };

    expect(isNotebookRichDocumentV5(version5)).toBe(false);
  });
});
