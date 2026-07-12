import type { DisplayOutcome } from '../../../types/calculator';
import { resolveCanonicalResultForStorage } from '../../result-contract';

export function requireNativeEquationResult(
  outcome: DisplayOutcome,
): DisplayOutcome {
  if (outcome.kind === 'prompt') {
    return outcome;
  }
  const resolution = resolveCanonicalResultForStorage(outcome);
  if (resolution.ok && resolution.source === 'native') {
    return outcome;
  }
  const reason = resolution.ok
    ? `resolved through ${resolution.source}`
    : resolution.message;
  throw new Error(`Equation result is missing native canonical authority: ${reason}`);
}
