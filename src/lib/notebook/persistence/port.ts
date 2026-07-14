import {
  isNotebookRichDocument,
  summarizeNotebookDocument,
} from '../document/model';
import type {
  NotebookDocumentSummary,
  NotebookRichDocument,
} from '../document/types';
import {
  cloneNotebookAssetPayloadV1,
  cloneNotebookStoredRecordV1,
  isNotebookAssetMetadataV1,
  isNotebookStoredRecordV1,
  isNotebookSupportedAssetMimeType,
  notebookSha256Hex,
  summarizeNotebookStoredRecordV1,
  type NotebookAssetMetadataV1,
  type NotebookAssetPayloadV1,
  type NotebookPackageInspectionV1,
  type NotebookStoredRecordSummaryV1,
  type NotebookStoredRecordV1,
  type NotebookSupportedAssetMimeType,
} from './contracts';

export type NotebookPersistencePort = {
  list(): Promise<NotebookDocumentSummary[]>;
  load(id: string): Promise<NotebookRichDocument | null>;
  save(document: NotebookRichDocument): Promise<void>;
  delete(id: string): Promise<void>;
};

export type NotebookLibrarySaveOptions = {
  expectedRevision?: number | null;
};

export type NotebookLibraryPort = {
  list(): Promise<NotebookStoredRecordSummaryV1[]>;
  load(libraryId: string): Promise<NotebookStoredRecordV1 | null>;
  save(
    record: NotebookStoredRecordV1,
    options?: NotebookLibrarySaveOptions,
  ): Promise<NotebookStoredRecordV1>;
  delete(libraryId: string): Promise<void>;
};

export type NotebookAssetPort = {
  put(
    bytes: Uint8Array,
    mimeType: NotebookSupportedAssetMimeType,
    createdAt?: string,
  ): Promise<NotebookAssetMetadataV1>;
  load(assetId: string): Promise<NotebookAssetPayloadV1 | null>;
  delete(assetId: string): Promise<void>;
};

export type NotebookPackagePort = {
  exportPortable(record: NotebookStoredRecordV1): Promise<Uint8Array>;
  inspectPortable(bytes: Uint8Array): Promise<NotebookPackageInspectionV1>;
  importPortable(bytes: Uint8Array): Promise<NotebookStoredRecordV1>;
};

function cloneDocument(document: NotebookRichDocument): NotebookRichDocument {
  return JSON.parse(JSON.stringify(document)) as NotebookRichDocument;
}

export function createInMemoryNotebookPersistencePort(
  initialDocuments: readonly NotebookRichDocument[] = [],
): NotebookPersistencePort {
  const documents = new Map<string, NotebookRichDocument>();
  initialDocuments.forEach((document) => {
    if (!isNotebookRichDocument(document)) {
      throw new TypeError('Notebook persistence accepts valid rich documents only.');
    }
    documents.set(document.id, cloneDocument(document));
  });

  return {
    async list() {
      return [...documents.values()]
        .map(summarizeNotebookDocument)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },
    async load(id) {
      const document = documents.get(id);
      return document ? cloneDocument(document) : null;
    },
    async save(document) {
      if (!isNotebookRichDocument(document)) {
        throw new TypeError('Notebook persistence accepts valid rich documents only.');
      }
      documents.set(document.id, cloneDocument(document));
    },
    async delete(id) {
      documents.delete(id);
    },
  };
}

export function createInMemoryNotebookLibraryPort(
  initialRecords: readonly NotebookStoredRecordV1[] = [],
): NotebookLibraryPort {
  const records = new Map<string, NotebookStoredRecordV1>();
  for (const record of initialRecords) {
    if (!isNotebookStoredRecordV1(record)) {
      throw new TypeError('Notebook library accepts stored-record version 1 only.');
    }
    records.set(record.libraryId, cloneNotebookStoredRecordV1(record));
  }

  return {
    async list() {
      return [...records.values()]
        .map(summarizeNotebookStoredRecordV1)
        .sort((left, right) => right.savedAt.localeCompare(left.savedAt));
    },
    async load(libraryId) {
      const record = records.get(libraryId);
      return record ? cloneNotebookStoredRecordV1(record) : null;
    },
    async save(record, options = {}) {
      if (!isNotebookStoredRecordV1(record)) {
        throw new TypeError('Notebook library accepts stored-record version 1 only.');
      }
      const current = records.get(record.libraryId);
      const expectedRevision = options.expectedRevision;
      if (
        expectedRevision !== undefined
        && (current?.revision ?? null) !== expectedRevision
      ) {
        throw new Error('Notebook revision conflict.');
      }
      if (current && record.revision <= current.revision) {
        throw new Error('Notebook revision must advance.');
      }
      const stored = cloneNotebookStoredRecordV1(record);
      records.set(record.libraryId, stored);
      return cloneNotebookStoredRecordV1(stored);
    },
    async delete(libraryId) {
      records.delete(libraryId);
    },
  };
}

export function createInMemoryNotebookAssetPort(): NotebookAssetPort {
  const assets = new Map<string, NotebookAssetPayloadV1>();
  return {
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
      const existing = assets.get(metadata.id);
      if (existing && existing.metadata.mimeType !== metadata.mimeType) {
        throw new Error('Notebook asset hash already exists with a different media type.');
      }
      assets.set(metadata.id, cloneNotebookAssetPayloadV1({ metadata, bytes }));
      return { ...metadata };
    },
    async load(assetId) {
      const asset = assets.get(assetId);
      return asset ? cloneNotebookAssetPayloadV1(asset) : null;
    },
    async delete(assetId) {
      assets.delete(assetId);
    },
  };
}
