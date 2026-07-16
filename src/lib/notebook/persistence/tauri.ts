import { invoke } from '@tauri-apps/api/core';

import {
  cloneNotebookStoredRecordV1,
  cloneNotebookVersionSnapshotV1,
  isNotebookAssetMetadataV1,
  isNotebookPackageInspectionV1,
  isNotebookStoredRecordV1,
  isNotebookStoredRecordSummaryV1,
  isNotebookSupportedAssetMimeType,
  isNotebookVersionSnapshotV1,
  requireDurableNotebookStoredRecordV1,
  requireDurableNotebookVersionSnapshotV1,
  type NotebookAssetPayloadV1,
} from './contracts';
import type {
  NotebookAssetPort,
  NotebookLibraryPort,
  NotebookPackagePort,
} from './port';

type TauriAssetPayload = {
  metadata: unknown;
  bytes: number[];
};

const NOTEBOOK_ASSET_UPLOAD_CHUNK_BYTES = 1024 * 1024;

function hasTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function requireTauriRuntime() {
  if (!hasTauriRuntime()) {
    throw new Error('Notebook desktop storage is unavailable in this browser preview.');
  }
}

function asStoredRecord(value: unknown) {
  return cloneNotebookStoredRecordV1(requireDurableNotebookStoredRecordV1(value));
}

function asStoredRecordLoadResult(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('Notebook desktop storage returned an invalid record load result.');
  }
  const candidate = value as { record?: unknown; sourceDocumentVersion?: unknown };
  if (!Number.isInteger(candidate.sourceDocumentVersion)) {
    throw new TypeError('Notebook desktop storage returned an invalid source schema.');
  }
  return {
    record: asStoredRecord(candidate.record),
    sourceDocumentVersion: candidate.sourceDocumentVersion as number,
  };
}

function asByteArray(value: unknown, message: string) {
  if (!Array.isArray(value) || !value.every((byte) => (
    Number.isInteger(byte) && byte >= 0 && byte <= 255
  ))) {
    throw new TypeError(message);
  }
  return new Uint8Array(value);
}

export type TauriNotebookPorts = {
  asset: NotebookAssetPort;
  library: NotebookLibraryPort;
  package: NotebookPackagePort;
};

export function createTauriNotebookPorts(): TauriNotebookPorts {
  const loadedDocumentVersions = new Map<string, number>();
  const library: NotebookLibraryPort = {
    async list() {
      requireTauriRuntime();
      const summaries = await invoke<unknown[]>('notebook_list_records');
      if (!Array.isArray(summaries) || !summaries.every(isNotebookStoredRecordSummaryV1)) {
        throw new TypeError('Notebook desktop storage returned an invalid record list.');
      }
      return summaries.map((summary) => ({ ...summary }));
    },
    async load(libraryId) {
      requireTauriRuntime();
      const value = await invoke<unknown>('notebook_load_record', { libraryId });
      if (value === null) {
        loadedDocumentVersions.delete(libraryId);
        return null;
      }
      const loaded = asStoredRecordLoadResult(value);
      loadedDocumentVersions.set(libraryId, loaded.sourceDocumentVersion);
      return loaded.record;
    },
    loadedDocumentVersion(libraryId) {
      return loadedDocumentVersions.get(libraryId) ?? null;
    },
    async loadRawRecovery(libraryId) {
      requireTauriRuntime();
      const value = await invoke<unknown>('notebook_load_raw_recovery', { libraryId });
      return value === null
        ? null
        : asByteArray(value, 'Notebook desktop storage returned invalid recovery bytes.');
    },
    async save(record, options = {}) {
      requireTauriRuntime();
      if (!isNotebookStoredRecordV1(record)) {
        throw new TypeError('Notebook desktop storage accepts stored-record version 1 only.');
      }
      const value = await invoke<unknown>('notebook_save_record', {
        expectedRevision: options.expectedRevision,
        requireAbsent: options.expectedRevision === null,
        record,
      });
      return asStoredRecord(value);
    },
    async delete(libraryId) {
      requireTauriRuntime();
      await invoke('notebook_delete_record', { libraryId });
    },
    async listVersions(libraryId) {
      requireTauriRuntime();
      const versions = await invoke<unknown[]>('notebook_list_versions', { libraryId });
      if (!Array.isArray(versions)) {
        throw new TypeError('Notebook desktop storage returned invalid version history.');
      }
      return versions.map((snapshot) => {
        return cloneNotebookVersionSnapshotV1(requireDurableNotebookVersionSnapshotV1(snapshot));
      });
    },
    async saveVersion(snapshot) {
      requireTauriRuntime();
      if (!isNotebookVersionSnapshotV1(snapshot)) {
        throw new TypeError('Notebook desktop storage accepts snapshot version 1 only.');
      }
      await invoke('notebook_save_version', { snapshot });
    },
    async moveToTrash(libraryId) {
      requireTauriRuntime();
      return asStoredRecord(await invoke<unknown>('notebook_move_record_to_trash', { libraryId }));
    },
    async listTrash() {
      requireTauriRuntime();
      const summaries = await invoke<unknown[]>('notebook_list_trash');
      if (!Array.isArray(summaries) || !summaries.every(isNotebookStoredRecordSummaryV1)) {
        throw new TypeError('Notebook desktop storage returned an invalid trash list.');
      }
      return summaries.map((summary) => ({ ...summary }));
    },
    async restoreFromTrash(libraryId) {
      requireTauriRuntime();
      return asStoredRecord(await invoke<unknown>('notebook_restore_record_from_trash', {
        libraryId,
      }));
    },
    async deletePermanently(libraryId) {
      requireTauriRuntime();
      await invoke('notebook_delete_record_permanently', { libraryId });
    },
  };

  const asset: NotebookAssetPort = {
    async put(bytes, mimeType, createdAt, options) {
      requireTauriRuntime();
      if (!isNotebookSupportedAssetMimeType(mimeType)) {
        throw new TypeError('Notebook asset type is unsupported.');
      }
      const value = await invoke<unknown>('notebook_put_asset', {
        bytes: [...bytes],
        createdAt: createdAt ?? new Date().toISOString(),
        imageHeightPx: options?.imageHeightPx ?? null,
        imageWidthPx: options?.imageWidthPx ?? null,
        mimeType,
      });
      if (!isNotebookAssetMetadataV1(value)) {
        throw new TypeError('Notebook desktop storage returned invalid asset metadata.');
      }
      return { ...value };
    },
    async load(assetId) {
      requireTauriRuntime();
      const value = await invoke<TauriAssetPayload | null>('notebook_load_asset', { assetId });
      if (value === null) {
        return null;
      }
      if (!isNotebookAssetMetadataV1(value.metadata)) {
        throw new TypeError('Notebook desktop storage returned an invalid asset.');
      }
      const payload: NotebookAssetPayloadV1 = {
        metadata: value.metadata,
        bytes: asByteArray(
          value.bytes,
          'Notebook desktop storage returned invalid asset bytes.',
        ),
      };
      if (payload.bytes.byteLength !== payload.metadata.byteLength) {
        throw new TypeError('Notebook desktop asset length does not match its metadata.');
      }
      return payload;
    },
    async delete(assetId) {
      requireTauriRuntime();
      await invoke('notebook_delete_asset', { assetId });
    },
  };
  asset.putBlob = async (blob, mimeType, createdAt = new Date().toISOString(), options) => {
    requireTauriRuntime();
    if (!isNotebookSupportedAssetMimeType(mimeType)) {
      throw new TypeError('Notebook asset type is unsupported.');
    }
    const uploadId = await invoke<string>('notebook_begin_asset_upload', {
      byteLength: blob.size,
      createdAt,
      imageHeightPx: options?.imageHeightPx ?? null,
      imageWidthPx: options?.imageWidthPx ?? null,
      mimeType,
    });
    try {
      for (let offset = 0; offset < blob.size; offset += NOTEBOOK_ASSET_UPLOAD_CHUNK_BYTES) {
        const chunk = new Uint8Array(await blob.slice(
          offset,
          Math.min(blob.size, offset + NOTEBOOK_ASSET_UPLOAD_CHUNK_BYTES),
        ).arrayBuffer());
        await invoke('notebook_append_asset_upload', { uploadId, chunk: [...chunk] });
      }
      const value = await invoke<unknown>('notebook_finish_asset_upload', { uploadId });
      if (!isNotebookAssetMetadataV1(value)) {
        throw new TypeError('Notebook desktop storage returned invalid asset metadata.');
      }
      return { ...value };
    } catch (error) {
      await invoke('notebook_abort_asset_upload', { uploadId }).catch(() => {});
      throw error;
    }
  };
  asset.resolveUrl = async (assetId) => {
    if (!hasTauriRuntime() || !/^sha256:[0-9a-f]{64}$/.test(assetId)) return null;
    const value = await invoke<unknown>('notebook_resolve_asset_url', { assetId });
    if (typeof value !== 'string' || !/^http:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]+\/[0-9a-f]{64}$/.test(value)) {
      throw new TypeError('Notebook desktop storage returned an invalid media URL.');
    }
    return value;
  };

  const packagePort: NotebookPackagePort = {
    async exportPortable(record) {
      requireTauriRuntime();
      if (!isNotebookStoredRecordV1(record)) {
        throw new TypeError('Portable export requires a valid current Notebook record.');
      }
      const bytes = await invoke<unknown>('notebook_export_package', { record });
      return asByteArray(bytes, 'Notebook desktop storage returned an invalid package.');
    },
    async inspectPortable(bytes) {
      requireTauriRuntime();
      const inspection = await invoke<unknown>('notebook_inspect_package', {
        bytes: [...bytes],
      });
      if (!isNotebookPackageInspectionV1(inspection)) {
        throw new TypeError('Notebook desktop storage returned an invalid package inspection.');
      }
      return inspection;
    },
    async importPortable(bytes) {
      requireTauriRuntime();
      const record = await invoke<unknown>('notebook_import_package', {
        bytes: [...bytes],
      });
      return asStoredRecord(record);
    },
  };

  return { asset, library, package: packagePort };
}
