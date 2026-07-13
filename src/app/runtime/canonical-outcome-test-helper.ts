import type { DisplayOutcome } from '../../types/calculator';
import { projectDisplayOutcomeToCanonicalResult } from '../../lib/result-contract';

export function withCanonicalResult(
  outcome: Extract<DisplayOutcome, { kind: 'success' }>,
): Extract<DisplayOutcome, { kind: 'success' }> {
  const projected = projectDisplayOutcomeToCanonicalResult(outcome);
  if (!projected.ok) throw new Error(projected.failure.message);
  return { ...outcome, canonicalResult: projected.document };
}
