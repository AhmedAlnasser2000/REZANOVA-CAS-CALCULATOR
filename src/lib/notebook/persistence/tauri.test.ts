import { invoke } from '@tauri-apps/api/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createNotebookRichDocument } from '../document/model';
import {
  createNotebookStoredRecordV1,
  createNotebookVersionSnapshotV1,
  summarizeNotebookStoredRecordV1,
} from './contracts';
import { createTauriNotebookPorts } from './tauri';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockedInvoke = vi.mocked(invoke);

function enableDesktopRuntime() {
  vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
}

function createRecord() {
  const document = createNotebookRichDocument({
    idPrefix: 'tauri-persistence',
    now: () => new Date('2026-07-14T00:00:00.000Z'),
    title: 'Desktop record',
  });
  return createNotebookStoredRecordV1(document, {
    libraryId: 'desktop.record.1',
    savedAt: '2026-07-14T00:00:00.000Z',
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('Tauri Notebook persistence ports', () => {
  it('fails explicitly when desktop storage is unavailable', async () => {
    const ports = createTauriNotebookPorts();

    await expect(ports.library.list()).rejects.toThrow(/unavailable/);
    expect(mockedInvoke).not.toHaveBeenCalled();
  });

  it('validates record summaries and preserves create-only save intent', async () => {
    enableDesktopRuntime();
    const record = createRecord();
    mockedInvoke.mockImplementation(async (command) => {
      if (command === 'notebook_list_records') {
        return [summarizeNotebookStoredRecordV1(record)];
      }
      if (command === 'notebook_save_record') {
        return record;
      }
      throw new Error(`Unexpected command: ${command}`);
    });
    const ports = createTauriNotebookPorts();

    const listed = await ports.library.list();
    expect(listed).toEqual([expect.objectContaining({
      libraryId: record.libraryId,
      revision: 1,
      title: 'Desktop record',
    })]);
    await ports.library.save(record, { expectedRevision: null });
    expect(mockedInvoke).toHaveBeenLastCalledWith('notebook_save_record', {
      expectedRevision: null,
      requireAbsent: true,
      record,
    });

    mockedInvoke.mockResolvedValueOnce([{ version: 1, libraryId: '../escape' }]);
    await expect(ports.library.list()).rejects.toThrow(/invalid record list/);
  });

  it('rejects malformed native bytes and package inspection payloads', async () => {
    enableDesktopRuntime();
    const record = createRecord();
    const ports = createTauriNotebookPorts();

    mockedInvoke.mockResolvedValueOnce([80, 75, 300]);
    await expect(ports.package.exportPortable(record)).rejects.toThrow(/invalid package/);

    mockedInvoke.mockResolvedValueOnce({ manifest: {}, document: record.document });
    await expect(ports.package.inspectPortable(new Uint8Array([80, 75])))
      .rejects.toThrow(/invalid package inspection/);

    mockedInvoke.mockResolvedValueOnce({
      metadata: {
        version: 1,
        id: `sha256:${'0'.repeat(64)}`,
        sha256: '0'.repeat(64),
        byteLength: 1,
        mimeType: 'image/png',
        createdAt: '2026-07-14T00:00:00.000Z',
      },
      bytes: [-1],
    });
    await expect(ports.asset.load(`sha256:${'0'.repeat(64)}`))
      .rejects.toThrow(/invalid asset bytes/);
  });

  it('validates and routes native version-history and Trash operations', async () => {
    enableDesktopRuntime();
    const record = createRecord();
    const snapshot = createNotebookVersionSnapshotV1(record, {
      createdAt: '2026-07-14T00:05:00.000Z',
      reason: 'before-trash',
      snapshotId: 'snapshot.desktop.1',
    });
    mockedInvoke.mockImplementation(async (command) => {
      if (command === 'notebook_list_versions') return [snapshot];
      if (command === 'notebook_list_trash') return [summarizeNotebookStoredRecordV1(record)];
      if (command === 'notebook_move_record_to_trash'
        || command === 'notebook_restore_record_from_trash') return record;
      if (command === 'notebook_save_version'
        || command === 'notebook_delete_record_permanently') return null;
      throw new Error(`Unexpected command: ${command}`);
    });
    const ports = createTauriNotebookPorts();

    expect(await ports.library.listVersions(record.libraryId)).toEqual([snapshot]);
    await ports.library.saveVersion(snapshot);
    expect(await ports.library.moveToTrash(record.libraryId)).toEqual(record);
    expect(await ports.library.listTrash()).toEqual([
      expect.objectContaining({ libraryId: record.libraryId }),
    ]);
    expect(await ports.library.restoreFromTrash(record.libraryId)).toEqual(record);
    await ports.library.deletePermanently(record.libraryId);
    expect(mockedInvoke).toHaveBeenCalledWith('notebook_delete_record_permanently', {
      libraryId: record.libraryId,
    });
  });
});
