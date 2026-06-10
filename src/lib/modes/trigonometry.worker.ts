import type { RunTrigonometryRuntimeRequest } from '../trigonometry/runtime-input';
import {
  buildTrigonometryModeRunPayload,
  type TrigonometryModeRunPayload,
} from '../trigonometry/runtime-run';

export type TrigonometryWorkerInboundMessage = {
  kind: 'run';
  requestId: string;
  request: RunTrigonometryRuntimeRequest;
};

export type TrigonometryWorkerOutboundMessage =
  | {
      kind: 'started';
      requestId: string;
    }
  | {
      kind: 'completed';
      requestId: string;
      payload: TrigonometryModeRunPayload;
    }
  | {
      kind: 'failed';
      requestId: string;
      message: string;
    };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

type TrigonometryWorkerGlobalScope = {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<TrigonometryWorkerInboundMessage>) => void,
  ) => void;
  postMessage: (message: TrigonometryWorkerOutboundMessage) => void;
};

const workerSelf = self as unknown as TrigonometryWorkerGlobalScope;

workerSelf.addEventListener('message', (event: MessageEvent<TrigonometryWorkerInboundMessage>) => {
  if (event.data.kind !== 'run') {
    return;
  }

  try {
    workerSelf.postMessage({
      kind: 'started',
      requestId: event.data.requestId,
    } satisfies TrigonometryWorkerOutboundMessage);
    workerSelf.postMessage({
      kind: 'completed',
      requestId: event.data.requestId,
      payload: buildTrigonometryModeRunPayload(event.data.request),
    } satisfies TrigonometryWorkerOutboundMessage);
  } catch (error: unknown) {
    workerSelf.postMessage({
      kind: 'failed',
      requestId: event.data.requestId,
      message: errorMessage(error),
    } satisfies TrigonometryWorkerOutboundMessage);
  }
});

export {};
