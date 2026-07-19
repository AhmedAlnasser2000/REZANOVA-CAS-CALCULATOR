import type { OoeRuntimeControlContext } from '../../ooe/runtime-control/runtime-coordinator';
import {
  validateTransferredGraphSampleResult,
  type GraphSampleRequestV1,
  type GraphSampleResultV1,
} from '../contracts';
import { GraphExpressionPlanCache } from '../evaluator';
import { collectGraphSceneTransferables } from '../scene';
import {
  buildCancelledGraphSampleExecution,
  runGraphSampleRequest,
  type GraphSampleExecution,
} from '../sampling/request';
import type {
  CreateGraphSamplingWorker,
  GraphSamplingWorkerLike,
  GraphSamplingWorkerOutboundMessage,
} from './worker-contract';

export const GRAPH_SAMPLE_WORKER_HOST_ID = 'graph-sampling-worker-runtime' as const;
export const GRAPH_SAMPLE_FALLBACK_HOST_ID = 'graph-sampling-runtime' as const;

export type GraphSamplingHostExecution =
  | {
      kind: 'worker';
      hostId: typeof GRAPH_SAMPLE_WORKER_HOST_ID;
      isolated: true;
      terminalStatus: 'completed';
    }
  | {
      kind: 'worker-cancelled';
      hostId: typeof GRAPH_SAMPLE_WORKER_HOST_ID;
      isolated: true;
      terminalStatus: 'cancelled';
      termination: 'hardStop';
      reason: string;
    }
  | {
      kind: 'fallback';
      hostId: typeof GRAPH_SAMPLE_FALLBACK_HOST_ID;
      isolated: false;
      terminalStatus: 'fallback';
      fallbackFromHostId: typeof GRAPH_SAMPLE_WORKER_HOST_ID;
      reason: string;
    }
  | {
      kind: 'fallback-cancelled';
      hostId: typeof GRAPH_SAMPLE_FALLBACK_HOST_ID;
      isolated: false;
      terminalStatus: 'cancelled';
      fallbackFromHostId: typeof GRAPH_SAMPLE_WORKER_HOST_ID;
      termination: 'cooperative';
      reason: string;
    };

export type GraphSamplingHostResult = GraphSampleExecution & {
  hostExecution: GraphSamplingHostExecution;
};

type GraphSamplingApplicationHostOptions = {
  createWorker?: CreateGraphSamplingWorker;
  cancellationPollMs?: number;
  startupTimeoutMs?: number;
};

type ActiveRun = {
  cancel: (reason: string) => void;
};

function defaultWorker(): GraphSamplingWorkerLike {
  return new Worker(new URL('./graph-sampling.worker.ts', import.meta.url), {
    type: 'module',
    name: GRAPH_SAMPLE_WORKER_HOST_ID,
  }) as GraphSamplingWorkerLike;
}

function resultMatchesRequest(
  result: GraphSampleResultV1,
  request: GraphSampleRequestV1,
) {
  return result.requestId === request.requestId
    && result.workspaceInstanceId === request.workspaceInstanceId
    && result.documentId === request.documentId
    && result.quality === request.quality
    && result.revisions.scene === request.revisions.scene
    && result.revisions.document === request.revisions.document
    && result.revisions.viewport === request.revisions.viewport
    && result.revisions.parameter === request.revisions.parameter
    && result.viewport.coordinateSystem === request.viewport.coordinateSystem
    && result.viewport.xMin === request.viewport.xMin
    && result.viewport.xMax === request.viewport.xMax
    && result.viewport.yMin === request.viewport.yMin
    && result.viewport.yMax === request.viewport.yMax;
}

export class GraphSamplingApplicationHost {
  readonly #options: GraphSamplingApplicationHostOptions;
  readonly #fallbackPlanCache = new GraphExpressionPlanCache(100);
  #worker: GraphSamplingWorkerLike | null = null;
  #activeRun: ActiveRun | null = null;
  #requestSequence = 0;
  #workerGenerationCount = 0;

  constructor(options: GraphSamplingApplicationHostOptions = {}) {
    this.#options = options;
  }

  get evidence() {
    return {
      activeRequestCount: this.#activeRun ? 1 : 0,
      workerGenerationCount: this.#workerGenerationCount,
      hasRetainedWorker: this.#worker !== null,
    };
  }

  async run(
    request: GraphSampleRequestV1,
    context: OoeRuntimeControlContext,
  ): Promise<GraphSamplingHostResult> {
    if (context.shouldCancel()) {
      const execution = buildCancelledGraphSampleExecution(request, 'cancelled-before-host-start');
      return {
        ...execution,
        hostExecution: {
          kind: 'worker-cancelled',
          hostId: GRAPH_SAMPLE_WORKER_HOST_ID,
          isolated: true,
          terminalStatus: 'cancelled',
          termination: 'hardStop',
          reason: 'Graph sampling stopped before host startup.',
        },
      };
    }
    this.#activeRun?.cancel('Superseded by the latest Graph sampling request.');
    const worker = this.#ensureWorker();
    if (!worker) {
      return this.#runFallback(request, context, 'worker-unavailable');
    }
    return this.#runWorker(worker, request, context);
  }

  cancelActive(reason = 'Graph sampling host was cancelled.') {
    this.#activeRun?.cancel(reason);
  }

  dispose(reason = 'Graph sampling host was disposed.') {
    this.#activeRun?.cancel(reason);
    this.#terminateWorker();
    this.#fallbackPlanCache.clear();
  }

  #ensureWorker() {
    if (this.#worker) return this.#worker;
    if (!this.#options.createWorker && typeof Worker === 'undefined') return null;
    try {
      this.#worker = this.#options.createWorker?.() ?? defaultWorker();
      this.#workerGenerationCount += 1;
      return this.#worker;
    } catch {
      this.#worker = null;
      return null;
    }
  }

  #terminateWorker() {
    this.#worker?.terminate();
    this.#worker = null;
  }

  async #runFallback(
    request: GraphSampleRequestV1,
    context: OoeRuntimeControlContext,
    reason: string,
  ): Promise<GraphSamplingHostResult> {
    context.checkpoint(`Graph sampling worker unavailable; using cooperative fallback (${reason}).`);
    let locallyCancelled = false;
    const cancel = () => {
      locallyCancelled = true;
    };
    this.#activeRun = { cancel };
    let execution: GraphSampleExecution;
    try {
      execution = await runGraphSampleRequest(request, this.#fallbackPlanCache, {
        isCancelled: () => locallyCancelled || context.shouldCancel(),
        maximumItemTimeMs: 8,
        yieldBetweenItems: async () => {
          await context.yieldIfBudgetExceeded('Graph sampling fallback yielded between items.');
        },
      });
    } finally {
      if (this.#activeRun?.cancel === cancel) this.#activeRun = null;
    }
    const cancelled = execution.result.status === 'cancelled';
    return {
      ...execution,
      hostExecution: cancelled
        ? {
            kind: 'fallback-cancelled',
            hostId: GRAPH_SAMPLE_FALLBACK_HOST_ID,
            isolated: false,
            terminalStatus: 'cancelled',
            fallbackFromHostId: GRAPH_SAMPLE_WORKER_HOST_ID,
            termination: 'cooperative',
            reason: 'Graph sampling fallback stopped cooperatively.',
          }
        : {
            kind: 'fallback',
            hostId: GRAPH_SAMPLE_FALLBACK_HOST_ID,
            isolated: false,
            terminalStatus: 'fallback',
            fallbackFromHostId: GRAPH_SAMPLE_WORKER_HOST_ID,
            reason,
          },
    };
  }

  #runWorker(
    worker: GraphSamplingWorkerLike,
    request: GraphSampleRequestV1,
    context: OoeRuntimeControlContext,
  ) {
    this.#requestSequence += 1;
    const requestId = `graph-sample-worker.${this.#requestSequence}`;
    context.checkpoint('Graph sampling application worker started.');
    return new Promise<GraphSamplingHostResult>((resolve, reject) => {
      let settled = false;
      let started = false;
      let startupTimer: ReturnType<typeof setTimeout> | undefined;
      const cancellationTimer = setInterval(() => {
        if (context.shouldCancel()) settleCancelled('Graph sampling stopped after cancellation.');
      }, this.#options.cancellationPollMs ?? 8);

      const cleanup = () => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        clearInterval(cancellationTimer);
        if (startupTimer) clearTimeout(startupTimer);
        if (this.#activeRun?.cancel === cancel) this.#activeRun = null;
      };
      const settle = (result: GraphSamplingHostResult) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      };
      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        cleanup();
        this.#terminateWorker();
        reject(new Error(`Graph sampling worker failed: ${message}`));
      };
      const cancel = (reason: string) => settleCancelled(reason);
      const settleCancelled = (reason: string) => {
        if (settled) return;
        this.#terminateWorker();
        const execution = buildCancelledGraphSampleExecution(request, 'worker-hard-stop');
        settle({
          ...execution,
          hostExecution: {
            kind: 'worker-cancelled',
            hostId: GRAPH_SAMPLE_WORKER_HOST_ID,
            isolated: true,
            terminalStatus: 'cancelled',
            termination: 'hardStop',
            reason,
          },
        });
      };
      const fallbackBeforeStartup = (reason: string) => {
        if (settled) return;
        settled = true;
        cleanup();
        this.#terminateWorker();
        void this.#runFallback(request, context, reason).then(resolve, reject);
      };
      const handleMessage = (event: MessageEvent<GraphSamplingWorkerOutboundMessage>) => {
        if (event.data.requestId !== requestId) return;
        if (event.data.kind === 'started') {
          started = true;
          if (startupTimer) clearTimeout(startupTimer);
          context.checkpoint('Graph sampling worker acknowledged startup.');
          return;
        }
        if (event.data.kind === 'failed') {
          if (started) fail(event.data.message);
          else fallbackBeforeStartup(event.data.message);
          return;
        }
        const validation = validateTransferredGraphSampleResult(event.data.result);
        if (!validation.ok) {
          fail(`invalid result: ${validation.failure.message}`);
          return;
        }
        if (!resultMatchesRequest(validation.value, request)) {
          fail('result identity or revisions did not match the active request');
          return;
        }
        const collected = collectGraphSceneTransferables(validation.value.scene);
        if (!collected.ok) {
          fail(collected.message);
          return;
        }
        settle({
          result: validation.value,
          transferList: collected.transferList,
          hostExecution: {
            kind: 'worker',
            hostId: GRAPH_SAMPLE_WORKER_HOST_ID,
            isolated: true,
            terminalStatus: 'completed',
          },
        });
      };
      const handleError = () => {
        if (started) fail('worker-runtime-error');
        else fallbackBeforeStartup('worker-runtime-error-before-start');
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      this.#activeRun = { cancel };
      if (!this.#options.createWorker) {
        startupTimer = setTimeout(
          () => fallbackBeforeStartup('worker-startup-timeout'),
          this.#options.startupTimeoutMs ?? 1_500,
        );
      }
      try {
        worker.postMessage({ kind: 'run', requestId, request });
      } catch (error) {
        fallbackBeforeStartup(error instanceof Error ? error.message : 'worker-post-message-failed');
      }
    });
  }
}

export const graphSamplingApplicationHost = new GraphSamplingApplicationHost();
