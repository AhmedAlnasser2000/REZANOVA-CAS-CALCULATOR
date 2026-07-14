import type {
  ResultProducerDraft,
  PlannerOutcome,
  RuntimeAdvisories,
  RuntimeStopReason,
} from '../../types/calculator';
import { UNSUPPORTED_FAMILY_ERROR } from '../equation/guarded/outcome';

function advisories(
  stopReason?: RuntimeStopReason,
  equationNumericSolve?: RuntimeAdvisories['equationNumericSolve'],
): RuntimeAdvisories | undefined {
  if (!stopReason && !equationNumericSolve) {
    return undefined;
  }

  return {
    ...(stopReason ? { stopReason } : {}),
    ...(equationNumericSolve ? { equationNumericSolve } : {}),
  };
}

function deriveEquationNumericSolveAdvisory(
  outcome: ResultProducerDraft | undefined,
  stopReason: RuntimeStopReason | undefined,
): RuntimeAdvisories['equationNumericSolve'] {
  if (stopReason?.kind === 'range-guard') {
    return { kind: 'blocked', reason: 'range-guard' };
  }

  if (stopReason?.kind === 'invalid-request' || stopReason?.kind === 'planner-hard-stop') {
    return { kind: 'blocked', reason: 'invalid-request' };
  }

  if (!outcome) {
    return undefined;
  }

  return outcome.kind === 'error'
    ? { kind: 'suggest-on-error' }
    : { kind: 'manual-only' };
}

function isUnsupportedFamilyMessage(error: string) {
  return (
    error === UNSUPPORTED_FAMILY_ERROR
    || error.includes('outside the supported exact symbolic solve families')
    || error.includes('outside the supported symbolic solve families')
    || error.includes('outside the current exact bounded solve set')
    || error.includes('not supported by the shared runtime host')
    || error.includes('No explicit algebra transform is available')
    || error.includes('could not be determined symbolically in this milestone')
  );
}

export function classifyPlannerBlockedRuntimeAdvisories(
  planner: PlannerOutcome,
  runtime: 'calculate' | 'equation',
): RuntimeAdvisories | undefined {
  if (planner.kind !== 'blocked') {
    return undefined;
  }

  const stopReason: RuntimeStopReason = {
    kind: 'planner-hard-stop',
    source: 'planner',
  };

  return advisories(
    stopReason,
    runtime === 'equation' ? deriveEquationNumericSolveAdvisory(undefined, stopReason) : undefined,
  );
}

export function classifyCalculateRuntimeAdvisories(options: {
  invalidRequest?: boolean;
  error?: string;
}): RuntimeAdvisories | undefined {
  const stopReason: RuntimeStopReason | undefined = options.invalidRequest
    ? { kind: 'invalid-request', source: 'host' }
    : options.error && isUnsupportedFamilyMessage(options.error)
      ? { kind: 'unsupported-family', source: 'host' }
      : undefined;

  return advisories(stopReason);
}

export function classifyEquationRuntimeAdvisories(options: {
  invalidRequest?: boolean;
  outcome?: ResultProducerDraft;
}): RuntimeAdvisories | undefined {
  const { invalidRequest = false, outcome } = options;

  const stopReason: RuntimeStopReason | undefined = invalidRequest
    ? { kind: 'invalid-request', source: 'host' }
    : outcome && outcome.kind !== 'prompt' && (outcome.solveBadges ?? []).includes('Range Guard')
      ? { kind: 'range-guard', source: 'stage' }
      : outcome?.kind === 'error' && isUnsupportedFamilyMessage(outcome.error)
        ? {
            kind: 'unsupported-family',
            source: outcome.error === UNSUPPORTED_FAMILY_ERROR ? 'stage' : 'host',
          }
        : undefined;

  return advisories(
    stopReason,
    deriveEquationNumericSolveAdvisory(outcome, stopReason),
  );
}
