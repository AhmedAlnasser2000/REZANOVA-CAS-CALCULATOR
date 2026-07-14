import { invoke } from '@tauri-apps/api/core';

import {
  cloneNotebookStoredRecordV1,
  isNotebookAssetMetadataV1,
  isNotebookPackageInspectionV1,
  isNotebookStoredRecordV1,
  isNotebookStoredRecordSummaryV1,
  isNotebookSupportedAssetMimeType,
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

function hasTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function requireTauriRuntime() {
  if (!hasTauriRuntime()) {
    throw new Error('Notebook desktop storage is unavailable in this browser preview.');
  }
}

function asStoredRecord(value: unknown) {
  if (!isNotebookStoredRecordV1(value)) {
    throw new TypeError('Notebook desktop storage returned an invalid record.');
  }
  return cloneNotebookStoredRecordV1(value);
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
      return value === null ? null : asStoredRecord(value);
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
  };

  const asset: NotebookAssetPort = {
    async put(bytes, mimeType, createdAt) {
      requireTauriRuntime();
      if (!isNotebookSupportedAssetMimeType(mimeType)) {
        throw new TypeError('Notebook asset type is unsupported.');
      }
      const value = await invoke<unknown>('notebook_put_asset', {
        bytes: [...bytes],
        createdAt: createdAt ?? new Date().toISOString(),
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
