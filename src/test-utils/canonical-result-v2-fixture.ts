import type {
  CanonicalRuntimeActionV2,
  CanonicalRuntimeResultOutcomeV2,
  RuntimeAdvisories,
} from '../types/calculator';
import {
  buildCanonicalResultDocumentV2,
  canonicalMathValueV2FromProof,
  createCanonicalRuntimeResult,
  declareProducerOwnedAnswerMathJson,
  proveStandardAnswerMathJson,
  type CanonicalResultProducerInputV2,
} from '../lib/result-contract';
import type { HistoryReplayWorkspace } from '../lib/history-replay/fixture-contract';
import type { MathJsonRouteId } from '../lib/result-contract/mathjson-route-registry';

export function standardV2MathValue(
  canonicalLatex: string,
  mathJson: unknown,
  provenance: {
    owner?: HistoryReplayWorkspace;
    routeId?: MathJsonRouteId;
    source?: string;
  } = {},
) {
  const proof = proveStandardAnswerMathJson({
    canonicalLatex,
    candidate: declareProducerOwnedAnswerMathJson({
      mathJson,
      owner: provenance.owner ?? 'calculate',
      routeId: provenance.routeId ?? 'calculate.arithmetic',
      source: provenance.source ?? 'canonical-result-v2-fixture',
    }),
  });
  if (!proof.ok) {
    throw new Error(`${proof.failure.reason}: ${proof.failure.message}`);
  }
  return canonicalMathValueV2FromProof(proof.evidence);
}

export function canonicalResultDocumentV2Fixture(
  input: CanonicalResultProducerInputV2,
) {
  return buildCanonicalResultDocumentV2(input);
}

export function canonicalRuntimeResultV2Fixture(
  input: CanonicalResultProducerInputV2,
  options: {
    actions?: readonly CanonicalRuntimeActionV2[];
    runtimeAdvisories?: RuntimeAdvisories;
  } = {},
): CanonicalRuntimeResultOutcomeV2 {
  return createCanonicalRuntimeResult(buildCanonicalResultDocumentV2(input), options);
}
