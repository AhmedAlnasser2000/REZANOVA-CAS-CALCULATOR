import { GraphExpressionPlanCache } from '../evaluator';
import { runGraphAnalysisRequest } from '../analysis/analyze';
import { validateGraphAnalysisResult } from '../analysis/validation';
import type { GraphAnalysisWorkerInboundMessage, GraphAnalysisWorkerOutboundMessage } from './analysis-worker-contract';

type Scope = {
  addEventListener(type: 'message', listener: (event: MessageEvent<GraphAnalysisWorkerInboundMessage>) => void): void;
  postMessage(message: GraphAnalysisWorkerOutboundMessage): void;
};
const workerSelf = self as unknown as Scope;
const cache = new GraphExpressionPlanCache(100);
const cancelled = new Set<string>();
let active: string | null = null;
let queued: Extract<GraphAnalysisWorkerInboundMessage, { kind: 'run' }> | null = null;

function start(message: Extract<GraphAnalysisWorkerInboundMessage, { kind: 'run' }>) {
  active = message.requestId;
  workerSelf.postMessage({ kind: 'started', requestId: message.requestId });
  void runGraphAnalysisRequest(message.request, cache, {
    isCancelled: () => cancelled.has(message.requestId),
    yieldBetweenItems: () => new Promise((resolve) => setTimeout(resolve, 0)),
  }).then((result) => {
    const validation = validateGraphAnalysisResult(result);
    if (!validation.ok) throw new Error(validation.message);
    workerSelf.postMessage({ kind: 'completed', requestId: message.requestId, result });
  }).catch((error: unknown) => workerSelf.postMessage({
    kind: 'failed', requestId: message.requestId,
    message: error instanceof Error ? error.message : String(error),
  })).finally(() => {
    cancelled.delete(message.requestId);
    if (active === message.requestId) active = null;
    const next = queued; queued = null;
    if (next) start(next);
  });
}

workerSelf.addEventListener('message', (event) => {
  if (event.data.kind === 'cancel') {
    cancelled.add(event.data.requestId);
    if (queued?.requestId === event.data.requestId) queued = null;
  } else if (active) queued = event.data;
  else start(event.data);
});

export {};
