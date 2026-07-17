import { describe, expect, it } from 'vitest';

import { isNotebookRichDocument } from './model';
import { isNotebookRichDocumentV10 } from './compatibility';
import { migrateNotebookDocumentV10 } from './migrate-v10';
import type { NotebookRichDocumentV10 } from './compatibility';
import { NOTEBOOK_RICH_DOCUMENT_VERSION } from './types';

describe('Notebook rich document V10 migration', () => {
  it('preserves legacy running matter and converts page numbering to a live field', () => {
    const version10: NotebookRichDocumentV10 = {
      version: 10,
      id: 'notebook.v10',
      title: 'Running matter',
      createdAt: '2026-07-15T00:00:00.000Z',
      updatedAt: '2026-07-15T01:00:00.000Z',
      selectedNodeId: 'paragraph.1',
      content: [{ type: 'paragraph', id: 'paragraph.1' }],
      pageSetup: {
        paperSize: 'a4',
        orientation: 'portrait',
        marginsPt: { top: 72, right: 72, bottom: 72, left: 72 },
      },
      headerFooter: {
        headerText: 'Course notes',
        footerText: 'Rezanova',
        differentFirstPage: true,
        pageNumbering: { enabled: true, position: 'right', startAt: 7 },
      },
    };
    expect(isNotebookRichDocumentV10(version10)).toBe(true);
    const migrated = migrateNotebookDocumentV10(version10);
    expect(migrated.version).toBe(NOTEBOOK_RICH_DOCUMENT_VERSION);
    expect(migrated.headerFooter.pageNumberStart).toBe(7);
    expect(migrated.headerFooter.defaultHeader.left[0]?.content).toEqual([
      { type: 'text', text: 'Course notes' },
    ]);
    expect(migrated.headerFooter.defaultFooter.right[0]?.content).toEqual([
      { type: 'pageNumber' },
    ]);
    expect(migrated.headerFooter.firstPageHeader).toEqual({
      left: [{ type: 'paragraph' }],
      center: [{ type: 'paragraph' }],
      right: [{ type: 'paragraph' }],
    });
    expect(isNotebookRichDocument(migrated)).toBe(true);
  });

  it('strictly rejects V11 regions in a version-10 document', () => {
    const invalid = {
      version: 10,
      id: 'notebook.invalid',
      title: 'Invalid',
      createdAt: '2026-07-15T00:00:00.000Z',
      updatedAt: '2026-07-15T00:00:00.000Z',
      selectedNodeId: null,
      content: [{ type: 'paragraph', id: 'paragraph.1' }],
      pageSetup: { paperSize: 'a4', orientation: 'portrait', marginsPt: { top: 72, right: 72, bottom: 72, left: 72 } },
      headerFooter: { defaultHeader: {} },
    };
    expect(isNotebookRichDocumentV10(invalid)).toBe(false);
  });
});
