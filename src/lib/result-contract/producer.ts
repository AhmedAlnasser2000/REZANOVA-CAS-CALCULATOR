import type {
  CanonicalMathValueV1,
  CanonicalResultBranchReadbackV1,
  CanonicalResultDetailPartV1,
  CanonicalResultDetailSectionV1,
  CanonicalResultDocumentV1,
  CanonicalResultPeriodicFamilyV1,
  CanonicalResultSemanticMetadataV1,
  CanonicalResultSystemReadbackV1,
  CanonicalResultTableV1,
  DisplayAnswerRowsReadback,
  DisplayBranchReadback,
  DisplayDetailLinePart,
  DisplayDetailSection,
  DisplaySystemSolutionReadback,
  PeriodicFamilyInfo,
  SerializableMathJson,
} from '../../types/calculator';
import { validateCanonicalResultDocument } from './validation';
import type { ProvenAnswerMathJson } from './proven-answer-mathjson';

export type CanonicalResultProducerInputV1 = {
  outcomeKind: 'success' | 'error';
  title: string;
  error?: string;
  primaryMath?: CanonicalMathValueV1;
  answerRows?: DisplayAnswerRowsReadback;
  branchReadback?: DisplayBranchReadback;
  systemReadback?: DisplaySystemSolutionReadback;
  periodicFamily?: PeriodicFamilyInfo;
  supplements?: readonly string[];
  approxText?: string;
  detailSections?: readonly DisplayDetailSection[];
  solveSummaryParts?: readonly (readonly DisplayDetailLinePart[])[];
  transformSummaryText?: string;
  transformSummaryLatex?: string;
  warnings: readonly string[];
  metadata?: CanonicalResultSemanticMetadataV1;
  table?: CanonicalResultTableV1;
};

type CanonicalResultProducerMathFieldsV1 = Partial<Pick<
  CanonicalResultDocumentV1,
  | 'primaryMath'
  | 'answerRows'
  | 'branchReadback'
  | 'systemReadback'
  | 'periodicFamily'
  | 'supplements'
  | 'details'
  | 'summaries'
  | 'table'
>> & {
  metadata?: Pick<
    CanonicalResultSemanticMetadataV1,
    'resolvedInput' | 'variableSubstitutions'
  >;
};

type ProducerOwnedMathShape<Value> =
  Value extends CanonicalMathValueV1
    ? Omit<Value, 'mathJson'> & { mathJson?: ProvenAnswerMathJson }
    : Value extends readonly (infer Entry)[]
      ? ProducerOwnedMathShape<Entry>[]
      : Value extends object
        ? { [Key in keyof Value]: ProducerOwnedMathShape<Value[Key]> }
        : Value;

export type CanonicalResultProducerMathValuesV1 = ProducerOwnedMathShape<
  CanonicalResultProducerMathFieldsV1
>;

export type CanonicalResultProducerOptionsV1 = {
  mathValues?: CanonicalResultProducerMathValuesV1;
};

export function canonicalMathValue(
  canonicalLatex: string,
  mathJson?: SerializableMathJson,
): CanonicalMathValueV1 {
  return {
    canonicalLatex,
    ...(mathJson !== undefined ? { mathJson } : {}),
  };
}

function canonicalDetailPart(part: DisplayDetailLinePart): CanonicalResultDetailPartV1 {
  return part.kind === 'math'
    ? { kind: 'math', math: canonicalMathValue(part.latex) }
    : { kind: 'text', text: part.text };
}

function canonicalDetailSections(
  sections: readonly DisplayDetailSection[] | undefined,
): CanonicalResultDetailSectionV1[] | undefined {
  if (!sections?.length) return undefined;
  return sections.map((section, sectionIndex) => ({
    title: section.title,
    lines: section.lines.map((line, lineIndex) => {
      const parts = section.lineParts?.[lineIndex];
      if (parts?.length) return parts.map(canonicalDetailPart);
      const lineKind = section.lineKinds?.[lineIndex] ?? section.lineKind;
      if (lineKind === 'math') return [{ kind: 'math', math: canonicalMathValue(line) }];
      if (lineKind === 'text') return [{ kind: 'text', text: line }];
      throw new Error(
        `Canonical result producer detail ${sectionIndex}:${lineIndex} has no typed intent.`,
      );
    }),
  }));
}

function canonicalBranchReadback(
  readback: DisplayBranchReadback | undefined,
): CanonicalResultBranchReadbackV1 | undefined {
  if (!readback) return undefined;
  return {
    target: canonicalMathValue(readback.targetLatex),
    relation: readback.relationLatex,
    branches: readback.branchesLatex.map((branch) => canonicalMathValue(branch)),
    ...(readback.countLabel ? { countLabel: readback.countLabel } : {}),
    ...(readback.label ? { label: readback.label } : {}),
    ...(readback.source ? { source: readback.source } : {}),
  };
}

function canonicalSystemReadback(
  readback: DisplaySystemSolutionReadback | undefined,
): CanonicalResultSystemReadbackV1 | undefined {
  if (!readback) return undefined;
  return {
    variables: readback.variablesLatex.map((value) => canonicalMathValue(value)),
    rows: readback.rows.map((row) => ({
      values: row.valuesLatex.map((value) => canonicalMathValue(value)),
      ...(row.approxText ? { approxText: row.approxText } : {}),
    })),
    ...(readback.label ? { label: readback.label } : {}),
    ...(readback.source ? { source: readback.source } : {}),
  };
}

function canonicalPeriodicFamily(
  family: PeriodicFamilyInfo | undefined,
): CanonicalResultPeriodicFamilyV1 | undefined {
  if (!family) return undefined;
  return {
    carrier: canonicalMathValue(family.carrierLatex),
    parameter: canonicalMathValue(family.parameterLatex),
    ...(family.parameterConstraintLatex?.length
      ? {
          parameterConstraints: family.parameterConstraintLatex.map((value) =>
            canonicalMathValue(value)),
        }
      : {}),
    branches: family.branchesLatex.map((value) => canonicalMathValue(value)),
    ...(family.discoveredFamilies?.length
      ? {
          discoveredFamilies: family.discoveredFamilies.map((value) =>
            canonicalMathValue(value)),
        }
      : {}),
    ...(family.representatives?.length
      ? {
          representatives: family.representatives.map((representative) => ({
            label: representative.label,
            ...(representative.exactLatex
              ? { exact: canonicalMathValue(representative.exactLatex) }
              : {}),
            ...(representative.approxText ? { approxText: representative.approxText } : {}),
          })),
        }
      : {}),
    ...(family.suggestedIntervals?.length
      ? {
          suggestedIntervals: family.suggestedIntervals.map((interval) => ({
            label: interval.label,
            start: canonicalMathValue(interval.start),
            end: canonicalMathValue(interval.end),
          })),
        }
      : {}),
    ...(family.piecewiseBranches?.length
      ? {
          piecewiseBranches: family.piecewiseBranches.map((branch) => ({
            condition: canonicalMathValue(branch.conditionLatex),
            result: canonicalMathValue(branch.resultLatex),
          })),
        }
      : {}),
    ...(family.principalRangeLatex
      ? { principalRange: canonicalMathValue(family.principalRangeLatex) }
      : {}),
    ...(family.reducedCarrierLatex
      ? { reducedCarrier: canonicalMathValue(family.reducedCarrierLatex) }
      : {}),
    ...(family.structuredStopReason
      ? { structuredStopReason: family.structuredStopReason }
      : {}),
  };
}

type CanonicalMathField = Exclude<
  keyof CanonicalResultProducerMathValuesV1,
  'metadata'
>;

const CANONICAL_MATH_FIELDS: readonly CanonicalMathField[] = [
  'primaryMath',
  'answerRows',
  'branchReadback',
  'systemReadback',
  'periodicFamily',
  'supplements',
  'details',
  'summaries',
  'table',
];

function withoutMathJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutMathJson);
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key !== 'mathJson') result[key] = withoutMathJson(child);
  }
  return result;
}

function structuredEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => structuredEqual(value, right[index]));
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) =>
      key === rightKeys[index] && structuredEqual(leftRecord[key], rightRecord[key]));
}

function assertMathValueParity(
  field: string,
  compatibilityValue: unknown,
  producerValue: unknown,
) {
  if (!structuredEqual(
    withoutMathJson(compatibilityValue),
    withoutMathJson(producerValue),
  )) {
    throw new Error(
      `Canonical producer math values changed compatibility field ${field}.`,
    );
  }
}

function applyProducerMathValues(
  candidate: CanonicalResultDocumentV1,
  mathValues: CanonicalResultProducerMathValuesV1 | undefined,
) {
  if (!mathValues) return;
  const candidateRecord = candidate as unknown as Record<string, unknown>;
  const valuesRecord = mathValues as unknown as Record<string, unknown>;
  for (const field of CANONICAL_MATH_FIELDS) {
    const producerValue = valuesRecord[field];
    if (producerValue === undefined) continue;
    assertMathValueParity(field, candidateRecord[field], producerValue);
    candidateRecord[field] = producerValue;
  }

  if (!mathValues.metadata) return;
  const metadata = candidate.metadata ?? {};
  for (const field of ['resolvedInput', 'variableSubstitutions'] as const) {
    const producerValue = mathValues.metadata[field];
    if (producerValue === undefined) continue;
    assertMathValueParity(`metadata.${field}`, metadata[field], producerValue);
    Object.assign(metadata, { [field]: producerValue });
  }
  candidate.metadata = metadata;
}

export function buildCanonicalResultDocumentFromProducer(
  input: CanonicalResultProducerInputV1,
  options: CanonicalResultProducerOptionsV1 = {},
): CanonicalResultDocumentV1 {
  const details = canonicalDetailSections(input.detailSections);
  const branchReadback = canonicalBranchReadback(input.branchReadback);
  const systemReadback = canonicalSystemReadback(input.systemReadback);
  const periodicFamily = canonicalPeriodicFamily(input.periodicFamily);
  const solveSummary = input.solveSummaryParts?.length
    ? input.solveSummaryParts.map((line) => line.map(canonicalDetailPart))
    : undefined;
  const candidate: CanonicalResultDocumentV1 = {
    version: 1,
    outcomeKind: input.outcomeKind,
    title: input.title,
    ...(input.outcomeKind === 'error' ? { error: input.error } : {}),
    ...(input.primaryMath ? { primaryMath: input.primaryMath } : {}),
    ...(input.outcomeKind === 'success' && input.answerRows
      ? {
          answerRows: {
            ...(input.answerRows.label ? { label: input.answerRows.label } : {}),
            rows: input.answerRows.rows.map((row) => ({
              math: canonicalMathValue(row.latex),
              ...(row.label ? { label: row.label } : {}),
            })),
          },
        }
      : {}),
    ...(branchReadback ? { branchReadback } : {}),
    ...(input.outcomeKind === 'success' && systemReadback ? { systemReadback } : {}),
    ...(periodicFamily ? { periodicFamily } : {}),
    ...(input.supplements?.length
      ? { supplements: input.supplements.map((value) => canonicalMathValue(value)) }
      : {}),
    ...(input.approxText ? { approximations: { primary: input.approxText } } : {}),
    ...(details ? { details } : {}),
    ...(solveSummary || input.transformSummaryText || input.transformSummaryLatex
      ? {
          summaries: {
            ...(solveSummary ? { solve: solveSummary } : {}),
            ...(input.transformSummaryText || input.transformSummaryLatex
              ? {
                  transform: {
                    ...(input.transformSummaryText
                      ? { text: input.transformSummaryText }
                      : {}),
                    ...(input.transformSummaryLatex
                      ? { math: canonicalMathValue(input.transformSummaryLatex) }
                      : {}),
                  },
                }
              : {}),
          },
        }
      : {}),
    warnings: [...input.warnings],
    ...(input.metadata && Object.keys(input.metadata).length > 0
      ? { metadata: input.metadata }
      : {}),
    ...(input.table ? { table: input.table } : {}),
  };

  applyProducerMathValues(candidate, options.mathValues);

  const validation = validateCanonicalResultDocument(candidate);
  if (!validation.ok) {
    throw new Error(
      `Invalid producer canonical result: ${validation.failure.reason}: ${validation.failure.message}`,
    );
  }
  return validation.validated.value;
}

export function updateCanonicalResultMetadata(
  document: CanonicalResultDocumentV1,
  patch: Partial<CanonicalResultSemanticMetadataV1>,
): CanonicalResultDocumentV1 {
  const metadata: CanonicalResultSemanticMetadataV1 = { ...(document.metadata ?? {}) };
  for (const key of Object.keys(patch) as Array<keyof CanonicalResultSemanticMetadataV1>) {
    const value = patch[key];
    if (value === undefined) {
      delete metadata[key];
    } else {
      Object.assign(metadata, { [key]: value });
    }
  }
  const candidate: CanonicalResultDocumentV1 = {
    ...document,
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
  if (Object.keys(metadata).length === 0) {
    delete candidate.metadata;
  }
  const validation = validateCanonicalResultDocument(candidate);
  if (!validation.ok) {
    throw new Error(
      `Invalid canonical result metadata update: ${validation.failure.reason}: ${validation.failure.message}`,
    );
  }
  return validation.validated.value;
}
