import type { DisplayOutcome } from '../../../types/calculator';
import type {
  LinearAlgebraHostExecution,
  OOE_MATRIX_FALLBACK_HOST_ID,
  OOE_MATRIX_WORKER_HOST_ID,
  OOE_VECTOR_FALLBACK_HOST_ID,
  OOE_VECTOR_WORKER_HOST_ID,
} from '../../ooe/pilots/linear-algebra-pilot';
import type { OoeRuntimeControlContext } from '../../ooe/runtime-control/runtime-coordinator';
import type {
  LinearAlgebraWorkerInboundMessage,
  LinearAlgebraWorkerOutboundMessage,
} from '../worker-entrypoints/linear-algebra-worker-contract';
import { WORKER_CANCEL_POLL_INTERVAL_MS, WORKER_STARTUP_TIMEOUT_MS } from './runtime-config';
import { proseSolveSummary } from '../../display/result-detail-lines';

export type LinearAlgebraWorkerLike<TRequest> = {
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
  postMessage(message: LinearAlgebraWorkerInboundMessage<TRequest>): void;
  terminate(): void;
};

export type CreateLinearAlgebraWorkspaceWorker<TRequest> = () => LinearAlgebraWorkerLike<TRequest>;

export type LinearAlgebraWorkerRunResult = {
  payload: DisplayOutcome;
  hostExecution: LinearAlgebraHostExecution;
};

type LinearAlgebraWorkerConfig<TRequest> = (
  | {
      label: 'Matrix';
      requestIdPrefix: 'matrix-worker';
      primaryHostId: typeof OOE_MATRIX_WORKER_HOST_ID;
      fallbackHostId: typeof OOE_MATRIX_FALLBACK_HOST_ID;
    }
  | {
      label: 'Vector';
      requestIdPrefix: 'vector-worker';
      primaryHostId: typeof OOE_VECTOR_WORKER_HOST_ID;
      fallbackHostId: typeof OOE_VECTOR_FALLBACK_HOST_ID;
    }
) & {
  createDefaultWorker: CreateLinearAlgebraWorkspaceWorker<TRequest>;
};

type RunLinearAlgebraWorkspaceViaIsolatedWorkerOptions<TRequest> = {
  createWorker?: CreateLinearAlgebraWorkspaceWorker<TRequest>;
  fallback: () => Promise<DisplayOutcome> | DisplayOutcome;
};

const requestCounters = new Map<string, number>();

function nextRequestId(prefix: string) {
  const next = (requestCounters.get(prefix) ?? 0) + 1;
  requestCounters.set(prefix, next);
  return `${prefix}-${next}`;
}

function stoppedMessage(label: string) {
  return `${label} operation stopped before it finished.`;
}

function buildCancelledPayload(label: string): DisplayOutcome {
  return {
    kind: 'error',
    title: label,
    error: stoppedMessage(label),
    warnings: [],
    ...proseSolveSummary(`${label} operation stopped after the worker runtime was hard-stopped.`),
  };
}

async function runFallback<TRequest>(
  context: Pick<OoeRuntimeControlContext, 'checkpoint'>,
  reason: string,
  config: LinearAlgebraWorkerConfig<TRequest>,
  fallback: () => Promise<DisplayOutcome> | DisplayOutcome,
): Promise<LinearAlgebraWorkerRunResult> {
  context.checkpoint(
    `${config.label} worker runtime unavailable; falling back to main-thread ${config.label} runtime (${reason}).`,
  );
  const payload = await fallback();
  return {
    payload,
    hostExecution: {
      kind: 'fallback',
      hostId: config.fallbackHostId,
      isolated: false,
      terminalStatus: 'fallback',
      fallbackFromHostId: config.primaryHostId,
      reason,
    },
  };
}

function workerRuntimeError(label: string, reason: string) {
  return new Error(`${label} worker runtime failed: ${reason}`);
}

export async function runLinearAlgebraWorkspaceViaIsolatedWorker<TRequest>(
  request: TRequest,
  context: OoeRuntimeControlContext,
  config: LinearAlgebraWorkerConfig<TRequest>,
  options: RunLinearAlgebraWorkspaceViaIsolatedWorkerOptions<TRequest>,
): Promise<LinearAlgebraWorkerRunResult> {
  if (context.shouldCancel()) {
    return {
      payload: buildCancelledPayload(config.label),
      hostExecution: {
        kind: 'worker-cancelled',
        hostId: config.primaryHostId,
        isolated: true,
        terminalStatus: 'cancelled',
        termination: 'hardStop',
        reason: stoppedMessage(config.label),
      },
    };
  }

  if (!options.createWorker && typeof Worker === 'undefined') {
    return runFallback(context, 'worker-unavailable', config, options.fallback);
  }

  let worker: LinearAlgebraWorkerLike<TRequest>;
  try {
    worker = options.createWorker ? options.createWorker() : config.createDefaultWorker();
  } catch (error) {
    return runFallback(
      context,
      error instanceof Error ? `worker-initialization-failed: ${error.message}` : 'worker-initialization-failed',
      config,
      options.fallback,
    );
  }

  const requestId = nextRequestId(config.requestIdPrefix);
  context.checkpoint(`${config.label} worker runtime started.`);

  return new Promise<LinearAlgebraWorkerRunResult>((resolve, reject) => {
    let settled = false;
    let startupTimer: ReturnType<typeof setTimeout> | undefined;
    const cancelTimer = setInterval(() => {
      if (context.shouldCancel()) settleCancelled();
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
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      cleanup();
      reject(error);
    };

    const fallbackBeforeStartup = (reason: string) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      cleanup();
      void runFallback(context, reason, config, options.fallback).then(resolve, reject);
    };

    const settleCancelled = () => {
      worker.terminate();
      context.checkpoint(`${config.label} worker runtime was terminated after a Stop request.`);
      settle({
        payload: buildCancelledPayload(config.label),
        hostExecution: {
          kind: 'worker-cancelled',
          hostId: config.primaryHostId,
          isolated: true,
          terminalStatus: 'cancelled',
          termination: 'hardStop',
          reason: stoppedMessage(config.label),
        },
      });
    };

    function handleMessage(event: MessageEvent<LinearAlgebraWorkerOutboundMessage>) {
      if (event.data.requestId !== requestId) return;
      if (context.shouldCancel()) {
        settleCancelled();
        return;
      }
      if (event.data.kind === 'started') {
        clearStartupTimer();
        context.checkpoint(`${config.label} worker runtime acknowledged startup.`);
        return;
      }

      clearStartupTimer();
      if (event.data.kind === 'completed') {
        settle({
          payload: event.data.payload,
          hostExecution: {
            kind: 'worker',
            hostId: config.primaryHostId,
            isolated: true,
            terminalStatus: 'completed',
          },
        });
        return;
      }
      fail(workerRuntimeError(config.label, event.data.message));
    }

    function handleError() {
      fail(workerRuntimeError(config.label, 'worker-runtime-error'));
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
      worker.postMessage({ kind: 'run', requestId, request });
    } catch (error) {
      fail(workerRuntimeError(
        config.label,
        error instanceof Error ? `worker-post-message-failed: ${error.message}` : 'worker-post-message-failed',
      ));
    }
  });
}
