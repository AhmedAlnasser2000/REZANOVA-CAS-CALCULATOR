import { describe, expect, it } from 'vitest';

import { migrateNotebookRichDocument } from './migrate';
import { migrateNotebookDocumentV9 } from './migrate-v9';
import {
  isNotebookRichDocument,
  isNotebookRichDocumentV9,
} from './model';
import type { NotebookRichDocumentV9 } from './types';

describe('Notebook rich document V9 migration', () => {
  it('changes only the version while preserving the V9 document tree', () => {
    const version9: NotebookRichDocumentV9 = {
      version: 9,
      id: 'notebook.v9',
      title: 'Direct-media draft',
      createdAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T01:00:00.000Z',
      selectedNodeId: 'paragraph.1',
      content: [{
        type: 'paragraph',
        id: 'paragraph.1',
        format: { alignment: 'justify', lineSpacing: 1.5 },
      }, {
        type: 'imageFigure',
        id: 'image.1',
        assetId: `sha256:${'a'.repeat(64)}`,
        rotation: 90,
      }, {
        type: 'videoFigure',
        id: 'video.1',
        assetId: `sha256:${'b'.repeat(64)}`,
        title: 'Worked limit',
        description: '',
        alignment: 'center',
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

    expect(isNotebookRichDocumentV9(version9)).toBe(true);
    const migrated = migrateNotebookDocumentV9(version9);
    expect(migrated).toMatchObject({
      ...version9,
      version: 12,
      headerFooter: { differentFirstPage: false, pageNumberStart: 1 },
    });
    expect(migrateNotebookRichDocument(version9)).toEqual(migrated);
    expect(isNotebookRichDocument(migrated)).toBe(true);
  });

  it('strictly rejects V10-only indentation and direct-media fields in V9', () => {
    const version9: NotebookRichDocumentV9 = {
      version: 9,
      id: 'notebook.v9.strict',
      title: 'Strict legacy shape',
      createdAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T01:00:00.000Z',
      selectedNodeId: 'paragraph.1',
      content: [{ type: 'paragraph', id: 'paragraph.1' }, {
        type: 'imageFigure',
        id: 'image.1',
        assetId: `sha256:${'c'.repeat(64)}`,
        rotation: 90,
      }, {
        type: 'videoFigure',
        id: 'video.1',
        assetId: `sha256:${'d'.repeat(64)}`,
        title: 'Worked limit',
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

    const withIndent = structuredClone(version9) as {
      content: Array<Record<string, unknown>>;
    };
    withIndent.content[0]!.format = { leftIndentPt: 36 };
    expect(isNotebookRichDocumentV9(withIndent)).toBe(false);

    const withImageAspectRatio = structuredClone(version9) as {
      content: Array<Record<string, unknown>>;
    };
    withImageAspectRatio.content[1]!.displayAspectRatio = 1.25;
    expect(isNotebookRichDocumentV9(withImageAspectRatio)).toBe(false);

    const withArbitraryRotation = structuredClone(version9) as {
      content: Array<Record<string, unknown>>;
    };
    withArbitraryRotation.content[1]!.rotation = 137;
    expect(isNotebookRichDocumentV9(withArbitraryRotation)).toBe(false);

    const withVideoPlacement = structuredClone(version9) as {
      content: Array<Record<string, unknown>>;
    };
    withVideoPlacement.content[2]!.placement = 'square-left';
    expect(isNotebookRichDocumentV9(withVideoPlacement)).toBe(false);
  });
});
