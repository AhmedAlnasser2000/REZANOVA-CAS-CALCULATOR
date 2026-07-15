import type {
  ResultProducerDraft,
  ResultProducerDraftV2,
} from '../../types/calculator';
import { exactScalarToLatex } from '../linear-algebra/exact-matrix-format';
import type { LinearAlgebraCanonicalEvidence } from '../linear-algebra/canonical-evidence';
import {
  attachCanonicalResultV2ToProducerDraft,
  buildCanonicalResultDocumentV2FromProducerDraft,
  type CanonicalResultProducerInputV2,
} from '../result-contract';
import {
  proveMatrixCanonicalEvidence,
  type MatrixMathJsonRouteId,
} from './matrix-math-values';

type MatrixResultProducerInput = Exclude<ResultProducerDraft, { kind: 'prompt' }>;

function matrixDetailsV2(
  input: MatrixResultProducerInput,
  routeId: MatrixMathJsonRouteId,
  evidence: LinearAlgebraCanonicalEvidence,
): CanonicalResultProducerInputV2['details'] {
  let evidenceIndex = 0;
  const consume = (canonicalLatex: string, path: string) => {
    const candidate = evidence.details?.[evidenceIndex];
    if (!candidate) {
      throw new Error(`Matrix producer is missing aligned detail evidence at ${path}.`);
    }
    evidenceIndex += 1;
    if (candidate.kind === 'math') {
      if (candidate.value.canonicalLatex !== canonicalLatex) {
        throw new Error(
          `Matrix detail evidence mismatch at ${path}: displayed ${canonicalLatex}, evidence ${candidate.value.canonicalLatex}.`,
        );
      }
      return {
        kind: 'math' as const,
        math: proveMatrixCanonicalEvidence(routeId, candidate.value, path),
      };
    }
    if (candidate.presentationLatex !== canonicalLatex) {
      throw new Error(
        `Matrix row-operation evidence mismatch at ${path}: displayed ${canonicalLatex}, evidence ${candidate.presentationLatex}.`,
      );
    }
    const operation = candidate.operation;
    if (operation.kind === 'swap') {
      return {
        kind: 'row-operation' as const,
        presentationLatex: canonicalLatex,
        operation: {
          kind: 'swap' as const,
          firstRow: operation.rowA + 1,
          secondRow: operation.rowB + 1,
        },
      };
    }
    if (!candidate.factor
      || candidate.factor.canonicalLatex !== exactScalarToLatex(operation.factor)) {
      throw new Error(`Matrix row-operation factor evidence is missing at ${path}.`);
    }
    const factor = proveMatrixCanonicalEvidence(routeId, candidate.factor, `${path}.operation.factor`);
    return {
      kind: 'row-operation' as const,
      presentationLatex: canonicalLatex,
      operation: operation.kind === 'scale'
        ? { kind: 'scale' as const, row: operation.row + 1, factor }
        : {
            kind: 'eliminate' as const,
            targetRow: operation.targetRow + 1,
            sourceRow: operation.pivotRow + 1,
            factor,
          },
    };
  };

  const details = input.detailSections?.map((section, sectionIndex) => ({
    title: section.title,
    lines: section.lines.map((line, lineIndex) => {
      const parts = section.lineParts?.[lineIndex];
      if (parts?.length) {
        return parts.map((part, partIndex) => part.kind === 'math'
          ? consume(
              part.latex,
              `details[${sectionIndex}].lines[${lineIndex}][${partIndex}].math`,
            )
          : { kind: 'text' as const, text: part.text });
      }
      const lineKind = section.lineKinds?.[lineIndex] ?? section.lineKind;
      if (lineKind === 'math') {
        return [consume(line, `details[${sectionIndex}].lines[${lineIndex}][0].math`)];
      }
      if (lineKind === 'text') return [{ kind: 'text' as const, text: line }];
      throw new Error(`Matrix detail ${sectionIndex}:${lineIndex} has no typed intent.`);
    }),
  }));
  if (evidenceIndex !== (evidence.details?.length ?? 0)) {
    throw new Error('Matrix canonical detail evidence was not fully consumed.');
  }
  return details;
}

export function createMatrixResultOutcomeV2(
  input: MatrixResultProducerInput,
  options: {
    routeId: MatrixMathJsonRouteId;
    evidence: LinearAlgebraCanonicalEvidence;
    mathValue: Parameters<typeof buildCanonicalResultDocumentV2FromProducerDraft>[0]['mathValue'];
  },
): ResultProducerDraftV2 {
  const success = input.kind === 'success' ? input : undefined;
  const semantic = options.evidence.semanticPrimary;
  const primary = semantic?.kind === 'linear-map-profile' && input.exactLatex
    ? {
        kind: 'linear-map-profile' as const,
        presentation: {
          primaryLatex: input.exactLatex,
          ...(success?.answerRows ? { answerRows: success.answerRows } : {}),
        },
        operand: proveMatrixCanonicalEvidence(options.routeId, semantic.operand, 'primary.operand'),
        domainDimension: semantic.domainDimension,
        codomainDimension: semantic.codomainDimension,
        rank: semantic.rank,
        nullity: semantic.nullity,
      }
    : undefined;
  if (
    options.routeId === 'matrix.profile'
    && input.kind === 'success'
    && !primary
    && !options.evidence.primary
  ) {
    throw new Error('Matrix profile is missing aligned semantic-primary evidence.');
  }
  const canonicalResult = buildCanonicalResultDocumentV2FromProducerDraft({
    draft: input,
    mathValue: options.mathValue,
    ...(primary ? { primary, answerRows: null } : {}),
    details: matrixDetailsV2(input, options.routeId, options.evidence),
  });
  return attachCanonicalResultV2ToProducerDraft(canonicalResult, input);
}
