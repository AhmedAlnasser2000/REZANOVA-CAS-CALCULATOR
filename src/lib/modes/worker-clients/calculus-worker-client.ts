import type { CanonicalRuntimeOutcome } from '../../../types/calculator';
import type { OoeRuntimeControlContext } from '../../ooe/runtime-control/runtime-coordinator';
import type { CalculusHostExecution } from '../../ooe/pilots/calculus-pilot';
import type { RunCalculusWorkspaceModeRequest } from '../../calculus/workspace/engine';
import type {
  CalculusWorkerInboundMessage,
  CalculusWorkerOutboundMessage,
} from '../worker-entrypoints/calculus.worker';
import { WORKER_CANCEL_POLL_INTERVAL_MS, WORKER_STARTUP_TIMEOUT_MS } from './runtime-config';
import { proseSolveSummary } from '../../display/result-detail-lines';
import {
  projectDisplayOutcomeToCanonicalRuntimeOutcome,
  validateCanonicalRuntimeOutcome,
} from '../../result-contract';
import { createCalculusResultOutcome } from '../../calculus/workspace/result-document';

export const CALCULUS_WORKER_RUNTIME_HOST_ID = 'calculus-worker-runtime' as const;
export const CALCULUS_WORKER_RUNTIME_FALLBACK_HOST_ID = 'calculus-runtime' as const;

export type CalculusWorkerRunResult = {
  outcome: CanonicalRuntimeOutcome;
  hostExecution: CalculusHostExecution;
};

type CalculusWorkerLike = {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<CalculusWorkerOutboundMessage>) => void,
  ): void;
  addEventListener(type: 'error', listener: (event: Event) => void): void;
  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<CalculusWorkerOutboundMessage>) => void,
  ): void;
  removeEventListener(type: 'error', listener: (event: Event) => void): void;
  postMessage(message: CalculusWorkerInboundMessage): void;
  terminate(): void;
};

type CreateCalculusWorker = () => CalculusWorkerLike;

type RunCalculusModeViaIsolatedWorkerOptions = {
  createWorker?: CreateCalculusWorker;
  fallback: () => Promise<CanonicalRuntimeOutcome>;
};

let calculusWorkerRequestCounter = 0;

function createDefaultCalculusWorker(): CalculusWorkerLike {
  return new Worker(new URL('../worker-entrypoints/calculus.worker.ts', import.meta.url), {
    type: 'module',
    name: CALCULUS_WORKER_RUNTIME_HOST_ID,
  }) as CalculusWorkerLike;
}

function nextRequestId() {
  calculusWorkerRequestCounter += 1;
  return `calculus-worker-${calculusWorkerRequestCounter}`;
}

function buildCancelledOutcome(): CanonicalRuntimeOutcome {
  return projectDisplayOutcomeToCanonicalRuntimeOutcome(createCalculusResultOutcome({
    kind: 'error',
    title: 'Calculus',
    error: 'Calculus evaluation stopped before it finished.',
    warnings: [],
    ...proseSolveSummary('Calculus evaluation stopped after the worker runtime was hard-stopped.'),
  }), 'Calculus cancellation');
}

async function runFallback(
  context: Pick<OoeRuntimeControlContext, 'checkpoint'>,
  reason: string,
  fallback: () => Promise<CanonicalRuntimeOutcome>,
): Promise<CalculusWorkerRunResult> {
  context.checkpoint(`Calculus worker runtime unavailable; falling back to main-thread Calculus runtime (${reason}).`);
  const outcome = await fallback();
  return {
    outcome,
    hostExecution: {
      kind: 'fallback',
      hostId: CALCULUS_WORKER_RUNTIME_FALLBACK_HOST_ID,
      isolated: false,
      terminalStatus: 'fallback',
      fallbackFromHostId: CALCULUS_WORKER_RUNTIME_HOST_ID,
      reason,
    },
  };
}

function workerRuntimeError(reason: string) {
  return new Error(`Calculus worker runtime failed: ${reason}`);
}

export async function runCalculusModeViaIsolatedWorker(
  request: RunCalculusWorkspaceModeRequest,
  context: OoeRuntimeControlContext,
  options: RunCalculusModeViaIsolatedWorkerOptions,
): Promise<CalculusWorkerRunResult> {
  if (context.shouldCancel()) {
    return {
      outcome: buildCancelledOutcome(),
      hostExecution: {
        kind: 'worker-cancelled',
        hostId: CALCULUS_WORKER_RUNTIME_HOST_ID,
        isolated: true,
        terminalStatus: 'cancelled',
        termination: 'hardStop',
        reason: 'Calculus evaluation stopped before it finished.',
      },
    };
  }

  if (!options.createWorker && typeof Worker === 'undefined') {
    return runFallback(context, 'worker-unavailable', options.fallback);
  }

  let worker: CalculusWorkerLike;
  try {
    worker = options.createWorker ? options.createWorker() : createDefaultCalculusWorker();
  } catch (error) {
    return runFallback(
      context,
      error instanceof Error ? `worker-initialization-failed: ${error.message}` : 'worker-initialization-failed',
      options.fallback,
    );
  }

  const requestId = nextRequestId();
  context.checkpoint('Calculus worker runtime started.');

  return new Promise<CalculusWorkerRunResult>((resolve, reject) => {
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

    const settle = (result: CalculusWorkerRunResult) => {
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
      context.checkpoint('Calculus worker runtime was terminated after a Stop request.');
      settle({
        outcome: buildCancelledOutcome(),
        hostExecution: {
          kind: 'worker-cancelled',
          hostId: CALCULUS_WORKER_RUNTIME_HOST_ID,
          isolated: true,
          terminalStatus: 'cancelled',
          termination: 'hardStop',
          reason: 'Calculus evaluation stopped before it finished.',
        },
      });
    };

    function handleMessage(event: MessageEvent<CalculusWorkerOutboundMessage>) {
      if (event.data.requestId !== requestId) {
        return;
      }

      if (context.shouldCancel()) {
        settleCancelled();
        return;
      }

      if (event.data.kind === 'started') {
        clearStartupTimer();
        context.checkpoint('Calculus worker runtime acknowledged startup.');
        return;
      }

      clearStartupTimer();
      if (event.data.kind === 'completed') {
        const validation = validateCanonicalRuntimeOutcome(event.data.outcome);
        if (!validation.ok) {
          fail(workerRuntimeError(
            `invalid completed outcome: ${validation.failure.reason}: ${validation.failure.message}`,
          ));
          return;
        }
        settle({
          outcome: validation.validated.value,
          hostExecution: {
            kind: 'worker',
            hostId: CALCULUS_WORKER_RUNTIME_HOST_ID,
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
      } satisfies CalculusWorkerInboundMessage);
    } catch (error) {
      fail(
        workerRuntimeError(
          error instanceof Error ? `worker-post-message-failed: ${error.message}` : 'worker-post-message-failed',
        ),
      );
    }
  });
}
