import {
  cloneNotebookAssetPayloadV1,
  cloneNotebookStoredRecordV1,
  cloneNotebookVersionSnapshotV1,
  isNotebookAssetId,
  isNotebookAssetMetadataV1,
  isNotebookStoredRecordV1,
  isNotebookSupportedAssetMimeType,
  isNotebookVersionSnapshotV1,
  migrateDurableNotebookVersionSnapshotV1,
  notebookStoredRecordDocumentVersion,
  notebookSha256Hex,
  requireDurableNotebookStoredRecordV1,
  requireDurableNotebookVersionSnapshotV1,
  summarizeNotebookStoredRecordV1,
  NOTEBOOK_VERSION_HISTORY_MAX_AGE_MS,
  NOTEBOOK_VERSION_HISTORY_MAX_COUNT,
  type NotebookAssetMetadataV1,
  type NotebookAssetPayloadV1,
  type NotebookVersionSnapshotV1,
} from './contracts';
import type {
  NotebookAssetPort,
  NotebookLibraryPort,
} from './port';

const NOTEBOOK_INDEXED_DB_VERSION = 2;
const RECORD_STORE = 'records';
const ASSET_STORE = 'assets';
const TRASH_STORE = 'trash';
const VERSION_STORE = 'versions';

type StoredAsset = {
  id: string;
  metadata: NotebookAssetMetadataV1;
  bytes: Uint8Array;
};

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(
      request.error ?? new Error('Notebook IndexedDB request failed.'),
    ), { once: true });
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true });
    transaction.addEventListener('abort', () => reject(
      transaction.error ?? new Error('Notebook IndexedDB transaction was aborted.'),
    ), { once: true });
    transaction.addEventListener('error', () => reject(
      transaction.error ?? new Error('Notebook IndexedDB transaction failed.'),
    ), { once: true });
  });
}

async function pruneVersionStore(
  store: IDBObjectStore,
  libraryId: string,
  createdAt: string,
) {
  const values = (await requestResult(store.getAll()) as unknown[])
    .map(migrateDurableNotebookVersionSnapshotV1)
    .filter((candidate): candidate is NotebookVersionSnapshotV1 => candidate !== null);
  const cutoff = Date.parse(createdAt) - NOTEBOOK_VERSION_HISTORY_MAX_AGE_MS;
  const expired = values
    .filter((candidate) => candidate.libraryId === libraryId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .filter((candidate, index) => (
      index >= NOTEBOOK_VERSION_HISTORY_MAX_COUNT
      || Date.parse(candidate.createdAt) < cutoff
    ));
  await Promise.all(expired.map((candidate) => requestResult(store.delete(
    candidate.snapshotId,
  ))));
}

function openNotebookDatabase(indexedDb: IDBFactory, databaseName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(databaseName, NOTEBOOK_INDEXED_DB_VERSION);
    request.addEventListener('upgradeneeded', () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RECORD_STORE)) {
        database.createObjectStore(RECORD_STORE, { keyPath: 'libraryId' });
      }
      if (!database.objectStoreNames.contains(ASSET_STORE)) {
        database.createObjectStore(ASSET_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(TRASH_STORE)) {
        database.createObjectStore(TRASH_STORE, { keyPath: 'libraryId' });
      }
      if (!database.objectStoreNames.contains(VERSION_STORE)) {
        database.createObjectStore(VERSION_STORE, { keyPath: 'snapshotId' });
      }
    });
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(
      request.error ?? new Error('Notebook IndexedDB could not open.'),
    ), { once: true });
    request.addEventListener('blocked', () => reject(
      new Error('Notebook IndexedDB upgrade is blocked by another tab.'),
    ), { once: true });
  });
}

export type IndexedDbNotebookPorts = {
  asset: NotebookAssetPort;
  library: NotebookLibraryPort;
};

export function createIndexedDbNotebookPorts(options: {
  databaseName?: string;
  indexedDb?: IDBFactory;
} = {}): IndexedDbNotebookPorts {
  const indexedDb = options.indexedDb ?? globalThis.indexedDB;
  if (!indexedDb) {
    throw new Error('Notebook IndexedDB storage is unavailable.');
  }
  const databaseName = options.databaseName ?? 'calcwiz-notebook-library-v1';
  const database = openNotebookDatabase(indexedDb, databaseName);
  const loadedDocumentVersions = new Map<string, number>();

  const library: NotebookLibraryPort = {
    async list() {
      const db = await database;
      const transaction = db.transaction(RECORD_STORE, 'readonly');
      const records = await requestResult(transaction.objectStore(RECORD_STORE).getAll());
      await transactionComplete(transaction);
      return records
        .map(requireDurableNotebookStoredRecordV1)
        .map(summarizeNotebookStoredRecordV1)
        .sort((left, right) => right.savedAt.localeCompare(left.savedAt));
    },
    async load(libraryId) {
      const db = await database;
      const transaction = db.transaction(RECORD_STORE, 'readonly');
      const value = await requestResult(transaction.objectStore(RECORD_STORE).get(libraryId));
      await transactionComplete(transaction);
      if (value === undefined) {
        loadedDocumentVersions.delete(libraryId);
        return null;
      }
      const sourceDocumentVersion = notebookStoredRecordDocumentVersion(value);
      if (sourceDocumentVersion === null) {
        throw new TypeError('Notebook stored record is missing its document schema.');
      }
      loadedDocumentVersions.set(libraryId, sourceDocumentVersion);
      return cloneNotebookStoredRecordV1(requireDurableNotebookStoredRecordV1(value));
    },
    loadedDocumentVersion(libraryId) {
      return loadedDocumentVersions.get(libraryId) ?? null;
    },
    async loadRawRecovery(libraryId) {
      const db = await database;
      const transaction = db.transaction(RECORD_STORE, 'readonly');
      const value = await requestResult(transaction.objectStore(RECORD_STORE).get(libraryId));
      await transactionComplete(transaction);
      return value === undefined
        ? null
        : new TextEncoder().encode(JSON.stringify(value, null, 2));
    },
    async save(record, saveOptions = {}) {
      if (!isNotebookStoredRecordV1(record)) {
        throw new TypeError('Notebook IndexedDB accepts stored-record version 1 only.');
      }
      const db = await database;
      const preflightTransaction = db.transaction(RECORD_STORE, 'readonly');
      const preflightCurrent = await requestResult(
        preflightTransaction.objectStore(RECORD_STORE).get(record.libraryId),
      );
      await transactionComplete(preflightTransaction);
      const preflightRecord = preflightCurrent === undefined
        ? null
        : requireDurableNotebookStoredRecordV1(preflightCurrent);
      const preflightSourceVersion = notebookStoredRecordDocumentVersion(preflightCurrent);
      const upgradeSnapshotId = preflightRecord
        && preflightSourceVersion !== null
        && preflightSourceVersion < record.document.version
        ? `snapshot.schema-upgrade.${await notebookSha256Hex(new TextEncoder().encode(
            `${preflightRecord.libraryId}:${preflightRecord.revision}`,
          ))}`
        : null;
      const transaction = db.transaction([RECORD_STORE, VERSION_STORE], 'readwrite');
      const store = transaction.objectStore(RECORD_STORE);
      const versionStore = transaction.objectStore(VERSION_STORE);
      const current = await requestResult(store.get(record.libraryId));
      const currentRecord = current === undefined
        ? null
        : requireDurableNotebookStoredRecordV1(current);
      if (
        saveOptions.expectedRevision !== undefined
        && (currentRecord?.revision ?? null) !== saveOptions.expectedRevision
      ) {
        transaction.abort();
        throw new Error('Notebook revision conflict.');
      }
      if (currentRecord && record.revision <= currentRecord.revision) {
        transaction.abort();
        throw new Error('Notebook revision must advance.');
      }
      const sourceVersion = notebookStoredRecordDocumentVersion(current);
      if (currentRecord && sourceVersion !== null && sourceVersion < record.document.version) {
        if (!upgradeSnapshotId || currentRecord.revision !== preflightRecord?.revision) {
          transaction.abort();
          throw new Error('Notebook revision conflict.');
        }
        const snapshotId = upgradeSnapshotId;
        const existing = await requestResult(versionStore.get(snapshotId));
        if (existing === undefined) {
          await requestResult(versionStore.put({
            version: 1,
            snapshotId,
            libraryId: currentRecord.libraryId,
            revision: currentRecord.revision,
            createdAt: record.savedAt,
            reason: 'before-schema-upgrade',
            record: current,
          }));
        } else {
          const existingSnapshot = migrateDurableNotebookVersionSnapshotV1(existing);
          if (!existingSnapshot
            || existingSnapshot.libraryId !== currentRecord.libraryId
            || existingSnapshot.revision !== currentRecord.revision
            || existingSnapshot.reason !== 'before-schema-upgrade') {
            transaction.abort();
            throw new Error('Notebook schema-upgrade snapshot conflicts with stored history.');
          }
        }
        await pruneVersionStore(versionStore, currentRecord.libraryId, record.savedAt);
      }
      const stored = cloneNotebookStoredRecordV1(record);
      await requestResult(store.put(stored));
      await transactionComplete(transaction);
      return cloneNotebookStoredRecordV1(stored);
    },
    async delete(libraryId) {
      const db = await database;
      const transaction = db.transaction(RECORD_STORE, 'readwrite');
      await requestResult(transaction.objectStore(RECORD_STORE).delete(libraryId));
      await transactionComplete(transaction);
    },
    async listVersions(libraryId) {
      const db = await database;
      const transaction = db.transaction(VERSION_STORE, 'readonly');
      const values = await requestResult(transaction.objectStore(VERSION_STORE).getAll());
      await transactionComplete(transaction);
      return values
        .map(migrateDurableNotebookVersionSnapshotV1)
        .filter((snapshot): snapshot is NonNullable<typeof snapshot> => snapshot !== null)
        .filter((snapshot) => snapshot.libraryId === libraryId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map(cloneNotebookVersionSnapshotV1);
    },
    async saveVersion(snapshot) {
      if (!isNotebookVersionSnapshotV1(snapshot)) {
        throw new TypeError('Notebook IndexedDB accepts snapshot version 1 only.');
      }
      const db = await database;
      const transaction = db.transaction(VERSION_STORE, 'readwrite');
      const store = transaction.objectStore(VERSION_STORE);
      await requestResult(store.put(cloneNotebookVersionSnapshotV1(snapshot)));
      await pruneVersionStore(store, snapshot.libraryId, snapshot.createdAt);
      await transactionComplete(transaction);
    },
    async moveToTrash(libraryId) {
      const db = await database;
      const transaction = db.transaction([RECORD_STORE, TRASH_STORE], 'readwrite');
      const recordStore = transaction.objectStore(RECORD_STORE);
      const value = await requestResult(recordStore.get(libraryId));
      if (value === undefined) {
        transaction.abort();
        throw new Error('Notebook record does not exist.');
      }
      const migrated = requireDurableNotebookStoredRecordV1(value);
      await requestResult(transaction.objectStore(TRASH_STORE).put(value));
      await requestResult(recordStore.delete(libraryId));
      await transactionComplete(transaction);
      return cloneNotebookStoredRecordV1(migrated);
    },
    async listTrash() {
      const db = await database;
      const transaction = db.transaction(TRASH_STORE, 'readonly');
      const values = await requestResult(transaction.objectStore(TRASH_STORE).getAll());
      await transactionComplete(transaction);
      return values
        .map(requireDurableNotebookStoredRecordV1)
        .map(summarizeNotebookStoredRecordV1)
        .sort((left, right) => right.savedAt.localeCompare(left.savedAt));
    },
    async restoreFromTrash(libraryId) {
      const db = await database;
      const transaction = db.transaction([RECORD_STORE, TRASH_STORE], 'readwrite');
      const recordStore = transaction.objectStore(RECORD_STORE);
      if ((await requestResult(recordStore.get(libraryId))) !== undefined) {
        transaction.abort();
        throw new Error('Notebook library identity is already active.');
      }
      const trashStore = transaction.objectStore(TRASH_STORE);
      const value = await requestResult(trashStore.get(libraryId));
      if (value === undefined) {
        transaction.abort();
        throw new Error('Notebook trash record does not exist.');
      }
      const migrated = requireDurableNotebookStoredRecordV1(value);
      await requestResult(recordStore.put(value));
      await requestResult(trashStore.delete(libraryId));
      await transactionComplete(transaction);
      return cloneNotebookStoredRecordV1(migrated);
    },
    async deletePermanently(libraryId) {
      const db = await database;
      const transaction = db.transaction([TRASH_STORE, VERSION_STORE], 'readwrite');
      await requestResult(transaction.objectStore(TRASH_STORE).delete(libraryId));
      const versionStore = transaction.objectStore(VERSION_STORE);
      const values = await requestResult(versionStore.getAll());
      await Promise.all(values
        .map(requireDurableNotebookVersionSnapshotV1)
        .filter((snapshot) => snapshot.libraryId === libraryId)
        .map((snapshot) => requestResult(versionStore.delete(snapshot.snapshotId))));
      await transactionComplete(transaction);
    },
  };

  const asset: NotebookAssetPort = {
    async put(bytes, mimeType, createdAt = new Date().toISOString(), options) {
      if (!isNotebookSupportedAssetMimeType(mimeType)) {
        throw new TypeError('Notebook asset type is unsupported.');
      }
      const sha256 = await notebookSha256Hex(bytes);
      const metadata: NotebookAssetMetadataV1 = {
        version: 1,
        id: `sha256:${sha256}`,
        sha256,
        byteLength: bytes.byteLength,
        mimeType,
        createdAt,
        ...(options?.imageWidthPx !== undefined ? { imageWidthPx: options.imageWidthPx } : {}),
        ...(options?.imageHeightPx !== undefined ? { imageHeightPx: options.imageHeightPx } : {}),
      };
      if (!isNotebookAssetMetadataV1(metadata)) {
        throw new TypeError('Notebook asset metadata is invalid.');
      }
      const db = await database;
      const transaction = db.transaction(ASSET_STORE, 'readwrite');
      const store = transaction.objectStore(ASSET_STORE);
      const current = await requestResult(store.get(metadata.id)) as StoredAsset | undefined;
      if (current && current.metadata.mimeType !== metadata.mimeType) {
        transaction.abort();
        throw new Error('Notebook asset hash already exists with a different media type.');
      }
      if (current) {
        await transactionComplete(transaction);
        return { ...current.metadata };
      }
      const stored: StoredAsset = {
        id: metadata.id,
        metadata: { ...metadata },
        bytes: new Uint8Array(bytes),
      };
      await requestResult(store.put(stored));
      await transactionComplete(transaction);
      return { ...metadata };
    },
    async load(assetId) {
      if (!isNotebookAssetId(assetId)) {
        return null;
      }
      const db = await database;
      const transaction = db.transaction(ASSET_STORE, 'readonly');
      const value = await requestResult(transaction.objectStore(ASSET_STORE).get(assetId));
      await transactionComplete(transaction);
      const stored = value as StoredAsset | undefined;
      if (!stored || !isNotebookAssetMetadataV1(stored.metadata)) {
        return null;
      }
      const payload: NotebookAssetPayloadV1 = {
        metadata: stored.metadata,
        bytes: new Uint8Array(stored.bytes),
      };
      return cloneNotebookAssetPayloadV1(payload);
    },
    async delete(assetId) {
      const db = await database;
      const transaction = db.transaction(ASSET_STORE, 'readwrite');
      await requestResult(transaction.objectStore(ASSET_STORE).delete(assetId));
      await transactionComplete(transaction);
    },
  };
  asset.putBlob = async (blob, mimeType, createdAt) => asset.put(
    new Uint8Array(await blob.arrayBuffer()),
    mimeType,
    createdAt,
  );

  return { asset, library };
}
