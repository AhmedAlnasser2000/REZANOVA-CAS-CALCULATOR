import type {
  GraphSampleRequestV6,
  GraphSampleResultV6,
} from '../contracts';

export type GraphSamplingWorkerInboundMessage = {
  kind: 'run';
  requestId: string;
  request: GraphSampleRequestV6;
} | { kind: 'cancel'; requestId: string };

export type GraphSamplingWorkerOutboundMessage =
  | { kind: 'started'; requestId: string }
  | { kind: 'completed'; requestId: string; result: GraphSampleResultV6 }
  | { kind: 'failed'; requestId: string; message: string };

export type GraphSamplingWorkerLike = {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<GraphSamplingWorkerOutboundMessage>) => void,
  ): void;
  addEventListener(type: 'error', listener: (event: Event) => void): void;
  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<GraphSamplingWorkerOutboundMessage>) => void,
  ): void;
  removeEventListener(type: 'error', listener: (event: Event) => void): void;
  postMessage(message: GraphSamplingWorkerInboundMessage): void;
  terminate(): void;
};

export type CreateGraphSamplingWorker = () => GraphSamplingWorkerLike;
