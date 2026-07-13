import {
  buildCanonicalTableModeResult,
  runTableMode,
  type CanonicalTableModeResult,
  type RunTableModeRequest,
} from '../table-core';

export type TableWorkerInboundMessage = {
  kind: 'run';
  requestId: string;
  request: RunTableModeRequest;
};

export type TableWorkerOutboundMessage =
  | {
      kind: 'started';
      requestId: string;
    }
  | {
      kind: 'completed';
      requestId: string;
      payload: CanonicalTableModeResult;
    }
  | {
      kind: 'failed';
      requestId: string;
      message: string;
    };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

type TableWorkerGlobalScope = {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<TableWorkerInboundMessage>) => void,
  ) => void;
  postMessage: (message: TableWorkerOutboundMessage) => void;
};

const workerSelf = self as unknown as TableWorkerGlobalScope;

workerSelf.addEventListener('message', (event: MessageEvent<TableWorkerInboundMessage>) => {
  if (event.data.kind !== 'run') {
    return;
  }

  try {
    workerSelf.postMessage({
      kind: 'started',
      requestId: event.data.requestId,
    } satisfies TableWorkerOutboundMessage);
    workerSelf.postMessage({
      kind: 'completed',
      requestId: event.data.requestId,
      payload: buildCanonicalTableModeResult(runTableMode(event.data.request)),
    } satisfies TableWorkerOutboundMessage);
  } catch (error) {
    workerSelf.postMessage({
      kind: 'failed',
      requestId: event.data.requestId,
      message: errorMessage(error),
    } satisfies TableWorkerOutboundMessage);
  }
});

export {};
