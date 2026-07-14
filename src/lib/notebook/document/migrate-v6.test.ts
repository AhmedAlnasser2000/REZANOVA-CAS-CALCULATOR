import { describe, expect, it } from 'vitest';

import { isNotebookRichDocument, isNotebookRichDocumentV6 } from './model';
import { migrateNotebookDocumentV6 } from './migrate-v6';
import type { NotebookRichDocumentV6 } from './types';

describe('Notebook rich document V6 migration', () => {
  it('changes only the document version when no V7 image exists', () => {
    const version6: NotebookRichDocumentV6 = {
      version: 6,
      id: 'notebook.v6',
      title: 'Structured draft',
      createdAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T01:00:00.000Z',
      selectedNodeId: 'paragraph.1',
      content: [{
        type: 'section',
        id: 'section.1',
        title: 'Preserved section',
        accentColor: '#84bfe8',
        content: [{ type: 'paragraph', id: 'paragraph.1' }],
      }],
    };

    expect(isNotebookRichDocumentV6(version6)).toBe(true);
    const migrated = migrateNotebookDocumentV6(version6);
    expect(migrated).toEqual({ ...version6, version: 7 });
    expect(isNotebookRichDocument(migrated)).toBe(true);
  });
});
