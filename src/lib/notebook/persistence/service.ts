import {
  cloneNotebookStoredRecordV1,
  type NotebookStoredRecordV1,
} from './contracts';
import { createIndexedDbNotebookPorts } from './indexed-db';
import {
  createInMemoryNotebookAssetPort,
  createInMemoryNotebookLibraryPort,
  type NotebookAssetPort,
  type NotebookLibraryPort,
  type NotebookPackagePort,
} from './port';
import { createTauriNotebookPorts } from './tauri';

export const NOTEBOOK_WARM_RECORD_MAX_BYTES = 16 * 1024 * 1024;

function fitsConservativeWarmBudget(value: unknown, budget: number) {
  let estimatedBytes = 0;
  const reserve = (bytes: number) => {
    estimatedBytes += bytes;
    return estimatedBytes < budget;
  };
  const visit = (candidate: unknown): boolean => {
    if (candidate === null) return reserve(4);
    if (typeof candidate === 'boolean') return reserve(5);
    if (typeof candidate === 'number') return reserve(24);
    if (typeof candidate === 'string') {
      const remaining = budget - estimatedBytes - 2;
      return candidate.length < remaining / 3 && reserve(2 + candidate.length * 3);
    }
    if (Array.isArray(candidate)) {
      if (!reserve(2 + candidate.length)) return false;
      return candidate.every(visit);
    }
    if (candidate && typeof candidate === 'object') {
      const entries = Object.entries(candidate);
      if (!reserve(2 + entries.length)) return false;
      return entries.every(([key, entry]) => visit(key) && visit(entry));
    }
    return false;
  };
  return visit(value);
}

function cloneWarmRecord(record: NotebookStoredRecordV1) {
  return typeof structuredClone === 'function'
    ? structuredClone(record)
    : cloneNotebookStoredRecordV1(record);
}

export type NotebookLibraryService = {
  asset: NotebookAssetPort;
  library: NotebookLibraryPort;
  package: NotebookPackagePort | null;
  loadRecord(libraryId: string): Promise<NotebookStoredRecordV1 | null>;
  saveRecord(
    record: NotebookStoredRecordV1,
    options?: Parameters<NotebookLibraryPort['save']>[1],
  ): Promise<NotebookStoredRecordV1>;
  rememberWarmRecord(record: NotebookStoredRecordV1, dirty?: boolean): void;
  isWarmRecordDirty(libraryId: string): boolean;
  forgetWarmRecord(libraryId?: string): void;
};

export function createNotebookLibraryService(options: {
  asset?: NotebookAssetPort;
  library?: NotebookLibraryPort;
  package?: NotebookPackagePort | null;
} = {}): NotebookLibraryService {
  const asset = options.asset ?? createInMemoryNotebookAssetPort();
  const library = options.library ?? createInMemoryNotebookLibraryPort();
  const packagePort = options.package ?? null;
  let warmRecord: { dirty: boolean; record: NotebookStoredRecordV1 } | null = null;
  const pendingSaves = new Map<string, Promise<NotebookStoredRecordV1>>();

  return {
    asset,
    library,
    package: packagePort,
    async loadRecord(libraryId) {
      const pending = pendingSaves.get(libraryId);
      if (pending) {
        try {
          return cloneNotebookStoredRecordV1(await pending);
        } catch {
          // The warm in-memory revision remains the recovery source below.
        }
      }
      if (warmRecord?.record.libraryId === libraryId) {
        return cloneWarmRecord(warmRecord.record);
      }
      return library.load(libraryId);
    },
    saveRecord(record, saveOptions) {
      const operation = library.save(record, saveOptions);
      pendingSaves.set(record.libraryId, operation);
      void operation.then(() => {
        if (warmRecord?.record.libraryId === record.libraryId) {
          warmRecord = null;
        }
      }, () => {}).finally(() => {
        if (pendingSaves.get(record.libraryId) === operation) {
          pendingSaves.delete(record.libraryId);
        }
      });
      return operation;
    },
    rememberWarmRecord(record, dirty = false) {
      if (record.assetIds.length > 0) {
        warmRecord = null;
        return;
      }
      warmRecord = fitsConservativeWarmBudget(record, NOTEBOOK_WARM_RECORD_MAX_BYTES)
        ? { dirty, record: cloneWarmRecord(record) }
        : null;
    },
    isWarmRecordDirty(libraryId) {
      return warmRecord?.record.libraryId === libraryId && warmRecord.dirty;
    },
    forgetWarmRecord(libraryId) {
      if (!libraryId || warmRecord?.record.libraryId === libraryId) {
        warmRecord = null;
      }
    },
  };
}

let defaultService: NotebookLibraryService | null = null;

export function getDefaultNotebookLibraryService(): NotebookLibraryService {
  if (defaultService) {
    return defaultService;
  }
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const ports = createTauriNotebookPorts();
    defaultService = createNotebookLibraryService(ports);
    return defaultService;
  }
  if (globalThis.indexedDB) {
    const ports = createIndexedDbNotebookPorts();
    defaultService = createNotebookLibraryService(ports);
    return defaultService;
  }
  defaultService = createNotebookLibraryService();
  return defaultService;
}
