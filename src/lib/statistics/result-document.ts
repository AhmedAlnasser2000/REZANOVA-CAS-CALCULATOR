import type { ResultProducerDraft } from '../../types/calculator';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
  attachCanonicalResultToProducerDraft,
  type CanonicalResultProducerOptionsV1,
} from '../result-contract';

type StatisticsSuccessOutcome = Extract<ResultProducerDraft, { kind: 'success' }>;
type StatisticsErrorOutcome = Extract<ResultProducerDraft, { kind: 'error' }>;

type StatisticsResultProducerInput =
  | Omit<StatisticsSuccessOutcome, 'canonicalResult'>
  | Omit<StatisticsErrorOutcome, 'canonicalResult'>;

type StatisticsResultProducerOutcome = Exclude<ResultProducerDraft, { kind: 'prompt' }>;

export function createStatisticsResultOutcome(
  input: Omit<StatisticsSuccessOutcome, 'canonicalResult'>,
  options?: CanonicalResultProducerOptionsV1,
): StatisticsSuccessOutcome;
export function createStatisticsResultOutcome(
  input: Omit<StatisticsErrorOutcome, 'canonicalResult'>,
  options?: CanonicalResultProducerOptionsV1,
): StatisticsErrorOutcome;
export function createStatisticsResultOutcome(
  input: StatisticsResultProducerInput,
  options?: CanonicalResultProducerOptionsV1,
): StatisticsResultProducerOutcome;
export function createStatisticsResultOutcome(
  input: StatisticsResultProducerInput,
  options: CanonicalResultProducerOptionsV1 = {},
): StatisticsResultProducerOutcome {
  if (input.primaryMath && input.primaryMath.canonicalLatex !== input.exactLatex) {
    throw new Error('Statistics canonical math must match the producer exact LaTeX.');
  }
  const success = input.kind === 'success' ? input : undefined;
  const canonicalResult = buildCanonicalResultDocumentFromProducer({
    outcomeKind: input.kind,
    title: input.title,
    ...(input.kind === 'error' ? { error: input.error } : {}),
    ...(input.exactLatex
      ? { primaryMath: canonicalMathValue(input.exactLatex, input.primaryMath?.mathJson) }
      : {}),
    ...(success?.answerRows ? { answerRows: success.answerRows } : {}),
    ...(input.branchReadback ? { branchReadback: input.branchReadback } : {}),
    ...(success?.systemReadback ? { systemReadback: success.systemReadback } : {}),
    ...(input.periodicFamily ? { periodicFamily: input.periodicFamily } : {}),
    ...(input.exactSupplementLatex ? { supplements: input.exactSupplementLatex } : {}),
    ...(input.approxText ? { approxText: input.approxText } : {}),
    ...(input.detailSections ? { detailSections: input.detailSections } : {}),
    ...(input.solveSummaryParts ? { solveSummaryParts: input.solveSummaryParts } : {}),
    ...(input.transformSummaryText ? { transformSummaryText: input.transformSummaryText } : {}),
    ...(input.transformSummaryLatex ? { transformSummaryLatex: input.transformSummaryLatex } : {}),
    warnings: input.warnings,
    metadata: {
      ...(input.answerMode ? { answerMode: input.answerMode } : {}),
      ...(input.answerDomain ? { answerDomain: input.answerDomain } : {}),
      ...(input.solutionKind ? { solutionKind: input.solutionKind } : {}),
      ...(success?.resultOrigin ? { resultOrigin: success.resultOrigin } : {}),
      ...(success?.calculusStrategy ? { calculusStrategy: success.calculusStrategy } : {}),
      ...(success?.calculusDerivativeStrategies?.length
        ? { calculusDerivativeStrategies: [...success.calculusDerivativeStrategies] }
        : {}),
      ...(input.plannerBadges?.length ? { plannerBadges: [...input.plannerBadges] } : {}),
      ...(input.solveBadges?.length ? { solveBadges: [...input.solveBadges] } : {}),
      ...(input.transformBadges?.length ? { transformBadges: [...input.transformBadges] } : {}),
      ...(input.resolvedInputLatex
        ? { resolvedInput: canonicalMathValue(input.resolvedInputLatex) }
        : {}),
      ...(success?.candidateValues?.length ? { candidateValues: [...success.candidateValues] } : {}),
      ...(input.rejectedCandidateCount !== undefined
        ? { rejectedCandidateCount: input.rejectedCandidateCount }
        : {}),
      ...(input.substitutionDiagnostics
        ? { substitutionDiagnostics: { ...input.substitutionDiagnostics } }
        : {}),
      ...(input.numericMethod ? { numericMethod: input.numericMethod } : {}),
      ...(input.sourceMode ? { sourceMode: input.sourceMode } : {}),
      ...(success?.variableSubstitutions?.length
        ? {
            variableSubstitutions: success.variableSubstitutions.map((substitution) => ({
              name: substitution.name,
              value: canonicalMathValue(substitution.valueLatex),
              numericValue: substitution.numericValue,
            })),
          }
        : {}),
    },
  }, options);

  return attachCanonicalResultToProducerDraft<StatisticsResultProducerOutcome>(
    canonicalResult,
    input,
  );
}
