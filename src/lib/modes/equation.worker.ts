import {
  runEquationModeForIsolatedWorker,
  type RunEquationModeRequest,
} from './equation';
import type { DisplayOutcome } from '../../types/calculator';
import type { GuardedEquationStageReplayTrace } from '../equation/guarded-solve';

export type EquationWorkerInboundMessage = {
  kind: 'run';
  requestId: string;
  request: RunEquationModeRequest;
};

export type EquationWorkerOutboundMessage =
  | {
      kind: 'started';
      requestId: string;
    }
  | {
      kind: 'completed';
      requestId: string;
      payload: DisplayOutcome;
      guardedTrace?: GuardedEquationStageReplayTrace;
    }
  | {
      kind: 'failed';
      requestId: string;
      message: string;
    };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

type EquationWorkerGlobalScope = {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<EquationWorkerInboundMessage>) => void,
  ) => void;
  postMessage: (message: EquationWorkerOutboundMessage) => void;
};

const workerSelf = self as unknown as EquationWorkerGlobalScope;

workerSelf.addEventListener('message', (event: MessageEvent<EquationWorkerInboundMessage>) => {
  if (event.data.kind !== 'run') {
    return;
  }

  workerSelf.postMessage({
    kind: 'started',
    requestId: event.data.requestId,
  } satisfies EquationWorkerOutboundMessage);

  void runEquationModeForIsolatedWorker(event.data.request)
    .then((result) => {
      workerSelf.postMessage({
        kind: 'completed',
        requestId: event.data.requestId,
        payload: result.payload,
        guardedTrace: result.guardedTrace,
      } satisfies EquationWorkerOutboundMessage);
    })
    .catch((error: unknown) => {
      workerSelf.postMessage({
        kind: 'failed',
        requestId: event.data.requestId,
        message: errorMessage(error),
      } satisfies EquationWorkerOutboundMessage);
    });
});

export {};
