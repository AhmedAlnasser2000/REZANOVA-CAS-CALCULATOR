import type {
  CanonicalRuntimeOutcome,
  ResultProducerDraft,
  VersionedResultProducerDraft,
} from '../../../types/calculator';
import { finalizeCanonicalRuntimeOutcomeFromProducer } from '../../result-contract';
import { getEquationAnalysisEvidence } from '../analysis-evidence';
import { buildEquationSolveResultFromProducerDraft } from './producer-adapter';
import { buildEquationRuntimeCanonicalResultDocument } from './runtime-producer-v2';

export function finalizeEquationCanonicalRuntimeOutcome(
  outcome: ResultProducerDraft,
  owner = 'Equation',
): CanonicalRuntimeOutcome {
  if (outcome.kind === 'prompt') return finalizeCanonicalRuntimeOutcomeFromProducer(outcome, owner);
  const projected = buildEquationSolveResultFromProducerDraft(outcome);
  if (!projected.ok) {
    throw new Error(`${owner} runtime outcome rejected solve-result: ${projected.failure.message}`);
  }
  const canonicalResult = buildEquationRuntimeCanonicalResultDocument({
    outcome,
    document: projected.result.document,
    analysisEvidence: getEquationAnalysisEvidence(outcome),
  });
  return finalizeCanonicalRuntimeOutcomeFromProducer({
    ...outcome,
    canonicalResult,
  } as VersionedResultProducerDraft, owner);
}
