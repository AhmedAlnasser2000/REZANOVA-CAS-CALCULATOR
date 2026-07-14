import type {
  DisplayDetailLinePart,
  DisplayDetailSection,
  ResultProducerDraft,
  TrigRequest,
} from '../../types/calculator';
import {
  tryProvenCanonicalMathValue,
  type CanonicalResultProducerMathValuesV1,
  type ProvenCanonicalMathValue,
} from '../result-contract';
import type { MathJsonRouteId } from '../result-contract/mathjson-route-registry';

export type TrigonometryMathJsonRouteId = Extract<MathJsonRouteId, `trigonometry.${string}`>;

export type TrigonometryOwnedMathJsonLeaf = {
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
      throw new Error(`Trigonometry producer detail ${sectionIndex}:${lineIndex} has no typed intent.`);
    }),
  }));
}

export function trigonometryMathValuesFromOwnedLeaves(input: {
  outcome: Exclude<ResultProducerDraft, { kind: 'prompt' }>;
  routeId: TrigonometryMathJsonRouteId;
  leaves: readonly TrigonometryOwnedMathJsonLeaf[];
}): CanonicalResultProducerMathValuesV1 {
  const proven = new Map<string, ProvenCanonicalMathValue>();
  for (const leaf of input.leaves) {
    const value = tryProvenCanonicalMathValue({
      canonicalLatex: leaf.canonicalLatex,
      mathJson: leaf.mathJson,
      owner: 'trigonometry',
      routeId: input.routeId,
      source: leaf.source,
    });
    if (!value) continue;
    const existing = proven.get(leaf.canonicalLatex);
    if (existing && JSON.stringify(existing.mathJson) !== JSON.stringify(value.mathJson)) {
      throw new Error(`Trigonometry producer supplied conflicting trees for ${leaf.canonicalLatex}.`);
    }
    proven.set(leaf.canonicalLatex, value);
  }

  const values: CanonicalResultProducerMathValuesV1 = {};
  if (input.outcome.exactLatex) {
    values.primaryMath = proven.get(input.outcome.exactLatex) ?? unproven(input.outcome.exactLatex);
  }
  if (input.outcome.branchReadback) {
    values.branchReadback = {
      target: proven.get(input.outcome.branchReadback.targetLatex)
        ?? unproven(input.outcome.branchReadback.targetLatex),
      relation: input.outcome.branchReadback.relationLatex,
      branches: input.outcome.branchReadback.branchesLatex.map((latex) =>
        proven.get(latex) ?? unproven(latex)),
      ...(input.outcome.branchReadback.countLabel
        ? { countLabel: input.outcome.branchReadback.countLabel }
        : {}),
      ...(input.outcome.branchReadback.label ? { label: input.outcome.branchReadback.label } : {}),
      ...(input.outcome.branchReadback.source ? { source: input.outcome.branchReadback.source } : {}),
    };
  }
  if (input.outcome.exactSupplementLatex?.length) {
    values.supplements = input.outcome.exactSupplementLatex.map((latex) =>
      proven.get(latex) ?? unproven(latex));
  }
  const detailValues = details(input.outcome.detailSections, proven);
  if (detailValues?.length) values.details = detailValues;
  if (input.outcome.resolvedInputLatex) {
    values.metadata = {
      resolvedInput: proven.get(input.outcome.resolvedInputLatex)
        ?? unproven(input.outcome.resolvedInputLatex),
    };
  }
  return values;
}

export function trigonometryMathJsonRouteForRequest(
  request: TrigRequest,
): TrigonometryMathJsonRouteId {
  if (request.kind === 'function') return 'trigonometry.function';
  if (request.kind === 'identitySimplify' || request.kind === 'identityConvert') {
    return 'trigonometry.identity';
  }
  if (request.kind === 'equationSolve') return 'trigonometry.equation';
  if (request.kind === 'angleConvert') return 'trigonometry.angle-conversion';
  if (request.kind === 'periodPhase') return 'trigonometry.period-phase';
  return 'trigonometry.right-triangle';
}
