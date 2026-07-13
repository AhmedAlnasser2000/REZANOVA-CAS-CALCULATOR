import type {
  DisplayAnswerRowsReadback,
  DisplayDetailLinePart,
  DisplayDetailSection,
} from '../../../types/calculator';
import {
  tryProvenCanonicalMathValue,
  type CanonicalResultProducerMathValuesV1,
  type ProvenCanonicalMathValue,
} from '../../result-contract';
import type { MathJsonRouteId } from '../../result-contract/mathjson-route-registry';

export type CalculateOwnedMathJsonLeaf = {
  canonicalLatex: string;
  mathJson: unknown;
  source: string;
};

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
      throw new Error(`Calculate producer detail ${sectionIndex}:${lineIndex} has no typed intent.`);
    }),
  }));
}

export function calculateMathValuesFromOwnedLeaves(input: {
  routeId: Extract<MathJsonRouteId, `calculate.${string}`>;
  exactLatex?: string;
  answerRows?: DisplayAnswerRowsReadback;
  supplements?: readonly string[];
  detailSections?: readonly DisplayDetailSection[];
  leaves: readonly CalculateOwnedMathJsonLeaf[];
}): CanonicalResultProducerMathValuesV1 {
  const proven = new Map<string, ProvenCanonicalMathValue>();
  for (const leaf of input.leaves) {
    const value = tryProvenCanonicalMathValue({
      canonicalLatex: leaf.canonicalLatex,
      mathJson: leaf.mathJson,
      owner: 'calculate',
      routeId: input.routeId,
      source: leaf.source,
    });
    if (!value) continue;
    const existing = proven.get(leaf.canonicalLatex);
    if (existing && JSON.stringify(existing.mathJson) !== JSON.stringify(value.mathJson)) {
      throw new Error(`Calculate producer supplied conflicting trees for ${leaf.canonicalLatex}.`);
    }
    proven.set(leaf.canonicalLatex, value);
  }

  const values: CanonicalResultProducerMathValuesV1 = {};
  if (input.exactLatex) {
    values.primaryMath = proven.get(input.exactLatex) ?? unproven(input.exactLatex);
  }
  if (input.answerRows) {
    values.answerRows = {
      ...(input.answerRows.label ? { label: input.answerRows.label } : {}),
      rows: input.answerRows.rows.map((row) => ({
        math: proven.get(row.latex) ?? unproven(row.latex),
        ...(row.label ? { label: row.label } : {}),
      })),
    };
  }
  if (input.supplements?.length) {
    values.supplements = input.supplements.map((latex) =>
      proven.get(latex) ?? unproven(latex));
  }
  const detailValues = details(input.detailSections, proven);
  if (detailValues?.length) values.details = detailValues;
  return values;
}
