import type { OoeRuntimeControlContext } from '../../ooe/runtime-control/runtime-coordinator';
import type { GraphAnalysisRequestV1, GraphAnalysisResultV1 } from '../contracts';
import { GraphExpressionPlanCache } from '../evaluator';
import { runGraphAnalysisRequest } from '../analysis/analyze';
import { validateGraphAnalysisResult } from '../analysis/validation';
import type {
  CreateGraphAnalysisWorker,
  GraphAnalysisWorkerLike,
  GraphAnalysisWorkerOutboundMessage,
} from './analysis-worker-contract';

export const GRAPH_ANALYSIS_WORKER_HOST_ID = 'graph-analysis-worker-runtime' as const;
export const GRAPH_ANALYSIS_FALLBACK_HOST_ID = 'graph-analysis-runtime' as const;
export type GraphAnalysisHostExecution = {
  kind: 'worker' | 'worker-cancelled' | 'fallback' | 'fallback-cancelled';
  hostId: typeof GRAPH_ANALYSIS_WORKER_HOST_ID | typeof GRAPH_ANALYSIS_FALLBACK_HOST_ID;
  isolated: boolean;
  terminalStatus: 'completed' | 'cancelled' | 'fallback';
  reason?: string;
  termination?: 'hardStop' | 'cooperative';
  fallbackFromHostId?: typeof GRAPH_ANALYSIS_WORKER_HOST_ID;
};
export type GraphAnalysisHostResult = { result: GraphAnalysisResultV1; hostExecution: GraphAnalysisHostExecution };
type Options = { createWorker?: CreateGraphAnalysisWorker; cancellationPollMs?: number; startupTimeoutMs?: number };
type ActiveRun = { cancel(reason: string, hard: boolean): void };

function defaultWorker(): GraphAnalysisWorkerLike {
  return new Worker(new URL('./graph-analysis.worker.ts', import.meta.url), {
    type: 'module', name: GRAPH_ANALYSIS_WORKER_HOST_ID,
  }) as GraphAnalysisWorkerLike;
}
function cancelledResult(request: GraphAnalysisRequestV1): GraphAnalysisResultV1 {
  return {
    version: 1, requestId: request.requestId, workspaceInstanceId: request.workspaceInstanceId,
    documentId: request.documentId, revisions: { ...request.revisions }, status: 'cancelled', evidence: [],
    canonicalResult: { version: 2, outcomeKind: 'success', title: 'Graph analysis', warnings: ['Analysis was cancelled.'] },
    stopReasons: [{ code: 'analysis-inconclusive', detailCode: 'cancelled' }],
    diagnostics: { elapsedMs: 0, evaluatedPointCount: 0, exactFindingCount: 0, validatedFindingCount: 0, analysisRevision: request.revisions.mathematics },
  };
}
function matches(result: GraphAnalysisResultV1, request: GraphAnalysisRequestV1) {
  return result.requestId === request.requestId && result.workspaceInstanceId === request.workspaceInstanceId
    && result.documentId === request.documentId
    && Object.keys(request.revisions).every((key) => result.revisions[key as keyof typeof request.revisions] === request.revisions[key as keyof typeof request.revisions]);
}

export class GraphAnalysisApplicationHost {
  readonly #options: Options;
  readonly #cache = new GraphExpressionPlanCache(100);
  #worker: GraphAnalysisWorkerLike | null = null;
  #active: ActiveRun | null = null;
  #sequence = 0;
  #generation = 0;
  constructor(options: Options = {}) { this.#options = options; }
  get evidence() { return { activeRequestCount: this.#active ? 1 : 0, workerGenerationCount: this.#generation, hasRetainedWorker: this.#worker !== null }; }
  #ensureWorker() {
    if (this.#worker) return this.#worker;
    if (!this.#options.createWorker && typeof Worker === 'undefined') return null;
    try { this.#worker = this.#options.createWorker?.() ?? defaultWorker(); this.#generation += 1; return this.#worker; }
    catch { this.#worker = null; return null; }
  }
  #terminate() { this.#worker?.terminate(); this.#worker = null; }
  cancelActive(reason = 'Graph analysis cancelled.') { this.#active?.cancel(reason, true); }
  dispose(reason = 'Graph analysis disposed.') { this.cancelActive(reason); this.#terminate(); this.#cache.clear(); }
  async run(request: GraphAnalysisRequestV1, context: OoeRuntimeControlContext): Promise<GraphAnalysisHostResult> {
    if (context.shouldCancel()) return { result: cancelledResult(request), hostExecution: { kind: 'worker-cancelled', hostId: GRAPH_ANALYSIS_WORKER_HOST_ID, isolated: true, terminalStatus: 'cancelled', termination: 'hardStop', reason: 'cancelled-before-host-start' } };
    this.#active?.cancel('Superseded by the latest Graph analysis request.', false);
    const worker = this.#ensureWorker();
    return worker ? this.#runWorker(worker, request, context) : this.#runFallback(request, context, 'worker-unavailable');
  }
  async #runFallback(request: GraphAnalysisRequestV1, context: OoeRuntimeControlContext, reason: string): Promise<GraphAnalysisHostResult> {
    context.checkpoint(`Graph analysis worker unavailable; using cooperative fallback (${reason}).`);
    let localCancelled = false;
    const cancel = () => { localCancelled = true; };
    this.#active = { cancel };
    let result: GraphAnalysisResultV1;
    try {
      result = await runGraphAnalysisRequest(request, this.#cache, {
        isCancelled: () => localCancelled || context.shouldCancel(),
        yieldBetweenItems: () => context.yieldIfBudgetExceeded('Graph analysis fallback yielded between items.'),
      });
    } finally { if (this.#active?.cancel === cancel) this.#active = null; }
    const stopped = result.status === 'cancelled';
    return { result, hostExecution: stopped
      ? { kind: 'fallback-cancelled', hostId: GRAPH_ANALYSIS_FALLBACK_HOST_ID, isolated: false, terminalStatus: 'cancelled', termination: 'cooperative', fallbackFromHostId: GRAPH_ANALYSIS_WORKER_HOST_ID, reason: 'cooperative-cancel' }
      : { kind: 'fallback', hostId: GRAPH_ANALYSIS_FALLBACK_HOST_ID, isolated: false, terminalStatus: 'fallback', fallbackFromHostId: GRAPH_ANALYSIS_WORKER_HOST_ID, reason } };
  }
  #runWorker(worker: GraphAnalysisWorkerLike, request: GraphAnalysisRequestV1, context: OoeRuntimeControlContext) {
    const requestId = `graph-analysis-worker.${++this.#sequence}`;
    return new Promise<GraphAnalysisHostResult>((resolve, reject) => {
      let settled = false; let started = false; let startupTimer: ReturnType<typeof setTimeout> | undefined;
      const cancellationTimer = setInterval(() => { if (context.shouldCancel()) cancel('Graph analysis stopped after cancellation.', true); }, this.#options.cancellationPollMs ?? 8);
      const cleanup = () => { worker.removeEventListener('message', onMessage); worker.removeEventListener('error', onError); clearInterval(cancellationTimer); if (startupTimer) clearTimeout(startupTimer); if (this.#active?.cancel === cancel) this.#active = null; };
      const settle = (value: GraphAnalysisHostResult) => { if (settled) return; settled = true; cleanup(); resolve(value); };
      const cancel = (reason: string, hard: boolean) => { if (settled) return; if (hard) this.#terminate(); else worker.postMessage({ kind: 'cancel', requestId }); settle({ result: cancelledResult(request), hostExecution: { kind: 'worker-cancelled', hostId: GRAPH_ANALYSIS_WORKER_HOST_ID, isolated: true, terminalStatus: 'cancelled', termination: hard ? 'hardStop' : 'cooperative', reason } }); };
      const fallback = (reason: string) => { if (settled) return; settled = true; cleanup(); this.#terminate(); void this.#runFallback(request, context, reason).then(resolve, reject); };
      const onMessage = (event: MessageEvent<GraphAnalysisWorkerOutboundMessage>) => {
        if (event.data.requestId !== requestId) return;
        if (event.data.kind === 'started') { started = true; if (startupTimer) clearTimeout(startupTimer); context.checkpoint('Graph analysis worker acknowledged startup.'); return; }
        if (event.data.kind === 'failed') { if (started) { cleanup(); this.#terminate(); reject(new Error(event.data.message)); } else fallback(event.data.message); return; }
        const valid = validateGraphAnalysisResult(event.data.result);
        if (!valid.ok || !matches(event.data.result, request)) { cleanup(); this.#terminate(); reject(new Error(valid.ok ? 'Graph analysis result identity mismatch.' : valid.message)); return; }
        settle({ result: event.data.result, hostExecution: { kind: 'worker', hostId: GRAPH_ANALYSIS_WORKER_HOST_ID, isolated: true, terminalStatus: 'completed' } });
      };
      const onError = () => started ? (cleanup(), this.#terminate(), reject(new Error('graph-analysis-worker-runtime-error'))) : fallback('worker-runtime-error-before-start');
      worker.addEventListener('message', onMessage); worker.addEventListener('error', onError); this.#active = { cancel };
      if (!this.#options.createWorker) startupTimer = setTimeout(() => fallback('worker-startup-timeout'), this.#options.startupTimeoutMs ?? 1500);
      try { worker.postMessage({ kind: 'run', requestId, request }); } catch (error) { fallback(error instanceof Error ? error.message : 'worker-post-message-failed'); }
    });
  }
}

export const graphAnalysisApplicationHost = new GraphAnalysisApplicationHost();
