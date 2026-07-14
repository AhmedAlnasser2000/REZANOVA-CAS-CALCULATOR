import type {
  CanonicalMathValueV1,
  CanonicalMathValueV2,
  CanonicalResultDetailPartV1,
  CanonicalResultDetailPartV2,
  CanonicalResultDocument,
  CanonicalResultDocumentV1,
  CanonicalResultDocumentV2,
  CanonicalResultDocumentV3,
  CanonicalResultPeriodicFamilyV1,
  CanonicalResultPrimaryV3,
  CanonicalResultRequestV2,
  CanonicalResultRowOperationV2,
  CanonicalResultSemanticMetadataV1,
} from '../../types/calculator';

type RelaxV2Math<Value> =
  Value extends CanonicalMathValueV2
    ? CanonicalMathValueV1
    : Value extends readonly (infer Entry)[]
      ? RelaxV2Math<Entry>[]
      : Value extends object
        ? { [Key in keyof Value]: RelaxV2Math<Value[Key]> }
        : Value;

export type CanonicalResultPrimarySemantics = RelaxV2Math<CanonicalResultPrimaryV3>;
export type CanonicalResultRequestSemantics = RelaxV2Math<CanonicalResultRequestV2>;
export type CanonicalResultRowOperationSemantics = RelaxV2Math<CanonicalResultRowOperationV2>;

export type CanonicalResultPresentationDetailPart =
  | { kind: 'text'; text: string }
  | { kind: 'math'; latex: string };

export type CanonicalResultPresentation = {
  outcomeKind: 'success' | 'error';
  title: string;
  error?: string;
  primaryLatex?: string;
  requestLatex?: string;
  answerRows?: {
    label?: string;
    rows: Array<{ latex: string; label?: string }>;
  };
  branchReadback?: {
    targetLatex: string;
    relationLatex: '=' | '\\in' | '\\approx';
    branchesLatex: string[];
    countLabel?: 'roots' | 'candidateRoots';
    label?: string;
    source?: string;
  };
  systemReadback?: {
    variablesLatex: string[];
    rows: Array<{ valuesLatex: string[]; approxText?: string }>;
    label?: string;
    source?: string;
  };
  periodicFamily?: {
    carrierLatex: string;
    parameterLatex: string;
    parameterConstraintLatex?: string[];
    branchesLatex: string[];
    discoveredFamilies?: string[];
    representatives?: Array<{ label: string; exactLatex?: string; approxText?: string }>;
    suggestedIntervals?: Array<{ label: string; start: string; end: string }>;
    piecewiseBranches?: Array<{ conditionLatex: string; resultLatex: string }>;
    principalRangeLatex?: string;
    reducedCarrierLatex?: string;
    structuredStopReason?:
      | 'second-periodic-parameter'
      | 'outside-principal-range'
      | 'unsupported-sawtooth-closure'
      | 'multi-parameter-periodic-family'
      | 'periodic-depth-cap'
      | 'unmerged-periodic-branches';
  };
  supplements?: string[];
  approximations?: { primary?: string };
  details?: Array<{
    title: string;
    lines: CanonicalResultPresentationDetailPart[][];
  }>;
  summaries?: {
    solve?: CanonicalResultPresentationDetailPart[][];
    transform?: { text?: string; mathLatex?: string };
  };
  warnings: string[];
  table?: {
    headers: string[];
    rows: Array<{ x: string; primary: string; secondary?: string }>;
  };
};

export type CanonicalResultSemantics = {
  primary?: CanonicalResultPrimarySemantics;
  request?: CanonicalResultRequestSemantics;
  answerRows?: {
    label?: string;
    rows: Array<{ math: CanonicalMathValueV1; label?: string }>;
  };
  branchReadback?: {
    target: CanonicalMathValueV1;
    relation: '=' | '\\in' | '\\approx';
    branches: CanonicalMathValueV1[];
    countLabel?: 'roots' | 'candidateRoots';
    label?: string;
    source?: string;
  };
  systemReadback?: {
    variables: CanonicalMathValueV1[];
    rows: Array<{ values: CanonicalMathValueV1[]; approxText?: string }>;
    label?: string;
    source?: string;
  };
  periodicFamily?: RelaxV2Math<CanonicalResultPeriodicFamilyV1>;
  supplements?: Array<{
    role?: 'general' | 'exclusion' | 'condition' | 'parameter-constraint';
    math: CanonicalMathValueV1;
  }>;
  details?: Array<{
    title: string;
    lines: Array<Array<
      | { kind: 'text'; text: string }
      | { kind: 'math'; math: CanonicalMathValueV1 }
      | {
          kind: 'row-operation';
          operation: CanonicalResultRowOperationSemantics;
        }
    >>;
  }>;
  summaries?: {
    solve?: Array<Array<
      | { kind: 'text'; text: string }
      | { kind: 'math'; math: CanonicalMathValueV1 }
      | {
          kind: 'row-operation';
          operation: CanonicalResultRowOperationSemantics;
        }
    >>;
    transform?: { text?: string; math?: CanonicalMathValueV1 };
  };
  metadata?: CanonicalResultSemanticMetadataV1;
  table?: {
    headers: string[];
    rows: Array<{
      x: CanonicalMathValueV1;
      primary:
        | { kind: 'legacy'; value: CanonicalMathValueV1 }
        | { kind: 'value'; value: CanonicalMathValueV1 }
        | { kind: 'undefined'; reason: 'outside-real-domain' | 'pole' };
      secondary?:
        | { kind: 'legacy'; value: CanonicalMathValueV1 }
        | { kind: 'value'; value: CanonicalMathValueV1 }
        | { kind: 'undefined'; reason: 'outside-real-domain' | 'pole' };
    }>;
  };
};

export type NormalizedCanonicalResult = {
  sourceVersion: 1 | 2 | 3;
  rawDocument: CanonicalResultDocument;
  presentation: CanonicalResultPresentation;
  semantics: CanonicalResultSemantics;
};

function presentationPart(
  part: CanonicalResultDetailPartV1 | CanonicalResultDetailPartV2,
): CanonicalResultPresentationDetailPart {
  if (part.kind === 'text') return { kind: 'text', text: part.text };
  if (part.kind === 'math') return { kind: 'math', latex: part.math.canonicalLatex };
  return { kind: 'math', latex: part.presentationLatex };
}

function semanticPart(part: CanonicalResultDetailPartV1 | CanonicalResultDetailPartV2) {
  if (part.kind === 'text') return { kind: 'text' as const, text: part.text };
  if (part.kind === 'math') return { kind: 'math' as const, math: part.math };
  return {
    kind: 'row-operation' as const,
    operation: part.operation as CanonicalResultRowOperationSemantics,
  };
}

function presentationPeriodicFamily(
  family: CanonicalResultPeriodicFamilyV1 | undefined,
): CanonicalResultPresentation['periodicFamily'] {
  if (!family) return undefined;
  return {
    carrierLatex: family.carrier.canonicalLatex,
    parameterLatex: family.parameter.canonicalLatex,
    ...(family.parameterConstraints
      ? { parameterConstraintLatex: family.parameterConstraints.map((value) => value.canonicalLatex) }
      : {}),
    branchesLatex: family.branches.map((value) => value.canonicalLatex),
    ...(family.discoveredFamilies
      ? { discoveredFamilies: family.discoveredFamilies.map((value) => value.canonicalLatex) }
      : {}),
    ...(family.representatives
      ? {
          representatives: family.representatives.map((representative) => ({
            label: representative.label,
            ...(representative.exact
              ? { exactLatex: representative.exact.canonicalLatex }
              : {}),
            ...(representative.approxText ? { approxText: representative.approxText } : {}),
          })),
        }
      : {}),
    ...(family.suggestedIntervals
      ? {
          suggestedIntervals: family.suggestedIntervals.map((interval) => ({
            label: interval.label,
            start: interval.start.canonicalLatex,
            end: interval.end.canonicalLatex,
          })),
        }
      : {}),
    ...(family.piecewiseBranches
      ? {
          piecewiseBranches: family.piecewiseBranches.map((branch) => ({
            conditionLatex: branch.condition.canonicalLatex,
            resultLatex: branch.result.canonicalLatex,
          })),
        }
      : {}),
    ...(family.principalRange
      ? { principalRangeLatex: family.principalRange.canonicalLatex }
      : {}),
    ...(family.reducedCarrier
      ? { reducedCarrierLatex: family.reducedCarrier.canonicalLatex }
      : {}),
    ...(family.structuredStopReason
      ? { structuredStopReason: family.structuredStopReason }
      : {}),
  };
}

function commonPresentation(
  document: CanonicalResultDocument,
): Omit<CanonicalResultPresentation, 'primaryLatex' | 'requestLatex' | 'answerRows' | 'supplements' | 'table'> {
  return {
    outcomeKind: document.outcomeKind,
    title: document.title,
    ...(document.error ? { error: document.error } : {}),
    ...(document.branchReadback
      ? {
          branchReadback: {
            targetLatex: document.branchReadback.target.canonicalLatex,
            relationLatex: document.branchReadback.relation,
            branchesLatex: document.branchReadback.branches.map((value) => value.canonicalLatex),
            ...(document.branchReadback.countLabel
              ? { countLabel: document.branchReadback.countLabel }
              : {}),
            ...(document.branchReadback.label ? { label: document.branchReadback.label } : {}),
            ...(document.branchReadback.source ? { source: document.branchReadback.source } : {}),
          },
        }
      : {}),
    ...(document.systemReadback
      ? {
          systemReadback: {
            variablesLatex: document.systemReadback.variables.map((value) => value.canonicalLatex),
            rows: document.systemReadback.rows.map((row) => ({
              valuesLatex: row.values.map((value) => value.canonicalLatex),
              ...(row.approxText ? { approxText: row.approxText } : {}),
            })),
            ...(document.systemReadback.label ? { label: document.systemReadback.label } : {}),
            ...(document.systemReadback.source ? { source: document.systemReadback.source } : {}),
          },
        }
      : {}),
    ...(document.periodicFamily
      ? {
          periodicFamily: presentationPeriodicFamily(
            document.periodicFamily as CanonicalResultPeriodicFamilyV1,
          ),
        }
      : {}),
    ...(document.approximations ? { approximations: { ...document.approximations } } : {}),
    ...(document.details
      ? {
          details: document.details.map((section) => ({
            title: section.title,
            lines: section.lines.map((line) => line.map(presentationPart)),
          })),
        }
      : {}),
    ...(document.summaries
      ? {
          summaries: {
            ...(document.summaries.solve
              ? {
                  solve: document.summaries.solve.map((line) =>
                    line.map(presentationPart)),
                }
              : {}),
            ...(document.summaries.transform
              ? {
                  transform: {
                    ...(document.summaries.transform.text
                      ? { text: document.summaries.transform.text }
                      : {}),
                    ...(document.summaries.transform.math
                      ? { mathLatex: document.summaries.transform.math.canonicalLatex }
                      : {}),
                  },
                }
              : {}),
          },
        }
      : {}),
    warnings: [...document.warnings],
  };
}

function commonSemantics(document: CanonicalResultDocument): Omit<
  CanonicalResultSemantics,
  'primary' | 'request' | 'supplements' | 'table'
> {
  return {
    ...(document.answerRows ? { answerRows: document.answerRows } : {}),
    ...(document.branchReadback ? { branchReadback: document.branchReadback } : {}),
    ...(document.systemReadback ? { systemReadback: document.systemReadback } : {}),
    ...(document.periodicFamily
      ? {
          periodicFamily: document.periodicFamily as CanonicalResultSemantics['periodicFamily'],
        }
      : {}),
    ...(document.details
      ? {
          details: document.details.map((section) => ({
            title: section.title,
            lines: section.lines.map((line) => line.map(semanticPart)),
          })),
        }
      : {}),
    ...(document.summaries
      ? {
          summaries: {
            ...(document.summaries.solve
              ? { solve: document.summaries.solve.map((line) => line.map(semanticPart)) }
              : {}),
            ...(document.summaries.transform
              ? { transform: document.summaries.transform }
              : {}),
          },
        }
      : {}),
    ...(document.metadata
      ? { metadata: document.metadata as CanonicalResultSemanticMetadataV1 }
      : {}),
  };
}

function normalizeV1(document: CanonicalResultDocumentV1): NormalizedCanonicalResult {
  return {
    sourceVersion: 1,
    rawDocument: document,
    presentation: {
      ...commonPresentation(document),
      ...(document.primaryMath
        ? { primaryLatex: document.primaryMath.canonicalLatex }
        : {}),
      ...(document.metadata?.resolvedInput
        ? { requestLatex: document.metadata.resolvedInput.canonicalLatex }
        : {}),
      ...(document.answerRows
        ? {
            answerRows: {
              ...(document.answerRows.label ? { label: document.answerRows.label } : {}),
              rows: document.answerRows.rows.map((row) => ({
                latex: row.math.canonicalLatex,
                ...(row.label ? { label: row.label } : {}),
              })),
            },
          }
        : {}),
      ...(document.supplements
        ? { supplements: document.supplements.map((value) => value.canonicalLatex) }
        : {}),
      ...(document.table
        ? {
            table: {
              headers: [...document.table.headers],
              rows: document.table.rows.map((row) => ({
                x: row.x.canonicalLatex,
                primary: row.primary.canonicalLatex,
                ...(row.secondary ? { secondary: row.secondary.canonicalLatex } : {}),
              })),
            },
          }
        : {}),
    },
    semantics: {
      ...commonSemantics(document),
      ...(document.primaryMath
        ? { primary: { kind: 'math', value: document.primaryMath } }
        : {}),
      ...(document.supplements
        ? { supplements: document.supplements.map((math) => ({ math })) }
        : {}),
      ...(document.table
        ? {
            table: {
              headers: [...document.table.headers],
              rows: document.table.rows.map((row) => ({
                x: row.x,
                primary: { kind: 'legacy' as const, value: row.primary },
                ...(row.secondary
                  ? { secondary: { kind: 'legacy' as const, value: row.secondary } }
                  : {}),
              })),
            },
          }
        : {}),
    },
  };
}

function modernRequestLatex(request: CanonicalResultDocumentV2['request']) {
  if (!request) return undefined;
  return request.kind === 'math' ? request.value.canonicalLatex : request.presentationLatex;
}

function normalizeModern(
  document: CanonicalResultDocumentV2 | CanonicalResultDocumentV3,
): NormalizedCanonicalResult {
  const compoundPresentation = document.primary?.kind !== 'math'
    ? document.primary?.presentation
    : undefined;
  const answerRows = compoundPresentation?.answerRows ?? (
    document.answerRows
      ? {
          ...(document.answerRows.label ? { label: document.answerRows.label } : {}),
          rows: document.answerRows.rows.map((row) => ({
            latex: row.math.canonicalLatex,
            ...(row.label ? { label: row.label } : {}),
          })),
        }
      : undefined
  );
  return {
    sourceVersion: document.version,
    rawDocument: document,
    presentation: {
      ...commonPresentation(document),
      ...(document.primary
        ? {
            primaryLatex: document.primary.kind === 'math'
              ? document.primary.value.canonicalLatex
              : document.primary.presentation.primaryLatex,
          }
        : {}),
      ...(document.request
        ? { requestLatex: modernRequestLatex(document.request) }
        : document.metadata?.resolvedInput
          ? { requestLatex: document.metadata.resolvedInput.canonicalLatex }
          : {}),
      ...(answerRows ? { answerRows } : {}),
      ...(document.supplements
        ? { supplements: document.supplements.map((value) => value.presentationLatex) }
        : {}),
      ...(document.table
        ? {
            table: {
              headers: [...document.table.headers],
              rows: document.table.rows.map((row) => ({
                x: row.x.canonicalLatex,
                primary: row.primary.kind === 'value'
                  ? row.primary.value.canonicalLatex
                  : row.primary.presentationLatex,
                ...(row.secondary
                  ? {
                      secondary: row.secondary.kind === 'value'
                        ? row.secondary.value.canonicalLatex
                        : row.secondary.presentationLatex,
                    }
                  : {}),
              })),
            },
          }
        : {}),
    },
    semantics: {
      ...commonSemantics(document),
      ...(document.primary
        ? { primary: document.primary as CanonicalResultPrimarySemantics }
        : {}),
      ...(document.request
        ? { request: document.request as CanonicalResultRequestSemantics }
        : {}),
      ...(document.supplements
        ? {
            supplements: document.supplements.map((supplement) => ({
              role: supplement.role,
              math: supplement.math,
            })),
          }
        : {}),
      ...(document.table
        ? {
            table: {
              headers: [...document.table.headers],
              rows: document.table.rows.map((row) => ({
                x: row.x,
                primary: row.primary.kind === 'value'
                  ? { kind: 'value' as const, value: row.primary.value }
                  : { kind: 'undefined' as const, reason: row.primary.reason },
                ...(row.secondary
                  ? {
                      secondary: row.secondary.kind === 'value'
                        ? { kind: 'value' as const, value: row.secondary.value }
                        : { kind: 'undefined' as const, reason: row.secondary.reason },
                    }
                  : {}),
              })),
            },
          }
        : {}),
    },
  };
}

export function normalizeCanonicalResultDocument(
  document: CanonicalResultDocument,
): NormalizedCanonicalResult {
  return document.version === 1 ? normalizeV1(document) : normalizeModern(document);
}
