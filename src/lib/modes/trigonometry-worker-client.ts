import type { OoeRuntimeControlContext } from '../ooe/runtime-coordinator';
import type { TrigonometryHostExecution } from '../ooe/trigonometry-pilot';
import type { RunTrigonometryRuntimeRequest } from '../trigonometry/runtime-input';
import type { TrigonometryModeRunPayload } from '../trigonometry/runtime-run';
import type {
  TrigonometryWorkerInboundMessage,
  TrigonometryWorkerOutboundMessage,
} from './trigonometry.worker';
import { WORKER_CANCEL_POLL_INTERVAL_MS, WORKER_STARTUP_TIMEOUT_MS } from './worker-runtime-config';

export const TRIGONOMETRY_WORKER_RUNTIME_HOST_ID = 'trigonometry-worker-runtime' as const;
export const TRIGONOMETRY_WORKER_RUNTIME_FALLBACK_HOST_ID = 'trigonometry-runtime' as const;

export type TrigonometryWorkerRunResult = {
  payload: TrigonometryModeRunPayload;
  hostExecution: TrigonometryHostExecution;
};

type TrigonometryWorkerLike = {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<TrigonometryWorkerOutboundMessage>) => void,
  ): void;
  addEventListener(type: 'error', listener: (event: Event) => void): void;
  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<TrigonometryWorkerOutboundMessage>) => void,
  ): void;
  removeEventListener(type: 'error', listener: (event: Event) => void): void;
  postMessage(message: TrigonometryWorkerInboundMessage): void;
  terminate(): void;
};

export type CreateTrigonometryWorker = () => TrigonometryWorkerLike;

type RunTrigonometryModeViaIsolatedWorkerOptions = {
  createWorker?: CreateTrigonometryWorker;
  fallback: () => Promise<TrigonometryModeRunPayload> | TrigonometryModeRunPayload;
};

let trigonometryWorkerRequestCounter = 0;

function createDefaultTrigonometryWorker(): TrigonometryWorkerLike {
  return new Worker(new URL('./trigonometry.worker.ts', import.meta.url), {
    type: 'module',
    name: TRIGONOMETRY_WORKER_RUNTIME_HOST_ID,
  }) as TrigonometryWorkerLike;
}

function nextRequestId() {
  trigonometryWorkerRequestCounter += 1;
  return `trigonometry-worker-${trigonometryWorkerRequestCounter}`;
}

function buildCancelledPayload(request: RunTrigonometryRuntimeRequest): TrigonometryModeRunPayload {
  return {
    outcome: {
      kind: 'error',
      title: 'Trigonometry',
      error: 'Trigonometry evaluation stopped before it finished.',
      warnings: [],
      solveSummaryText: 'Trigonometry evaluation stopped after the worker runtime was hard-stopped.',
    },
    parsed: {
      ok: false,
      error: 'Trigonometry evaluation stopped before it finished.',
    },
    replayScreen: request.screenHint,
  };
}

async function runFallback(
  context: Pick<OoeRuntimeControlContext, 'checkpoint'>,
  reason: string,
  fallback: () => Promise<TrigonometryModeRunPayload> | TrigonometryModeRunPayload,
): Promise<TrigonometryWorkerRunResult> {
  context.checkpoint(`Trigonometry worker runtime unavailable; falling back to main-thread Trigonometry runtime (${reason}).`);
  const payload = await fallback();
  return {
    payload,
    hostExecution: {
      kind: 'fallback',
      hostId: TRIGONOMETRY_WORKER_RUNTIME_FALLBACK_HOST_ID,
      isolated: false,
      terminalStatus: 'fallback',
      fallbackFromHostId: TRIGONOMETRY_WORKER_RUNTIME_HOST_ID,
      reason,
    },
  };
}

function workerRuntimeError(reason: string) {
  return new Error(`Trigonometry worker runtime failed: ${reason}`);
}

export async function runTrigonometryModeViaIsolatedWorker(
  request: RunTrigonometryRuntimeRequest,
  context: OoeRuntimeControlContext,
  options: RunTrigonometryModeViaIsolatedWorkerOptions,
): Promise<TrigonometryWorkerRunResult> {
  if (context.shouldCancel()) {
    return {
      payload: buildCancelledPayload(request),
      hostExecution: {
        kind: 'worker-cancelled',
        hostId: TRIGONOMETRY_WORKER_RUNTIME_HOST_ID,
        isolated: true,
        terminalStatus: 'cancelled',
        termination: 'hardStop',
        reason: 'Trigonometry evaluation stopped before it finished.',
      },
    };
  }

  if (!options.createWorker && typeof Worker === 'undefined') {
    return runFallback(context, 'worker-unavailable', options.fallback);
  }

  let worker: TrigonometryWorkerLike;
  try {
    worker = options.createWorker ? options.createWorker() : createDefaultTrigonometryWorker();
  } catch (error) {
    return runFallback(
      context,
      error instanceof Error ? `worker-initialization-failed: ${error.message}` : 'worker-initialization-failed',
      options.fallback,
    );
  }

  const requestId = nextRequestId();
  context.checkpoint('Trigonometry worker runtime started.');

  return new Promise<TrigonometryWorkerRunResult>((resolve, reject) => {
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
      clearInterval(cancelTimer);
    };

    const settle = (result: TrigonometryWorkerRunResult) => {
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
      context.checkpoint('Trigonometry worker runtime was terminated after a Stop request.');
      settle({
        payload: buildCancelledPayload(request),
        hostExecution: {
          kind: 'worker-cancelled',
          hostId: TRIGONOMETRY_WORKER_RUNTIME_HOST_ID,
          isolated: true,
          terminalStatus: 'cancelled',
          termination: 'hardStop',
          reason: 'Trigonometry evaluation stopped before it finished.',
        },
      });
    };

    function handleMessage(event: MessageEvent<TrigonometryWorkerOutboundMessage>) {
      if (event.data.requestId !== requestId) {
        return;
      }

      if (context.shouldCancel()) {
        settleCancelled();
        return;
      }

      if (event.data.kind === 'started') {
        clearStartupTimer();
        context.checkpoint('Trigonometry worker runtime acknowledged startup.');
        return;
      }

      clearStartupTimer();
      if (event.data.kind === 'completed') {
        settle({
          payload: event.data.payload,
          hostExecution: {
            kind: 'worker',
            hostId: TRIGONOMETRY_WORKER_RUNTIME_HOST_ID,
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
      } satisfies TrigonometryWorkerInboundMessage);
    } catch (error) {
      fail(
        workerRuntimeError(
          error instanceof Error ? `worker-post-message-failed: ${error.message}` : 'worker-post-message-failed',
        ),
      );
    }
  });
}
