import type {
  ResultProducerDraft,
  ResultProducerDraftV2,
  TableResponse,
} from '../../types/calculator';
import {
  attachCanonicalResultV2ToProducerDraft,
  buildCanonicalResultDocumentV2FromProducerDraft,
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
  attachCanonicalResultToProducerDraft,
  type CanonicalResultProducerOptionsV1,
  type CanonicalResultV2MathResolver,
} from '../result-contract';
import type { TableMathJsonEvidence } from '../engine/math-engine';

type TableSuccessOutcome = Extract<ResultProducerDraft, { kind: 'success' }>;
type TableErrorOutcome = Extract<ResultProducerDraft, { kind: 'error' }>;

type TableResultProducerInput =
  | Omit<TableSuccessOutcome, 'canonicalResult'>
  | Omit<TableErrorOutcome, 'canonicalResult'>;

type TableResultProducerOutcome = Exclude<ResultProducerDraft, { kind: 'prompt' }>;

export function createTableResultOutcomeV2(
  input: TableResultProducerInput,
  response: TableResponse,
  evidence: {
    mathValue: CanonicalResultV2MathResolver;
    tableEvidence?: TableMathJsonEvidence;
  },
): ResultProducerDraftV2 {
  if (response.rows.length !== (evidence.tableEvidence?.rows.length ?? 0)) {
    throw new Error('Table selected V2 without row-aligned producer evidence.');
  }
  const tableEvidence = evidence.tableEvidence;
  const table = {
    headers: [...response.headers],
    rows: response.rows.map((row, index) => {
      const rowEvidence = tableEvidence?.rows[index];
      if (!rowEvidence) throw new Error(`Table selected V2 without evidence for row ${index}.`);
      const cell = (
        value: string,
        cellEvidence: typeof rowEvidence.primary | undefined,
        path: string,
      ) => {
        if (!cellEvidence) throw new Error(`Table selected V2 without evidence for ${path}.`);
        if (cellEvidence.undefinedReason) {
          return {
            kind: 'undefined' as const,
            reason: cellEvidence.undefinedReason,
            presentationLatex: value,
          };
        }
        return {
          kind: 'value' as const,
          value: evidence.mathValue(value, `${path}.value`),
        };
      };
      return {
        x: evidence.mathValue(row.x, `table.rows[${index}].x`),
        primary: cell(row.primary, rowEvidence.primary, `table.rows[${index}].primary`),
        ...(row.secondary !== undefined
          ? {
              secondary: cell(
                row.secondary,
                rowEvidence.secondary,
                `table.rows[${index}].secondary`,
              ),
            }
          : {}),
      };
    }),
  };
  const canonicalResult = buildCanonicalResultDocumentV2FromProducerDraft({
    draft: input,
    mathValue: evidence.mathValue,
    table,
  });
  return attachCanonicalResultV2ToProducerDraft(canonicalResult, input);
}

export function createTableResultOutcome(
  input: Omit<TableSuccessOutcome, 'canonicalResult'>,
  response: TableResponse,
  options?: CanonicalResultProducerOptionsV1,
): TableSuccessOutcome;
export function createTableResultOutcome(
  input: Omit<TableErrorOutcome, 'canonicalResult'>,
  response: TableResponse,
  options?: CanonicalResultProducerOptionsV1,
): TableErrorOutcome;
export function createTableResultOutcome(
  input: TableResultProducerInput,
  response: TableResponse,
  options?: CanonicalResultProducerOptionsV1,
): TableResultProducerOutcome;
export function createTableResultOutcome(
  input: TableResultProducerInput,
  response: TableResponse,
  options: CanonicalResultProducerOptionsV1 = {},
): TableResultProducerOutcome {
  if (input.primaryMath && input.primaryMath.canonicalLatex !== input.exactLatex) {
    throw new Error('Table canonical math must match the producer exact LaTeX.');
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
    table: {
      headers: [...response.headers],
      rows: response.rows.map((row) => ({
        x: canonicalMathValue(row.x),
        primary: canonicalMathValue(row.primary),
        ...(row.secondary !== undefined
          ? { secondary: canonicalMathValue(row.secondary) }
          : {}),
      })),
    },
  }, options);

  return attachCanonicalResultToProducerDraft<TableResultProducerOutcome>(
    canonicalResult,
    input,
  );
}
