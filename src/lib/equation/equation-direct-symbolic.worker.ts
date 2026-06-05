import type {
  DisplayOutcome,
  GuardedSolveRequest,
} from '../../types/calculator';
import { runGuardedDirectSymbolicFallback } from './guarded-solve';

export type EquationDirectSymbolicWorkerInboundMessage = {
  kind: 'run';
  requestId: string;
  request: GuardedSolveRequest;
};

export type EquationDirectSymbolicWorkerOutboundMessage =
  | {
      kind: 'completed';
      requestId: string;
      payload: DisplayOutcome;
    }
  | {
      kind: 'failed';
      requestId: string;
      message: string;
    };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

type EquationDirectSymbolicWorkerGlobalScope = {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<EquationDirectSymbolicWorkerInboundMessage>) => void,
  ) => void;
  postMessage: (message: EquationDirectSymbolicWorkerOutboundMessage) => void;
};

const workerSelf = self as unknown as EquationDirectSymbolicWorkerGlobalScope;

workerSelf.addEventListener('message', (event: MessageEvent<EquationDirectSymbolicWorkerInboundMessage>) => {
  if (event.data.kind !== 'run') {
    return;
  }

  try {
    workerSelf.postMessage({
      kind: 'completed',
      requestId: event.data.requestId,
      payload: runGuardedDirectSymbolicFallback(event.data.request),
    } satisfies EquationDirectSymbolicWorkerOutboundMessage);
  } catch (error) {
    workerSelf.postMessage({
      kind: 'failed',
      requestId: event.data.requestId,
      message: errorMessage(error),
    } satisfies EquationDirectSymbolicWorkerOutboundMessage);
  }
});

export {};
