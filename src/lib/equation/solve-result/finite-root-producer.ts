import type {
  AnswerDomain,
  DisplayBranchReadback,
  DisplayDetailSection,
  CanonicalMathValueV1,
  ResultProducerDraft,
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
  primaryMath: CanonicalMathValueV1;
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
): Extract<ResultProducerDraft, { kind: 'success' }> {
  if (
    input.primaryMath.canonicalLatex !== input.exactLatex
    || input.primaryMath.mathJson === undefined
  ) {
    throw new Error('Equation finite-root producers require matching proven answer MathJSON.');
  }
  const ownedMathValues = tryEquationMathValuesFromOwnedPayload({
    primaryMath: input.primaryMath,
    branchReadback: input.branchReadback,
    routeId: input.mathJsonRouteId,
    source: input.mathJsonSource,
  });
  const provenCanonicalMath = ownedMathValues ? input.primaryMath : undefined;
  const canonicalResult = buildCanonicalResultDocumentFromProducer({
    outcomeKind: 'success',
    title: input.title,
    primaryMath: canonicalMathValue(
      input.primaryMath.canonicalLatex,
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
    ...(provenCanonicalMath ? { primaryMath: provenCanonicalMath } : {}),
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
