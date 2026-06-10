import type { DisplayOutcome } from '../../types/calculator';
import {
  runCalculateRuntimeRequest,
  type RunCalculateRuntimeRequest,
} from './calculate';

export type CalculateWorkerInboundMessage = {
  kind: 'run';
  requestId: string;
  request: RunCalculateRuntimeRequest;
};

export type CalculateWorkerOutboundMessage =
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

type CalculateWorkerGlobalScope = {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<CalculateWorkerInboundMessage>) => void,
  ) => void;
  postMessage: (message: CalculateWorkerOutboundMessage) => void;
};

const workerSelf = self as unknown as CalculateWorkerGlobalScope;

workerSelf.addEventListener('message', (event: MessageEvent<CalculateWorkerInboundMessage>) => {
  if (event.data.kind !== 'run') {
    return;
  }

  try {
    workerSelf.postMessage({
      kind: 'started',
      requestId: event.data.requestId,
    } satisfies CalculateWorkerOutboundMessage);
    workerSelf.postMessage({
      kind: 'completed',
      requestId: event.data.requestId,
      payload: runCalculateRuntimeRequest(event.data.request),
    } satisfies CalculateWorkerOutboundMessage);
  } catch (error: unknown) {
    workerSelf.postMessage({
      kind: 'failed',
      requestId: event.data.requestId,
      message: errorMessage(error),
    } satisfies CalculateWorkerOutboundMessage);
  }
});

export {};
