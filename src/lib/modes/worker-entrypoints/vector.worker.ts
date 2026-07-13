import { runVectorMode, type RunVectorModeRequest } from '../vector';
import { projectDisplayOutcomeToCanonicalRuntimeOutcome } from '../../result-contract';
import type {
  LinearAlgebraWorkerInboundMessage,
  LinearAlgebraWorkerOutboundMessage,
} from './linear-algebra-worker-contract';

export type VectorWorkerInboundMessage = LinearAlgebraWorkerInboundMessage<RunVectorModeRequest>;
export type VectorWorkerOutboundMessage = LinearAlgebraWorkerOutboundMessage;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

type VectorWorkerGlobalScope = {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<VectorWorkerInboundMessage>) => void,
  ) => void;
  postMessage: (message: VectorWorkerOutboundMessage) => void;
};

const workerSelf = self as unknown as VectorWorkerGlobalScope;

workerSelf.addEventListener('message', (event) => {
  if (event.data.kind !== 'run') return;

  try {
    workerSelf.postMessage({ kind: 'started', requestId: event.data.requestId });
    workerSelf.postMessage({
      kind: 'completed',
      requestId: event.data.requestId,
      payload: projectDisplayOutcomeToCanonicalRuntimeOutcome(
        runVectorMode(event.data.request),
        'Vector worker',
      ),
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
