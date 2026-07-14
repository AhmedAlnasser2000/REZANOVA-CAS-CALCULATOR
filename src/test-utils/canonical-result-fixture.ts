import type { CanonicalRuntimeOutcome } from '../types/calculator';
import {
  buildCanonicalResultDocumentFromProducer,
  createCanonicalRuntimeResult,
  type CanonicalResultProducerInputV1,
} from '../lib/result-contract';
import {
  buildDisplayBlocks,
  type BuildDisplayBlocksOptions,
} from '../lib/display/result/display-blocks';

export function canonicalResultFixture<Kind extends 'success' | 'error'>(
  input: CanonicalResultProducerInputV1 & { outcomeKind: Kind },
  options?: Parameters<typeof createCanonicalRuntimeResult>[1],
): Extract<CanonicalRuntimeOutcome, { kind: Kind }> {
  return createCanonicalRuntimeResult(
    buildCanonicalResultDocumentFromProducer(input),
    options,
  ) as Extract<CanonicalRuntimeOutcome, { kind: Kind }>;
}

export function buildCanonicalDisplayBlocksFixture(
  input: CanonicalResultProducerInputV1,
  options?: BuildDisplayBlocksOptions,
) {
  return buildDisplayBlocks(canonicalResultFixture(input), options);
}
