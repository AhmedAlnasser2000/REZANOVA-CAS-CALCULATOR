import type {
  AnswerDomain,
  DisplayBranchReadback,
  DisplayDetailSection,
  DisplayMathPayloadV1,
  DisplayOutcome,
  PlannerBadge,
  ResultOrigin,
} from '../../../types/calculator';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
  type CanonicalResultProducerOptionsV1,
} from '../../result-contract';
import {
  tryEquationMathValuesFromOwnedPayload,
  type EquationMathJsonRouteId,
} from './math-values';

export type EquationFiniteRootSuccessInput = {
  title: string;
  exactLatex: string;
  canonicalMath: DisplayMathPayloadV1;
  branchReadback?: DisplayBranchReadback;
  exactSupplementLatex?: string[];
  approxText?: string;
  detailSections?: DisplayDetailSection[];
  warnings: string[];
  resultOrigin: ResultOrigin;
  answerDomain?: AnswerDomain;
  plannerBadges?: PlannerBadge[];
  mathJsonRouteId: EquationMathJsonRouteId;
  mathJsonSource: string;
};

export function createEquationFiniteRootSuccessOutcome(
  input: EquationFiniteRootSuccessInput,
  options: CanonicalResultProducerOptionsV1 = {},
): Extract<DisplayOutcome, { kind: 'success' }> {
  if (
    input.canonicalMath.canonicalLatex !== input.exactLatex
    || input.canonicalMath.mathJson === undefined
  ) {
    throw new Error('Equation finite-root producers require matching proven answer MathJSON.');
  }
  const ownedMathValues = tryEquationMathValuesFromOwnedPayload({
    canonicalMath: input.canonicalMath,
    branchReadback: input.branchReadback,
    routeId: input.mathJsonRouteId,
    source: input.mathJsonSource,
  });
  const provenCanonicalMath = ownedMathValues ? input.canonicalMath : undefined;
  const canonicalResult = buildCanonicalResultDocumentFromProducer({
    outcomeKind: 'success',
    title: input.title,
    primaryMath: canonicalMathValue(
      input.canonicalMath.canonicalLatex,
      provenCanonicalMath?.mathJson,
    ),
    branchReadback: input.branchReadback,
    supplements: input.exactSupplementLatex,
    approxText: input.approxText,
    detailSections: input.detailSections,
    warnings: input.warnings,
    metadata: {
      resultOrigin: input.resultOrigin,
      ...(input.plannerBadges?.length ? { plannerBadges: input.plannerBadges } : {}),
      ...(input.answerDomain ? { answerDomain: input.answerDomain } : {}),
    },
  }, {
    ...options,
    mathValues: {
      ...ownedMathValues,
      ...options.mathValues,
    },
  });
  return {
    kind: 'success',
    title: input.title,
    exactLatex: input.exactLatex,
    ...(provenCanonicalMath ? { canonicalMath: provenCanonicalMath } : {}),
    canonicalResult,
    ...(input.branchReadback ? { branchReadback: input.branchReadback } : {}),
    exactSupplementLatex: input.exactSupplementLatex,
    approxText: input.approxText,
    detailSections: input.detailSections,
    warnings: input.warnings,
    resultOrigin: input.resultOrigin,
    ...(input.plannerBadges?.length ? { plannerBadges: input.plannerBadges } : {}),
    ...(input.answerDomain ? { answerDomain: input.answerDomain } : {}),
  };
}
