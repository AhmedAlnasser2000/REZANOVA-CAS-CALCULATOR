import { describe, expect, it } from 'vitest';

import { createNotebookRichDocument, isNotebookRichDocumentV11 } from './model';
import { migrateNotebookDocumentV11 } from './migrate-v11';
import type { NotebookRichDocumentV11 } from './types';

describe('Notebook rich document V11 migration', () => {
  it('changes only the version and preserves integer media widths', () => {
    const current = createNotebookRichDocument({
      idPrefix: 'v11-migration',
      now: () => new Date('2026-07-15T00:00:00.000Z'),
    });
    const version11 = {
      ...current,
      version: 11,
      content: [{
        type: 'imageFigure',
        id: 'image.v11',
        assetId: `sha256:${'a'.repeat(64)}`,
        widthPercent: 63,
      }],
    } as NotebookRichDocumentV11;

    expect(isNotebookRichDocumentV11(version11)).toBe(true);
    expect(migrateNotebookDocumentV11(version11)).toEqual({
      ...version11,
      version: 13,
    });
  });
});
