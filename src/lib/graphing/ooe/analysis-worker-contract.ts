import type { GraphAnalysisRequestV1, GraphAnalysisResultV1 } from '../contracts';

export type GraphAnalysisWorkerInboundMessage =
  | { kind: 'run'; requestId: string; request: GraphAnalysisRequestV1 }
  | { kind: 'cancel'; requestId: string };
export type GraphAnalysisWorkerOutboundMessage =
  | { kind: 'started'; requestId: string }
  | { kind: 'completed'; requestId: string; result: GraphAnalysisResultV1 }
  | { kind: 'failed'; requestId: string; message: string };
export type GraphAnalysisWorkerLike = {
  addEventListener(type: 'message', listener: (event: MessageEvent<GraphAnalysisWorkerOutboundMessage>) => void): void;
  addEventListener(type: 'error', listener: (event: Event) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent<GraphAnalysisWorkerOutboundMessage>) => void): void;
  removeEventListener(type: 'error', listener: (event: Event) => void): void;
  postMessage(message: GraphAnalysisWorkerInboundMessage): void;
  terminate(): void;
};
export type CreateGraphAnalysisWorker = () => GraphAnalysisWorkerLike;
