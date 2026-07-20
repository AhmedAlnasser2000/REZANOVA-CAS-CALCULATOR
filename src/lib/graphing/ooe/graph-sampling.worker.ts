import { GraphExpressionPlanCache } from '../evaluator';
import { validateGraphSampleResult } from '../contracts';
import { runGraphSampleRequest } from '../sampling/request';
import { GraphSamplingRuntimeCache } from '../sampling/runtime-cache';
import type {
  GraphSamplingWorkerInboundMessage,
  GraphSamplingWorkerOutboundMessage,
} from './worker-contract';

type GraphSamplingWorkerGlobalScope = {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<GraphSamplingWorkerInboundMessage>) => void,
  ) => void;
  postMessage: (
    message: GraphSamplingWorkerOutboundMessage,
    transfer?: Transferable[],
  ) => void;
};

const workerSelf = self as unknown as GraphSamplingWorkerGlobalScope;
const planCache = new GraphExpressionPlanCache(100);
const samplingCache = new GraphSamplingRuntimeCache();
const workspaceDocumentRevisions = new Map<string, number>();
const cancelledRequests = new Set<string>();
let activeRequestId: string | null = null;
let queuedRun: Extract<GraphSamplingWorkerInboundMessage, { kind: 'run' }> | null = null;

function startRun(message: Extract<GraphSamplingWorkerInboundMessage, { kind: 'run' }>) {
  const { requestId, request } = message;
  const previousDocumentRevision = workspaceDocumentRevisions.get(request.workspaceInstanceId);
  if (previousDocumentRevision !== undefined && previousDocumentRevision !== request.revisions.mathematics) {
    samplingCache.clearWorkspace(request.workspaceInstanceId);
  }
  workspaceDocumentRevisions.set(request.workspaceInstanceId, request.revisions.mathematics);
  activeRequestId = requestId;
  workerSelf.postMessage({ kind: 'started', requestId });
  void runGraphSampleRequest(request, planCache, {
    isCancelled: () => cancelledRequests.has(requestId),
    yieldBetweenItems: () => new Promise((resolve) => setTimeout(resolve, request.quality === 'polish' ? 8 : 0)),
  }, samplingCache)
    .then((execution) => {
      const validation = validateGraphSampleResult(execution.result);
      if (!validation.ok) {
        throw new Error(`Graph sampling worker produced invalid output: ${validation.failure.message}`);
      }
      cancelledRequests.delete(requestId);
      workerSelf.postMessage(
        { kind: 'completed', requestId, result: execution.result },
        execution.transferList,
      );
    })
    .catch((error: unknown) => {
      workerSelf.postMessage({
        kind: 'failed',
        requestId,
        message: error instanceof Error ? error.message : String(error),
      });
    })
    .finally(() => {
      cancelledRequests.delete(requestId);
      if (activeRequestId === requestId) activeRequestId = null;
      const next = queuedRun;
      queuedRun = null;
      if (next) startRun(next);
    });
}

workerSelf.addEventListener('message', (event) => {
  if (event.data.kind === 'cancel') {
    cancelledRequests.add(event.data.requestId);
    if (queuedRun?.requestId === event.data.requestId) queuedRun = null;
    return;
  }
  if (activeRequestId) {
    queuedRun = event.data;
    return;
  }
  startRun(event.data);
});

export {};
