import type { OoeJobContextOptions } from '../../ooe/job-contract';
import {
  runCalculateWithOoePilot,
  type CalculateHostExecution,
} from '../../ooe/calculate-pilot';
import {
  runCalculateModeViaIsolatedWorker,
  type CreateCalculateWorker,
} from '../calculate-worker-client';
import type { DisplayOutcome } from '../../../types/calculator';
import {
  buildCalculateRuntimeOoeSnapshot,
  calculateCapabilityIdForRuntimeRequest,
} from './ooe-snapshot';
import { runCalculateMode } from './standard';
import { runCalculateAlgebraTransform } from './transforms';
import type {
  RunCalculateAlgebraTransformRequest,
  RunCalculateModeRequest,
  RunCalculateRuntimeRequest,
} from './types';

type RunCalculateRuntimeWithOoePilotOptions = OoeJobContextOptions & {
  createWorker?: CreateCalculateWorker;
};

export function runCalculateRuntimeRequest(
  request: RunCalculateRuntimeRequest,
): DisplayOutcome {
  switch (request.kind) {
    case 'standard':
    case 'legacyWorkbench':
      return runCalculateMode(request.request);
    case 'algebraTransform':
      return runCalculateAlgebraTransform(request.request);
  }
}

export async function runCalculateRuntimeWithOoePilot(
  request: RunCalculateRuntimeRequest,
  options: RunCalculateRuntimeWithOoePilotOptions = {},
) {
  let hostExecution: CalculateHostExecution | undefined;
  const routeSnapshot = buildCalculateRuntimeOoeSnapshot(request);
  return runCalculateWithOoePilot(
    calculateCapabilityIdForRuntimeRequest(request),
    async (context) => {
      const result = await runCalculateModeViaIsolatedWorker(request, context, {
        createWorker: options.createWorker,
        fallback: () => runCalculateRuntimeRequest(request),
      });
      hostExecution = result.hostExecution;
      return result.payload;
    },
    routeSnapshot,
    options,
    () => hostExecution,
  );
}

export async function runCalculateModeWithOoePilot(
  request: RunCalculateModeRequest,
  options?: RunCalculateRuntimeWithOoePilotOptions,
) {
  return runCalculateRuntimeWithOoePilot({ kind: 'standard', request }, options);
}

export async function runCalculateAlgebraTransformWithOoePilot(
  request: RunCalculateAlgebraTransformRequest,
  options?: RunCalculateRuntimeWithOoePilotOptions,
) {
  return runCalculateRuntimeWithOoePilot({ kind: 'algebraTransform', request }, options);
}
