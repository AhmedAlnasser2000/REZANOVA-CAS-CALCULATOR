import type {
  CalculusDerivativeStrategy,
  CalculusIntegrationStrategy,
  DisplayAnswerRowsReadback,
  DisplayDetailSection,
  CanonicalMathValueV1,
  ResultProducerDraft,
  PlannerBadge,
  ResultOrigin,
  TransformBadge,
  VariableSubstitutionSnapshot,
} from '../../../types/calculator';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
  attachCanonicalResultToProducerDraft,
  type CanonicalResultProducerOptionsV1,
} from '../../result-contract';

export type CalculateResultDocumentInput = {
  outcomeKind: 'success' | 'error';
  title: string;
  error?: string;
  exactLatex?: string;
  primaryMath?: CanonicalMathValueV1;
  answerRows?: DisplayAnswerRowsReadback;
  supplements?: readonly string[];
  approxText?: string;
  detailSections?: readonly DisplayDetailSection[];
  warnings: readonly string[];
  resultOrigin?: ResultOrigin;
  calculusStrategy?: CalculusIntegrationStrategy;
  calculusDerivativeStrategies?: readonly CalculusDerivativeStrategy[];
  plannerBadges?: readonly PlannerBadge[];
  resolvedInputLatex?: string;
  variableSubstitutions?: readonly VariableSubstitutionSnapshot[];
  transformBadges?: readonly TransformBadge[];
  transformSummaryText?: string;
  transformSummaryLatex?: string;
};

export function buildCalculateResultDocument(
  input: CalculateResultDocumentInput,
  options: CanonicalResultProducerOptionsV1 = {},
) {
  if (
    input.primaryMath
    && input.primaryMath.canonicalLatex !== input.exactLatex
  ) {
    throw new Error('Calculate canonical math must match the producer exact LaTeX.');
  }
  const isSuccess = input.outcomeKind === 'success';
  return buildCanonicalResultDocumentFromProducer({
    outcomeKind: input.outcomeKind,
    title: input.title,
    ...(input.error ? { error: input.error } : {}),
    ...(input.exactLatex
      ? {
          primaryMath: canonicalMathValue(
            input.exactLatex,
            isSuccess ? input.primaryMath?.mathJson : undefined,
          ),
        }
      : {}),
    ...(isSuccess && input.answerRows ? { answerRows: input.answerRows } : {}),
    ...(input.supplements ? { supplements: input.supplements } : {}),
    ...(input.approxText ? { approxText: input.approxText } : {}),
    ...(input.detailSections ? { detailSections: input.detailSections } : {}),
    ...(input.transformSummaryText
      ? { transformSummaryText: input.transformSummaryText }
      : {}),
    ...(input.transformSummaryLatex
      ? { transformSummaryLatex: input.transformSummaryLatex }
      : {}),
    warnings: input.warnings,
    metadata: {
      ...(isSuccess && input.resultOrigin ? { resultOrigin: input.resultOrigin } : {}),
      ...(isSuccess && input.calculusStrategy
        ? { calculusStrategy: input.calculusStrategy }
        : {}),
      ...(isSuccess && input.calculusDerivativeStrategies?.length
        ? { calculusDerivativeStrategies: [...input.calculusDerivativeStrategies] }
        : {}),
      ...(input.plannerBadges?.length ? { plannerBadges: [...input.plannerBadges] } : {}),
      ...(input.resolvedInputLatex
        ? { resolvedInput: canonicalMathValue(input.resolvedInputLatex) }
        : {}),
      ...(isSuccess && input.variableSubstitutions?.length
        ? {
            variableSubstitutions: input.variableSubstitutions.map((substitution) => ({
              name: substitution.name,
              value: canonicalMathValue(substitution.valueLatex),
              numericValue: substitution.numericValue,
            })),
          }
        : {}),
      ...(isSuccess && input.transformBadges?.length
        ? { transformBadges: [...input.transformBadges] }
        : {}),
    },
  }, options);
}

type CalculateErrorOutcome = Extract<ResultProducerDraft, { kind: 'error' }>;

export function createCalculateErrorResultOutcome(
  input: Omit<CalculateErrorOutcome, 'canonicalResult'>,
  options: CanonicalResultProducerOptionsV1 = {},
): CalculateErrorOutcome {
  const canonicalResult = buildCalculateResultDocument({
    outcomeKind: 'error',
    title: input.title,
    error: input.error,
    exactLatex: input.exactLatex,
    primaryMath: input.primaryMath,
    supplements: input.exactSupplementLatex,
    approxText: input.approxText,
    detailSections: input.detailSections,
    warnings: input.warnings,
    plannerBadges: input.plannerBadges,
    resolvedInputLatex: input.resolvedInputLatex,
    transformSummaryText: input.transformSummaryText,
    transformSummaryLatex: input.transformSummaryLatex,
  }, options);
  return attachCanonicalResultToProducerDraft(canonicalResult, input);
}
