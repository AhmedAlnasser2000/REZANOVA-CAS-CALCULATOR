import type {
  ResultProducerDraft,
  ResultProducerDraftV2,
} from '../../types/calculator';
import {
  attachCanonicalResultV2ToProducerDraft,
  buildCanonicalResultDocumentFromProducer,
  buildCanonicalResultDocumentV2FromProducerDraft,
  canonicalMathValue,
  attachCanonicalResultToProducerDraft,
  type CanonicalResultProducerOptionsV1,
  type CanonicalResultV2MathResolver,
  type ProvenCanonicalMathValueV2,
} from '../result-contract';
import type { TrigonometryV2RequestEvidence } from './core';

type TrigonometrySuccessOutcome = Extract<ResultProducerDraft, { kind: 'success' }>;
type TrigonometryErrorOutcome = Extract<ResultProducerDraft, { kind: 'error' }>;

type TrigonometryResultProducerInput =
  | Omit<TrigonometrySuccessOutcome, 'canonicalResult'>
  | Omit<TrigonometryErrorOutcome, 'canonicalResult'>;

type TrigonometryResultProducerOutcome = Exclude<ResultProducerDraft, { kind: 'prompt' }>;

export function createTrigonometryResultOutcome(
  input: Omit<TrigonometrySuccessOutcome, 'canonicalResult'>,
  options?: CanonicalResultProducerOptionsV1,
): TrigonometrySuccessOutcome;
export function createTrigonometryResultOutcome(
  input: Omit<TrigonometryErrorOutcome, 'canonicalResult'>,
  options?: CanonicalResultProducerOptionsV1,
): TrigonometryErrorOutcome;
export function createTrigonometryResultOutcome(
  input: TrigonometryResultProducerInput,
  options?: CanonicalResultProducerOptionsV1,
): TrigonometryResultProducerOutcome;
export function createTrigonometryResultOutcome(
  input: TrigonometryResultProducerInput,
  options: CanonicalResultProducerOptionsV1 = {},
): TrigonometryResultProducerOutcome {
  if (input.primaryMath && input.primaryMath.canonicalLatex !== input.exactLatex) {
    throw new Error('Trigonometry canonical math must match the producer exact LaTeX.');
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

  return attachCanonicalResultToProducerDraft<TrigonometryResultProducerOutcome>(
    canonicalResult,
    input,
  );
}

export function createTrigonometryRequestResultOutcomeV2(
  input: TrigonometryResultProducerInput,
  evidence: {
    requestEvidence: TrigonometryV2RequestEvidence;
    presentationLatex: string;
    mathValue: CanonicalResultV2MathResolver;
  },
): ResultProducerDraftV2 {
  const rightTriangleQuantities: Array<
    | { kind: 'side'; name: 'a' | 'b' | 'c'; value: ProvenCanonicalMathValueV2 }
    | { kind: 'angle'; name: 'A' | 'B'; value: ProvenCanonicalMathValueV2 }
  > = [];
  if (evidence.requestEvidence.kind === 'rightTriangle') {
    evidence.requestEvidence.knownQuantities.forEach((quantity, index) => {
      const value = evidence.mathValue(
        quantity.value.canonicalLatex,
        `request.knownQuantities[${index}].value`,
      );
      rightTriangleQuantities.push(quantity.kind === 'side'
        ? { kind: 'side', name: quantity.name, value }
        : { kind: 'angle', name: quantity.name, value });
    });
  }
  const request = input.kind === 'success'
    ? evidence.requestEvidence.kind === 'angleConvert'
      ? {
          kind: 'angle-conversion' as const,
          presentationLatex: evidence.presentationLatex,
          value: evidence.mathValue(
            evidence.requestEvidence.value.canonicalLatex,
            'request.value',
          ),
          fromUnit: evidence.requestEvidence.from,
          toUnit: evidence.requestEvidence.to,
        }
      : {
          kind: 'right-triangle' as const,
          presentationLatex: evidence.presentationLatex,
          angleUnit: 'deg' as const,
          knownQuantities: rightTriangleQuantities,
        }
    : undefined;
  const canonicalResult = buildCanonicalResultDocumentV2FromProducerDraft({
    draft: input,
    mathValue: evidence.mathValue,
    ...(request ? { request } : {}),
  });
  return attachCanonicalResultV2ToProducerDraft(
    canonicalResult,
    input,
  );
}

export function createTrigonometryRequestErrorOutcomeV2(
  input: Omit<TrigonometryErrorOutcome, 'canonicalResult'>,
  mathValue: CanonicalResultV2MathResolver,
): ResultProducerDraftV2 {
  const canonicalResult = buildCanonicalResultDocumentV2FromProducerDraft({
    draft: input,
    mathValue,
  });
  return attachCanonicalResultV2ToProducerDraft(canonicalResult, input);
}
