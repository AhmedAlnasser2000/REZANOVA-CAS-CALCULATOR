import { describe, expect, it } from 'vitest';

import { createNotebookSurfaceState } from '../model';
import { createNotebookRichDocument } from './model';
import {
  createNotebookRichSurfaceState,
  notebookRichSurfaceStateFromSlot,
} from './surface-state';

const NOW = () => new Date('2026-07-12T00:00:00.000Z');

describe('Notebook rich surface state', () => {
  it('creates an empty version-2 session document', () => {
    const state = createNotebookRichSurfaceState({ idPrefix: 'page', now: NOW });
    expect(state.kind).toBe('notebook-surface-state');
    expect(state.document.version).toBe(2);
    expect(state.document.content).toEqual([
      expect.objectContaining({ type: 'paragraph' }),
    ]);
  });

  it('keeps version-2 state and migrates version-1 state losslessly', () => {
    const rich = createNotebookRichDocument({ idPrefix: 'rich', now: NOW });
    expect(notebookRichSurfaceStateFromSlot({
      kind: 'notebook-surface-state',
      document: rich,
    }).document).toBe(rich);

    const legacy = createNotebookSurfaceState({ idPrefix: 'legacy', now: NOW });
    const migrated = notebookRichSurfaceStateFromSlot(legacy);
    expect(migrated.document.version).toBe(2);
    expect(migrated.document.id).toBe(legacy.document.id);
    expect(migrated.document.content.length).toBe(legacy.document.blocks.length);
  });
});
