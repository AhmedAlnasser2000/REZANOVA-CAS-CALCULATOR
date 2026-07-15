import { act, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import {
  createInMemoryNotebookLibraryPort,
  createNotebookLibraryService,
  createNotebookLibrarySurfaceState,
  createNotebookRichDocument,
  createNotebookStoredRecordV1,
  type NotebookLibraryPort,
  type NotebookStoredRecordV1,
  type NotebookSurfaceState,
} from '../../../../lib/notebook';
import { useNotebookLibrarySession } from './useNotebookLibrarySession';

const NOW = '2026-07-15T10:00:00.000Z';

function record(
  libraryId: string,
  title: string,
  assetIds: readonly string[] = [],
): NotebookStoredRecordV1 {
  const document = createNotebookRichDocument({
    idPrefix: libraryId,
    now: () => new Date(NOW),
    title,
  });
  if (assetIds[0]) {
    const figureId = `${libraryId}.figure.1`;
    document.content = [{
      type: 'imageFigure',
      id: figureId,
      assetId: assetIds[0],
      altText: 'A graph illustrating a limit.',
      caption: 'Limit graph',
      numbered: true,
      widthPercent: 75,
      alignment: 'center',
      placement: 'top-and-bottom',
      displayAspectRatio: 1.25,
      rotation: 0,
    }];
    document.selectedNodeId = figureId;
  }
  return createNotebookStoredRecordV1(document, {
    assetIds,
    libraryId,
    savedAt: NOW,
  });
}

function renderLibrarySession(
  library: NotebookLibraryPort,
  initialRecord: NotebookStoredRecordV1,
) {
  const service = createNotebookLibraryService({ library });
  return renderHook(() => {
    const [surfaceState, setSurfaceState] = useState<NotebookSurfaceState>(() => (
      createNotebookLibrarySurfaceState({
        libraryId: initialRecord.libraryId,
        revision: initialRecord.revision,
        title: initialRecord.document.title,
      })
    ));
    return useNotebookLibrarySession({
      instanceId: 'notebook.library.session.test',
      onUpdateSurfaceState: (_, nextState) => setSurfaceState(nextState),
      service,
      surfaceState,
    });
  });
}

describe('Notebook library session operations', () => {
  it('saves an unchanged migrated record on explicit Save without rewriting it on open', async () => {
    const source = record('library.schema-upgrade', 'Schema Upgrade');
    const base = createInMemoryNotebookLibraryPort([source]);
    let saves = 0;
    const library: NotebookLibraryPort = {
      ...base,
      loadedDocumentVersion(libraryId) {
        return libraryId === source.libraryId ? 10 : base.loadedDocumentVersion(libraryId);
      },
      async save(nextRecord, options) {
        saves += 1;
        return base.save(nextRecord, options);
      },
    };
    const hook = renderLibrarySession(library, source);

    await waitFor(() => expect(hook.result.current.record?.libraryId).toBe(source.libraryId));
    expect(saves).toBe(0);
    expect(hook.result.current.saveStatus).toBe('saved');

    await act(async () => {
      expect(await hook.result.current.saveNow()).toBe(true);
    });
    expect(saves).toBe(1);
    expect((await library.load(source.libraryId))?.revision).toBe(2);
    expect(hook.result.current.saveStatus).toBe('saved');
  });

  it('classifies string-based open failures, exposes raw recovery, and retries in place', async () => {
    const source = record('library.retry', 'Retry Notebook');
    const base = createInMemoryNotebookLibraryPort([source]);
    let attempts = 0;
    const library: NotebookLibraryPort = {
      ...base,
      async load(libraryId) {
        attempts += 1;
        if (attempts === 1) {
          throw 'NOTEBOOK_SCHEMA_NEWER: This Notebook requires a newer Calcwiz version.';
        }
        return base.load(libraryId);
      },
    };
    const hook = renderLibrarySession(library, source);

    await waitFor(() => expect(hook.result.current.openFailure?.kind).toBe('newer-schema'));
    await waitFor(() => expect(hook.result.current.rawRecoveryAvailable).toBe(true));
    const recovery = await hook.result.current.exportRawRecovery();
    expect(recovery.bytes.byteLength).toBeGreaterThan(0);
    expect(recovery.fileName).toBe('Raw recovery - Retry Notebook.json');
    act(() => hook.result.current.retryOpen());
    await waitFor(() => expect(hook.result.current.record?.libraryId).toBe(source.libraryId));
    expect(hook.result.current.openFailure).toBeNull();
  });

  it('renames the active record and duplicates it with fresh document and library identities', async () => {
    const assetId = `sha256:${'a'.repeat(64)}`;
    const source = record('library.source', 'Source Notebook', [assetId]);
    const library = createInMemoryNotebookLibraryPort([source]);
    const hook = renderLibrarySession(library, source);

    await waitFor(() => expect(hook.result.current.record?.libraryId).toBe(source.libraryId));

    await act(async () => {
      await hook.result.current.renameRecord(source.libraryId, 'Renamed Notebook');
    });
    const renamed = await library.load(source.libraryId);
    expect(renamed).toMatchObject({
      revision: 2,
      document: { title: 'Renamed Notebook' },
    });

    let duplicate: NotebookStoredRecordV1;
    await act(async () => {
      duplicate = await hook.result.current.duplicateRecord(source.libraryId);
    });
    expect(duplicate!).toMatchObject({
      revision: 1,
      assetIds: [assetId],
      document: { title: 'Renamed Notebook copy' },
    });
    expect(duplicate!.libraryId).not.toBe(source.libraryId);
    expect(duplicate!.document.id).not.toBe(renamed!.document.id);
    expect(await library.listVersions(duplicate!.libraryId)).toEqual([
      expect.objectContaining({ reason: 'initial', revision: 1 }),
    ]);
  });

  it('moves the current and other records to Trash with partial failures, then restores and deletes batches', async () => {
    const current = record('library.current', 'Current');
    const other = record('library.other', 'Other');
    const base = createInMemoryNotebookLibraryPort([current, other]);
    const library: NotebookLibraryPort = {
      ...base,
      async deletePermanently(libraryId) {
        if (libraryId === 'library.fail-delete') {
          throw new Error('Delete failed locally.');
        }
        await base.deletePermanently(libraryId);
      },
    };
    const hook = renderLibrarySession(library, current);

    await waitFor(() => expect(hook.result.current.record?.libraryId).toBe(current.libraryId));

    let moved: Awaited<ReturnType<typeof hook.result.current.moveLibraryRecords>>;
    await act(async () => {
      moved = await hook.result.current.moveLibraryRecords([
        current.libraryId,
        other.libraryId,
        'library.missing',
      ]);
    });
    expect(moved!).toMatchObject({
      succeededIds: expect.arrayContaining([current.libraryId, other.libraryId]),
      failures: [expect.objectContaining({ libraryId: 'library.missing' })],
    });
    expect(hook.result.current.record?.libraryId).not.toBe(current.libraryId);
    expect(await library.listTrash()).toEqual(expect.arrayContaining([
      expect.objectContaining({ libraryId: current.libraryId }),
      expect.objectContaining({ libraryId: other.libraryId }),
    ]));
    expect(await library.listVersions(current.libraryId)).toEqual(expect.arrayContaining([
      expect.objectContaining({ reason: 'before-trash' }),
    ]));

    let restored: Awaited<ReturnType<typeof hook.result.current.restoreTrashRecords>>;
    await act(async () => {
      restored = await hook.result.current.restoreTrashRecords([
        current.libraryId,
        other.libraryId,
        'library.missing',
      ]);
    });
    expect(restored!).toMatchObject({
      succeededIds: expect.arrayContaining([current.libraryId, other.libraryId]),
      failures: [expect.objectContaining({ libraryId: 'library.missing' })],
    });

    await base.moveToTrash(other.libraryId);
    let deleted: Awaited<ReturnType<typeof hook.result.current.deleteTrashRecords>>;
    await act(async () => {
      deleted = await hook.result.current.deleteTrashRecords([
        other.libraryId,
        'library.fail-delete',
      ]);
    });
    expect(deleted!).toEqual({
      succeededIds: [other.libraryId],
      failures: [{ libraryId: 'library.fail-delete', message: 'Delete failed locally.' }],
    });
    expect(await library.listTrash()).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ libraryId: other.libraryId }),
    ]));
  });
});
