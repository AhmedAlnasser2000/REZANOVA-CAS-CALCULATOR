import type { DisplayOutcome } from '../../types/calculator';
import {
  EQUATION_SOLVE_CANCELLED_MESSAGE,
  type GuardedEquationStageReplayTrace,
} from '../equation/guarded-solve';
import type { OoeRuntimeControlContext } from '../ooe/runtime-coordinator';
import type { EquationRuntimeHostExecution } from '../ooe/equation-pilot';
import type {
  EquationWorkerInboundMessage,
  EquationWorkerOutboundMessage,
} from './equation.worker';
import type { RunEquationModeRequest } from './equation';

export const EQUATION_WORKER_RUNTIME_HOST_ID = 'equation-worker-runtime' as const;
export const EQUATION_WORKER_RUNTIME_FALLBACK_HOST_ID = 'equation-runtime' as const;

export type EquationWorkerRunPayload = {
  payload: DisplayOutcome;
  guardedTrace?: GuardedEquationStageReplayTrace;
};

export type EquationWorkerRunResult = EquationWorkerRunPayload & {
  hostExecution: EquationRuntimeHostExecution;
};

type EquationWorkerLike = {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<EquationWorkerOutboundMessage>) => void,
  ): void;
  addEventListener(type: 'error', listener: (event: Event) => void): void;
  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<EquationWorkerOutboundMessage>) => void,
  ): void;
  removeEventListener(type: 'error', listener: (event: Event) => void): void;
  postMessage(message: EquationWorkerInboundMessage): void;
  terminate(): void;
};

type CreateEquationWorker = () => EquationWorkerLike;

type RunEquationModeViaIsolatedWorkerOptions = {
  createWorker?: CreateEquationWorker;
  fallback: () => Promise<EquationWorkerRunPayload>;
};

let equationWorkerRequestCounter = 0;

function createDefaultEquationWorker(): EquationWorkerLike {
  return new Worker(new URL('./equation.worker.ts', import.meta.url), {
    type: 'module',
    name: EQUATION_WORKER_RUNTIME_HOST_ID,
  }) as EquationWorkerLike;
}

function nextRequestId() {
  equationWorkerRequestCounter += 1;
  return `equation-worker-${equationWorkerRequestCounter}`;
}

function buildCancelledOutcome(): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Solve',
    error: EQUATION_SOLVE_CANCELLED_MESSAGE,
    warnings: [],
    plannerBadges: [],
    solveSummaryText: 'Equation solve stopped after the Equation worker runtime was hard-stopped.',
  };
}

async function runFallback(
  context: Pick<OoeRuntimeControlContext, 'checkpoint'>,
  reason: string,
  fallback: () => Promise<EquationWorkerRunPayload>,
): Promise<EquationWorkerRunResult> {
  context.checkpoint(`Equation worker runtime unavailable; falling back to main-thread Equation runtime (${reason}).`);
  const result = await fallback();
  return {
    ...result,
    hostExecution: {
      kind: 'fallback',
      hostId: EQUATION_WORKER_RUNTIME_FALLBACK_HOST_ID,
      isolated: false,
      terminalStatus: 'fallback',
      fallbackFromHostId: EQUATION_WORKER_RUNTIME_HOST_ID,
      reason,
    },
  };
}

function workerRuntimeError(reason: string) {
  return new Error(`Equation worker runtime failed: ${reason}`);
}

export async function runEquationModeViaIsolatedWorker(
  request: RunEquationModeRequest,
  context: OoeRuntimeControlContext,
  options: RunEquationModeViaIsolatedWorkerOptions,
): Promise<EquationWorkerRunResult> {
  if (context.shouldCancel()) {
    return {
      payload: buildCancelledOutcome(),
      hostExecution: {
        kind: 'worker-cancelled',
        hostId: EQUATION_WORKER_RUNTIME_HOST_ID,
        isolated: true,
        terminalStatus: 'cancelled',
        termination: 'hardStop',
        reason: EQUATION_SOLVE_CANCELLED_MESSAGE,
      },
    };
  }

  if (!options.createWorker && typeof Worker === 'undefined') {
    return runFallback(context, 'worker-unavailable', options.fallback);
  }

  let worker: EquationWorkerLike;
  try {
    worker = options.createWorker ? options.createWorker() : createDefaultEquationWorker();
  } catch (error) {
    return runFallback(
      context,
      error instanceof Error ? `worker-initialization-failed: ${error.message}` : 'worker-initialization-failed',
      options.fallback,
    );
  }

  const requestId = nextRequestId();
  context.checkpoint('Equation worker runtime started.');

  return new Promise<EquationWorkerRunResult>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      clearInterval(cancelTimer);
    };

    const settle = (result: EquationWorkerRunResult) => {
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

    const settleCancelled = () => {
      worker.terminate();
      context.checkpoint('Equation worker runtime was terminated after a Stop request.');
      settle({
        payload: buildCancelledOutcome(),
        hostExecution: {
          kind: 'worker-cancelled',
          hostId: EQUATION_WORKER_RUNTIME_HOST_ID,
          isolated: true,
          terminalStatus: 'cancelled',
          termination: 'hardStop',
          reason: EQUATION_SOLVE_CANCELLED_MESSAGE,
        },
      });
    };

    function handleMessage(event: MessageEvent<EquationWorkerOutboundMessage>) {
      if (event.data.requestId !== requestId) {
        return;
      }

      if (context.shouldCancel()) {
        settleCancelled();
        return;
      }

      if (event.data.kind === 'completed') {
        settle({
          payload: event.data.payload,
          guardedTrace: event.data.guardedTrace,
          hostExecution: {
            kind: 'worker',
            hostId: EQUATION_WORKER_RUNTIME_HOST_ID,
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
    const cancelTimer = setInterval(() => {
      if (context.shouldCancel()) {
        settleCancelled();
      }
    }, 1);

    try {
      worker.postMessage({
        kind: 'run',
        requestId,
        request,
      } satisfies EquationWorkerInboundMessage);
    } catch (error) {
      worker.terminate();
      cleanup();
      settled = true;
      void runFallback(
        context,
        error instanceof Error ? `worker-post-message-failed: ${error.message}` : 'worker-post-message-failed',
        options.fallback,
      ).then(resolve, reject);
    }
  });
}
