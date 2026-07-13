import { buildOoeInputRevisionId, type OoeJobContextOptions } from '../ooe/job-launch/job-contract';
import {
  OOE_CALCULUS_EVALUATE_CAPABILITY_ID,
  runCalculusWithOoePilot,
  type CalculusHostExecution,
} from '../ooe/pilots/calculus-pilot';
import {
  runCalculusWorkspaceMode,
  type RunCalculusWorkspaceModeRequest,
} from '../calculus/workspace/engine';
import { runCalculusModeViaIsolatedWorker } from './worker-clients/calculus-worker-client';
import type { CanonicalRuntimeOutcome } from '../../types/calculator';
import {
  projectCanonicalRuntimeOutcomeToDisplayOutcome,
  projectDisplayOutcomeToCanonicalRuntimeOutcome,
} from '../result-contract';

export type { RunCalculusWorkspaceModeRequest as RunCalculusModeRequest } from '../calculus/workspace/engine';
export { runCalculusWorkspaceMode as runCalculusMode } from '../calculus/workspace/engine';

export function buildCalculusOoeSnapshot(
  request: RunCalculusWorkspaceModeRequest,
  generatedLatex?: string,
) {
  return {
    capabilityId: OOE_CALCULUS_EVALUATE_CAPABILITY_ID,
    generatedLatex,
    request,
  };
}

export function buildCalculusOoeInputRevisionId(
  request: RunCalculusWorkspaceModeRequest,
  generatedLatex?: string,
) {
  return buildOoeInputRevisionId(
    OOE_CALCULUS_EVALUATE_CAPABILITY_ID,
    buildCalculusOoeSnapshot(request, generatedLatex),
  );
}

export async function runCalculusCanonicalRuntimeRequest(
  request: RunCalculusWorkspaceModeRequest,
): Promise<CanonicalRuntimeOutcome> {
  return projectDisplayOutcomeToCanonicalRuntimeOutcome(
    await runCalculusWorkspaceMode(request),
    'Calculus',
  );
}

export async function runCalculusModeWithOoePilot(
  request: RunCalculusWorkspaceModeRequest,
  options?: OoeJobContextOptions & {
    generatedLatex?: string;
  },
) {
  let hostExecution: CalculusHostExecution | undefined;
  const routeSnapshot = buildCalculusOoeSnapshot(request, options?.generatedLatex);
  const envelope = await runCalculusWithOoePilot(async (context) => {
    const isolatedResult = await runCalculusModeViaIsolatedWorker(request, context, {
      fallback: () => runCalculusCanonicalRuntimeRequest(request),
    });
    hostExecution = isolatedResult.hostExecution;
    return isolatedResult.outcome;
  }, routeSnapshot, options, () => hostExecution, (payload) => (
    projectCanonicalRuntimeOutcomeToDisplayOutcome(payload)
  ));
  return {
    payload: projectCanonicalRuntimeOutcomeToDisplayOutcome(envelope.payload),
    ooe: envelope.ooe,
  };
}
