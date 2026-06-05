import type {
  DisplayOutcome,
  GuardedSolveRequest,
} from '../../types/calculator';
import {
  EQUATION_SOLVE_CANCELLED_MESSAGE,
  type GuardedEquationDirectSymbolicHostEvidence,
  type GuardedEquationDirectSymbolicRunnerResult,
} from './guarded-solve';
import type {
  EquationDirectSymbolicWorkerInboundMessage,
  EquationDirectSymbolicWorkerOutboundMessage,
} from './equation-direct-symbolic.worker';

export const EQUATION_DIRECT_SYMBOLIC_WORKER_HOST_ID =
  'equation-direct-symbolic-worker-runtime' as const;
export const EQUATION_DIRECT_SYMBOLIC_FALLBACK_HOST_ID = 'equation-runtime' as const;

type EquationDirectSymbolicWorkerLike = Pick<
  Worker,
  'addEventListener' | 'removeEventListener' | 'postMessage' | 'terminate'
>;

type CreateEquationDirectSymbolicWorker = () => EquationDirectSymbolicWorkerLike;

type EquationDirectSymbolicWorkerControl = {
  shouldCancel: () => boolean;
  checkpoint: (message: string) => void;
};

type RunEquationDirectSymbolicViaIsolatedWorkerOptions = {
  createWorker?: CreateEquationDirectSymbolicWorker;
  fallback: () => DisplayOutcome;
};

let directSymbolicWorkerRequestCounter = 0;

function createDefaultEquationDirectSymbolicWorker(): EquationDirectSymbolicWorkerLike {
  return new Worker(new URL('./equation-direct-symbolic.worker.ts', import.meta.url), {
    type: 'module',
    name: EQUATION_DIRECT_SYMBOLIC_WORKER_HOST_ID,
  });
}

function nextRequestId() {
  directSymbolicWorkerRequestCounter += 1;
  return `equation-direct-symbolic-worker-${directSymbolicWorkerRequestCounter}`;
}

function buildCancelledOutcome(): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Solve',
    error: EQUATION_SOLVE_CANCELLED_MESSAGE,
    warnings: [],
    plannerBadges: [],
    solveSummaryText: 'Equation solve stopped at an OOE cancellation checkpoint.',
  };
}

function workerHostEvidence(
  depth: number,
  terminalStatus: GuardedEquationDirectSymbolicHostEvidence['terminalStatus'],
): GuardedEquationDirectSymbolicHostEvidence {
  return {
    helperId: 'direct-symbolic',
    stageId: 'direct-symbolic',
    depth,
    selectedHostId: EQUATION_DIRECT_SYMBOLIC_WORKER_HOST_ID,
    isolated: true,
    terminalStatus,
    ...(terminalStatus === 'cancelled' ? { termination: 'hardStop' as const } : {}),
  };
}

function fallbackHostEvidence(
  depth: number,
  reason: string,
): GuardedEquationDirectSymbolicHostEvidence {
  return {
    helperId: 'direct-symbolic',
    stageId: 'direct-symbolic',
    depth,
    selectedHostId: EQUATION_DIRECT_SYMBOLIC_FALLBACK_HOST_ID,
    fallbackFromHostId: EQUATION_DIRECT_SYMBOLIC_WORKER_HOST_ID,
    fallbackReason: reason,
    isolated: false,
    terminalStatus: 'fallback',
  };
}

function runFallback(
  depth: number,
  control: EquationDirectSymbolicWorkerControl,
  reason: string,
  fallback: () => DisplayOutcome,
): GuardedEquationDirectSymbolicRunnerResult {
  control.checkpoint(`Equation direct-symbolic worker unavailable; falling back to main-thread helper (${reason}).`);
  return {
    outcome: fallback(),
    hostEvidence: fallbackHostEvidence(depth, reason),
  };
}

export async function runEquationDirectSymbolicViaIsolatedWorker(
  input: {
    request: GuardedSolveRequest;
    depth: number;
  },
  control: EquationDirectSymbolicWorkerControl,
  options: RunEquationDirectSymbolicViaIsolatedWorkerOptions,
): Promise<GuardedEquationDirectSymbolicRunnerResult> {
  if (control.shouldCancel()) {
    return {
      outcome: buildCancelledOutcome(),
      hostEvidence: workerHostEvidence(input.depth, 'cancelled'),
    };
  }

  if (!options.createWorker && typeof Worker === 'undefined') {
    return runFallback(input.depth, control, 'worker-unavailable', options.fallback);
  }

  let worker: EquationDirectSymbolicWorkerLike;
  try {
    worker = options.createWorker ? options.createWorker() : createDefaultEquationDirectSymbolicWorker();
  } catch (error) {
    return runFallback(
      input.depth,
      control,
      error instanceof Error ? `worker-initialization-failed: ${error.message}` : 'worker-initialization-failed',
      options.fallback,
    );
  }

  const requestId = nextRequestId();
  control.checkpoint('Equation direct-symbolic worker runtime started.');

  return new Promise<GuardedEquationDirectSymbolicRunnerResult>((resolve) => {
    let settled = false;

    const cleanup = () => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      clearInterval(cancelTimer);
    };

    const settle = (result: GuardedEquationDirectSymbolicRunnerResult) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(result);
    };

    const settleCancelled = () => {
      worker.terminate();
      control.checkpoint('Equation direct-symbolic worker was terminated after a Stop request.');
      settle({
        outcome: buildCancelledOutcome(),
        hostEvidence: workerHostEvidence(input.depth, 'cancelled'),
      });
    };

    const fallbackFromWorkerFailure = (reason: string) => {
      worker.terminate();
      cleanup();
      settled = true;
      resolve(runFallback(input.depth, control, reason, options.fallback));
    };

    function handleMessage(event: MessageEvent<EquationDirectSymbolicWorkerOutboundMessage>) {
      if (event.data.requestId !== requestId) {
        return;
      }

      if (control.shouldCancel()) {
        settleCancelled();
        return;
      }

      if (event.data.kind === 'completed') {
        settle({
          outcome: event.data.payload,
          hostEvidence: workerHostEvidence(input.depth, 'completed'),
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
    const cancelTimer = setInterval(() => {
      if (control.shouldCancel()) {
        settleCancelled();
      }
    }, 1);

    try {
      worker.postMessage({
        kind: 'run',
        requestId,
        request: input.request,
      } satisfies EquationDirectSymbolicWorkerInboundMessage);
    } catch (error) {
      fallbackFromWorkerFailure(
        error instanceof Error ? `worker-post-message-failed: ${error.message}` : 'worker-post-message-failed',
      );
    }
  });
}
