import type {
  CanonicalResultDocumentV1,
  CanonicalResultSemanticMetadataV1,
  DisplayDetailSection,
  DisplaySystemSolutionReadback,
  HistoryEntry,
  VariableSubstitutionSnapshot,
} from '../types/calculator';

export type HistoryResultDocumentOptions = {
  title?: string;
  primaryLatex?: string;
  metadata?: CanonicalResultSemanticMetadataV1;
  overrides?: Partial<CanonicalResultDocumentV1>;
};

export function historyResultDocument(
  primaryLatex = '1',
  options: HistoryResultDocumentOptions = {},
): CanonicalResultDocumentV1 {
  return {
    version: 1,
    outcomeKind: 'success',
    title: options.title ?? 'Result',
    primaryMath: { canonicalLatex: options.primaryLatex ?? primaryLatex },
    warnings: [],
    ...(options.metadata ? { metadata: options.metadata } : {}),
    ...options.overrides,
  };
}

export type HistoryEntryFixtureInput = Partial<Omit<HistoryEntry, 'resultDocument'>> & {
  resultDocument?: CanonicalResultDocumentV1;
  resolvedInputLatex?: string;
  resultLatex?: string;
  exactSupplementLatex?: string[];
  approxText?: string;
  detailSections?: DisplayDetailSection[];
  systemReadback?: DisplaySystemSolutionReadback;
  answerDomain?: CanonicalResultSemanticMetadataV1['answerDomain'];
  solutionKind?: CanonicalResultSemanticMetadataV1['solutionKind'];
  variableSubstitutions?: VariableSubstitutionSnapshot[];
};

export function historyEntryFixture(input: HistoryEntryFixtureInput = {}): HistoryEntry {
  const {
    resolvedInputLatex,
    resultLatex = '1',
    exactSupplementLatex,
    approxText,
    detailSections,
    systemReadback,
    answerDomain,
    solutionKind,
    variableSubstitutions,
    resultDocument,
    ...current
  } = input;
  const metadata: CanonicalResultSemanticMetadataV1 = {
    ...(resolvedInputLatex ? { resolvedInput: { canonicalLatex: resolvedInputLatex } } : {}),
    ...(answerDomain ? { answerDomain } : {}),
    ...(solutionKind ? { solutionKind } : {}),
    ...(variableSubstitutions?.length
      ? {
          variableSubstitutions: variableSubstitutions.map((substitution) => ({
            name: substitution.name,
            value: { canonicalLatex: substitution.valueLatex },
            numericValue: substitution.numericValue,
          })),
        }
      : {}),
  };

  return {
    id: 'history.fixture',
    mode: 'calculate',
    inputLatex: '1',
    timestamp: '2026-07-13T00:00:00.000Z',
    ...current,
    resultDocument: resultDocument ?? historyResultDocument(resultLatex, {
      title: 'History',
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      overrides: {
        ...(exactSupplementLatex?.length
          ? { supplements: exactSupplementLatex.map((canonicalLatex) => ({ canonicalLatex })) }
          : {}),
        ...(approxText ? { approximations: { primary: approxText } } : {}),
        ...(detailSections?.length
          ? {
              details: detailSections.map((section) => ({
                title: section.title,
                lines: section.lines.map((line, index) => {
                  const parts = section.lineParts?.[index];
                  if (parts) {
                    return parts.map((part) => part.kind === 'math'
                      ? { kind: 'math' as const, math: { canonicalLatex: part.latex } }
                      : { kind: 'text' as const, text: part.text });
                  }
                  return section.lineKinds?.[index] === 'text' || section.lineKind === 'text'
                    ? [{ kind: 'text' as const, text: line }]
                    : [{ kind: 'math' as const, math: { canonicalLatex: line } }];
                }),
              })),
            }
          : {}),
        ...(systemReadback
          ? {
              systemReadback: {
                variables: systemReadback.variablesLatex.map((canonicalLatex) => ({ canonicalLatex })),
                rows: systemReadback.rows.map((row) => ({
                  values: row.valuesLatex.map((canonicalLatex) => ({ canonicalLatex })),
                  ...(row.approxText ? { approxText: row.approxText } : {}),
                })),
                ...(systemReadback.label ? { label: systemReadback.label } : {}),
                ...(systemReadback.source ? { source: systemReadback.source } : {}),
              },
            }
          : {}),
      },
    }),
  };
}
