import type {
  ResultProducerDraft,
  ResultProducerDraftV2,
} from '../../types/calculator';
import { exactScalarToLatex } from '../linear-algebra/exact-matrix-format';
import {
  attachCanonicalResultV2ToProducerDraft,
  buildCanonicalResultDocumentV2FromProducerDraft,
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
  attachCanonicalResultToProducerDraft,
  type CanonicalResultProducerInputV2,
  type CanonicalResultProducerOptionsV1,
  type CanonicalResultV2MathResolver,
} from '../result-contract';
import type {
  MatrixMathJsonRouteId,
  MatrixProfileV2Evidence,
  MatrixRowOperationV2Evidence,
} from './matrix-math-values';

type MatrixSuccessOutcome = Extract<ResultProducerDraft, { kind: 'success' }>;
type MatrixErrorOutcome = Extract<ResultProducerDraft, { kind: 'error' }>;

type MatrixResultProducerInput =
  | Omit<MatrixSuccessOutcome, 'canonicalResult'>
  | Omit<MatrixErrorOutcome, 'canonicalResult'>;

type MatrixResultProducerOutcome = Exclude<ResultProducerDraft, { kind: 'prompt' }>;

function matrixDetailsV2(
  input: MatrixResultProducerInput,
  mathValue: CanonicalResultV2MathResolver,
  rowOperations: readonly MatrixRowOperationV2Evidence[],
): CanonicalResultProducerInputV2['details'] {
  let rowOperationIndex = 0;
  const details = input.detailSections?.map((section, sectionIndex) => ({
    title: section.title,
    lines: section.lines.map((line, lineIndex) => {
      const lineKind = section.lineKinds?.[lineIndex] ?? section.lineKind;
      if (section.title === 'Row Reduction Steps' && lineKind === 'math') {
        const evidence = rowOperations[rowOperationIndex];
        if (!evidence || evidence.presentationLatex !== line) {
          throw new Error(
            `Matrix V2 row-operation evidence does not match detail ${sectionIndex}:${lineIndex}.`,
          );
        }
        rowOperationIndex += 1;
        const { operation } = evidence;
        if (operation.kind === 'swap') {
          return [{
            kind: 'row-operation' as const,
            presentationLatex: line,
            operation: {
              kind: 'swap' as const,
              firstRow: operation.rowA + 1,
              secondRow: operation.rowB + 1,
            },
          }];
        }
        const factor = mathValue(
          exactScalarToLatex(operation.factor),
          `details[${sectionIndex}].lines[${lineIndex}][0].operation.factor`,
        );
        return [{
          kind: 'row-operation' as const,
          presentationLatex: line,
          operation: operation.kind === 'scale'
            ? {
                kind: 'scale' as const,
                row: operation.row + 1,
                factor,
              }
            : {
                kind: 'eliminate' as const,
                targetRow: operation.targetRow + 1,
                sourceRow: operation.pivotRow + 1,
                factor,
              },
        }];
      }

      const parts = section.lineParts?.[lineIndex];
      if (parts?.length) {
        return parts.map((part, partIndex) => part.kind === 'math'
          ? {
              kind: 'math' as const,
              math: mathValue(
                part.latex,
                `details[${sectionIndex}].lines[${lineIndex}][${partIndex}].math`,
              ),
            }
          : { kind: 'text' as const, text: part.text });
      }
      if (lineKind === 'math') {
        return [{
          kind: 'math' as const,
          math: mathValue(line, `details[${sectionIndex}].lines[${lineIndex}][0].math`),
        }];
      }
      if (lineKind === 'text') return [{ kind: 'text' as const, text: line }];
      throw new Error(`Matrix V2 detail ${sectionIndex}:${lineIndex} has no typed intent.`);
    }),
  }));
  if (rowOperationIndex !== rowOperations.length) {
    throw new Error('Matrix V2 row-operation evidence was not fully represented in details.');
  }
  return details;
}

export function createMatrixResultOutcomeV2(
  input: MatrixResultProducerInput,
  evidence: {
    routeId: MatrixMathJsonRouteId;
    mathValue: CanonicalResultV2MathResolver;
    profile?: MatrixProfileV2Evidence;
    rowOperations?: readonly MatrixRowOperationV2Evidence[];
  },
): ResultProducerDraftV2 {
  const success = input.kind === 'success' ? input : undefined;
  const isProfile = evidence.routeId === 'matrix.profile' && input.kind === 'success';
  if (isProfile && (!input.exactLatex || !evidence.profile)) {
    throw new Error('Matrix selected profile V2 without complete native profile evidence.');
  }
  const profile = isProfile ? evidence.profile : undefined;
  const canonicalResult = buildCanonicalResultDocumentV2FromProducerDraft({
    draft: input,
    mathValue: evidence.mathValue,
    ...(profile && input.exactLatex
      ? {
          primary: {
            kind: 'linear-map-profile' as const,
            presentation: {
              primaryLatex: input.exactLatex,
              ...(success?.answerRows ? { answerRows: success.answerRows } : {}),
            },
            operand: evidence.mathValue(profile.operandLatex, 'primary.operand'),
            domainDimension: profile.domainDimension,
            codomainDimension: profile.codomainDimension,
            rank: profile.rank,
            nullity: profile.nullity,
          },
          answerRows: null,
        }
      : {}),
    ...(evidence.routeId === 'matrix.linear-system'
      ? {
          details: matrixDetailsV2(
            input,
            evidence.mathValue,
            evidence.rowOperations ?? [],
          ),
        }
      : {}),
  });
  return attachCanonicalResultV2ToProducerDraft(canonicalResult, input);
}

export function createMatrixResultOutcome(
  input: Omit<MatrixSuccessOutcome, 'canonicalResult'>,
  options?: CanonicalResultProducerOptionsV1,
): MatrixSuccessOutcome;
export function createMatrixResultOutcome(
  input: Omit<MatrixErrorOutcome, 'canonicalResult'>,
  options?: CanonicalResultProducerOptionsV1,
): MatrixErrorOutcome;
export function createMatrixResultOutcome(
  input: MatrixResultProducerInput,
  options?: CanonicalResultProducerOptionsV1,
): MatrixResultProducerOutcome;
export function createMatrixResultOutcome(
  input: MatrixResultProducerInput,
  options: CanonicalResultProducerOptionsV1 = {},
): MatrixResultProducerOutcome {
  if (input.primaryMath && input.primaryMath.canonicalLatex !== input.exactLatex) {
    throw new Error('Matrix canonical math must match the producer exact LaTeX.');
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

  return attachCanonicalResultToProducerDraft<MatrixResultProducerOutcome>(
    canonicalResult,
    input,
  );
}
