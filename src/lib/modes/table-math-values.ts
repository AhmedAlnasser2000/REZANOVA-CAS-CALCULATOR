import type {
  DisplayDetailLinePart,
  DisplayDetailSection,
  DisplayOutcome,
  TableResponse,
} from '../../types/calculator';
import type { TableMathJsonEvidence } from '../engine/math-engine';
import {
  tryProvenCanonicalMathValue,
  type CanonicalResultProducerMathValuesV1,
  type ProvenCanonicalMathValue,
} from '../result-contract';
import type { MathJsonRouteId } from '../result-contract/mathjson-route-registry';

export type TableMathJsonRouteId = Extract<MathJsonRouteId, `table.${string}`>;

function unproven(canonicalLatex: string) {
  return { canonicalLatex };
}

function detailPart(
  part: DisplayDetailLinePart,
  proven: ReadonlyMap<string, ProvenCanonicalMathValue>,
) {
  return part.kind === 'math'
    ? { kind: 'math' as const, math: proven.get(part.latex) ?? unproven(part.latex) }
    : { kind: 'text' as const, text: part.text };
}

function details(
  sections: readonly DisplayDetailSection[] | undefined,
  proven: ReadonlyMap<string, ProvenCanonicalMathValue>,
) {
  return sections?.map((section, sectionIndex) => ({
    title: section.title,
    lines: section.lines.map((line, lineIndex) => {
      const parts = section.lineParts?.[lineIndex];
      if (parts?.length) return parts.map((part) => detailPart(part, proven));
      const kind = section.lineKinds?.[lineIndex] ?? section.lineKind;
      if (kind === 'math') {
        return [{ kind: 'math' as const, math: proven.get(line) ?? unproven(line) }];
      }
      if (kind === 'text') return [{ kind: 'text' as const, text: line }];
      throw new Error(`Table producer detail ${sectionIndex}:${lineIndex} has no typed intent.`);
    }),
  }));
}

export function tableMathValuesFromEvidence(input: {
  outcome: Exclude<DisplayOutcome, { kind: 'prompt' }>;
  response: TableResponse;
  routeId: TableMathJsonRouteId;
  evidence: TableMathJsonEvidence;
}): CanonicalResultProducerMathValuesV1 {
  const proven = new Map<string, ProvenCanonicalMathValue>();
  const cells = [
    input.evidence.functions,
    input.evidence.variable,
    ...input.evidence.rows.flatMap((row) => [row.x, row.primary, row.secondary]),
  ];
  for (const cell of cells) {
    if (cell?.mathJson === undefined) continue;
    const value = tryProvenCanonicalMathValue({
      canonicalLatex: cell.canonicalLatex,
      mathJson: cell.mathJson,
      owner: 'table',
      routeId: input.routeId,
      source: 'table.native-expression-and-row-evidence',
    });
    if (value) proven.set(cell.canonicalLatex, value);
  }

  const values: CanonicalResultProducerMathValuesV1 = {
    table: {
      headers: [...input.response.headers],
      rows: input.response.rows.map((row) => ({
        x: proven.get(row.x) ?? unproven(row.x),
        primary: proven.get(row.primary) ?? unproven(row.primary),
        ...(row.secondary !== undefined
          ? { secondary: proven.get(row.secondary) ?? unproven(row.secondary) }
          : {}),
      })),
    },
  };
  if (input.outcome.exactLatex) {
    values.primaryMath = proven.get(input.outcome.exactLatex) ?? unproven(input.outcome.exactLatex);
  }
  const detailValues = details(input.outcome.detailSections, proven);
  if (detailValues?.length) values.details = detailValues;
  return values;
}

export function tableMathJsonRoute(input: {
  primaryLatex: string;
  secondaryLatex: string;
  secondaryEnabled: boolean;
}): TableMathJsonRouteId {
  if (input.secondaryEnabled && input.secondaryLatex.trim()) return 'table.two-functions';
  const primary = input.primaryLatex.replaceAll(' ', '');
  if (primary.includes('\\sqrt')) return 'table.domain-boundary';
  if (primary.includes('\\frac{1}{x}') || primary === '1/x') return 'table.rational-function';
  if (/\\(sin|cos|tan)/.test(primary)) return 'table.trigonometric-function';
  return 'table.single-function';
}
