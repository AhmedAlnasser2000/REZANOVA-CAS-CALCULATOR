import { GraphExpressionPlanCache } from '../evaluator';
import { validateGraphSampleResult } from '../contracts';
import { runGraphSampleRequest } from '../sampling/request';
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

workerSelf.addEventListener('message', (event) => {
  if (event.data.kind !== 'run') return;
  const { requestId, request } = event.data;
  workerSelf.postMessage({ kind: 'started', requestId });
  void runGraphSampleRequest(request, planCache)
    .then((execution) => {
      const validation = validateGraphSampleResult(execution.result);
      if (!validation.ok) {
        throw new Error(`Graph sampling worker produced invalid output: ${validation.failure.message}`);
      }
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
    });
});

export {};
