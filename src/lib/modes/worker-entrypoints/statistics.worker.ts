import type {
  RunStatisticsRuntimeRequest,
} from '../../statistics/runtime-input';
import {
  buildStatisticsModeRunPayload,
  type StatisticsModeRunPayload,
} from '../../statistics/runtime-run';

export type StatisticsWorkerInboundMessage = {
  kind: 'run';
  requestId: string;
  request: RunStatisticsRuntimeRequest;
};

export type StatisticsWorkerOutboundMessage =
  | {
      kind: 'started';
      requestId: string;
    }
  | {
      kind: 'completed';
      requestId: string;
      payload: StatisticsModeRunPayload;
    }
  | {
      kind: 'failed';
      requestId: string;
      message: string;
    };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

type StatisticsWorkerGlobalScope = {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<StatisticsWorkerInboundMessage>) => void,
  ) => void;
  postMessage: (message: StatisticsWorkerOutboundMessage) => void;
};

const workerSelf = self as unknown as StatisticsWorkerGlobalScope;

workerSelf.addEventListener('message', (event: MessageEvent<StatisticsWorkerInboundMessage>) => {
  if (event.data.kind !== 'run') {
    return;
  }

  try {
    workerSelf.postMessage({
      kind: 'started',
      requestId: event.data.requestId,
    } satisfies StatisticsWorkerOutboundMessage);
    workerSelf.postMessage({
      kind: 'completed',
      requestId: event.data.requestId,
      payload: buildStatisticsModeRunPayload(event.data.request),
    } satisfies StatisticsWorkerOutboundMessage);
  } catch (error: unknown) {
    workerSelf.postMessage({
      kind: 'failed',
      requestId: event.data.requestId,
      message: errorMessage(error),
    } satisfies StatisticsWorkerOutboundMessage);
  }
});

export {};
