import { describe, expect, it } from 'vitest';

import {
  isNotebookRichDocument,
  isNotebookRichDocumentV8,
} from './model';
import { migrateNotebookDocumentV8 } from './migrate-v8';
import type { NotebookRichDocumentV8 } from './types';

describe('Notebook rich document V8 migration', () => {
  it('changes only the version when no video formatting exists', () => {
    const version8: NotebookRichDocumentV8 = {
      version: 8,
      id: 'notebook.v8',
      title: 'Paged image draft',
      createdAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T01:00:00.000Z',
      selectedNodeId: 'figure.1',
      content: [{
        type: 'imageFigure',
        id: 'figure.1',
        assetId: `sha256:${'a'.repeat(64)}`,
        caption: 'Preserved figure',
        widthPercent: 50,
      }],
      pageSetup: {
        paperSize: 'letter',
        orientation: 'landscape',
        marginsPt: { top: 36, right: 54, bottom: 36, left: 54 },
      },
      headerFooter: {
        headerText: 'Limits',
        footerText: 'Chapter 2',
        differentFirstPage: true,
        pageNumbering: { enabled: true, position: 'right', startAt: 4 },
      },
    };

    expect(isNotebookRichDocumentV8(version8)).toBe(true);
    const migrated = migrateNotebookDocumentV8(version8);
    expect(migrated).toMatchObject({
      ...version8,
      version: 14,
      headerFooter: {
        differentFirstPage: true,
        pageNumberStart: 4,
      },
    });
    expect(migrated.headerFooter.defaultHeader.left[0]?.content).toEqual([
      { type: 'text', text: 'Limits' },
    ]);
    expect(migrated.headerFooter.defaultFooter.right[0]?.content).toEqual([
      { type: 'pageNumber' },
    ]);
    expect(isNotebookRichDocument(migrated)).toBe(true);
  });

  it('rejects V9 video nodes in V8', () => {
    const invalid = {
      version: 8,
      id: 'notebook.v8.invalid',
      title: 'Invalid future video',
      createdAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T00:00:00.000Z',
      selectedNodeId: 'video.1',
      content: [{
        type: 'videoFigure',
        id: 'video.1',
        assetId: `sha256:${'a'.repeat(64)}`,
        title: 'Future video',
        description: '',
      }],
      pageSetup: {
        paperSize: 'a4',
        orientation: 'portrait',
        marginsPt: { top: 72, right: 72, bottom: 72, left: 72 },
      },
      headerFooter: {
        headerText: '',
        footerText: '',
        differentFirstPage: false,
        pageNumbering: { enabled: false, position: 'center', startAt: 1 },
      },
    };
    expect(isNotebookRichDocumentV8(invalid)).toBe(false);
  });
});
