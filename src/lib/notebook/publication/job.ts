import {
  cloneNotebookStoredRecordV1,
  type NotebookStoredRecordV1,
} from '../persistence/contracts';
import type { NotebookAssetPort } from '../persistence/port';
import {
  buildNotebookPublicationProjection,
} from './projection';
import type {
  NotebookCompatibilityFindingV1,
  NotebookExportRequest,
  NotebookPublicationJob,
  NotebookPublicationJobStatus,
  NotebookPublicationLayoutV1,
  NotebookPublicationProjectionV1,
} from './types';

export type CreateNotebookPublicationJobOptions = {
  assetPort: NotebookAssetPort;
  compatibilityFindings?: readonly NotebookCompatibilityFindingV1[];
  createdAt?: string;
  jobId?: string;
  layout: NotebookPublicationLayoutV1;
  record: NotebookStoredRecordV1;
  request: NotebookExportRequest;
  scheduleLowPriority?: () => Promise<void>;
};

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object') return value;
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function defaultLowPrioritySchedule() {
  return new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
}

function jobId() {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? `notebook.export.${globalThis.crypto.randomUUID()}`
    : `notebook.export.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Owns an export snapshot independently from any mounted Notebook page.
 * Workspace switches may unmount the editor without cancelling this job.
 */
export function createNotebookPublicationJob(
  options: CreateNotebookPublicationJobOptions,
): NotebookPublicationJob {
  const snapshotRecord = cloneNotebookStoredRecordV1(options.record);
  const snapshotLayout = cloneValue(options.layout);
  const snapshotRequest = cloneValue(options.request);
  const snapshotFindings = cloneValue(options.compatibilityFindings ?? []);
  const controller = new AbortController();
  let currentStatus: NotebookPublicationJobStatus = 'queued';
  let runPromise: Promise<NotebookPublicationProjectionV1> | null = null;

  const job: NotebookPublicationJob = {
    id: options.jobId ?? jobId(),
    request: deepFreeze(snapshotRequest),
    sourceRevision: snapshotRecord.revision,
    get status() {
      return currentStatus;
    },
    cancel() {
      if (currentStatus === 'succeeded' || currentStatus === 'failed') return;
      controller.abort();
      currentStatus = 'cancelled';
    },
    run() {
      if (runPromise) return runPromise;
      runPromise = (async () => {
        if (controller.signal.aborted) {
          throw new DOMException('Notebook export was cancelled.', 'AbortError');
        }
        currentStatus = 'running';
        try {
          await (options.scheduleLowPriority ?? defaultLowPrioritySchedule)();
          const projection = await buildNotebookPublicationProjection({
            assetPort: options.assetPort,
            compatibilityFindings: snapshotFindings,
            createdAt: options.createdAt,
            layout: snapshotLayout,
            record: snapshotRecord,
            request: snapshotRequest,
            signal: controller.signal,
            yieldControl: options.scheduleLowPriority ?? defaultLowPrioritySchedule,
          });
          currentStatus = 'succeeded';
          return projection;
        } catch (error) {
          currentStatus = controller.signal.aborted ? 'cancelled' : 'failed';
          throw error;
        }
      })();
      return runPromise;
    },
  };
  return Object.freeze(job);
}
