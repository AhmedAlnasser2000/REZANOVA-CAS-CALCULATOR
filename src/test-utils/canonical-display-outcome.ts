import { projectDisplayOutcomeToCanonicalResult } from '../lib/result-contract/projection';
import {
  buildDisplayBlocks,
  type BuildDisplayBlocksOptions,
} from '../lib/display/result/display-blocks';
import type { DisplayOutcome } from '../types/calculator';

export function canonicalDisplayOutcomeFixture(
  outcome: DisplayOutcome | null | undefined,
): DisplayOutcome | null | undefined {
  if (!outcome || outcome.kind === 'prompt' || outcome.canonicalResult) {
    return outcome;
  }

  const projection = projectDisplayOutcomeToCanonicalResult(outcome);
  if (!projection.ok) {
    throw new Error(`Invalid canonical Display fixture: ${projection.failure.message}`);
  }

  return {
    ...outcome,
    canonicalResult: projection.document,
  };
}

export function buildCanonicalDisplayBlocksFixture(
  outcome: DisplayOutcome | null | undefined,
  options?: BuildDisplayBlocksOptions,
) {
  return buildDisplayBlocks(canonicalDisplayOutcomeFixture(outcome), options);
}
