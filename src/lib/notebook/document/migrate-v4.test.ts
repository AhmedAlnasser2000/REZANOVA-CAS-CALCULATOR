import { describe, expect, it } from 'vitest';

import { isNotebookRichDocument, isNotebookRichDocumentV4 } from './model';
import { migrateNotebookDocumentV4 } from './migrate-v4';
import type { NotebookRichDocumentV4 } from './types';

describe('Notebook rich document V4 migration', () => {
  it('continues through V8 while preserving an unformatted authored tree', () => {
    const version4: NotebookRichDocumentV4 = {
      version: 4,
      id: 'notebook.v4',
      title: 'Legacy draft',
      createdAt: '2026-07-13T00:00:00.000Z',
      updatedAt: '2026-07-13T01:00:00.000Z',
      selectedNodeId: 'paragraph.1',
      content: [{
        type: 'section',
        id: 'section.1',
        title: 'Nested prose',
        content: [{
          type: 'paragraph',
          id: 'paragraph.1',
          content: [{
            type: 'text',
            text: 'Exactly preserved',
            marks: [{ type: 'strike' }, { type: 'textStyle', fontSize: 125 }],
          }],
        }],
      }],
    };

    expect(isNotebookRichDocumentV4(version4)).toBe(true);
    const migrated = migrateNotebookDocumentV4(version4);
    expect(migrated).toMatchObject({ ...version4, version: 8 });
    expect(migrated.pageSetup).toEqual({
      paperSize: 'a4',
      orientation: 'portrait',
      marginsPt: { top: 72, right: 72, bottom: 72, left: 72 },
    });
    expect(migrated.content).toEqual(version4.content);
    expect(isNotebookRichDocument(migrated)).toBe(true);
  });
});
