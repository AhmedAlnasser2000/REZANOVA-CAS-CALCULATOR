import type { OoeRuntimeControlContext } from '../ooe/runtime-coordinator';
import type { CalculateHostExecution } from '../ooe/calculate-pilot';
import type { DisplayOutcome } from '../../types/calculator';
import type { RunCalculateRuntimeRequest } from './calculate';
import type {
  CalculateWorkerInboundMessage,
  CalculateWorkerOutboundMessage,
} from './calculate.worker';
import { WORKER_CANCEL_POLL_INTERVAL_MS, WORKER_STARTUP_TIMEOUT_MS } from './worker-runtime-config';

export const CALCULATE_WORKER_RUNTIME_HOST_ID = 'calculate-worker-runtime' as const;
export const CALCULATE_WORKER_RUNTIME_FALLBACK_HOST_ID = 'calculate-runtime' as const;

export type CalculateWorkerRunResult = {
  payload: DisplayOutcome;
  hostExecution: CalculateHostExecution;
};

type CalculateWorkerLike = {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<CalculateWorkerOutboundMessage>) => void,
  ): void;
  addEventListener(type: 'error', listener: (event: Event) => void): void;
  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<CalculateWorkerOutboundMessage>) => void,
  ): void;
  removeEventListener(type: 'error', listener: (event: Event) => void): void;
  postMessage(message: CalculateWorkerInboundMessage): void;
  terminate(): void;
};

export type CreateCalculateWorker = () => CalculateWorkerLike;

type RunCalculateModeViaIsolatedWorkerOptions = {
  createWorker?: CreateCalculateWorker;
  fallback: () => Promise<DisplayOutcome> | DisplayOutcome;
};

let calculateWorkerRequestCounter = 0;

function createDefaultCalculateWorker(): CalculateWorkerLike {
  return new Worker(new URL('./calculate.worker.ts', import.meta.url), {
    type: 'module',
    name: CALCULATE_WORKER_RUNTIME_HOST_ID,
  }) as CalculateWorkerLike;
}

function nextRequestId() {
  calculateWorkerRequestCounter += 1;
  return `calculate-worker-${calculateWorkerRequestCounter}`;
}

function buildCancelledPayload(): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Calculate',
    error: 'Calculate stopped before it finished.',
    warnings: [],
    solveSummaryText: 'Calculate stopped after the worker runtime was hard-stopped.',
  };
}

async function runFallback(
  context: Pick<OoeRuntimeControlContext, 'checkpoint'>,
  reason: string,
  fallback: () => Promise<DisplayOutcome> | DisplayOutcome,
): Promise<CalculateWorkerRunResult> {
  context.checkpoint(`Calculate worker runtime unavailable; falling back to main-thread Calculate runtime (${reason}).`);
  const payload = await fallback();
  return {
    payload,
    hostExecution: {
      kind: 'fallback',
      hostId: CALCULATE_WORKER_RUNTIME_FALLBACK_HOST_ID,
      isolated: false,
      terminalStatus: 'fallback',
      fallbackFromHostId: CALCULATE_WORKER_RUNTIME_HOST_ID,
      reason,
    },
  };
}

function workerRuntimeError(reason: string) {
  return new Error(`Calculate worker runtime failed: ${reason}`);
}

export async function runCalculateModeViaIsolatedWorker(
  request: RunCalculateRuntimeRequest,
  context: OoeRuntimeControlContext,
  options: RunCalculateModeViaIsolatedWorkerOptions,
): Promise<CalculateWorkerRunResult> {
  if (context.shouldCancel()) {
    return {
      payload: buildCancelledPayload(),
      hostExecution: {
        kind: 'worker-cancelled',
        hostId: CALCULATE_WORKER_RUNTIME_HOST_ID,
        isolated: true,
        terminalStatus: 'cancelled',
        termination: 'hardStop',
        reason: 'Calculate stopped before it finished.',
      },
    };
  }

  if (!options.createWorker && typeof Worker === 'undefined') {
    return runFallback(context, 'worker-unavailable', options.fallback);
  }

  let worker: CalculateWorkerLike;
  try {
    worker = options.createWorker ? options.createWorker() : createDefaultCalculateWorker();
  } catch (error) {
    return runFallback(
      context,
      error instanceof Error ? `worker-initialization-failed: ${error.message}` : 'worker-initialization-failed',
      options.fallback,
    );
  }

  const requestId = nextRequestId();
  context.checkpoint('Calculate worker runtime started.');

  return new Promise<CalculateWorkerRunResult>((resolve, reject) => {
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

    const settle = (result: CalculateWorkerRunResult) => {
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
      if (settled) {
        return;
      }
      worker.terminate();
      context.checkpoint('Calculate worker runtime was terminated after a Stop request.');
      settle({
        payload: buildCancelledPayload(),
        hostExecution: {
          kind: 'worker-cancelled',
          hostId: CALCULATE_WORKER_RUNTIME_HOST_ID,
          isolated: true,
          terminalStatus: 'cancelled',
          termination: 'hardStop',
          reason: 'Calculate stopped before it finished.',
        },
      });
    };

    function handleMessage(event: MessageEvent<CalculateWorkerOutboundMessage>) {
      if (event.data.requestId !== requestId) {
        return;
      }

      if (context.shouldCancel()) {
        settleCancelled();
        return;
      }

      if (event.data.kind === 'started') {
        clearStartupTimer();
        context.checkpoint('Calculate worker runtime acknowledged startup.');
        return;
      }

      clearStartupTimer();
      if (event.data.kind === 'completed') {
        settle({
          payload: event.data.payload,
          hostExecution: {
            kind: 'worker',
            hostId: CALCULATE_WORKER_RUNTIME_HOST_ID,
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
      } satisfies CalculateWorkerInboundMessage);
    } catch (error) {
      fail(
        workerRuntimeError(
          error instanceof Error ? `worker-post-message-failed: ${error.message}` : 'worker-post-message-failed',
        ),
      );
    }
  });
}
