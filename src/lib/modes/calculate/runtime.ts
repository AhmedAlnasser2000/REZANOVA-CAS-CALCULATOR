import type { OoeJobContextOptions } from '../../ooe/job-launch/job-contract';
import {
  runCalculateWithOoePilot,
  type CalculateHostExecution,
} from '../../ooe/pilots/calculate-pilot';
import {
  runCalculateModeViaIsolatedWorker,
  type CreateCalculateWorker,
} from '../worker-clients/calculate-worker-client';
import type { DisplayOutcome } from '../../../types/calculator';
import { requireCanonicalResultAuthority } from '../../result-contract';
import {
  buildCalculateRuntimeOoeSnapshot,
  calculateCapabilityIdForRuntimeRequest,
} from './ooe-snapshot';
import { runCalculateMode } from './standard';
import { runCalculateAlgebraTransform } from './transforms';
import { createCalculateErrorResultOutcome } from './result-document';
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
  let outcome: DisplayOutcome;
  switch (request.kind) {
    case 'standard':
    case 'legacyWorkbench':
      outcome = runCalculateMode(request.request);
      break;
    case 'algebraTransform':
      outcome = runCalculateAlgebraTransform(request.request);
      break;
  }
  const ownedOutcome = outcome.kind === 'error' && outcome.canonicalResult === undefined
    ? createCalculateErrorResultOutcome(outcome)
    : outcome;
  return requireCanonicalResultAuthority(ownedOutcome, 'Calculate');
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
