import type {
  CalculusScreen,
  ResultProducerDraft,
  ResultProducerDraftV2,
} from '../../../types/calculator';
import {
  attachCanonicalResultV2ToProducerDraft,
  buildCanonicalResultDocumentFromProducer,
  buildCanonicalResultDocumentV2FromProducerDraft,
  canonicalMathValue,
  attachCanonicalResultToProducerDraft,
  type CanonicalResultProducerOptionsV1,
  type CanonicalResultV2MathResolver,
} from '../../result-contract';

type CalculusSuccessOutcome = Extract<ResultProducerDraft, { kind: 'success' }>;
type CalculusErrorOutcome = Extract<ResultProducerDraft, { kind: 'error' }>;

export type CalculusResultProducerInput =
  | Omit<CalculusSuccessOutcome, 'canonicalResult'>
  | Omit<CalculusErrorOutcome, 'canonicalResult'>;

export type CalculusResultProducerOutcome = Exclude<ResultProducerDraft, { kind: 'prompt' }>;

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
  options?: CanonicalResultProducerOptionsV1,
): CalculusSuccessOutcome;
export function createCalculusResultOutcome(
  input: Omit<CalculusErrorOutcome, 'canonicalResult'>,
  options?: CanonicalResultProducerOptionsV1,
): CalculusErrorOutcome;
export function createCalculusResultOutcome(
  input: CalculusResultProducerInput,
  options?: CanonicalResultProducerOptionsV1,
): CalculusResultProducerOutcome;
export function createCalculusResultOutcome(
  input: CalculusResultProducerInput,
  options: CanonicalResultProducerOptionsV1 = {},
): CalculusResultProducerOutcome {
  if (
    input.primaryMath
    && input.primaryMath.canonicalLatex !== input.exactLatex
  ) {
    throw new Error('Calculus canonical math must match the producer exact LaTeX.');
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
            input.primaryMath?.mathJson,
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
  }, options);

  return attachCanonicalResultToProducerDraft<CalculusResultProducerOutcome>(
    canonicalResult,
    input,
  );
}

export function createCalculusDerivativeAtPointResultOutcomeV2(
  input: Omit<CalculusSuccessOutcome, 'canonicalResult'>,
  evidence: {
    presentationLatex: string;
    primaryLatex: string;
    bodyLatex: string;
    appliedVariablePathLatex: string[];
    pointLatex: string;
    mathValue: CanonicalResultV2MathResolver;
  },
): ResultProducerDraftV2 {
  const canonicalResult = buildCanonicalResultDocumentV2FromProducerDraft({
    draft: input,
    mathValue: evidence.mathValue,
    primary: {
      kind: 'math',
      value: evidence.mathValue(evidence.primaryLatex, 'primary.value'),
    },
    request: {
      kind: 'derivative-at-point',
      presentationLatex: evidence.presentationLatex,
      body: evidence.mathValue(evidence.bodyLatex, 'request.body'),
      appliedVariablePath: evidence.appliedVariablePathLatex.map((value, index) =>
        evidence.mathValue(value, `request.appliedVariablePath[${index}]`)),
      point: evidence.mathValue(evidence.pointLatex, 'request.point'),
    },
  });
  return attachCanonicalResultV2ToProducerDraft(canonicalResult, input);
}

export function createCalculusDerivativeAtPointErrorOutcomeV2(
  input: Omit<CalculusErrorOutcome, 'canonicalResult'>,
  evidence: {
    mathValue: CanonicalResultV2MathResolver;
    presentationLatex?: string;
    bodyLatex?: string;
    appliedVariablePathLatex?: string[];
    pointLatex?: string;
  },
): ResultProducerDraftV2 {
  const hasRequest = evidence.presentationLatex
    && evidence.bodyLatex
    && evidence.appliedVariablePathLatex?.length
    && evidence.pointLatex;
  const canonicalResult = buildCanonicalResultDocumentV2FromProducerDraft({
    draft: input,
    mathValue: evidence.mathValue,
    ...(hasRequest
      ? {
          request: {
            kind: 'derivative-at-point' as const,
            presentationLatex: evidence.presentationLatex as string,
            body: evidence.mathValue(evidence.bodyLatex as string, 'request.body'),
            appliedVariablePath: (evidence.appliedVariablePathLatex ?? []).map(
              (value, index) => evidence.mathValue(
                value,
                `request.appliedVariablePath[${index}]`,
              ),
            ),
            point: evidence.mathValue(evidence.pointLatex as string, 'request.point'),
          },
        }
      : {}),
  });
  return attachCanonicalResultV2ToProducerDraft(canonicalResult, input);
}
