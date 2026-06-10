import type { RunGeometryRuntimeRequest } from '../geometry/runtime-input';
import type { GeometryModeRunPayload } from '../geometry/runtime-run';
import type { OoeRuntimeControlContext } from '../ooe/runtime-coordinator';
import type { GeometryHostExecution } from '../ooe/geometry-pilot';
import type {
  GeometryWorkerInboundMessage,
  GeometryWorkerOutboundMessage,
} from './geometry.worker';
import { WORKER_CANCEL_POLL_INTERVAL_MS, WORKER_STARTUP_TIMEOUT_MS } from './worker-runtime-config';

export const GEOMETRY_WORKER_RUNTIME_HOST_ID = 'geometry-worker-runtime' as const;
export const GEOMETRY_WORKER_RUNTIME_FALLBACK_HOST_ID = 'geometry-runtime' as const;

export type GeometryWorkerRunResult = {
  payload: GeometryModeRunPayload;
  hostExecution: GeometryHostExecution;
};

type GeometryWorkerLike = {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<GeometryWorkerOutboundMessage>) => void,
  ): void;
  addEventListener(type: 'error', listener: (event: Event) => void): void;
  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<GeometryWorkerOutboundMessage>) => void,
  ): void;
  removeEventListener(type: 'error', listener: (event: Event) => void): void;
  postMessage(message: GeometryWorkerInboundMessage): void;
  terminate(): void;
};

export type CreateGeometryWorker = () => GeometryWorkerLike;

type RunGeometryModeViaIsolatedWorkerOptions = {
  createWorker?: CreateGeometryWorker;
  fallback: () => Promise<GeometryModeRunPayload> | GeometryModeRunPayload;
};

let geometryWorkerRequestCounter = 0;

function createDefaultGeometryWorker(): GeometryWorkerLike {
  return new Worker(new URL('./geometry.worker.ts', import.meta.url), {
    type: 'module',
    name: GEOMETRY_WORKER_RUNTIME_HOST_ID,
  }) as GeometryWorkerLike;
}

function nextRequestId() {
  geometryWorkerRequestCounter += 1;
  return `geometry-worker-${geometryWorkerRequestCounter}`;
}

function buildCancelledPayload(request: RunGeometryRuntimeRequest): GeometryModeRunPayload {
  return {
    outcome: {
      kind: 'error',
      title: 'Geometry',
      error: 'Geometry evaluation stopped before it finished.',
      warnings: [],
      solveSummaryText: 'Geometry evaluation stopped after the worker runtime was hard-stopped.',
    },
    parsed: {
      ok: false,
      error: 'Geometry evaluation stopped before it finished.',
    },
    replayScreen: request.screenHint,
  };
}

async function runFallback(
  context: Pick<OoeRuntimeControlContext, 'checkpoint'>,
  reason: string,
  fallback: () => Promise<GeometryModeRunPayload> | GeometryModeRunPayload,
): Promise<GeometryWorkerRunResult> {
  context.checkpoint(`Geometry worker runtime unavailable; falling back to main-thread Geometry runtime (${reason}).`);
  const payload = await fallback();
  return {
    payload,
    hostExecution: {
      kind: 'fallback',
      hostId: GEOMETRY_WORKER_RUNTIME_FALLBACK_HOST_ID,
      isolated: false,
      terminalStatus: 'fallback',
      fallbackFromHostId: GEOMETRY_WORKER_RUNTIME_HOST_ID,
      reason,
    },
  };
}

function workerRuntimeError(reason: string) {
  return new Error(`Geometry worker runtime failed: ${reason}`);
}

export async function runGeometryModeViaIsolatedWorker(
  request: RunGeometryRuntimeRequest,
  context: OoeRuntimeControlContext,
  options: RunGeometryModeViaIsolatedWorkerOptions,
): Promise<GeometryWorkerRunResult> {
  if (context.shouldCancel()) {
    return {
      payload: buildCancelledPayload(request),
      hostExecution: {
        kind: 'worker-cancelled',
        hostId: GEOMETRY_WORKER_RUNTIME_HOST_ID,
        isolated: true,
        terminalStatus: 'cancelled',
        termination: 'hardStop',
        reason: 'Geometry evaluation stopped before it finished.',
      },
    };
  }

  if (!options.createWorker && typeof Worker === 'undefined') {
    return runFallback(context, 'worker-unavailable', options.fallback);
  }

  let worker: GeometryWorkerLike;
  try {
    worker = options.createWorker ? options.createWorker() : createDefaultGeometryWorker();
  } catch (error) {
    return runFallback(
      context,
      error instanceof Error ? `worker-initialization-failed: ${error.message}` : 'worker-initialization-failed',
      options.fallback,
    );
  }

  const requestId = nextRequestId();
  context.checkpoint('Geometry worker runtime started.');

  return new Promise<GeometryWorkerRunResult>((resolve, reject) => {
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

    const settle = (result: GeometryWorkerRunResult) => {
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
      context.checkpoint('Geometry worker runtime was terminated after a Stop request.');
      settle({
        payload: buildCancelledPayload(request),
        hostExecution: {
          kind: 'worker-cancelled',
          hostId: GEOMETRY_WORKER_RUNTIME_HOST_ID,
          isolated: true,
          terminalStatus: 'cancelled',
          termination: 'hardStop',
          reason: 'Geometry evaluation stopped before it finished.',
        },
      });
    };

    function handleMessage(event: MessageEvent<GeometryWorkerOutboundMessage>) {
      if (event.data.requestId !== requestId) {
        return;
      }

      if (context.shouldCancel()) {
        settleCancelled();
        return;
      }

      if (event.data.kind === 'started') {
        clearStartupTimer();
        context.checkpoint('Geometry worker runtime acknowledged startup.');
        return;
      }

      clearStartupTimer();
      if (event.data.kind === 'completed') {
        settle({
          payload: event.data.payload,
          hostExecution: {
            kind: 'worker',
            hostId: GEOMETRY_WORKER_RUNTIME_HOST_ID,
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
      } satisfies GeometryWorkerInboundMessage);
    } catch (error) {
      fail(
        workerRuntimeError(
          error instanceof Error ? `worker-post-message-failed: ${error.message}` : 'worker-post-message-failed',
        ),
      );
    }
  });
}
