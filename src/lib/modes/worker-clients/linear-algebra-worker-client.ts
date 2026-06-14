import type { DisplayOutcome } from '../../../types/calculator';
import type { LinearAlgebraHostExecution } from '../../ooe/pilots/linear-algebra-pilot';
import {
  OOE_LINEAR_ALGEBRA_FALLBACK_HOST_ID,
  OOE_LINEAR_ALGEBRA_WORKER_HOST_ID,
} from '../../ooe/pilots/linear-algebra-pilot';
import type { OoeRuntimeControlContext } from '../../ooe/runtime-coordinator';
import type {
  LinearAlgebraWorkerInboundMessage,
  LinearAlgebraWorkerOutboundMessage,
  LinearAlgebraWorkerRunPayload,
} from '../worker-entrypoints/linear-algebra.worker';
import { WORKER_CANCEL_POLL_INTERVAL_MS, WORKER_STARTUP_TIMEOUT_MS } from './runtime-config';

export type LinearAlgebraWorkerRunResult = {
  payload: DisplayOutcome;
  hostExecution: LinearAlgebraHostExecution;
};

type LinearAlgebraWorkerLike = {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<LinearAlgebraWorkerOutboundMessage>) => void,
  ): void;
  addEventListener(type: 'error', listener: (event: Event) => void): void;
  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<LinearAlgebraWorkerOutboundMessage>) => void,
  ): void;
  removeEventListener(type: 'error', listener: (event: Event) => void): void;
  postMessage(message: LinearAlgebraWorkerInboundMessage): void;
  terminate(): void;
};

export type CreateLinearAlgebraWorker = () => LinearAlgebraWorkerLike;

type RunLinearAlgebraModeViaIsolatedWorkerOptions = {
  createWorker?: CreateLinearAlgebraWorker;
  fallback: () => Promise<DisplayOutcome> | DisplayOutcome;
};

let linearAlgebraWorkerRequestCounter = 0;

function createDefaultLinearAlgebraWorker(): LinearAlgebraWorkerLike {
  return new Worker(new URL('../worker-entrypoints/linear-algebra.worker.ts', import.meta.url), {
    type: 'module',
    name: OOE_LINEAR_ALGEBRA_WORKER_HOST_ID,
  }) as LinearAlgebraWorkerLike;
}

function nextRequestId() {
  linearAlgebraWorkerRequestCounter += 1;
  return `linear-algebra-worker-${linearAlgebraWorkerRequestCounter}`;
}

function titleForPayload(payload: LinearAlgebraWorkerRunPayload) {
  return payload.kind === 'matrix' ? 'Matrix' : 'Vector';
}

function stoppedMessage(payload: LinearAlgebraWorkerRunPayload) {
  return `${titleForPayload(payload)} operation stopped before it finished.`;
}

function buildCancelledPayload(payload: LinearAlgebraWorkerRunPayload): DisplayOutcome {
  return {
    kind: 'error',
    title: titleForPayload(payload),
    error: stoppedMessage(payload),
    warnings: [],
    solveSummaryText: `${titleForPayload(payload)} operation stopped after the worker runtime was hard-stopped.`,
  };
}

async function runFallback(
  context: Pick<OoeRuntimeControlContext, 'checkpoint'>,
  reason: string,
  fallback: () => Promise<DisplayOutcome> | DisplayOutcome,
): Promise<LinearAlgebraWorkerRunResult> {
  context.checkpoint(
    `Linear Algebra worker runtime unavailable; falling back to main-thread Linear Algebra runtime (${reason}).`,
  );
  const payload = await fallback();
  return {
    payload,
    hostExecution: {
      kind: 'fallback',
      hostId: OOE_LINEAR_ALGEBRA_FALLBACK_HOST_ID,
      isolated: false,
      terminalStatus: 'fallback',
      fallbackFromHostId: OOE_LINEAR_ALGEBRA_WORKER_HOST_ID,
      reason,
    },
  };
}

function workerRuntimeError(reason: string) {
  return new Error(`Linear Algebra worker runtime failed: ${reason}`);
}

export async function runLinearAlgebraModeViaIsolatedWorker(
  payload: LinearAlgebraWorkerRunPayload,
  context: OoeRuntimeControlContext,
  options: RunLinearAlgebraModeViaIsolatedWorkerOptions,
): Promise<LinearAlgebraWorkerRunResult> {
  if (context.shouldCancel()) {
    return {
      payload: buildCancelledPayload(payload),
      hostExecution: {
        kind: 'worker-cancelled',
        hostId: OOE_LINEAR_ALGEBRA_WORKER_HOST_ID,
        isolated: true,
        terminalStatus: 'cancelled',
        termination: 'hardStop',
        reason: stoppedMessage(payload),
      },
    };
  }

  if (!options.createWorker && typeof Worker === 'undefined') {
    return runFallback(context, 'worker-unavailable', options.fallback);
  }

  let worker: LinearAlgebraWorkerLike;
  try {
    worker = options.createWorker ? options.createWorker() : createDefaultLinearAlgebraWorker();
  } catch (error) {
    return runFallback(
      context,
      error instanceof Error ? `worker-initialization-failed: ${error.message}` : 'worker-initialization-failed',
      options.fallback,
    );
  }

  const requestId = nextRequestId();
  context.checkpoint('Linear Algebra worker runtime started.');

  return new Promise<LinearAlgebraWorkerRunResult>((resolve, reject) => {
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

    const settle = (result: LinearAlgebraWorkerRunResult) => {
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
      context.checkpoint('Linear Algebra worker runtime was terminated after a Stop request.');
      settle({
        payload: buildCancelledPayload(payload),
        hostExecution: {
          kind: 'worker-cancelled',
          hostId: OOE_LINEAR_ALGEBRA_WORKER_HOST_ID,
          isolated: true,
          terminalStatus: 'cancelled',
          termination: 'hardStop',
          reason: stoppedMessage(payload),
        },
      });
    };

    function handleMessage(event: MessageEvent<LinearAlgebraWorkerOutboundMessage>) {
      if (event.data.requestId !== requestId) {
        return;
      }

      if (context.shouldCancel()) {
        settleCancelled();
        return;
      }

      if (event.data.kind === 'started') {
        clearStartupTimer();
        context.checkpoint('Linear Algebra worker runtime acknowledged startup.');
        return;
      }

      clearStartupTimer();
      if (event.data.kind === 'completed') {
        settle({
          payload: event.data.payload,
          hostExecution: {
            kind: 'worker',
            hostId: OOE_LINEAR_ALGEBRA_WORKER_HOST_ID,
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
        payload,
      } satisfies LinearAlgebraWorkerInboundMessage);
    } catch (error) {
      fail(
        workerRuntimeError(
          error instanceof Error ? `worker-post-message-failed: ${error.message}` : 'worker-post-message-failed',
        ),
      );
    }
  });
}
