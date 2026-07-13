import type { OoeJobContextOptions } from '../../ooe/job-launch/job-contract';
import {
  runCalculateWithOoePilot,
  type CalculateHostExecution,
} from '../../ooe/pilots/calculate-pilot';
import {
  runCalculateModeViaIsolatedWorker,
  type CreateCalculateWorker,
} from '../worker-clients/calculate-worker-client';
import type { CanonicalRuntimeOutcome, DisplayOutcome } from '../../../types/calculator';
import {
  projectCanonicalRuntimeOutcomeToDisplayOutcome,
  projectDisplayOutcomeToCanonicalRuntimeOutcome,
  requireCanonicalResultAuthority,
} from '../../result-contract';
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

export function runCalculateCanonicalRuntimeRequest(
  request: RunCalculateRuntimeRequest,
): CanonicalRuntimeOutcome {
  return projectDisplayOutcomeToCanonicalRuntimeOutcome(
    runCalculateRuntimeRequest(request),
    'Calculate',
  );
}

export async function runCalculateRuntimeWithOoePilot(
  request: RunCalculateRuntimeRequest,
  options: RunCalculateRuntimeWithOoePilotOptions = {},
) {
  let hostExecution: CalculateHostExecution | undefined;
  const routeSnapshot = buildCalculateRuntimeOoeSnapshot(request);
  const envelope = await runCalculateWithOoePilot(
    calculateCapabilityIdForRuntimeRequest(request),
    async (context) => {
      const result = await runCalculateModeViaIsolatedWorker(request, context, {
        createWorker: options.createWorker,
        fallback: () => runCalculateCanonicalRuntimeRequest(request),
      });
      hostExecution = result.hostExecution;
      return result.outcome;
    },
    routeSnapshot,
    options,
    () => hostExecution,
    (payload) => projectCanonicalRuntimeOutcomeToDisplayOutcome(payload),
  );
  return {
    payload: projectCanonicalRuntimeOutcomeToDisplayOutcome(envelope.payload),
    ooe: envelope.ooe,
  };
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
