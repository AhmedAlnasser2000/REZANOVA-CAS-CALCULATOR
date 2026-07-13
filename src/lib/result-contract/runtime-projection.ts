import type {
  CanonicalRuntimeActionV1,
  CanonicalRuntimeOutcome,
  DisplayOutcome,
  DisplayOutcomeAction,
} from '../../types/calculator';
import { canonicalMathValue } from './producer';
import { projectCanonicalResultToDisplayOutcome } from './projection';
import { requireCanonicalRuntimeOutcome } from './runtime-outcome';

function projectDisplayAction(action: DisplayOutcomeAction): CanonicalRuntimeActionV1 {
  if (action.kind === 'send') {
    return {
      kind: action.kind,
      target: action.target,
      math: canonicalMathValue(action.latex),
    };
  }
  return {
    kind: action.kind,
    mode: action.mode,
    math: canonicalMathValue(action.latex),
  };
}

export function projectDisplayOutcomeToCanonicalRuntimeOutcome(
  outcome: DisplayOutcome,
  owner: string,
): CanonicalRuntimeOutcome {
  if (outcome.kind === 'prompt') {
    return requireCanonicalRuntimeOutcome(outcome);
  }
  if (!outcome.canonicalResult) {
    throw new Error(`${owner} runtime outcome is missing native canonical result authority.`);
  }
  return requireCanonicalRuntimeOutcome({
    kind: outcome.kind,
    canonicalResult: outcome.canonicalResult,
    ...(outcome.actions?.length
      ? { actions: outcome.actions.map(projectDisplayAction) }
      : {}),
    ...(outcome.runtimeAdvisories
      ? { runtimeAdvisories: outcome.runtimeAdvisories }
      : {}),
  });
}

export function projectCanonicalRuntimeOutcomeToDisplayOutcome(
  outcome: CanonicalRuntimeOutcome,
): DisplayOutcome {
  if (outcome.kind === 'prompt') {
    return structuredClone(outcome);
  }
  const display = projectCanonicalResultToDisplayOutcome(outcome.canonicalResult, {
    includeCanonicalMath: outcome.canonicalResult.primaryMath?.mathJson !== undefined,
  });
  return {
    ...display,
    ...(outcome.actions?.length
      ? {
          actions: outcome.actions.map((action) => action.kind === 'send'
            ? {
                kind: action.kind,
                target: action.target,
                latex: action.math.canonicalLatex,
              }
            : {
                kind: action.kind,
                mode: action.mode,
                latex: action.math.canonicalLatex,
              }),
        }
      : {}),
    ...(outcome.runtimeAdvisories
      ? { runtimeAdvisories: structuredClone(outcome.runtimeAdvisories) }
      : {}),
  };
}
