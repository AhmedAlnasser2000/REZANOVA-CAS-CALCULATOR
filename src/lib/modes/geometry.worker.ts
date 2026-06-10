import type { RunGeometryRuntimeRequest } from '../geometry/runtime-input';
import {
  buildGeometryModeRunPayload,
  type GeometryModeRunPayload,
} from '../geometry/runtime-run';

export type GeometryWorkerInboundMessage = {
  kind: 'run';
  requestId: string;
  request: RunGeometryRuntimeRequest;
};

export type GeometryWorkerOutboundMessage =
  | {
      kind: 'started';
      requestId: string;
    }
  | {
      kind: 'completed';
      requestId: string;
      payload: GeometryModeRunPayload;
    }
  | {
      kind: 'failed';
      requestId: string;
      message: string;
    };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

type GeometryWorkerGlobalScope = {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<GeometryWorkerInboundMessage>) => void,
  ) => void;
  postMessage: (message: GeometryWorkerOutboundMessage) => void;
};

const workerSelf = self as unknown as GeometryWorkerGlobalScope;

workerSelf.addEventListener('message', (event: MessageEvent<GeometryWorkerInboundMessage>) => {
  if (event.data.kind !== 'run') {
    return;
  }

  try {
    workerSelf.postMessage({
      kind: 'started',
      requestId: event.data.requestId,
    } satisfies GeometryWorkerOutboundMessage);
    workerSelf.postMessage({
      kind: 'completed',
      requestId: event.data.requestId,
      payload: buildGeometryModeRunPayload(event.data.request),
    } satisfies GeometryWorkerOutboundMessage);
  } catch (error: unknown) {
    workerSelf.postMessage({
      kind: 'failed',
      requestId: event.data.requestId,
      message: errorMessage(error),
    } satisfies GeometryWorkerOutboundMessage);
  }
});

export {};
