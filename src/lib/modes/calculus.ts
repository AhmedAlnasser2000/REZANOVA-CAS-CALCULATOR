import { buildOoeInputRevisionId, type OoeJobContextOptions } from '../ooe/job-launch/job-contract';
import {
  OOE_CALCULUS_EVALUATE_CAPABILITY_ID,
  runCalculusWithOoePilot,
  type CalculusHostExecution,
} from '../ooe/pilots/calculus-pilot';
import {
  runAdvancedCalcMode,
  type RunAdvancedCalcModeRequest,
} from '../advanced-calc/engine';
import { runCalculusModeViaIsolatedWorker } from './worker-clients/calculus-worker-client';

export type { RunAdvancedCalcModeRequest as RunCalculusModeRequest } from '../advanced-calc/engine';
export { runAdvancedCalcMode as runCalculusMode } from '../advanced-calc/engine';

export function buildCalculusOoeSnapshot(
  request: RunAdvancedCalcModeRequest,
  generatedLatex?: string,
) {
  return {
    capabilityId: OOE_CALCULUS_EVALUATE_CAPABILITY_ID,
    generatedLatex,
    request,
  };
}

export function buildCalculusOoeInputRevisionId(
  request: RunAdvancedCalcModeRequest,
  generatedLatex?: string,
) {
  return buildOoeInputRevisionId(
    OOE_CALCULUS_EVALUATE_CAPABILITY_ID,
    buildCalculusOoeSnapshot(request, generatedLatex),
  );
}

export async function runCalculusModeWithOoePilot(
  request: RunAdvancedCalcModeRequest,
  options?: OoeJobContextOptions & {
    generatedLatex?: string;
  },
) {
  let hostExecution: CalculusHostExecution | undefined;
  const routeSnapshot = buildCalculusOoeSnapshot(request, options?.generatedLatex);
  return runCalculusWithOoePilot(async (context) => {
    const isolatedResult = await runCalculusModeViaIsolatedWorker(request, context, {
      fallback: () => runAdvancedCalcMode(request),
    });
    hostExecution = isolatedResult.hostExecution;
    return isolatedResult.payload;
  }, routeSnapshot, options, () => hostExecution);
}
