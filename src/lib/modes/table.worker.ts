import {
  runTableMode,
  type RunTableModeRequest,
  type TableModeResult,
} from './table-core';

export type TableWorkerInboundMessage = {
  kind: 'run';
  requestId: string;
  request: RunTableModeRequest;
};

export type TableWorkerOutboundMessage =
  | {
      kind: 'completed';
      requestId: string;
      payload: TableModeResult;
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
      kind: 'completed',
      requestId: event.data.requestId,
      payload: runTableMode(event.data.request),
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
