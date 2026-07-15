import { describe, expect, it } from 'vitest';

import { isNotebookRichDocument, isNotebookRichDocumentV7 } from './model';
import { migrateNotebookDocumentV7 } from './migrate-v7';
import type { NotebookRichDocumentV7 } from './types';

describe('Notebook rich document V7 migration', () => {
  it('adds only default page settings while preserving V7 image content', () => {
    const version7: NotebookRichDocumentV7 = {
      version: 7,
      id: 'notebook.v7',
      title: 'Image draft',
      createdAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T01:00:00.000Z',
      selectedNodeId: 'figure.1',
      content: [{
        type: 'imageFigure',
        id: 'figure.1',
        assetId: `sha256:${'a'.repeat(64)}`,
        altText: 'A diagram',
        caption: 'Preserved figure',
      }],
    };

    expect(isNotebookRichDocumentV7(version7)).toBe(true);
    const migrated = migrateNotebookDocumentV7(version7);
    expect(migrated.version).toBe(13);
    expect(migrated.content).toEqual(version7.content);
    expect(migrated.pageSetup).toEqual({
      paperSize: 'a4',
      orientation: 'portrait',
      marginsPt: { top: 72, right: 72, bottom: 72, left: 72 },
    });
    expect(migrated.headerFooter.pageNumberStart).toBe(1);
    expect(isNotebookRichDocument(migrated)).toBe(true);
  });

  it('rejects V8-only fields in a version-7 document', () => {
    const invalid = {
      version: 7,
      id: 'notebook.v7.invalid',
      title: 'Invalid',
      createdAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T00:00:00.000Z',
      selectedNodeId: null,
      content: [{ type: 'paragraph', id: 'paragraph.1' }],
      pageSetup: {
        paperSize: 'a4',
        orientation: 'portrait',
        marginsPt: { top: 72, right: 72, bottom: 72, left: 72 },
      },
    };
    expect(isNotebookRichDocumentV7(invalid)).toBe(false);
  });
});
