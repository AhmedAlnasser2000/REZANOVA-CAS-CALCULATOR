import type { DisplayOutcome } from '../../../types/calculator';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
  deriveDisplayOutcomeFromCanonicalResult,
  type CanonicalResultProducerOptionsV1,
} from '../../result-contract';
import {
  equationMathValuesFromOwnedPayload,
  inferEquationMathJsonRoute,
} from './math-values';

type EquationSuccessOutcome = Extract<DisplayOutcome, { kind: 'success' }>;
type EquationErrorOutcome = Extract<DisplayOutcome, { kind: 'error' }>;

export type EquationResultProducerInput =
  | Omit<EquationSuccessOutcome, 'canonicalResult'>
  | Omit<EquationErrorOutcome, 'canonicalResult'>;

export type EquationResultProducerOutcome = Exclude<DisplayOutcome, { kind: 'prompt' }>;

export function createEquationResultOutcome(
  input: Omit<EquationSuccessOutcome, 'canonicalResult'>,
  options?: CanonicalResultProducerOptionsV1,
): EquationSuccessOutcome;
export function createEquationResultOutcome(
  input: Omit<EquationErrorOutcome, 'canonicalResult'>,
  options?: CanonicalResultProducerOptionsV1,
): EquationErrorOutcome;
export function createEquationResultOutcome(
  input: EquationResultProducerInput,
  options?: CanonicalResultProducerOptionsV1,
): EquationResultProducerOutcome;
export function createEquationResultOutcome(
  input: EquationResultProducerInput,
  options: CanonicalResultProducerOptionsV1 = {},
): EquationResultProducerOutcome {
  if (
    input.canonicalMath
    && input.canonicalMath.canonicalLatex !== input.exactLatex
  ) {
    throw new Error('Equation canonical math must match the producer exact LaTeX.');
  }
  if (input.solveSummaryText && !input.solveSummaryParts?.length) {
    throw new Error('Equation solve summaries require typed producer parts.');
  }

  const success = input.kind === 'success' ? input : undefined;
  const ownedMathValues = input.canonicalMath?.mathJson !== undefined
    ? equationMathValuesFromOwnedPayload({
        canonicalMath: input.canonicalMath,
        branchReadback: input.branchReadback,
        routeId: inferEquationMathJsonRoute(input),
        source: 'equation-final-owner-canonical-math',
      })
    : undefined;
  const canonicalResult = buildCanonicalResultDocumentFromProducer({
    outcomeKind: input.kind,
    title: input.title,
    ...(input.kind === 'error' ? { error: input.error } : {}),
    ...(input.exactLatex
      ? {
          primaryMath: canonicalMathValue(
            input.exactLatex,
            input.canonicalMath?.mathJson,
          ),
        }
      : {}),
    ...(success?.answerRows ? { answerRows: success.answerRows } : {}),
    ...(input.branchReadback ? { branchReadback: input.branchReadback } : {}),
    ...(success?.systemReadback ? { systemReadback: success.systemReadback } : {}),
    ...(input.periodicFamily ? { periodicFamily: input.periodicFamily } : {}),
    ...(input.exactSupplementLatex
      ? { supplements: input.exactSupplementLatex }
      : {}),
    ...(input.approxText ? { approxText: input.approxText } : {}),
    ...(input.detailSections ? { detailSections: input.detailSections } : {}),
    ...(input.solveSummaryParts ? { solveSummaryParts: input.solveSummaryParts } : {}),
    ...(input.transformSummaryText
      ? { transformSummaryText: input.transformSummaryText }
      : {}),
    ...(input.transformSummaryLatex
      ? { transformSummaryLatex: input.transformSummaryLatex }
      : {}),
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
      ...(success?.transformBadges?.length
        ? { transformBadges: [...success.transformBadges] }
        : {}),
      ...(input.resolvedInputLatex
        ? { resolvedInput: canonicalMathValue(input.resolvedInputLatex) }
        : {}),
      ...(success?.candidateValues?.length
        ? { candidateValues: [...success.candidateValues] }
        : {}),
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
  }, {
    ...options,
    mathValues: {
      ...ownedMathValues,
      ...options.mathValues,
    },
  });

  return deriveDisplayOutcomeFromCanonicalResult<EquationResultProducerOutcome>(
    canonicalResult,
    input,
  );
}
