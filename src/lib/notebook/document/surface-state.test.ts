import { describe, expect, it } from 'vitest';

import { createNotebookSurfaceState } from '../model';
import { createNotebookRichDocument } from './model';
import {
  createNotebookLibrarySurfaceState,
  createNotebookRichSurfaceState,
  notebookLibrarySurfaceStateFromSlot,
  notebookRichSurfaceStateFromSlot,
} from './surface-state';

const NOW = () => new Date('2026-07-12T00:00:00.000Z');

describe('Notebook rich surface state', () => {
  it('creates an empty version-6 session document', () => {
    const state = createNotebookRichSurfaceState({ idPrefix: 'page', now: NOW });
    expect(state.kind).toBe('notebook-surface-state');
    expect(state.document.version).toBe(6);
    expect(state.document.content).toEqual([
      expect.objectContaining({ type: 'paragraph' }),
    ]);
  });

  it('keeps version-6 state and migrates version-1 state losslessly', () => {
    const rich = createNotebookRichDocument({ idPrefix: 'rich', now: NOW });
    expect(notebookRichSurfaceStateFromSlot({
      kind: 'notebook-surface-state',
      document: rich,
    }).document).toBe(rich);

    const legacy = createNotebookSurfaceState({ idPrefix: 'legacy', now: NOW });
    const migrated = notebookRichSurfaceStateFromSlot(legacy);
    expect(migrated.document.version).toBe(6);
    expect(migrated.document.id).toBe(legacy.document.id);
    expect(migrated.document.content.length).toBe(legacy.document.blocks.length);
  });

  it('migrates version-2 rich documents without regrouping their content', () => {
    const current = createNotebookRichDocument({ idPrefix: 'v2', now: NOW });
    const version2 = { ...current, version: 2 as const };
    const migrated = notebookRichSurfaceStateFromSlot({
      kind: 'notebook-surface-state',
      document: version2,
    });

    expect(migrated.document.version).toBe(6);
    expect(migrated.document.content).toEqual(version2.content);
  });

  it('migrates version-3 documents losslessly without changing authored content', () => {
    const current = createNotebookRichDocument({ idPrefix: 'v3', now: NOW });
    const version3 = { ...current, version: 3 as const };
    const migrated = notebookRichSurfaceStateFromSlot({
      kind: 'notebook-surface-state',
      document: version3,
    });

    expect(migrated.document.version).toBe(6);
    expect(migrated.document.content).toEqual(version3.content);
  });

  it('migrates version-4 documents continuously to version 6', () => {
    const current = createNotebookRichDocument({ idPrefix: 'v4', now: NOW });
    const version4 = { ...current, version: 4 as const };
    const migrated = notebookRichSurfaceStateFromSlot({
      kind: 'notebook-surface-state',
      document: version4,
    });

    expect(migrated.document).toEqual({ ...version4, version: 6 });
  });

  it('migrates version-5 documents through the structured-block normalizer', () => {
    const current = createNotebookRichDocument({ idPrefix: 'v5', now: NOW });
    const version5 = { ...current, version: 5 as const };
    const migrated = notebookRichSurfaceStateFromSlot({
      kind: 'notebook-surface-state',
      document: version5,
    });

    expect(migrated.document).toEqual({ ...version5, version: 6 });
  });

  it('keeps only durable identity metadata in a hydrated workspace tab', () => {
    const reference = createNotebookLibrarySurfaceState({
      libraryId: 'library.workspace.1',
      revision: 7,
      title: 'Durable Notebook',
    });
    expect(notebookLibrarySurfaceStateFromSlot(reference)).toEqual(reference);
    expect(reference).not.toHaveProperty('document');
    expect(notebookLibrarySurfaceStateFromSlot({
      ...reference,
      libraryId: '../escape',
    })).toBeNull();
  });
});
