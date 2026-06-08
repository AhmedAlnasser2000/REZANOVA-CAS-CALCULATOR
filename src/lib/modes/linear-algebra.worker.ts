import type { DisplayOutcome } from '../../types/calculator';
import {
  runMatrixMode,
  type RunMatrixModeRequest,
} from './matrix';
import {
  runVectorMode,
  type RunVectorModeRequest,
} from './vector';

export type LinearAlgebraWorkerRunPayload =
  | {
      kind: 'matrix';
      request: RunMatrixModeRequest;
    }
  | {
      kind: 'vector';
      request: RunVectorModeRequest;
    };

export type LinearAlgebraWorkerInboundMessage = {
  kind: 'run';
  requestId: string;
  payload: LinearAlgebraWorkerRunPayload;
};

export type LinearAlgebraWorkerOutboundMessage =
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

function runLinearAlgebraPayload(payload: LinearAlgebraWorkerRunPayload): DisplayOutcome {
  return payload.kind === 'matrix'
    ? runMatrixMode(payload.request)
    : runVectorMode(payload.request);
}

type LinearAlgebraWorkerGlobalScope = {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<LinearAlgebraWorkerInboundMessage>) => void,
  ) => void;
  postMessage: (message: LinearAlgebraWorkerOutboundMessage) => void;
};

const workerSelf = self as unknown as LinearAlgebraWorkerGlobalScope;

workerSelf.addEventListener('message', (event: MessageEvent<LinearAlgebraWorkerInboundMessage>) => {
  if (event.data.kind !== 'run') {
    return;
  }

  try {
    workerSelf.postMessage({
      kind: 'started',
      requestId: event.data.requestId,
    } satisfies LinearAlgebraWorkerOutboundMessage);
    workerSelf.postMessage({
      kind: 'completed',
      requestId: event.data.requestId,
      payload: runLinearAlgebraPayload(event.data.payload),
    } satisfies LinearAlgebraWorkerOutboundMessage);
  } catch (error: unknown) {
    workerSelf.postMessage({
      kind: 'failed',
      requestId: event.data.requestId,
      message: errorMessage(error),
    } satisfies LinearAlgebraWorkerOutboundMessage);
  }
});

export {};
