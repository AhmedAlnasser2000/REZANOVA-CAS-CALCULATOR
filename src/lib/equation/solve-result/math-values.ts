import type {
  CanonicalResultDocumentV1,
  DisplayBranchReadback,
  DisplayDetailLinePart,
  DisplayDetailSection,
  DisplayMathPayloadV1,
  SerializableMathJson,
  DisplayOutcome,
} from '../../../types/calculator';
import {
  tryProvenCanonicalMathValue,
  type CanonicalResultProducerMathValuesV1,
  type ProvenCanonicalMathValue,
} from '../../result-contract';
import type { MathJsonRouteId } from '../../result-contract/mathjson-route-registry';

type EquationMathJsonRouteId = Extract<MathJsonRouteId, `equation.${string}`>;

function unprovenMathValue(canonicalLatex: string) {
  return { canonicalLatex };
}

function arrayNode(value: SerializableMathJson): SerializableMathJson[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function branchNodes(
  mathJson: SerializableMathJson,
  relation: DisplayBranchReadback['relationLatex'],
) {
  const root = arrayNode(mathJson);
  if (!root) return undefined;
  if (relation === '=' && root[0] === 'Equal' && root.length === 3) {
    return { target: root[1], branches: [root[2]] };
  }
  const set = arrayNode(root[2]);
  if (relation === '\\in' && root[0] === 'Element' && set?.[0] === 'Set') {
    return { target: root[1], branches: set.slice(1) };
  }
  return undefined;
}

export function equationMathValuesFromOwnedPayload(input: {
  canonicalMath: DisplayMathPayloadV1;
  branchReadback?: DisplayBranchReadback;
  routeId: EquationMathJsonRouteId;
  source: string;
}): CanonicalResultProducerMathValuesV1 {
  const values = tryEquationMathValuesFromOwnedPayload(input);
  if (!values) {
    throw new Error(`Equation MathJSON source ${input.source} does not prove its displayed answer.`);
  }
  return values;
}

export function tryEquationMathValuesFromOwnedPayload(input: {
  canonicalMath: DisplayMathPayloadV1;
  branchReadback?: DisplayBranchReadback;
  routeId: EquationMathJsonRouteId;
  source: string;
}): CanonicalResultProducerMathValuesV1 | undefined {
  if (input.canonicalMath.mathJson === undefined) {
    return undefined;
  }
  const primaryMath = tryProvenCanonicalMathValue({
    canonicalLatex: input.canonicalMath.canonicalLatex,
    mathJson: input.canonicalMath.mathJson,
    owner: 'equation',
    routeId: input.routeId,
    source: input.source,
  });
  if (!primaryMath) return undefined;
  if (!input.branchReadback) return { primaryMath };

  const nodes = branchNodes(input.canonicalMath.mathJson, input.branchReadback.relationLatex);
  if (!nodes || nodes.branches.length !== input.branchReadback.branchesLatex.length) {
    return undefined;
  }
  const target = tryProvenCanonicalMathValue({
    canonicalLatex: input.branchReadback.targetLatex,
    mathJson: nodes.target,
    owner: 'equation',
    routeId: input.routeId,
    source: `${input.source}:target`,
  });
  const branches = nodes.branches.map((node, index) => tryProvenCanonicalMathValue({
    canonicalLatex: input.branchReadback!.branchesLatex[index],
    mathJson: node,
    owner: 'equation',
    routeId: input.routeId,
    source: `${input.source}:branch:${index}`,
  }));
  if (!target || branches.some((branch) => !branch)) return undefined;
  const branchReadback = {
    target,
    relation: input.branchReadback.relationLatex,
    branches: branches as ProvenCanonicalMathValue[],
    ...(input.branchReadback.countLabel
      ? { countLabel: input.branchReadback.countLabel }
      : {}),
    ...(input.branchReadback.label ? { label: input.branchReadback.label } : {}),
    ...(input.branchReadback.source ? { source: input.branchReadback.source } : {}),
  };
  return { primaryMath, branchReadback };
}

export type EquationOwnedMathJsonLeaf = {
  canonicalLatex: string;
  mathJson: unknown;
  source: string;
};

export function equationOwnedMathJsonLeavesFromDocument(
  document: CanonicalResultDocumentV1 | undefined,
  source: string,
): EquationOwnedMathJsonLeaf[] {
  if (!document) return [];
  const leaves: EquationOwnedMathJsonLeaf[] = [];
  const visit = (value: unknown, path: string) => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    if (typeof record.canonicalLatex === 'string' && record.mathJson !== undefined) {
      leaves.push({
        canonicalLatex: record.canonicalLatex,
        mathJson: record.mathJson,
        source: `${source}:${path}`,
      });
      return;
    }
    for (const [key, child] of Object.entries(record)) visit(child, `${path}.${key}`);
  };
  visit(document, 'canonicalResult');
  return leaves;
}

function detailParts(
  part: DisplayDetailLinePart,
  proven: ReadonlyMap<string, ProvenCanonicalMathValue>,
) {
  return part.kind === 'math'
    ? { kind: 'math' as const, math: proven.get(part.latex) ?? unprovenMathValue(part.latex) }
    : { kind: 'text' as const, text: part.text };
}

function detailValues(
  sections: readonly DisplayDetailSection[] | undefined,
  proven: ReadonlyMap<string, ProvenCanonicalMathValue>,
) {
  return sections?.map((section, sectionIndex) => ({
    title: section.title,
    lines: section.lines.map((line, lineIndex) => {
      const parts = section.lineParts?.[lineIndex];
      if (parts?.length) return parts.map((part) => detailParts(part, proven));
      const kind = section.lineKinds?.[lineIndex] ?? section.lineKind;
      if (kind === 'math') {
        return [{ kind: 'math' as const, math: proven.get(line) ?? unprovenMathValue(line) }];
      }
      if (kind === 'text') return [{ kind: 'text' as const, text: line }];
      throw new Error(`Equation producer detail ${sectionIndex}:${lineIndex} has no typed intent.`);
    }),
  }));
}

export function equationMathValuesFromOwnedLeaves(input: {
  outcome: Omit<Exclude<DisplayOutcome, { kind: 'prompt' }>, 'canonicalResult'>;
  routeId: EquationMathJsonRouteId;
  leaves: readonly EquationOwnedMathJsonLeaf[];
}): CanonicalResultProducerMathValuesV1 {
  const proven = new Map<string, ProvenCanonicalMathValue>();
  for (const leaf of input.leaves) {
    const value = tryProvenCanonicalMathValue({
      canonicalLatex: leaf.canonicalLatex,
      mathJson: leaf.mathJson,
      owner: 'equation',
      routeId: input.routeId,
      source: leaf.source,
    });
    if (!value) continue;
    const existing = proven.get(leaf.canonicalLatex);
    if (existing && JSON.stringify(existing.mathJson) !== JSON.stringify(value.mathJson)) {
      throw new Error(`Equation producer supplied conflicting trees for ${leaf.canonicalLatex}.`);
    }
    proven.set(leaf.canonicalLatex, value);
  }

  const values: CanonicalResultProducerMathValuesV1 = {};
  if (input.outcome.exactLatex) {
    values.primaryMath = proven.get(input.outcome.exactLatex)
      ?? unprovenMathValue(input.outcome.exactLatex);
  }
  if (input.outcome.branchReadback) {
    values.branchReadback = {
      target: proven.get(input.outcome.branchReadback.targetLatex)
        ?? unprovenMathValue(input.outcome.branchReadback.targetLatex),
      relation: input.outcome.branchReadback.relationLatex,
      branches: input.outcome.branchReadback.branchesLatex.map((latex) =>
        proven.get(latex) ?? unprovenMathValue(latex)),
      ...(input.outcome.branchReadback.countLabel
        ? { countLabel: input.outcome.branchReadback.countLabel }
        : {}),
      ...(input.outcome.branchReadback.label ? { label: input.outcome.branchReadback.label } : {}),
      ...(input.outcome.branchReadback.source ? { source: input.outcome.branchReadback.source } : {}),
    };
  }
  if (input.outcome.exactSupplementLatex?.length) {
    values.supplements = input.outcome.exactSupplementLatex.map((latex) =>
      proven.get(latex) ?? unprovenMathValue(latex));
  }
  const details = detailValues(input.outcome.detailSections, proven);
  if (details?.length) values.details = details;
  if (
    input.outcome.solveSummaryParts?.length
    || input.outcome.transformSummaryText
    || input.outcome.transformSummaryLatex
  ) {
    values.summaries = {
      ...(input.outcome.solveSummaryParts?.length
        ? {
            solve: input.outcome.solveSummaryParts.map((line) =>
              line.map((part) => detailParts(part, proven))),
          }
        : {}),
      ...(input.outcome.transformSummaryText || input.outcome.transformSummaryLatex
        ? {
            transform: {
              ...(input.outcome.transformSummaryText
                ? { text: input.outcome.transformSummaryText }
                : {}),
              ...(input.outcome.transformSummaryLatex
                ? {
                    math: proven.get(input.outcome.transformSummaryLatex)
                      ?? unprovenMathValue(input.outcome.transformSummaryLatex),
                  }
                : {}),
            },
          }
        : {}),
    };
  }
  if (input.outcome.resolvedInputLatex) {
    values.metadata = {
      resolvedInput: proven.get(input.outcome.resolvedInputLatex)
        ?? unprovenMathValue(input.outcome.resolvedInputLatex),
    };
  }
  return values;
}

export function inferEquationMathJsonRoute(
  input: Omit<Exclude<DisplayOutcome, { kind: 'prompt' }>, 'canonicalResult'>,
): EquationMathJsonRouteId {
  const detailTitles = input.detailSections?.map((section) => section.title) ?? [];
  const resolved = input.resolvedInputLatex ?? '';
  if (input.answerMode === 'isolate') return 'equation.answer-mode';
  if (input.solutionKind === 'approximate-numeric') return 'equation.numeric-boundary';
  if (
    input.answerDomain === 'complex'
    || detailTitles.some((title) => title === 'Complex Domain' || title === 'Real Domain')
  ) {
    return 'equation.domain-boundary';
  }
  if (/\\vert|\\left\|/u.test(resolved)) return 'equation.absolute-value';
  if (
    input.periodicFamily
    || input.exactSupplementLatex?.some((value) => value.includes('\\mathbb{Z}'))
    || detailTitles.some((title) => /Trig|Exp\/Log/u.test(title))
  ) {
    return 'equation.trig-exp-log';
  }
  if (
    input.exactSupplementLatex?.some((value) => /Exclusions|Conditions/u.test(value))
    || detailTitles.some((title) => /Domain Facts|Branch Guards/u.test(title))
  ) {
    return 'equation.rational-radical';
  }
  if (
    input.branchReadback
    || detailTitles.some((title) => /Quadratic|Polynomial/u.test(title))
  ) {
    return 'equation.polynomial';
  }
  return 'equation.linear';
}

export type { EquationMathJsonRouteId };
