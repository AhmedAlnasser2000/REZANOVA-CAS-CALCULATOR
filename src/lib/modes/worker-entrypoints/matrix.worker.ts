import { runMatrixMode, type RunMatrixModeRequest } from '../matrix';
import type {
  LinearAlgebraWorkerInboundMessage,
  LinearAlgebraWorkerOutboundMessage,
} from './linear-algebra-worker-contract';

export type MatrixWorkerInboundMessage = LinearAlgebraWorkerInboundMessage<RunMatrixModeRequest>;
export type MatrixWorkerOutboundMessage = LinearAlgebraWorkerOutboundMessage;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

type MatrixWorkerGlobalScope = {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<MatrixWorkerInboundMessage>) => void,
  ) => void;
  postMessage: (message: MatrixWorkerOutboundMessage) => void;
};

const workerSelf = self as unknown as MatrixWorkerGlobalScope;

workerSelf.addEventListener('message', (event) => {
  if (event.data.kind !== 'run') return;

  try {
    workerSelf.postMessage({ kind: 'started', requestId: event.data.requestId });
    workerSelf.postMessage({
      kind: 'completed',
      requestId: event.data.requestId,
      payload: runMatrixMode(event.data.request),
    });
  } catch (error: unknown) {
    workerSelf.postMessage({
      kind: 'failed',
      requestId: event.data.requestId,
      message: errorMessage(error),
    });
  }
});

export {};
