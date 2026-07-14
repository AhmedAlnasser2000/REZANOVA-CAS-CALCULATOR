import type {
  CandidateValidationResult,
  CanonicalResultDocumentV1,
  CanonicalResultTrustClassificationV1,
  CanonicalResultTrustEvidenceV1,
  CanonicalRuntimeOutcome,
  ResultProducerDraft,
  VersionedResultProducerDraft,
} from '../../../types/calculator';
import {
  finalizeCanonicalRuntimeOutcomeFromProducer,
  updateCanonicalResultMetadata,
  validateCanonicalResultDocument,
} from '../../result-contract';
import {
  getEquationAnalysisEvidence,
  type EquationAnalysisEvidence,
} from '../analysis-evidence';
import type {
  EquationControlledStopV1,
  EquationSolveResultContractV1,
} from './contract';
import { buildEquationSolveResultContract } from './factory';
import { buildEquationCanonicalResultDocumentForRuntime } from './producer-v2';

export type EquationSolveResultBuildFailure =
  { reason: 'contract'; message: string };

export type EquationSolveResultBuildResult =
  | { ok: true; result: EquationSolveResultContractV1 }
  | { ok: false; failure: EquationSolveResultBuildFailure };

export type BuildEquationSolveResultOptions = {
  candidateValidation?: CandidateValidationResult[];
  analysisEvidence?: EquationAnalysisEvidence[];
  controlledStop?: EquationControlledStopV1;
};

const CANONICAL_TRUST_CLASSIFICATIONS = new Set<CanonicalResultTrustClassificationV1>([
  'certified-polynomial-roots',
  'local-numeric-roots',
  'bounded-search-approximate-roots',
  'global-complex-polynomial-roots',
  'global-complex-rational-roots',
  'region-local-complex-roots',
]);

function canonicalTrustEvidence(
  evidence: readonly EquationAnalysisEvidence[],
): CanonicalResultTrustEvidenceV1[] {
  const seen = new Set<string>();
  const result: CanonicalResultTrustEvidenceV1[] = [];
  for (const entry of evidence) {
    if (
      entry.category !== 'trust'
      || !entry.classification
      || !CANONICAL_TRUST_CLASSIFICATIONS.has(
        entry.classification as CanonicalResultTrustClassificationV1,
      )
      || !entry.text?.trim()
    ) {
      continue;
    }
    const key = [
      entry.classification,
      entry.text,
      entry.interval?.start ?? '',
      entry.interval?.end ?? '',
    ].join('\u0000');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      classification: entry.classification as CanonicalResultTrustClassificationV1,
      text: entry.text,
      ...(entry.interval
        ? { interval: { start: entry.interval.start, end: entry.interval.end } }
        : {}),
    });
  }
  return result;
}

function withCanonicalTrustEvidence(
  document: CanonicalResultDocumentV1,
  evidence: readonly EquationAnalysisEvidence[],
) {
  const trustEvidence = canonicalTrustEvidence(evidence);
  return trustEvidence.length > 0
    ? updateCanonicalResultMetadata(document, { trustEvidence })
    : document;
}

export function buildEquationSolveResultFromProducerDraft(
  outcome: ResultProducerDraft,
  options: BuildEquationSolveResultOptions = {},
): EquationSolveResultBuildResult {
  if (outcome.kind === 'prompt') {
    return {
      ok: false,
      failure: { reason: 'contract', message: 'Equation prompts cannot carry solve results.' },
    };
  }
  if (!outcome.canonicalResult) {
    return {
      ok: false,
      failure: { reason: 'contract', message: 'Equation producer is missing canonical result authority.' },
    };
  }
  const validation = validateCanonicalResultDocument(outcome.canonicalResult);
  if (!validation.ok) {
    return {
      ok: false,
      failure: { reason: 'contract', message: validation.failure.message },
    };
  }
  const analysisEvidence = options.analysisEvidence ?? getEquationAnalysisEvidence(outcome);
  const document = withCanonicalTrustEvidence(validation.validated.value, analysisEvidence);
  const controlledStop = document.outcomeKind === 'error'
    ? options.controlledStop ?? {
        code: 'equation-producer-error',
        message: document.error ?? 'Equation stopped without an error message.',
        source: 'producer' as const,
      }
    : undefined;

  try {
    return {
      ok: true,
      result: buildEquationSolveResultContract({
        document,
        candidateValidation: options.candidateValidation,
        analysisEvidence,
        controlledStop,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      failure: {
        reason: 'contract',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function finalizeEquationCanonicalRuntimeOutcome(
  outcome: ResultProducerDraft,
  owner = 'Equation',
): CanonicalRuntimeOutcome {
  if (outcome.kind === 'prompt') {
    return finalizeCanonicalRuntimeOutcomeFromProducer(outcome, owner);
  }
  const projected = buildEquationSolveResultFromProducerDraft(outcome);
  if (!projected.ok) {
    throw new Error(
      `${owner} runtime outcome rejected solve-result: ${projected.failure.message}`,
    );
  }
  const analysisEvidence = getEquationAnalysisEvidence(outcome);
  const canonicalResult = buildEquationCanonicalResultDocumentForRuntime({
    outcome,
    document: projected.result.document,
    analysisEvidence,
  });
  return finalizeCanonicalRuntimeOutcomeFromProducer({
    ...outcome,
    canonicalResult,
  } as VersionedResultProducerDraft, owner);
}
