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

function legacyRecord(version = 10) {
  const record = structuredClone(createRecord()) as unknown as Record<string, unknown>;
  const document = record.document as Record<string, unknown>;
  document.version = version;
  document.headerFooter = {
    headerText: 'Course notes',
    footerText: 'Calculus',
    differentFirstPage: true,
    pageNumbering: { enabled: true, position: 'right', startAt: 7 },
  };
  return record;
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

  it('defensively migrates every native record-returning path and exposes raw recovery bytes', async () => {
    enableDesktopRuntime();
    const legacy = legacyRecord();
    const snapshot = {
      version: 1,
      snapshotId: 'snapshot.desktop.legacy',
      libraryId: 'desktop.record.1',
      revision: 1,
      createdAt: '2026-07-14T00:05:00.000Z',
      reason: 'before-schema-upgrade',
      record: legacy,
    };
    mockedInvoke.mockImplementation(async (command) => {
      if (command === 'notebook_load_record') {
        return { record: legacy, sourceDocumentVersion: 10 };
      }
      if (command === 'notebook_move_record_to_trash'
        || command === 'notebook_restore_record_from_trash'
        || command === 'notebook_import_package') return legacy;
      if (command === 'notebook_list_versions') return [snapshot];
      if (command === 'notebook_load_raw_recovery') return [123, 125];
      throw new Error(`Unexpected command: ${command}`);
    });
    const ports = createTauriNotebookPorts();

    expect((await ports.library.load('desktop.record.1'))?.document.version).toBe(12);
    expect(ports.library.loadedDocumentVersion('desktop.record.1')).toBe(10);
    expect((await ports.library.moveToTrash('desktop.record.1')).document.version).toBe(12);
    expect((await ports.library.restoreFromTrash('desktop.record.1')).document.version).toBe(12);
    expect((await ports.library.listVersions('desktop.record.1'))[0].record.document.version)
      .toBe(12);
    expect((await ports.package.importPortable(new Uint8Array([1]))).document.version).toBe(12);
    expect(await ports.library.loadRawRecovery('desktop.record.1'))
      .toEqual(new Uint8Array([123, 125]));
  });

  it('preserves specific unsupported-schema errors returned by the defensive migrator', async () => {
    enableDesktopRuntime();
    const ports = createTauriNotebookPorts();
    mockedInvoke.mockResolvedValueOnce({ record: legacyRecord(5), sourceDocumentVersion: 5 });
    await expect(ports.library.load('desktop.record.1')).rejects.toThrow(/SCHEMA_PRE_V6/);
    mockedInvoke.mockResolvedValueOnce({ record: legacyRecord(13), sourceDocumentVersion: 13 });
    await expect(ports.library.load('desktop.record.1')).rejects.toThrow(/SCHEMA_NEWER/);
  });
});
