import type { DisplayOutcome } from '../../../types/calculator';
import { resolveCanonicalResultForStorage } from '../../result-contract';

export function retainCompatibleNativeEquationResult(
  outcome: DisplayOutcome,
): DisplayOutcome {
  if (outcome.kind === 'prompt' || !outcome.canonicalResult) {
    return outcome;
  }
  const resolution = resolveCanonicalResultForStorage(outcome);
  if (resolution.ok && resolution.source === 'native') {
    return outcome;
  }
  const rest = { ...outcome };
  delete rest.canonicalResult;
  return rest;
}
