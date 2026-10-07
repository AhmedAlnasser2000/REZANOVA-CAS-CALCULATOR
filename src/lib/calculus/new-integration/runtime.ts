import type { WorkspaceInstanceRuntimeContext } from '../../../types/calculator';
import { runOoeRuntimeJob } from '../../ooe/runtime-control/runtime-coordinator';
import { buildOoeInputRevisionId } from '../../ooe/job-launch/job-contract';
import { subscribeToOoeActiveJobChanges, requestOoeJobCancellation } from '../../ooe/job-launch/active-job-registry';
import { buildOoeRuntimeShellEvidence } from '../../ooe/runtime-control/runtime-shell-contract';
import { validateCanonicalResultDocument } from '../../result-contract/current';
import { integrationError } from './error';
import { boundedSource, validIntegrationLimits, MAX_INTEGRATION_ARTIFACT_BYTES, type IntegrationJob, type IntegrationResponse } from './types';
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
export async function runIntegrationJob(suppliedJob: IntegrationJob, workspace: WorkspaceInstanceRuntimeContext, revision: number,
  currentRevision: () => number, isOpen: () => boolean, signal: AbortSignal, createWorker: IntegrationWorkerFactory = workerFactory) {
  const job: IntegrationJob = {...suppliedJob, request: {...suppliedJob.request, limits: {...suppliedJob.request.limits}}};
  let cancelled = false;
  const envelope = await runOoeRuntimeJob({
    definition: integrationDefinition, routeLabel: 'New Integration', routeSnapshot: {instanceId: workspace.workspaceInstanceId, revision},
    options: {workspaceInstance: workspace, activeInputRevisionId: () => integrationRevision(workspace.workspaceInstanceId, currentRevision()),
      isWorkspaceInstanceOpen: () => isOpen(), commitPolicy: 'commitLatestOnly'},
    run: context => new Promise<IntegrationResponse>((resolve, reject) => {
      let worker: Worker | undefined, unsubscribe = () => {}; let settled = false;
      const finish = (result?: IntegrationResponse, error?: Error) => {
        if (settled) return; settled = true; unsubscribe(); signal.removeEventListener('abort', stop); worker?.terminate();
        if (error) reject(error); else resolve(result!);
      };
      const stop = () => {if (settled) return; cancelled = true; finish(undefined, new DOMException('Integration stopped', 'AbortError')); requestOoeJobCancellation(context.registryId, {requestedBy: 'user', reason: 'New Integration stopped.'});};
      if (signal.aborted || context.shouldCancel()) {stop(); return;}
      signal.addEventListener('abort', stop, {once: true});
      unsubscribe = subscribeToOoeActiveJobChanges(() => {if (context.shouldCancel()) stop();});
      try {
        if (!boundedSource(job.request.source) || !validIntegrationLimits(job.request.limits)) throw new Error('Invalid request or source exceeds 64 KiB.');
        if (job.artifact !== undefined && (job.artifact.length > MAX_INTEGRATION_ARTIFACT_BYTES || new TextEncoder().encode(job.artifact).length > MAX_INTEGRATION_ARTIFACT_BYTES)) throw new Error('Artifact exceeds 16 MiB.');
        worker = createWorker();
        worker.onmessage = (event: MessageEvent<IntegrationResponse>) => {
          if (signal.aborted || context.shouldCancel()) {stop(); return;}
          try {
          const response = event.data;
          const validation = validateCanonicalResultDocument(response.document);
          if (!validation.ok) finish(undefined, new Error(validation.failure.message));
          else if (validation.validated.value.primary && !['rational-antiderivative', 'exponential-antiderivative', 'non-elementary'].includes(validation.validated.value.primary.kind)) finish(undefined, new Error('Unsupported Integration answer kind.'));
          else finish({...response, document: validation.validated.value});
          } catch {finish(undefined, new Error('Invalid integration worker response.'));}
        };
        worker.onerror = () => finish(undefined, new Error('The integration worker failed.'));
        worker.onmessageerror = () => finish(undefined, new Error('Invalid integration worker response.'));
        worker.postMessage(job);
      } catch (e) {
        finish({document: integrationError(e instanceof Error ? e.message : String(e)), request: job.request, elapsedMs: 0, usage: {work: 0, allocation: 0}, checks: []});
      }
    }),
    buildMetadata: ({status, jobContext, controlTraceEvents}) => ({...integrationDefinition, status, ...jobContext, traceEvents: [...controlTraceEvents],
      runtimeShell: buildOoeRuntimeShellEvidence({shellId: 'new-integration-shell', capabilityId: INTEGRATION_CAPABILITY, primaryHostId: INTEGRATION_HOST,
        hostExecution: {kind: 'worker', hostId: INTEGRATION_HOST, isolated: true, terminalStatus: cancelled ? 'cancelled' : 'completed'}})}),
  });
  return envelope.ooe.commitAssessment.legality === 'commitAllowed' && !signal.aborted && isOpen() && revision === currentRevision() ? envelope.payload : null;
}
