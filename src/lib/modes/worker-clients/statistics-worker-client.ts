import type { OoeRuntimeControlContext } from '../../ooe/runtime-coordinator';
import type { StatisticsHostExecution } from '../../ooe/statistics-pilot';
import type { StatisticsModeRunPayload } from '../../statistics/runtime-run';
import type { RunStatisticsRuntimeRequest } from '../../statistics/runtime-input';
import type {
  StatisticsWorkerInboundMessage,
  StatisticsWorkerOutboundMessage,
} from '../worker-entrypoints/statistics.worker';
import { WORKER_CANCEL_POLL_INTERVAL_MS, WORKER_STARTUP_TIMEOUT_MS } from './runtime-config';

export const STATISTICS_WORKER_RUNTIME_HOST_ID = 'statistics-worker-runtime' as const;
export const STATISTICS_WORKER_RUNTIME_FALLBACK_HOST_ID = 'statistics-runtime' as const;

export type StatisticsWorkerRunResult = {
  payload: StatisticsModeRunPayload;
  hostExecution: StatisticsHostExecution;
};

type StatisticsWorkerLike = {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<StatisticsWorkerOutboundMessage>) => void,
  ): void;
  addEventListener(type: 'error', listener: (event: Event) => void): void;
  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<StatisticsWorkerOutboundMessage>) => void,
  ): void;
  removeEventListener(type: 'error', listener: (event: Event) => void): void;
  postMessage(message: StatisticsWorkerInboundMessage): void;
  terminate(): void;
};

export type CreateStatisticsWorker = () => StatisticsWorkerLike;

type RunStatisticsModeViaIsolatedWorkerOptions = {
  createWorker?: CreateStatisticsWorker;
  fallback: () => Promise<StatisticsModeRunPayload> | StatisticsModeRunPayload;
};

let statisticsWorkerRequestCounter = 0;

function createDefaultStatisticsWorker(): StatisticsWorkerLike {
  return new Worker(new URL('../worker-entrypoints/statistics.worker.ts', import.meta.url), {
    type: 'module',
    name: STATISTICS_WORKER_RUNTIME_HOST_ID,
  }) as StatisticsWorkerLike;
}

function nextRequestId() {
  statisticsWorkerRequestCounter += 1;
  return `statistics-worker-${statisticsWorkerRequestCounter}`;
}

function buildCancelledPayload(request: RunStatisticsRuntimeRequest): StatisticsModeRunPayload {
  return {
    outcome: {
      kind: 'error',
      title: 'Statistics',
      error: 'Statistics evaluation stopped before it finished.',
      warnings: [],
      solveSummaryText: 'Statistics evaluation stopped after the worker runtime was hard-stopped.',
    },
    parsed: {
      ok: false,
      error: 'Statistics evaluation stopped before it finished.',
    },
    replayScreen: request.screenHint,
  };
}

async function runFallback(
  context: Pick<OoeRuntimeControlContext, 'checkpoint'>,
  reason: string,
  fallback: () => Promise<StatisticsModeRunPayload> | StatisticsModeRunPayload,
): Promise<StatisticsWorkerRunResult> {
  context.checkpoint(`Statistics worker runtime unavailable; falling back to main-thread Statistics runtime (${reason}).`);
  const payload = await fallback();
  return {
    payload,
    hostExecution: {
      kind: 'fallback',
      hostId: STATISTICS_WORKER_RUNTIME_FALLBACK_HOST_ID,
      isolated: false,
      terminalStatus: 'fallback',
      fallbackFromHostId: STATISTICS_WORKER_RUNTIME_HOST_ID,
      reason,
    },
  };
}

function workerRuntimeError(reason: string) {
  return new Error(`Statistics worker runtime failed: ${reason}`);
}

export async function runStatisticsModeViaIsolatedWorker(
  request: RunStatisticsRuntimeRequest,
  context: OoeRuntimeControlContext,
  options: RunStatisticsModeViaIsolatedWorkerOptions,
): Promise<StatisticsWorkerRunResult> {
  if (context.shouldCancel()) {
    return {
      payload: buildCancelledPayload(request),
      hostExecution: {
        kind: 'worker-cancelled',
        hostId: STATISTICS_WORKER_RUNTIME_HOST_ID,
        isolated: true,
        terminalStatus: 'cancelled',
        termination: 'hardStop',
        reason: 'Statistics evaluation stopped before it finished.',
      },
    };
  }

  if (!options.createWorker && typeof Worker === 'undefined') {
    return runFallback(context, 'worker-unavailable', options.fallback);
  }

  let worker: StatisticsWorkerLike;
  try {
    worker = options.createWorker ? options.createWorker() : createDefaultStatisticsWorker();
  } catch (error) {
    return runFallback(
      context,
      error instanceof Error ? `worker-initialization-failed: ${error.message}` : 'worker-initialization-failed',
      options.fallback,
    );
  }

  const requestId = nextRequestId();
  context.checkpoint('Statistics worker runtime started.');

  return new Promise<StatisticsWorkerRunResult>((resolve, reject) => {
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

    const settle = (result: StatisticsWorkerRunResult) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(result);
    };

    const fail = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      worker.terminate();
      cleanup();
      reject(error);
    };

    const fallbackBeforeStartup = (reason: string) => {
      if (settled) {
        return;
      }

      settled = true;
      worker.terminate();
      cleanup();
      void runFallback(context, reason, options.fallback).then(resolve, reject);
    };

    const settleCancelled = () => {
      worker.terminate();
      context.checkpoint('Statistics worker runtime was terminated after a Stop request.');
      settle({
        payload: buildCancelledPayload(request),
        hostExecution: {
          kind: 'worker-cancelled',
          hostId: STATISTICS_WORKER_RUNTIME_HOST_ID,
          isolated: true,
          terminalStatus: 'cancelled',
          termination: 'hardStop',
          reason: 'Statistics evaluation stopped before it finished.',
        },
      });
    };

    function handleMessage(event: MessageEvent<StatisticsWorkerOutboundMessage>) {
      if (event.data.requestId !== requestId) {
        return;
      }

      if (context.shouldCancel()) {
        settleCancelled();
        return;
      }

      if (event.data.kind === 'started') {
        clearStartupTimer();
        context.checkpoint('Statistics worker runtime acknowledged startup.');
        return;
      }

      clearStartupTimer();
      if (event.data.kind === 'completed') {
        settle({
          payload: event.data.payload,
          hostExecution: {
            kind: 'worker',
            hostId: STATISTICS_WORKER_RUNTIME_HOST_ID,
            isolated: true,
            terminalStatus: 'completed',
          },
        });
        return;
      }

      fail(workerRuntimeError(event.data.message));
    }

    function handleError() {
      fail(workerRuntimeError('worker-runtime-error'));
    }

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    if (!options.createWorker) {
      startupTimer = setTimeout(
        () => fallbackBeforeStartup('worker-startup-timeout'),
        WORKER_STARTUP_TIMEOUT_MS,
      );
    }

    try {
      worker.postMessage({
        kind: 'run',
        requestId,
        request,
      } satisfies StatisticsWorkerInboundMessage);
    } catch (error) {
      fail(
        workerRuntimeError(
          error instanceof Error ? `worker-post-message-failed: ${error.message}` : 'worker-post-message-failed',
        ),
      );
    }
  });
}
