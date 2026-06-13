import {
  runAdvancedCalcMode,
  type RunAdvancedCalcModeRequest,
} from '../../advanced-calc/engine';
import type { DisplayOutcome } from '../../../types/calculator';

export type CalculusWorkerInboundMessage = {
  kind: 'run';
  requestId: string;
  request: RunAdvancedCalcModeRequest;
};

export type CalculusWorkerOutboundMessage =
  | {
      kind: 'started';
      requestId: string;
    }
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

type CalculusWorkerGlobalScope = {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<CalculusWorkerInboundMessage>) => void,
  ) => void;
  postMessage: (message: CalculusWorkerOutboundMessage) => void;
};

const workerSelf = self as unknown as CalculusWorkerGlobalScope;

workerSelf.addEventListener('message', (event: MessageEvent<CalculusWorkerInboundMessage>) => {
  if (event.data.kind !== 'run') {
    return;
  }

  workerSelf.postMessage({
    kind: 'started',
    requestId: event.data.requestId,
  } satisfies CalculusWorkerOutboundMessage);

  void runAdvancedCalcMode(event.data.request)
    .then((payload) => {
      workerSelf.postMessage({
        kind: 'completed',
        requestId: event.data.requestId,
        payload,
      } satisfies CalculusWorkerOutboundMessage);
    })
    .catch((error: unknown) => {
      workerSelf.postMessage({
        kind: 'failed',
        requestId: event.data.requestId,
        message: errorMessage(error),
      } satisfies CalculusWorkerOutboundMessage);
    });
});

export {};
