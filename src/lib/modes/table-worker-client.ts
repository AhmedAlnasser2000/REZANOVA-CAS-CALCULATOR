import type { OoeRuntimeControlContext } from '../ooe/runtime-coordinator';
import {
  buildCancelledTableModeResult,
  type RunTableModeRequest,
  type TableModeResult,
} from './table-core';
import type {
  TableWorkerInboundMessage,
  TableWorkerOutboundMessage,
} from './table.worker';
import { WORKER_CANCEL_POLL_INTERVAL_MS, WORKER_STARTUP_TIMEOUT_MS } from './worker-runtime-config';

export type TableWorkerHostExecution =
  | {
      kind: 'worker';
      hostId: 'table-worker-runtime';
      isolated: true;
    }
  | {
      kind: 'worker-cancelled';
      hostId: 'table-worker-runtime';
      isolated: true;
      termination: 'hardStop';
    }
  | {
      kind: 'fallback';
      hostId: 'table-runtime';
      isolated: false;
      fallbackFromHostId: 'table-worker-runtime';
      reason: string;
    };

export type TableWorkerRunResult = {
  payload: TableModeResult;
  hostExecution: TableWorkerHostExecution;
};

type TableWorkerLike = Pick<
  Worker,
  'addEventListener' | 'removeEventListener' | 'postMessage' | 'terminate'
>;

type CreateTableWorker = () => TableWorkerLike;

type RunTableModeViaIsolatedWorkerOptions = {
  createWorker?: CreateTableWorker;
  fallback: () => Promise<TableModeResult>;
};

let tableWorkerRequestCounter = 0;

function createDefaultTableWorker(): TableWorkerLike {
  return new Worker(new URL('./table.worker.ts', import.meta.url), {
    type: 'module',
    name: 'table-worker-runtime',
  });
}

function nextRequestId() {
  tableWorkerRequestCounter += 1;
  return `table-worker-${tableWorkerRequestCounter}`;
}

async function runFallback(
  context: OoeRuntimeControlContext,
  reason: string,
  fallback: () => Promise<TableModeResult>,
): Promise<TableWorkerRunResult> {
  context.checkpoint(`Table worker unavailable; falling back to main-thread Table runtime (${reason}).`);
  return {
    payload: await fallback(),
    hostExecution: {
      kind: 'fallback',
      hostId: 'table-runtime',
      isolated: false,
      fallbackFromHostId: 'table-worker-runtime',
      reason,
    },
  };
}

export async function runTableModeViaIsolatedWorker(
  request: RunTableModeRequest,
  context: OoeRuntimeControlContext,
  options: RunTableModeViaIsolatedWorkerOptions,
): Promise<TableWorkerRunResult> {
  if (context.shouldCancel()) {
    return {
      payload: buildCancelledTableModeResult(),
      hostExecution: {
        kind: 'worker-cancelled',
        hostId: 'table-worker-runtime',
        isolated: true,
        termination: 'hardStop',
      },
    };
  }

  if (!options.createWorker && typeof Worker === 'undefined') {
    return runFallback(context, 'worker-unavailable', options.fallback);
  }

  let worker: TableWorkerLike;
  try {
    worker = options.createWorker ? options.createWorker() : createDefaultTableWorker();
  } catch (error) {
    return runFallback(
      context,
      error instanceof Error ? `worker-initialization-failed: ${error.message}` : 'worker-initialization-failed',
      options.fallback,
    );
  }

  const requestId = nextRequestId();
  context.checkpoint('Table worker runtime started.');

  return new Promise<TableWorkerRunResult>((resolve) => {
    let settled = false;
    let startupTimer: ReturnType<typeof setTimeout> | undefined;
    const cancelTimer = setInterval(() => {
      if (context.shouldCancel()) {
        settleCancelled();
      }
    }, WORKER_CANCEL_POLL_INTERVAL_MS);

    const clearStartupTimer = () => {
      if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = undefined;
      }
    };

    const cleanup = () => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      clearStartupTimer();
      if (cancelTimer) {
        clearInterval(cancelTimer);
      }
    };

    const settle = (result: TableWorkerRunResult) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(result);
    };

    const settleCancelled = () => {
      worker.terminate();
      context.checkpoint('Table worker runtime was terminated after a Stop request.');
      settle({
        payload: buildCancelledTableModeResult(),
        hostExecution: {
          kind: 'worker-cancelled',
          hostId: 'table-worker-runtime',
          isolated: true,
          termination: 'hardStop',
        },
      });
    };

    const fallbackFromWorkerFailure = (reason: string) => {
      worker.terminate();
      cleanup();
      settled = true;
      void runFallback(context, reason, options.fallback).then(resolve);
    };

    function handleMessage(event: MessageEvent<TableWorkerOutboundMessage>) {
      if (event.data.requestId !== requestId) {
        return;
      }

      if (context.shouldCancel()) {
        settleCancelled();
        return;
      }

      if (event.data.kind === 'started') {
        clearStartupTimer();
        context.checkpoint('Table worker runtime acknowledged startup.');
        return;
      }

      clearStartupTimer();
      if (event.data.kind === 'completed') {
        settle({
          payload: event.data.payload,
          hostExecution: {
            kind: 'worker',
            hostId: 'table-worker-runtime',
            isolated: true,
          },
        });
        return;
      }

      fallbackFromWorkerFailure(`worker-runtime-failed: ${event.data.message}`);
    }

    function handleError() {
      fallbackFromWorkerFailure('worker-runtime-error');
    }

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    if (!options.createWorker) {
      startupTimer = setTimeout(
        () => fallbackFromWorkerFailure('worker-startup-timeout'),
        WORKER_STARTUP_TIMEOUT_MS,
      );
    }

    try {
      worker.postMessage({
        kind: 'run',
        requestId,
        request,
      } satisfies TableWorkerInboundMessage);
    } catch (error) {
      fallbackFromWorkerFailure(
        error instanceof Error ? `worker-post-message-failed: ${error.message}` : 'worker-post-message-failed',
      );
    }
  });
}
