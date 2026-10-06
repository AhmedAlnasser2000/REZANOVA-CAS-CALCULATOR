import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator';
import { runOoeRuntimeJob } from '../ooe/runtime-control/runtime-coordinator';
import { buildOoeInputRevisionId } from '../ooe/job-launch/job-contract';
import { subscribeToOoeActiveJobChanges, requestOoeJobCancellation } from '../ooe/job-launch/active-job-registry';
import { buildOoeRuntimeShellEvidence } from '../ooe/runtime-control/runtime-shell-contract';
import { validateCanonicalResultDocument } from '../result-contract/current';
import { equationError } from './error';
import { validEquationRequest, type EquationRequest, type EquationResponse } from './types';

export const EQUATION_HOST = 'new-equation-worker-runtime';
export const EQUATION_CAPABILITY = 'equation.new-equation';
export const equationDefinition = {
  planId: `plan.${EQUATION_CAPABILITY}`, capabilityId: EQUATION_CAPABILITY, hostId: EQUATION_HOST,
  nodeId: `node.${EQUATION_CAPABILITY}`, phaseId: EQUATION_CAPABILITY,
};
export const equationRevision = (instanceId: string, revision: number) => buildOoeInputRevisionId(EQUATION_CAPABILITY, { instanceId, revision });
export type EquationWorkerFactory = () => Worker;
const workerFactory: EquationWorkerFactory = () => {
  if (typeof Worker === 'undefined') throw new Error('Worker execution is unavailable.');
  return new Worker(new URL('../symbolic-engine/equation/service/equation.worker.ts', import.meta.url), { type: 'module' });
};

/** A failed run as a response (no answer): the request, a current error document and no presentations. */
export function equationFailure(request: EquationRequest, message: string): EquationResponse {
  return { request, document: equationError(message), rowNotes: request.rows.map(() => ({ kind: 'empty' })), domainConditions: [], assumptionsComplete: true,
    elapsedMs: 0, usage: { work: 0, allocation: 0 } };
}

/**
 * Run one New Equation request in its own worker. Stop terminates the worker; an edit (a newer revision), a closed
 * tab or an abort drops the response. There is no main-thread fallback.
 */
export async function runEquationJob(suppliedRequest: EquationRequest, workspace: WorkspaceInstanceRuntimeContext, revision: number,
  currentRevision: () => number, isOpen: () => boolean, signal: AbortSignal, createWorker: EquationWorkerFactory = workerFactory) {
  const request: EquationRequest = { ...suppliedRequest, rows: [...suppliedRequest.rows], targets: [...suppliedRequest.targets], limits: { ...suppliedRequest.limits } };
  let cancelled = false;
  const envelope = await runOoeRuntimeJob({
    definition: equationDefinition, routeLabel: 'New Equation', routeSnapshot: { instanceId: workspace.workspaceInstanceId, revision },
    options: { workspaceInstance: workspace, activeInputRevisionId: () => equationRevision(workspace.workspaceInstanceId, currentRevision()),
      isWorkspaceInstanceOpen: () => isOpen(), commitPolicy: 'commitLatestOnly' },
    run: context => new Promise<EquationResponse>((resolve, reject) => {
      let worker: Worker | undefined, unsubscribe = () => {};
      let settled = false;
      const finish = (result?: EquationResponse, error?: Error) => {
        if (settled) return;
        settled = true; unsubscribe(); signal.removeEventListener('abort', stop); worker?.terminate();
        if (error) reject(error); else resolve(result as EquationResponse);
      };
      const stop = () => {
        if (settled) return;
        cancelled = true;
        finish(undefined, new DOMException('Equation stopped', 'AbortError'));
        requestOoeJobCancellation(context.registryId, { requestedBy: 'user', reason: 'New Equation stopped.' });
      };
      if (signal.aborted || context.shouldCancel()) { stop(); return; }
      signal.addEventListener('abort', stop, { once: true });
      unsubscribe = subscribeToOoeActiveJobChanges(() => { if (context.shouldCancel()) stop(); });
      try {
        if (!validEquationRequest(request)) throw new Error('Invalid request or rows exceed 64 KiB.');
        worker = createWorker();
        worker.onmessage = (event: MessageEvent<EquationResponse>) => {
          if (signal.aborted || context.shouldCancel()) { stop(); return; }
          try {
            const checked = validateCanonicalResultDocument(event.data.document);
            if (!checked.ok) finish(undefined, new Error(checked.failure.message)); else if (checked.validated.value.primary && checked.validated.value.primary.kind !== 'equation-outcome') finish(undefined, new Error('Unsupported Equation answer kind.'));
            else finish({ ...event.data, document: checked.validated.value });
          } catch {
            finish(undefined, new Error('Invalid equation worker response.'));
          }
        };
        worker.onerror = () => finish(undefined, new Error('The equation worker failed.'));
        worker.onmessageerror = () => finish(undefined, new Error('Invalid equation worker response.'));
        worker.postMessage(request);
      } catch (e) {
        finish(equationFailure(request, e instanceof Error ? e.message : String(e)));
      }
    }),
    buildMetadata: ({ status, jobContext, controlTraceEvents }) => ({ ...equationDefinition, status, ...jobContext, traceEvents: [...controlTraceEvents],
      runtimeShell: buildOoeRuntimeShellEvidence({ shellId: 'new-equation-shell', capabilityId: EQUATION_CAPABILITY, primaryHostId: EQUATION_HOST,
        hostExecution: { kind: 'worker', hostId: EQUATION_HOST, isolated: true, terminalStatus: cancelled ? 'cancelled' : 'completed' } }) }),
  });
  return envelope.ooe.commitAssessment.legality === 'commitAllowed' && !signal.aborted && isOpen() && revision === currentRevision() ? envelope.payload : null;
}
