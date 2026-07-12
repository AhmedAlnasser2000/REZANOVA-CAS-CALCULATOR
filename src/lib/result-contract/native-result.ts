import type { DisplayOutcome, TableResponse } from '../../types/calculator';
import { resolveCanonicalResultForStorage } from './storage';

export function requireNativeSuccessfulResult(
  outcome: DisplayOutcome,
  owner: string,
  options: { tableResponse?: TableResponse } = {},
): DisplayOutcome {
  if (outcome.kind !== 'success') {
    return outcome;
  }
  const resolution = resolveCanonicalResultForStorage(outcome, options);
  if (resolution.ok && resolution.source === 'native') {
    return outcome;
  }
  const reason = resolution.ok
    ? `resolved through ${resolution.source}`
    : resolution.message;
  throw new Error(`${owner} success is missing native canonical authority: ${reason}`);
}
