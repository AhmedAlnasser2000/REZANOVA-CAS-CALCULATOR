import {
  cloneNotebookAssetPayloadV1,
  cloneNotebookStoredRecordV1,
  isNotebookAssetId,
  isNotebookAssetMetadataV1,
  isNotebookStoredRecordV1,
  isNotebookSupportedAssetMimeType,
  notebookSha256Hex,
  summarizeNotebookStoredRecordV1,
  type NotebookAssetMetadataV1,
  type NotebookAssetPayloadV1,
} from './contracts';
import type {
  NotebookAssetPort,
  NotebookLibraryPort,
} from './port';

const NOTEBOOK_INDEXED_DB_VERSION = 1;
const RECORD_STORE = 'records';
const ASSET_STORE = 'assets';

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

  const library: NotebookLibraryPort = {
    async list() {
      const db = await database;
      const transaction = db.transaction(RECORD_STORE, 'readonly');
      const records = await requestResult(transaction.objectStore(RECORD_STORE).getAll());
      await transactionComplete(transaction);
      return records
        .filter(isNotebookStoredRecordV1)
        .map(summarizeNotebookStoredRecordV1)
        .sort((left, right) => right.savedAt.localeCompare(left.savedAt));
    },
    async load(libraryId) {
      const db = await database;
      const transaction = db.transaction(RECORD_STORE, 'readonly');
      const value = await requestResult(transaction.objectStore(RECORD_STORE).get(libraryId));
      await transactionComplete(transaction);
      return isNotebookStoredRecordV1(value) ? cloneNotebookStoredRecordV1(value) : null;
    },
    async save(record, saveOptions = {}) {
      if (!isNotebookStoredRecordV1(record)) {
        throw new TypeError('Notebook IndexedDB accepts stored-record version 1 only.');
      }
      const db = await database;
      const transaction = db.transaction(RECORD_STORE, 'readwrite');
      const store = transaction.objectStore(RECORD_STORE);
      const current = await requestResult(store.get(record.libraryId));
      const currentRecord = isNotebookStoredRecordV1(current) ? current : null;
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
  };

  const asset: NotebookAssetPort = {
    async put(bytes, mimeType, createdAt = new Date().toISOString()) {
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

  return { asset, library };
}
