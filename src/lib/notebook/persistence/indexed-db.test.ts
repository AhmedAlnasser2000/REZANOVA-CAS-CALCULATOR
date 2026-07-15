import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';

import { createNotebookRichDocument } from '../document/model';
import {
  createNotebookStoredRecordV1,
  createNotebookVersionSnapshotV1,
} from './contracts';
import { createIndexedDbNotebookPorts } from './indexed-db';

function createPorts(name: string, indexedDb = new IDBFactory()) {
  return createIndexedDbNotebookPorts({
    databaseName: `notebook-persistence-${name}`,
    indexedDb,
  });
}

function openDatabase(indexedDb: IDBFactory, name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(name, 2);
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(request.error), { once: true });
  });
}

function complete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true });
    transaction.addEventListener('error', () => reject(transaction.error), { once: true });
    transaction.addEventListener('abort', () => reject(transaction.error), { once: true });
  });
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(request.error), { once: true });
  });
}

function createRecord() {
  const document = createNotebookRichDocument({
    idPrefix: 'indexed-db',
    now: () => new Date('2026-07-14T00:00:00.000Z'),
    title: 'Browser record',
  });
  return createNotebookStoredRecordV1(document, {
    libraryId: 'browser.record.1',
    savedAt: '2026-07-14T00:00:00.000Z',
  });
}

describe('IndexedDB Notebook persistence ports', () => {
  it('persists isolated records and enforces revision ownership', async () => {
    const ports = createPorts('records');
    const first = createRecord();

    await ports.library.save(first, { expectedRevision: null });
    expect(await ports.library.list()).toEqual([expect.objectContaining({
      libraryId: first.libraryId,
      revision: 1,
      title: 'Browser record',
    })]);

    const loaded = await ports.library.load(first.libraryId);
    expect(loaded).toEqual(first);
    loaded!.document.title = 'Mutated copy';
    expect((await ports.library.load(first.libraryId))?.document.title).toBe('Browser record');

    await expect(ports.library.save({ ...first, revision: 2 }, { expectedRevision: 0 }))
      .rejects.toThrow(/conflict/);
    await ports.library.save({
      ...first,
      revision: 2,
      savedAt: '2026-07-14T00:00:01.000Z',
    }, { expectedRevision: 1 });
    await expect(ports.library.save({ ...first, revision: 2 }))
      .rejects.toThrow(/advance/);

    await ports.library.delete(first.libraryId);
    expect(await ports.library.load(first.libraryId)).toBeNull();
  });

  it('deduplicates content-addressed assets and isolates loaded bytes', async () => {
    const ports = createPorts('assets');
    const bytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>');

    const first = await ports.asset.put(
      bytes,
      'image/svg+xml',
      '2026-07-14T00:00:00.000Z',
    );
    const second = await ports.asset.put(
      bytes,
      'image/svg+xml',
      '2026-07-14T00:00:01.000Z',
    );
    expect(second.id).toBe(first.id);
    const loaded = await ports.asset.load(first.id);
    expect(loaded?.bytes).toEqual(bytes);
    loaded!.bytes.fill(0);
    expect((await ports.asset.load(first.id))?.bytes).toEqual(bytes);

    await expect(ports.asset.put(bytes, 'video/mp4'))
      .rejects.toThrow(/different media type/);
    await ports.asset.delete(first.id);
    expect(await ports.asset.load(first.id)).toBeNull();
  });

  it('persists version history and moves records through Trash atomically', async () => {
    const ports = createPorts('history-trash');
    const record = createRecord();
    await ports.library.save(record, { expectedRevision: null });
    const snapshot = createNotebookVersionSnapshotV1(record, {
      createdAt: '2026-07-14T00:05:00.000Z',
      reason: 'before-trash',
      snapshotId: 'snapshot.browser.1',
    });
    await ports.library.saveVersion(snapshot);
    expect(await ports.library.listVersions(record.libraryId)).toEqual([snapshot]);

    await ports.library.moveToTrash(record.libraryId);
    expect(await ports.library.load(record.libraryId)).toBeNull();
    expect(await ports.library.listTrash()).toEqual([
      expect.objectContaining({ libraryId: record.libraryId }),
    ]);
    await ports.library.restoreFromTrash(record.libraryId);
    expect(await ports.library.load(record.libraryId)).toEqual(record);
    await ports.library.moveToTrash(record.libraryId);
    await ports.library.deletePermanently(record.libraryId);
    expect(await ports.library.listTrash()).toEqual([]);
    expect(await ports.library.listVersions(record.libraryId)).toEqual([]);
  });

  it('hydrates V6 through V10 records and snapshots through the V11 browser contract', async () => {
    const name = 'legacy-v6-v10';
    const databaseName = `notebook-persistence-${name}`;
    const indexedDb = new IDBFactory();
    const ports = createPorts(name, indexedDb);
    const current = createRecord();
    await ports.library.save(current, { expectedRevision: null });

    const legacyRecords = [6, 7, 8, 9, 10].map((version) => {
      const legacy = JSON.parse(JSON.stringify(current));
      legacy.libraryId = `browser.record.v${version}`;
      legacy.document.id = `notebook.browser.v${version}`;
      legacy.document.version = version;
      if (version < 8) {
        delete legacy.document.pageSetup;
        delete legacy.document.headerFooter;
      } else {
        legacy.document.headerFooter = {
          headerText: '', footerText: '', differentFirstPage: false,
          pageNumbering: { enabled: false, position: 'center', startAt: 1 },
        };
      }
      return legacy;
    });
    const database = await openDatabase(indexedDb, databaseName);
    const transaction = database.transaction(['records', 'versions'], 'readwrite');
    legacyRecords.forEach((legacy) => {
      transaction.objectStore('records').put(legacy);
      transaction.objectStore('versions').put({
        version: 1,
        snapshotId: `snapshot.browser.v${legacy.document.version}`,
        libraryId: legacy.libraryId,
        revision: legacy.revision,
        createdAt: '2026-07-14T00:05:00.000Z',
        reason: 'periodic',
        record: legacy,
      });
    });
    await complete(transaction);
    database.close();

    for (const legacy of legacyRecords) {
      const loaded = await ports.library.load(legacy.libraryId);
      expect(loaded?.document.version).toBe(12);
      expect(loaded?.document.content).toEqual(legacy.document.content);
      const versions = await ports.library.listVersions(legacy.libraryId);
      expect(versions[0]?.record.document.version).toBe(12);
      expect(versions[0]?.record.document.content).toEqual(legacy.document.content);
    }
  });

  it('keeps V10 raw until save, then stores one raw upgrade snapshot atomically', async () => {
    const name = 'legacy-upgrade-save';
    const databaseName = `notebook-persistence-${name}`;
    const indexedDb = new IDBFactory();
    const ports = createPorts(name, indexedDb);
    const current = createRecord();
    const legacy = structuredClone(current) as unknown as Record<string, unknown>;
    legacy.revision = 4;
    legacy.savedAt = '2026-01-01T00:00:04.000Z';
    const legacyDocument = legacy.document as Record<string, unknown>;
    legacyDocument.version = 10;
    legacyDocument.headerFooter = {
      headerText: 'Course notes',
      footerText: 'Calculus',
      differentFirstPage: true,
      pageNumbering: { enabled: true, position: 'right', startAt: 7 },
    };
    const database = await openDatabase(indexedDb, databaseName);
    const seed = database.transaction('records', 'readwrite');
    seed.objectStore('records').put(legacy);
    await complete(seed);
    database.close();

    const loaded = await ports.library.load(current.libraryId);
    expect(loaded?.document.version).toBe(12);
    expect(loaded?.document.headerFooter.pageNumberStart).toBe(7);
    let inspection = await openDatabase(indexedDb, databaseName);
    let transaction = inspection.transaction('records', 'readonly');
    expect((await requestValue<Record<string, unknown>>(
      transaction.objectStore('records').get(current.libraryId),
    ).then((value) => (value.document as Record<string, unknown>).version))).toBe(10);
    await complete(transaction);
    inspection.close();

    await ports.library.save({
      ...loaded!,
      revision: 5,
      savedAt: '2026-07-15T00:00:05.000Z',
    }, { expectedRevision: 4 });
    const versions = await ports.library.listVersions(current.libraryId);
    expect(versions).toEqual([
      expect.objectContaining({ reason: 'before-schema-upgrade', revision: 4 }),
    ]);
    inspection = await openDatabase(indexedDb, databaseName);
    transaction = inspection.transaction(['records', 'versions'], 'readonly');
    const stored = await requestValue<Record<string, unknown>>(
      transaction.objectStore('records').get(current.libraryId),
    );
    const rawSnapshots = await requestValue<Record<string, unknown>[]>(
      transaction.objectStore('versions').getAll(),
    );
    expect((stored.document as Record<string, unknown>).version).toBe(12);
    expect(((rawSnapshots[0].record as Record<string, unknown>).document as Record<string, unknown>).version)
      .toBe(10);
    await complete(transaction);
    inspection.close();

    await ports.library.save({
      ...loaded!,
      revision: 6,
      savedAt: '2026-07-15T00:00:06.000Z',
    }, { expectedRevision: 5 });
    expect(await ports.library.listVersions(current.libraryId)).toHaveLength(1);
  });

  it('rejects pre-V6 and future durable records with specific recovery states', async () => {
    const name = 'unsupported-schemas';
    const databaseName = `notebook-persistence-${name}`;
    const indexedDb = new IDBFactory();
    const ports = createPorts(name, indexedDb);
    const current = createRecord();
    const database = await openDatabase(indexedDb, databaseName);
    const transaction = database.transaction('records', 'readwrite');
    for (const [libraryId, version] of [['browser.record.v5', 5], ['browser.record.v13', 13]] as const) {
      const candidate = structuredClone(current) as unknown as Record<string, unknown>;
      candidate.libraryId = libraryId;
      (candidate.document as Record<string, unknown>).version = version;
      transaction.objectStore('records').put(candidate);
    }
    await complete(transaction);
    database.close();

    await expect(ports.library.load('browser.record.v5')).rejects.toThrow(/SCHEMA_PRE_V6/);
    await expect(ports.library.load('browser.record.v13')).rejects.toThrow(/SCHEMA_NEWER/);
    expect(await ports.library.loadRawRecovery('browser.record.v5')).toBeInstanceOf(Uint8Array);
  });
});
