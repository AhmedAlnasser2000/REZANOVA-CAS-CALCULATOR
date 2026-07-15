import { describe, expect, it } from 'vitest';

import { createNotebookRichDocument, isNotebookRichDocumentV12 } from './model';
import { migrateNotebookDocumentV12 } from './migrate-v12';
import type { NotebookRichDocumentV12 } from './types';

describe('Notebook rich document V12 migration', () => {
  it('changes only the version and leaves every legacy object in flow', () => {
    const current = createNotebookRichDocument({
      idPrefix: 'v12-migration',
      now: () => new Date('2026-07-16T00:00:00.000Z'),
    });
    const version12 = {
      ...current,
      version: 12,
      content: [{
        type: 'imageFigure',
        id: 'image.v12',
        assetId: `sha256:${'a'.repeat(64)}`,
        widthPercent: 63.417,
        placement: 'square-left',
        alignment: 'left',
      }],
    } as NotebookRichDocumentV12;

    expect(isNotebookRichDocumentV12(version12)).toBe(true);
    expect(migrateNotebookDocumentV12(version12)).toEqual({
      ...version12,
      version: 13,
    });
    expect(migrateNotebookDocumentV12(version12).content[0]).not.toHaveProperty(
      'objectPlacement',
    );
  });
});
