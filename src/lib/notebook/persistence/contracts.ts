import {
  collectNotebookAssetIds,
  isNotebookRichDocument,
  summarizeNotebookDocument,
} from '../document/model';
import { migrateNotebookRichDocument } from '../document/migrate';
import type { NotebookRichDocument } from '../document/types';

export const NOTEBOOK_STORED_RECORD_VERSION = 1 as const;
export const NOTEBOOK_ASSET_RECORD_VERSION = 1 as const;
export const NOTEBOOK_PACKAGE_MANIFEST_VERSION = 1 as const;
export const NOTEBOOK_VERSION_SNAPSHOT_VERSION = 1 as const;
export const NOTEBOOK_VERSION_HISTORY_MAX_COUNT = 50;
export const NOTEBOOK_VERSION_HISTORY_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1_000;
export const NOTEBOOK_PACKAGE_KIND = 'calcwiz-notebook' as const;

export const NOTEBOOK_SUPPORTED_ASSET_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'text/vtt',
] as const;

export type NotebookSupportedAssetMimeType =
  typeof NOTEBOOK_SUPPORTED_ASSET_MIME_TYPES[number];

export type NotebookStoredRecordV1 = {
  version: typeof NOTEBOOK_STORED_RECORD_VERSION;
  libraryId: string;
  revision: number;
  savedAt: string;
  document: NotebookRichDocument;
  assetIds: string[];
};

export type NotebookStoredRecordSummaryV1 = {
  version: typeof NOTEBOOK_STORED_RECORD_VERSION;
  libraryId: string;
  revision: number;
  savedAt: string;
  documentId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  blockCount: number;
  wordCount: number;
  assetCount: number;
};

export type NotebookAssetMetadataV1 = {
  version: typeof NOTEBOOK_ASSET_RECORD_VERSION;
  id: string;
  sha256: string;
  byteLength: number;
  mimeType: NotebookSupportedAssetMimeType;
  createdAt: string;
};

export type NotebookAssetPayloadV1 = {
  metadata: NotebookAssetMetadataV1;
  bytes: Uint8Array;
};

export type NotebookPackageManifestV1 = {
  version: typeof NOTEBOOK_PACKAGE_MANIFEST_VERSION;
  kind: typeof NOTEBOOK_PACKAGE_KIND;
  createdAt: string;
  sourceLibraryId: string;
  sourceRevision: number;
  documentPath: 'document.json';
  documentSha256: string;
  assets: NotebookAssetMetadataV1[];
};

export type NotebookPackageInspectionV1 = {
  manifest: NotebookPackageManifestV1;
  document: NotebookRichDocument;
};

export const NOTEBOOK_VERSION_REASONS = [
  'initial',
  'periodic',
  'before-restore',
  'before-trash',
] as const;

export type NotebookVersionReason = typeof NOTEBOOK_VERSION_REASONS[number];

export type NotebookVersionSnapshotV1 = {
  version: typeof NOTEBOOK_VERSION_SNAPSHOT_VERSION;
  snapshotId: string;
  libraryId: string;
  revision: number;
  createdAt: string;
  reason: NotebookVersionReason;
  record: NotebookStoredRecordV1;
};

const LIBRARY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const ASSET_ID_PATTERN = /^sha256:[0-9a-f]{64}$/;
const SNAPSHOT_ID_PATTERN = /^snapshot\.[A-Za-z0-9._:-]{1,180}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

export function isNotebookLibraryId(value: unknown): value is string {
  return typeof value === 'string' && LIBRARY_ID_PATTERN.test(value);
}

export function isNotebookAssetId(value: unknown): value is string {
  return typeof value === 'string' && ASSET_ID_PATTERN.test(value);
}

export function isNotebookSupportedAssetMimeType(
  value: unknown,
): value is NotebookSupportedAssetMimeType {
  return typeof value === 'string'
    && NOTEBOOK_SUPPORTED_ASSET_MIME_TYPES.includes(value as NotebookSupportedAssetMimeType);
}

export function isNotebookAssetMetadataV1(value: unknown): value is NotebookAssetMetadataV1 {
  if (!isRecord(value)) {
    return false;
  }
  return value.version === NOTEBOOK_ASSET_RECORD_VERSION
    && isNotebookAssetId(value.id)
    && typeof value.sha256 === 'string'
    && SHA256_PATTERN.test(value.sha256)
    && value.id === `sha256:${value.sha256}`
    && Number.isSafeInteger(value.byteLength)
    && Number(value.byteLength) >= 0
    && isNotebookSupportedAssetMimeType(value.mimeType)
    && isIsoDate(value.createdAt);
}

export function isNotebookStoredRecordSummaryV1(
  value: unknown,
): value is NotebookStoredRecordSummaryV1 {
  if (!isRecord(value)) {
    return false;
  }
  return value.version === NOTEBOOK_STORED_RECORD_VERSION
    && isNotebookLibraryId(value.libraryId)
    && Number.isSafeInteger(value.revision)
    && Number(value.revision) >= 1
    && isIsoDate(value.savedAt)
    && typeof value.documentId === 'string'
    && value.documentId.length > 0
    && typeof value.title === 'string'
    && isIsoDate(value.createdAt)
    && isIsoDate(value.updatedAt)
    && Number.isSafeInteger(value.blockCount)
    && Number(value.blockCount) >= 0
    && Number.isSafeInteger(value.wordCount)
    && Number(value.wordCount) >= 0
    && Number.isSafeInteger(value.assetCount)
    && Number(value.assetCount) >= 0;
}

export function isNotebookPackageManifestV1(
  value: unknown,
): value is NotebookPackageManifestV1 {
  if (!isRecord(value)) {
    return false;
  }
  if (
    value.version !== NOTEBOOK_PACKAGE_MANIFEST_VERSION
    || value.kind !== NOTEBOOK_PACKAGE_KIND
    || !isIsoDate(value.createdAt)
    || !isNotebookLibraryId(value.sourceLibraryId)
    || !Number.isSafeInteger(value.sourceRevision)
    || Number(value.sourceRevision) < 1
    || value.documentPath !== 'document.json'
    || typeof value.documentSha256 !== 'string'
    || !SHA256_PATTERN.test(value.documentSha256)
    || !Array.isArray(value.assets)
    || !value.assets.every(isNotebookAssetMetadataV1)
  ) {
    return false;
  }
  return new Set(value.assets.map((asset) => asset.id)).size === value.assets.length;
}

export function isNotebookPackageInspectionV1(
  value: unknown,
): value is NotebookPackageInspectionV1 {
  return isRecord(value)
    && isNotebookPackageManifestV1(value.manifest)
    && isNotebookRichDocument(value.document);
}

export function isNotebookVersionSnapshotV1(
  value: unknown,
): value is NotebookVersionSnapshotV1 {
  if (!isRecord(value)) {
    return false;
  }
  return value.version === NOTEBOOK_VERSION_SNAPSHOT_VERSION
    && typeof value.snapshotId === 'string'
    && SNAPSHOT_ID_PATTERN.test(value.snapshotId)
    && isNotebookLibraryId(value.libraryId)
    && Number.isSafeInteger(value.revision)
    && Number(value.revision) >= 1
    && isIsoDate(value.createdAt)
    && NOTEBOOK_VERSION_REASONS.includes(value.reason as NotebookVersionReason)
    && isNotebookStoredRecordV1(value.record)
    && value.record.libraryId === value.libraryId
    && value.record.revision === value.revision;
}

export function createNotebookVersionSnapshotV1(
  record: NotebookStoredRecordV1,
  options: {
    createdAt?: string;
    reason: NotebookVersionReason;
    snapshotId: string;
  },
): NotebookVersionSnapshotV1 {
  const snapshot: NotebookVersionSnapshotV1 = {
    version: NOTEBOOK_VERSION_SNAPSHOT_VERSION,
    snapshotId: options.snapshotId,
    libraryId: record.libraryId,
    revision: record.revision,
    createdAt: options.createdAt ?? new Date().toISOString(),
    reason: options.reason,
    record: cloneNotebookStoredRecordV1(record),
  };
  if (!isNotebookVersionSnapshotV1(snapshot)) {
    throw new TypeError('Notebook version snapshot is invalid.');
  }
  return snapshot;
}

export function isNotebookStoredRecordV1(value: unknown): value is NotebookStoredRecordV1 {
  if (!isRecord(value)) {
    return false;
  }
  if (
    value.version !== NOTEBOOK_STORED_RECORD_VERSION
    || !isNotebookLibraryId(value.libraryId)
    || !Number.isSafeInteger(value.revision)
    || Number(value.revision) < 1
    || !isIsoDate(value.savedAt)
    || !isNotebookRichDocument(value.document)
    || !Array.isArray(value.assetIds)
    || !value.assetIds.every(isNotebookAssetId)
  ) {
    return false;
  }
  const assets = new Set(value.assetIds);
  return assets.size === value.assetIds.length
    && collectNotebookAssetIds(value.document.content).every((assetId) => assets.has(assetId));
}

export function migrateNotebookStoredRecordV1(
  value: unknown,
): NotebookStoredRecordV1 | null {
  if (!isRecord(value)) return null;
  const document = migrateNotebookRichDocument(value.document);
  if (
    value.version !== NOTEBOOK_STORED_RECORD_VERSION
    || !isNotebookLibraryId(value.libraryId)
    || !Number.isSafeInteger(value.revision)
    || Number(value.revision) < 1
    || !isIsoDate(value.savedAt)
    || !document
    || !Array.isArray(value.assetIds)
    || !value.assetIds.every(isNotebookAssetId)
  ) {
    return null;
  }
  const candidate: NotebookStoredRecordV1 = {
    version: NOTEBOOK_STORED_RECORD_VERSION,
    libraryId: value.libraryId,
    revision: Number(value.revision),
    savedAt: value.savedAt,
    document,
    assetIds: [...value.assetIds],
  };
  return isNotebookStoredRecordV1(candidate) ? candidate : null;
}

export function migrateNotebookVersionSnapshotV1(
  value: unknown,
): NotebookVersionSnapshotV1 | null {
  if (!isRecord(value)) return null;
  const record = migrateNotebookStoredRecordV1(value.record);
  if (!record) return null;
  const candidate = { ...value, record };
  return isNotebookVersionSnapshotV1(candidate)
    ? candidate as NotebookVersionSnapshotV1
    : null;
}

export function createNotebookStoredRecordV1(
  document: NotebookRichDocument,
  options: {
    assetIds?: readonly string[];
    libraryId: string;
    revision?: number;
    savedAt?: string;
  },
): NotebookStoredRecordV1 {
  const record: NotebookStoredRecordV1 = {
    version: NOTEBOOK_STORED_RECORD_VERSION,
    libraryId: options.libraryId,
    revision: options.revision ?? 1,
    savedAt: options.savedAt ?? new Date().toISOString(),
    document: cloneNotebookStoredDocument(document),
    assetIds: [...new Set(
      options.assetIds ?? collectNotebookAssetIds(document.content),
    )].sort(),
  };
  if (!isNotebookStoredRecordV1(record)) {
    throw new TypeError('Notebook stored record is invalid.');
  }
  return record;
}

export function summarizeNotebookStoredRecordV1(
  record: NotebookStoredRecordV1,
): NotebookStoredRecordSummaryV1 {
  const summary = summarizeNotebookDocument(record.document);
  return {
    version: NOTEBOOK_STORED_RECORD_VERSION,
    libraryId: record.libraryId,
    revision: record.revision,
    savedAt: record.savedAt,
    documentId: summary.id,
    title: summary.title,
    createdAt: record.document.createdAt,
    updatedAt: summary.updatedAt,
    blockCount: summary.blockCount,
    wordCount: summary.wordCount,
    assetCount: record.assetIds.length,
  };
}

export function cloneNotebookStoredDocument(
  document: NotebookRichDocument,
): NotebookRichDocument {
  return JSON.parse(JSON.stringify(document)) as NotebookRichDocument;
}

export function cloneNotebookStoredRecordV1(
  record: NotebookStoredRecordV1,
): NotebookStoredRecordV1 {
  return {
    ...record,
    document: cloneNotebookStoredDocument(record.document),
    assetIds: [...record.assetIds],
  };
}

export function cloneNotebookVersionSnapshotV1(
  snapshot: NotebookVersionSnapshotV1,
): NotebookVersionSnapshotV1 {
  return {
    ...snapshot,
    record: cloneNotebookStoredRecordV1(snapshot.record),
  };
}

export function cloneNotebookAssetPayloadV1(
  asset: NotebookAssetPayloadV1,
): NotebookAssetPayloadV1 {
  return {
    metadata: { ...asset.metadata },
    bytes: new Uint8Array(asset.bytes),
  };
}

export async function notebookSha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
