import type { CalculusScreen, DisplayOutcome } from '../../../types/calculator';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
} from '../../result-contract';

type CalculusSuccessOutcome = Extract<DisplayOutcome, { kind: 'success' }>;
type CalculusErrorOutcome = Extract<DisplayOutcome, { kind: 'error' }>;

export type CalculusResultProducerInput =
  | Omit<CalculusSuccessOutcome, 'canonicalResult'>
  | Omit<CalculusErrorOutcome, 'canonicalResult'>;

export type CalculusResultProducerOutcome = Exclude<DisplayOutcome, { kind: 'prompt' }>;

const NATIVE_CALCULUS_RESULT_DOCUMENT_SCREENS = new Set<CalculusScreen>([
  'limit',
  'finiteLimit',
  'infiniteLimit',
  'indefiniteIntegral',
  'definiteIntegral',
  'improperIntegral',
  'laplace',
  'partialDerivative',
  'derivative',
  'derivativePoint',
  'implicitDerivative',
  'maclaurin',
  'taylor',
  'odeFirstOrder',
  'odeSecondOrder',
  'odeNumericIvp',
]);

export function hasNativeCalculusResultDocument(screen: CalculusScreen) {
  return NATIVE_CALCULUS_RESULT_DOCUMENT_SCREENS.has(screen);
}

export function createCalculusResultOutcome(
  input: Omit<CalculusSuccessOutcome, 'canonicalResult'>,
): CalculusSuccessOutcome;
export function createCalculusResultOutcome(
  input: Omit<CalculusErrorOutcome, 'canonicalResult'>,
): CalculusErrorOutcome;
export function createCalculusResultOutcome(
  input: CalculusResultProducerInput,
): CalculusResultProducerOutcome;
export function createCalculusResultOutcome(
  input: CalculusResultProducerInput,
): CalculusResultProducerOutcome {
  if (
    input.canonicalMath
    && input.canonicalMath.canonicalLatex !== input.exactLatex
  ) {
    throw new Error('Calculus canonical math must match the producer exact LaTeX.');
  }
  if (input.solveSummaryText && !input.solveSummaryParts?.length) {
    throw new Error('Calculus solve summaries require typed producer parts.');
  }

  const success = input.kind === 'success' ? input : undefined;
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
  });

  return { ...input, canonicalResult };
}
