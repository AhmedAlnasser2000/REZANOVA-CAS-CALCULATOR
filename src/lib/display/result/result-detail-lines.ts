import type {
  DisplayDetailLineKind,
  DisplayDetailLinePart,
  DisplayDetailSection,
  DisplaySolveSummary,
} from '../../../types/calculator';

export function detailLineKindAt(
  section: Pick<DisplayDetailSection, 'lineKind' | 'lineKinds'>,
  index: number,
): DisplayDetailLineKind {
  return section.lineKinds?.[index] ?? section.lineKind ?? 'text';
}

export type DisplayDetailLineIntent =
  | 'typed-parts'
  | 'explicit-math'
  | 'explicit-text'
  | 'undeclared';

export function detailLineIntentAt(
  section: Pick<DisplayDetailSection, 'lineKind' | 'lineKinds' | 'lineParts'>,
  index: number,
): DisplayDetailLineIntent {
  if (section.lineParts?.[index]?.length) return 'typed-parts';
  const lineKind = section.lineKinds?.[index] ?? section.lineKind;
  if (lineKind === 'math') return 'explicit-math';
  if (lineKind === 'text') return 'explicit-text';
  return 'undeclared';
}

export function cloneDisplayDetailSection(section: DisplayDetailSection): DisplayDetailSection {
  return {
    ...section,
    lines: [...section.lines],
    lineKinds: section.lineKinds ? [...section.lineKinds] : undefined,
    lineParts: section.lineParts
      ? section.lineParts.map((parts) => parts.map((part) => ({ ...part })))
      : undefined,
  };
}

export function mathDetailSection(title: string, lines: readonly string[]): DisplayDetailSection {
  return {
    title,
    lines: [...lines],
    lineKind: 'math',
  };
}

export function textDetailSection(title: string, lines: readonly string[]): DisplayDetailSection {
  return {
    title,
    lines: [...lines],
    lineKind: 'text',
  };
}

export function textPart(text: string): DisplayDetailLinePart {
  return { kind: 'text', text };
}

export function mathPart(latex: string): DisplayDetailLinePart {
  return { kind: 'math', latex };
}

export function detailLineFromParts(parts: readonly DisplayDetailLinePart[]) {
  const line = parts
    .map((part) => part.kind === 'math' ? part.latex : part.text)
    .join('');

  return {
    line,
    parts: parts.map((part) => ({ ...part })),
  };
}

export function solveSummaryFromParts(
  rows: readonly (readonly DisplayDetailLinePart[])[],
): DisplaySolveSummary {
  const built = rows.map((parts) => detailLineFromParts(parts));
  return {
    solveSummaryParts: built.map((entry) => entry.parts),
  };
}

export function solveSummaryPlainText(
  summary: { solveSummaryParts?: readonly (readonly DisplayDetailLinePart[])[] },
): string {
  return (summary.solveSummaryParts ?? [])
    .map((parts) => detailLineFromParts(parts).line)
    .join('; ');
}

export function proseSolveSummary(text: string): DisplaySolveSummary {
  return solveSummaryFromParts([[textPart(text)]]);
}

export function mergeSolveSummaries(
  ...summaries: readonly (DisplaySolveSummary | undefined)[]
): DisplaySolveSummary | undefined {
  const parts = summaries.flatMap((summary) => summary?.solveSummaryParts ?? []);
  return parts.length > 0 ? solveSummaryFromParts(parts) : undefined;
}

export function dedupeSolveSummaries(
  ...summaries: readonly (DisplaySolveSummary | undefined)[]
): DisplaySolveSummary | undefined {
  const seen = new Set<string>();
  return mergeSolveSummaries(...summaries.filter((summary) => {
    if (!summary) return false;
    const text = solveSummaryPlainText(summary);
    if (seen.has(text)) return false;
    seen.add(text);
    return true;
  }));
}

export function solveSummaryFromDisplayFields({
  solveSummaryParts,
}: Partial<DisplaySolveSummary>): DisplaySolveSummary | undefined {
  return solveSummaryParts?.length
    ? { solveSummaryParts }
    : undefined;
}

export function mixedDetailSection(
  title: string,
  rows: readonly (readonly DisplayDetailLinePart[])[],
): DisplayDetailSection {
  const built = rows.map((parts) => detailLineFromParts(parts));
  return {
    title,
    lines: built.map((entry) => entry.line),
    lineParts: built.map((entry) => entry.parts),
  };
}

export function detailLinePartsAt(
  section: Pick<DisplayDetailSection, 'lineParts'>,
  index: number,
) {
  return section.lineParts?.[index];
}

export function equationLabelLineParts(label: string, latex: string): DisplayDetailLinePart[] {
  return [
    textPart(`${label}: `),
    mathPart(latex),
  ];
}

export function solveSummaryDetailLines(
  summaryParts: readonly (readonly DisplayDetailLinePart[])[],
) {
  return summaryParts.map((parts) => detailLineFromParts(parts));
}

export type ResolvedDetailLinePresentation =
  | { source: 'typed-parts'; kind: 'parts'; parts: DisplayDetailLinePart[] }
  | { source: 'explicit-kind'; kind: DisplayDetailLineKind }
  | { source: 'undeclared'; kind: 'text' };

export function resolveDetailLinePresentation({
  lineKind,
  parts,
}: {
  line: string;
  lineKind?: DisplayDetailLineKind;
  parts?: readonly DisplayDetailLinePart[];
}): ResolvedDetailLinePresentation {
  if (parts?.length) {
    return {
      source: 'typed-parts',
      kind: 'parts',
      parts: parts.map((part) => ({ ...part })),
    };
  }
  if (lineKind) return { source: 'explicit-kind', kind: lineKind };
  return { source: 'undeclared', kind: 'text' };
}
