import type { WorkspaceInstanceRuntimeContext } from '../../../types/calculator';
import { runOoeRuntimeJob } from '../../ooe/runtime-control/runtime-coordinator';
import { buildOoeInputRevisionId } from '../../ooe/job-launch/job-contract';
import { subscribeToOoeActiveJobChanges, requestOoeJobCancellation } from '../../ooe/job-launch/active-job-registry';
import { buildOoeRuntimeShellEvidence } from '../../ooe/runtime-control/runtime-shell-contract';
import { validateCanonicalResultDocument } from '../../result-contract/current';
import { integrationError } from './error';
import { boundedSource, validIntegrationLimits, validIntegrationPreview, validIntegrationObservation, MAX_INTEGRATION_ARTIFACT_BYTES,
  type IntegrationJob, type IntegrationResponse, type IntegrationJobCallbacks, type IntegrationWorkerMessage } from './types';
export const INTEGRATION_HOST = 'new-integration-worker-runtime';
export const INTEGRATION_CAPABILITY = 'calculus.new-integration';
export const integrationDefinition = {planId: `plan.${INTEGRATION_CAPABILITY}`, capabilityId: INTEGRATION_CAPABILITY, hostId: INTEGRATION_HOST,
  nodeId: `node.${INTEGRATION_CAPABILITY}`, phaseId: INTEGRATION_CAPABILITY};
export const integrationRevision = (instanceId: string, revision: number) => buildOoeInputRevisionId(INTEGRATION_CAPABILITY, {instanceId, revision});
export type IntegrationWorkerFactory = () => Worker;
const workerFactory: IntegrationWorkerFactory = () => {
  if (typeof Worker === 'undefined') throw new Error('Worker execution is unavailable.');
  return new Worker(new URL('./integration.worker.ts', import.meta.url), {type: 'module'});
};
type ExportMessage = Extract<IntegrationWorkerMessage, {phase: 'export'}>;
/** One isolated worker, two ordered Integration-owned OOE jobs. The first commits
 * verified mathematics; the second can only attach a saved file to that result. */
export async function runIntegrationJob(suppliedJob: IntegrationJob, workspace: WorkspaceInstanceRuntimeContext, revision: number,
  currentRevision: () => number, isOpen: () => boolean, signal: AbortSignal, createWorker: IntegrationWorkerFactory = workerFactory,
  callbacks: IntegrationJobCallbacks = {}): Promise<IntegrationResponse | null> {
  const job: IntegrationJob = {...suppliedJob, request: {...suppliedJob.request, limits: {...suppliedJob.request.limits}}};
  const id = `${workspace.workspaceInstanceId}:${revision}`;
  let worker: Worker | undefined, cancelled = false, exportPending = false;
  const current = () => !signal.aborted && isOpen() && revision === currentRevision();
  const metadata = ({status, jobContext, controlTraceEvents}: Parameters<NonNullable<Parameters<typeof runOoeRuntimeJob>[0]['buildMetadata']>>[0]) => ({
    ...integrationDefinition, status, ...jobContext, traceEvents: [...controlTraceEvents],
    runtimeShell: buildOoeRuntimeShellEvidence({shellId: 'new-integration-shell', capabilityId: INTEGRATION_CAPABILITY, primaryHostId: INTEGRATION_HOST,
      hostExecution: {kind: 'worker', hostId: INTEGRATION_HOST, isolated: true, terminalStatus: cancelled ? 'cancelled' : 'completed'}}),
  });
  const options = {workspaceInstance: workspace, activeInputRevisionId: () => integrationRevision(workspace.workspaceInstanceId, currentRevision()),
    isWorkspaceInstanceOpen: () => isOpen(), commitPolicy: 'commitLatestOnly' as const};
  function exchange<T extends IntegrationResponse | ExportMessage>(stage: 'solve' | 'export', registryId: string, shouldCancel: () => boolean): Promise<T> {
    return new Promise((resolve, reject) => {
      let settled = false, unsubscribe = () => {}, previewed = false;
      const finish = (result?: T, error?: Error) => {
        if (settled) return; settled = true; unsubscribe(); signal.removeEventListener('abort', stop);
        if (worker) {worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null;}
        if (error) reject(error); else resolve(result!);
      };
      const stop = () => {
        if (settled) return; cancelled = true; worker?.terminate();
        finish(undefined, new DOMException('Integration stopped', 'AbortError'));
        requestOoeJobCancellation(registryId, {requestedBy: 'user', reason: 'New Integration stopped.'});
      };
      if (signal.aborted || shouldCancel()) {stop(); return;}
      signal.addEventListener('abort', stop, {once: true});
      unsubscribe = subscribeToOoeActiveJobChanges(() => {if (shouldCancel()) stop();});
      try {
        if (!boundedSource(job.request.source) || !validIntegrationLimits(job.request.limits)) throw new Error('Invalid request or source exceeds 64 KiB.');
        if (job.artifact !== undefined && (job.artifact.length > MAX_INTEGRATION_ARTIFACT_BYTES || new TextEncoder().encode(job.artifact).length > MAX_INTEGRATION_ARTIFACT_BYTES)) throw new Error('Artifact exceeds 16 MiB.');
        worker ??= createWorker();
        worker.onmessage = (event: MessageEvent<IntegrationWorkerMessage>) => {
          if (signal.aborted || shouldCancel()) {stop(); return;}
          try {
            const message = event.data;
            if (!message || message.id !== id) throw new Error('Invalid integration request binding.');
            if (stage === 'solve') {
              if (message.phase === 'candidate') {
                if (previewed || job.artifact !== undefined || !validIntegrationPreview(message.preview, job.request)) throw new Error('Invalid integration candidate.');
                previewed = true; if (current()) callbacks.candidate?.(message.preview); return;
              }
              if (message.phase !== 'verified' && message.phase !== 'failure') throw new Error('Invalid integration worker phase.');
              const response = message.response, validation = validateCanonicalResultDocument(response.document);
              if (!validation.ok) throw new Error(validation.failure.message);
              if (!validIntegrationObservation(response) || response.artifact !== undefined
                || !Array.isArray(response.checks) || response.checks.length > 100_000 || response.checks.some(s => typeof s !== 'string' || !boundedSource(s))
                || (response.timings && Object.entries(response.timings).some(([k,v]) => !['construction','candidate','verification','projection','export'].includes(k) || !Number.isFinite(v) || v! < 0))) throw new Error('Invalid integration observations.');
              if (validation.validated.value.primary && !['rational-antiderivative', 'exponential-antiderivative', 'non-elementary'].includes(validation.validated.value.primary.kind)) throw new Error('Unsupported Integration answer kind.');
              if (!response.request || !boundedSource(response.request.source) || !validIntegrationLimits(response.request.limits)
                || (job.action !== 'open' && response.request.source !== job.request.source)
                || JSON.stringify(response.request.limits) !== JSON.stringify(job.request.limits)) throw new Error('Invalid integration response request.');
              if ((message.phase === 'verified') !== (validation.validated.value.outcomeKind !== 'error')) throw new Error('Invalid integration checked outcome.');
              exportPending = message.phase === 'verified' && message.exportPending === true;
              finish({...response, document: validation.validated.value} as T);
            } else {
              if (message.phase !== 'export' || !validIntegrationObservation(message) || (message.artifact === undefined && message.exportUnavailable === undefined)
                || (message.artifact !== undefined && message.exportUnavailable !== undefined)
                || (message.artifact !== undefined && (typeof message.artifact !== 'string'
                || message.artifact.length > MAX_INTEGRATION_ARTIFACT_BYTES || new TextEncoder().encode(message.artifact).length > MAX_INTEGRATION_ARTIFACT_BYTES))
                || (message.exportUnavailable !== undefined && typeof message.exportUnavailable !== 'string')) throw new Error('Invalid integration export response.');
              finish(message as T);
            }
          } catch (error) {finish(undefined, error instanceof Error ? error : new Error('Invalid integration worker response.'));}
        };
        worker.onerror = () => finish(undefined, new Error('The integration worker failed.'));
        worker.onmessageerror = () => finish(undefined, new Error('Invalid integration worker response.'));
        worker.postMessage(stage === 'solve' ? {phase: 'solve', id, job} : {phase: 'export', id});
      } catch (error) {
        if (stage === 'export') finish(undefined, error instanceof Error ? error : new Error('Export unavailable.'));
        else finish({document: integrationError(error instanceof Error ? error.message : String(error)), request: job.request,
          elapsedMs: 0, usage: {work: 0, allocation: 0}, checks: []} as unknown as T);
      }
    });
  }
  try {
    const checked = await runOoeRuntimeJob({definition: integrationDefinition, routeLabel: 'New Integration',
      routeSnapshot: {instanceId: workspace.workspaceInstanceId, revision}, options,
      run: context => exchange<IntegrationResponse>('solve', context.registryId, context.shouldCancel), buildMetadata: metadata});
    if (checked.ooe.commitAssessment.legality !== 'commitAllowed' || !current()) return null;
    const response = checked.payload;
    if (response.document.outcomeKind === 'error') return response;
    callbacks.verified?.(response);
    if (!exportPending) return response;
    callbacks.exporting?.();
    try {
      const exported = await runOoeRuntimeJob({definition: integrationDefinition, routeLabel: 'New Integration saved file',
        routeSnapshot: {instanceId: workspace.workspaceInstanceId, revision}, options,
        run: context => exchange<ExportMessage>('export', context.registryId, context.shouldCancel), buildMetadata: metadata});
      if (exported.ooe.commitAssessment.legality !== 'commitAllowed' || !current()) return null;
      const file = exported.payload;
      return {...response, artifact: file.artifact, exportUnavailable: file.exportUnavailable, usage: file.usage,
        timings: {...response.timings, export: file.elapsedMs}};
    } catch (error) {
      if (!current()) return null;
      return {...response, exportUnavailable: error instanceof Error ? error.message : 'Saved file preparation failed.'};
    }
  } finally {worker?.terminate();}
}
