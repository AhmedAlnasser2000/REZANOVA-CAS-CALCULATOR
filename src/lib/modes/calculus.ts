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

export async function runCalculusModeWithOoePilot(
  request: RunCalculusWorkspaceModeRequest,
  options?: OoeJobContextOptions & {
    generatedLatex?: string;
  },
) {
  let hostExecution: CalculusHostExecution | undefined;
  const routeSnapshot = buildCalculusOoeSnapshot(request, options?.generatedLatex);
  return runCalculusWithOoePilot(async (context) => {
    const isolatedResult = await runCalculusModeViaIsolatedWorker(request, context, {
      fallback: () => runCalculusWorkspaceMode(request),
    });
    hostExecution = isolatedResult.hostExecution;
    return isolatedResult.payload;
  }, routeSnapshot, options, () => hostExecution);
}
