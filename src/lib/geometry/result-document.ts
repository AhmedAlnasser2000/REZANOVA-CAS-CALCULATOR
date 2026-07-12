import type { DisplayOutcome } from '../../types/calculator';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
  deriveDisplayOutcomeFromCanonicalResult,
} from '../result-contract';

type GeometrySuccessOutcome = Extract<DisplayOutcome, { kind: 'success' }>;
type GeometryErrorOutcome = Extract<DisplayOutcome, { kind: 'error' }>;

type GeometryResultProducerInput =
  | Omit<GeometrySuccessOutcome, 'canonicalResult'>
  | Omit<GeometryErrorOutcome, 'canonicalResult'>;

type GeometryResultProducerOutcome = Exclude<DisplayOutcome, { kind: 'prompt' }>;

export function createGeometryResultOutcome(
  input: Omit<GeometrySuccessOutcome, 'canonicalResult'>,
): GeometrySuccessOutcome;
export function createGeometryResultOutcome(
  input: Omit<GeometryErrorOutcome, 'canonicalResult'>,
): GeometryErrorOutcome;
export function createGeometryResultOutcome(
  input: GeometryResultProducerInput,
): GeometryResultProducerOutcome;
export function createGeometryResultOutcome(
  input: GeometryResultProducerInput,
): GeometryResultProducerOutcome {
  if (input.canonicalMath && input.canonicalMath.canonicalLatex !== input.exactLatex) {
    throw new Error('Geometry canonical math must match the producer exact LaTeX.');
  }
  if (input.solveSummaryText && !input.solveSummaryParts?.length) {
    throw new Error('Geometry solve summaries require typed producer parts.');
  }

  const success = input.kind === 'success' ? input : undefined;
  const canonicalResult = buildCanonicalResultDocumentFromProducer({
    outcomeKind: input.kind,
    title: input.title,
    ...(input.kind === 'error' ? { error: input.error } : {}),
    ...(input.exactLatex
      ? { primaryMath: canonicalMathValue(input.exactLatex, input.canonicalMath?.mathJson) }
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
  });

  return deriveDisplayOutcomeFromCanonicalResult<GeometryResultProducerOutcome>(
    canonicalResult,
    input,
  );
}
