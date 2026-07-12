import type {
  AnswerDomain,
  DisplayBranchReadback,
  DisplayDetailSection,
  DisplayMathPayloadV1,
  DisplayOutcome,
  ResultOrigin,
} from '../../../types/calculator';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
} from '../../result-contract';

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
};

export function createEquationFiniteRootSuccessOutcome(
  input: EquationFiniteRootSuccessInput,
): Extract<DisplayOutcome, { kind: 'success' }> {
  if (
    input.canonicalMath.canonicalLatex !== input.exactLatex
    || input.canonicalMath.mathJson === undefined
  ) {
    throw new Error('Equation finite-root producers require matching proven answer MathJSON.');
  }
  const canonicalResult = buildCanonicalResultDocumentFromProducer({
    outcomeKind: 'success',
    title: input.title,
    primaryMath: canonicalMathValue(
      input.canonicalMath.canonicalLatex,
      input.canonicalMath.mathJson,
    ),
    branchReadback: input.branchReadback,
    supplements: input.exactSupplementLatex,
    approxText: input.approxText,
    detailSections: input.detailSections,
    warnings: input.warnings,
    metadata: {
      resultOrigin: input.resultOrigin,
      ...(input.answerDomain ? { answerDomain: input.answerDomain } : {}),
    },
  });
  return {
    kind: 'success',
    title: input.title,
    exactLatex: input.exactLatex,
    canonicalMath: input.canonicalMath,
    canonicalResult,
    ...(input.branchReadback ? { branchReadback: input.branchReadback } : {}),
    exactSupplementLatex: input.exactSupplementLatex,
    approxText: input.approxText,
    detailSections: input.detailSections,
    warnings: input.warnings,
    resultOrigin: input.resultOrigin,
    ...(input.answerDomain ? { answerDomain: input.answerDomain } : {}),
  };
}
