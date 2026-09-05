import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  CanonicalMathValueV1,
  DisplayAnswerRowsReadback,
  DisplayBranchReadback,
  SerializableMathJson,
} from '../../../types/calculator';
import { tryProvenCanonicalMathValue } from '../../result-contract';
import { compareFormalMathJson } from '../../result-contract/formal-mathjson-comparison';
import type { MathJsonRouteId } from '../../result-contract/mathjson-route-registry';
import { printValidatedBoxedMathJson } from '../../display/printer/printer';
import {
  createFiniteRootSet,
  renderFiniteRootSet,
} from '../solution/finite-root-set';
import { normalizeFiniteBranchExpression } from '../presentation/finite-roots';
import type { EquationOwnedMathJsonLeaf } from './math-values';

type EquationMathJsonRouteId = Extract<MathJsonRouteId, `equation.${string}`>;

const ce = new ComputeEngine();

export type EquationFiniteBranchAuthority = {
  exactLatex: string;
  primaryMath: Required<CanonicalMathValueV1>;
  branchReadback?: DisplayBranchReadback;
  answerRows?: DisplayAnswerRowsReadback;
  proofLeaves: EquationOwnedMathJsonLeaf[];
};

function nodeArray(value: unknown): SerializableMathJson[] | undefined {
  return Array.isArray(value) ? value as SerializableMathJson[] : undefined;
}

function comparisonLatex(value: string) {
  return value
    .trim()
    .replace(/^(?:\\(?:[,;:!]| )\s*)+/u, '')
    .trim();
}

function exactFiniteNodes(
  primaryMath: CanonicalMathValueV1,
  relation: DisplayBranchReadback['relationLatex'],
) {
  const root = primaryMath.mathJson === undefined
    ? undefined
    : nodeArray(primaryMath.mathJson);
  if (!root) return undefined;
  if (relation === '=' && root[0] === 'Equal' && root.length === 3) {
    return { target: root[1], branches: [root[2]] };
  }
  const set = root[0] === 'Element' && root.length === 3
    ? nodeArray(root[2])
    : undefined;
  return relation === '\\in' && set?.[0] === 'Set' && set.length >= 3
    ? { target: root[1], branches: set.slice(1) }
    : undefined;
}

function containsImaginaryUnit(value: SerializableMathJson): boolean {
  if (value === 'ImaginaryUnit') return true;
  const node = nodeArray(value);
  return node?.slice(1).some(containsImaginaryUnit) ?? false;
}

function proves(input: {
  canonicalLatex: string;
  mathJson: SerializableMathJson;
  routeId: EquationMathJsonRouteId;
  source: string;
}) {
  return Boolean(tryProvenCanonicalMathValue({
    ...input,
    owner: 'equation',
  }));
}

function uniqueNodeMatches(input: {
  canonicalLatex: string;
  nodes: readonly SerializableMathJson[];
  nodeForProof: (node: SerializableMathJson) => SerializableMathJson;
  routeId: EquationMathJsonRouteId;
  source: string;
}) {
  const canonicalLatex = comparisonLatex(input.canonicalLatex);
  return input.nodes.flatMap((node, index) => proves({
    canonicalLatex,
    mathJson: input.nodeForProof(node),
    routeId: input.routeId,
    source: `${input.source}:${index}`,
  }) ? [index] : []);
}

function exactSerializationBijection(input: {
  targetLatex: string;
  canonicalLatex: readonly string[];
  nodes: readonly SerializableMathJson[];
  nodeForProof: (node: SerializableMathJson) => SerializableMathJson;
  routeId: EquationMathJsonRouteId;
  source: string;
}) {
  const deterministicNodeForEntry = input.canonicalLatex.map((canonicalLatex) => {
    try {
      const parsed = ce.parse(canonicalLatex, { form: 'structural' });
      const matches = input.nodes.flatMap((node, index) => (
        compareFormalMathJson(input.nodeForProof(node), parsed.json, canonicalLatex).equal
          ? [index]
          : []
      ));
      return matches.length === 1 ? matches[0] : undefined;
    } catch {
      return undefined;
    }
  });
  if (
    deterministicNodeForEntry.every((index) => index !== undefined)
    && new Set(deterministicNodeForEntry).size === input.nodes.length
  ) {
    const proofResults = deterministicNodeForEntry.map((nodeIndex, entryIndex) => proves({
      canonicalLatex: comparisonLatex(input.canonicalLatex[entryIndex]),
      mathJson: input.nodeForProof(input.nodes[nodeIndex!]),
      routeId: input.routeId,
      source: `${input.source}:deterministic-entry:${entryIndex}`,
    }));
    if (proofResults.every(Boolean)) return deterministicNodeForEntry as number[];
  }

  const numericValue = (value: ReturnType<typeof ce.box>) => {
    const json = (value.N?.() ?? value).json;
    if (typeof json === 'number' && Number.isFinite(json)) return json;
    if (json && typeof json === 'object' && 'num' in json) {
      const parsed = Number((json as { num: string }).num);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  };
  const nodeValues = input.nodes.map((node) => {
    try {
      return numericValue(ce.box(input.nodeForProof(node) as Parameters<typeof ce.box>[0]));
    } catch {
      return undefined;
    }
  });
  const presentationValues = input.canonicalLatex.map((canonicalLatex) => {
    try {
      return numericValue(ce.parse(canonicalLatex));
    } catch {
      return undefined;
    }
  });
  const numericNodeForEntry = presentationValues.map((presentationValue) => {
    if (presentationValue === undefined) return undefined;
    const matches = nodeValues.flatMap((nodeValue, index) => {
      if (nodeValue === undefined) return [];
      const tolerance = 1e-10 * Math.max(1, Math.abs(nodeValue), Math.abs(presentationValue));
      return Math.abs(nodeValue - presentationValue) <= tolerance ? [index] : [];
    });
    return matches.length === 1 ? matches[0] : undefined;
  });
  if (
    numericNodeForEntry.every((index) => index !== undefined)
    && new Set(numericNodeForEntry).size === input.nodes.length
  ) {
    const proofResults = numericNodeForEntry.map((nodeIndex, entryIndex) => proves({
      canonicalLatex: comparisonLatex(input.canonicalLatex[entryIndex]),
      mathJson: input.nodeForProof(input.nodes[nodeIndex!]),
      routeId: input.routeId,
      source: `${input.source}:numeric-entry:${entryIndex}`,
    }));
    if (proofResults.every(Boolean)) return numericNodeForEntry as number[];
  }

  const serialized = input.nodes.map((node) => {
    const printed = printValidatedBoxedMathJson({
      boxedExpression: ce.box(node as Parameters<typeof ce.box>[0], { form: 'structural' }),
      profile: 'pedagogical-v1',
      target: 'canonical-latex',
    });
    if (!printed.ok) return [] as string[];
    return [
      comparisonLatex(printed.canonicalLatex),
      comparisonLatex(normalizeFiniteBranchExpression({
        latex: printed.canonicalLatex,
        node,
        target: input.targetLatex,
      })),
    ];
  });
  const nodeForEntry = input.canonicalLatex.map((canonicalLatex) => {
    const normalized = comparisonLatex(canonicalLatex);
    const matches = serialized.flatMap((values, index) => values.includes(normalized) ? [index] : []);
    return matches.length === 1 ? matches[0] : undefined;
  });
  if (
    nodeForEntry.some((index) => index === undefined)
    || new Set(nodeForEntry).size !== input.nodes.length
  ) {
    return undefined;
  }
  const proofResults = nodeForEntry.map((nodeIndex, entryIndex) => proves({
    canonicalLatex: comparisonLatex(input.canonicalLatex[entryIndex]),
    mathJson: input.nodeForProof(input.nodes[nodeIndex!]),
    routeId: input.routeId,
    source: `${input.source}:exact-entry:${entryIndex}`,
  }));
  return proofResults.every(Boolean) ? nodeForEntry as number[] : undefined;
}

function assertUniqueBijection(input: {
  targetLatex: string;
  canonicalLatex: readonly string[];
  nodes: readonly SerializableMathJson[];
  nodeForProof: (node: SerializableMathJson) => SerializableMathJson;
  routeId: EquationMathJsonRouteId;
  source: string;
}) {
  if (input.canonicalLatex.length !== input.nodes.length) {
    throw new Error('Equation exact finite branch evidence has a missing or extra branch.');
  }
  const exactBijection = exactSerializationBijection(input);
  if (exactBijection) return exactBijection;
  const nodeForEntry: number[] = [];
  const used = new Set<number>();
  for (const [index, canonicalLatex] of input.canonicalLatex.entries()) {
    const matches = uniqueNodeMatches({
      canonicalLatex,
      nodes: input.nodes,
      nodeForProof: input.nodeForProof,
      routeId: input.routeId,
      source: `${input.source}:entry:${index}`,
    });
    if (matches.length !== 1 || used.has(matches[0])) {
      throw new Error('Equation exact finite branch evidence is conflicting or ambiguous.');
    }
    used.add(matches[0]);
    nodeForEntry.push(matches[0]);
  }
  if (used.size !== input.nodes.length) {
    throw new Error('Equation exact finite branch evidence did not consume every native root.');
  }
  return nodeForEntry;
}

function uniqueLeaves(leaves: readonly EquationOwnedMathJsonLeaf[]) {
  const selected = new Map<string, EquationOwnedMathJsonLeaf>();
  for (const leaf of leaves) {
    const key = `${leaf.canonicalLatex}\u0000${JSON.stringify(leaf.mathJson)}`;
    if (!selected.has(key)) selected.set(key, leaf);
  }
  return [...selected.values()];
}

function exactAnswerRowBranches(
  answerRows: DisplayAnswerRowsReadback,
  targetLatex: string,
) {
  const prefix = `${targetLatex}=`;
  return answerRows.rows.map((row) => {
    if (!row.latex.startsWith(prefix)) {
      throw new Error('Equation exact finite answer row does not match its target relation.');
    }
    const branch = row.latex.slice(prefix.length).trim();
    if (!branch) {
      throw new Error('Equation exact finite answer row has an empty branch.');
    }
    return branch;
  });
}

export function resolveEquationFiniteBranchAuthority(input: {
  primaryMath: CanonicalMathValueV1 | undefined;
  branchReadback: DisplayBranchReadback | undefined;
  answerRows?: DisplayAnswerRowsReadback;
  preserveReadbackOrder?: boolean;
  routeId: EquationMathJsonRouteId;
  source: string;
}): EquationFiniteBranchAuthority | undefined {
  const readback = input.branchReadback;
  if (
    !readback
    || (readback.relationLatex !== '=' && readback.relationLatex !== '\\in')
    || !/^[A-Za-z]$/u.test(readback.targetLatex)
  ) {
    return undefined;
  }
  if (!input.primaryMath?.mathJson) {
    throw new Error('Equation exact finite branches require producer-owned primary MathJSON.');
  }
  const native = exactFiniteNodes(input.primaryMath, readback.relationLatex);
  if (!native) {
    throw new Error('Equation exact finite branch relation does not match its native primary tree.');
  }
  if (!proves({
    canonicalLatex: input.primaryMath.canonicalLatex,
    mathJson: input.primaryMath.mathJson,
    routeId: input.routeId,
    source: `${input.source}:primary`,
  })) {
    throw new Error('Equation exact finite primary presentation conflicts with its native tree.');
  }
  if (!proves({
    canonicalLatex: readback.targetLatex,
    mathJson: native.target,
    routeId: input.routeId,
    source: `${input.source}:target`,
  })) {
    throw new Error('Equation exact finite target conflicts with its native target.');
  }

  const branchNodeIndexes = assertUniqueBijection({
    targetLatex: readback.targetLatex,
    canonicalLatex: readback.branchesLatex,
    nodes: native.branches,
    nodeForProof: (node) => node,
    routeId: input.routeId,
    source: `${input.source}:branch`,
  });
  const renderedNodeIndexes = input.preserveReadbackOrder
    ? branchNodeIndexes
    : native.branches.map((_, index) => index);
  const branchForNode = new Map(branchNodeIndexes.map((nodeIndex, branchIndex) => [
    nodeIndex,
    readback.branchesLatex[branchIndex],
  ]));
  const rendered = renderFiniteRootSet(createFiniteRootSet({
    targetLatex: readback.targetLatex,
    source: readback.source ?? input.source,
    branches: renderedNodeIndexes.map((nodeIndex) => ({
      latex: branchForNode.get(nodeIndex)!,
      node: native.branches[nodeIndex],
      source: input.source,
    })),
  }), {
    preserveOrder: true,
    relationLatex: readback.relationLatex,
    setSeparator: ', ',
    ...(readback.label ? { label: readback.label } : {}),
  });
  if (
    !rendered.exactLatex
    || !rendered.primaryMath?.mathJson
    || rendered.branchesLatex.length !== native.branches.length
  ) {
    throw new Error('Equation exact finite native roots could not produce complete readback.');
  }
  const renderedNative = exactFiniteNodes(rendered.primaryMath, readback.relationLatex);
  if (!renderedNative || renderedNative.branches.length !== rendered.branchesLatex.length) {
    throw new Error('Equation exact finite normalized roots could not produce complete proof leaves.');
  }
  const isSingleEquality = readback.relationLatex === '=';
  const preserveProducerPresentation = isSingleEquality
    || native.branches.some(containsImaginaryUnit);
  const resolvedExactLatex = preserveProducerPresentation
    ? input.primaryMath.canonicalLatex
    : rendered.exactLatex;
  const resolvedPrimaryMath = preserveProducerPresentation
    ? input.primaryMath as Required<CanonicalMathValueV1>
    : rendered.primaryMath as Required<CanonicalMathValueV1>;
  const normalizedReadback = isSingleEquality
    ? undefined
    : preserveProducerPresentation
      ? readback
      : rendered.branchReadback
    ? {
        ...rendered.branchReadback,
        ...(readback.countLabel ? { countLabel: readback.countLabel } : {}),
      }
    : undefined;

  let answerRows: DisplayAnswerRowsReadback | undefined;
  const rowLeaves: EquationOwnedMathJsonLeaf[] = [];
  if (input.answerRows) {
    const rowBranches = exactAnswerRowBranches(input.answerRows, readback.targetLatex);
    const rowNodeIndexes = assertUniqueBijection({
      targetLatex: readback.targetLatex,
      canonicalLatex: rowBranches,
      nodes: native.branches,
      nodeForProof: (node) => node,
      routeId: input.routeId,
      source: `${input.source}:answer-row`,
    });
    const rowForNode = new Map(rowNodeIndexes.map((nodeIndex, rowIndex) => [
      nodeIndex,
      input.answerRows!.rows[rowIndex],
    ]));
    answerRows = preserveProducerPresentation
      ? input.answerRows
      : {
          ...(input.answerRows.label ? { label: input.answerRows.label } : {}),
          rows: rendered.branchesLatex.map((branch, index) => ({
            latex: `${readback.targetLatex}=${branch}`,
            ...(rowForNode.get(renderedNodeIndexes[index])?.label
              ? { label: rowForNode.get(renderedNodeIndexes[index])!.label }
              : {}),
          })),
        };
    if (preserveProducerPresentation) {
      input.answerRows.rows.forEach((row, rowIndex) => {
        const nodeIndex = rowNodeIndexes[rowIndex];
        rowLeaves.push({
          canonicalLatex: row.latex,
          mathJson: ['Equal', native.target, native.branches[nodeIndex]],
          source: `${input.source}:answer-row:${rowIndex}`,
        });
      });
    } else {
      answerRows.rows.forEach((row, index) => {
        rowLeaves.push({
          canonicalLatex: row.latex,
          mathJson: ['Equal', renderedNative.target, renderedNative.branches[index]],
          source: `${input.source}:answer-row:normalized:${index}`,
        });
      });
    }
  }

  const proofLeaves = uniqueLeaves([
    {
      canonicalLatex: resolvedExactLatex,
      mathJson: resolvedPrimaryMath.mathJson,
      source: `${input.source}:primary:resolved`,
    },
    {
      canonicalLatex: readback.targetLatex,
      mathJson: preserveProducerPresentation ? native.target : renderedNative.target,
      source: `${input.source}:target`,
    },
    ...(preserveProducerPresentation
      ? readback.branchesLatex.map((canonicalLatex, index) => ({
          canonicalLatex,
          mathJson: native.branches[branchNodeIndexes[index]],
          source: `${input.source}:branch:resolved:${index}`,
        }))
      : rendered.branchesLatex.map((canonicalLatex, index) => ({
          canonicalLatex,
          mathJson: renderedNative.branches[index],
          source: `${input.source}:branch:resolved:${index}`,
        }))),
    ...rowLeaves,
  ]);

  return {
    exactLatex: resolvedExactLatex,
    primaryMath: resolvedPrimaryMath,
    ...(normalizedReadback ? { branchReadback: normalizedReadback } : {}),
    ...(answerRows ? { answerRows } : {}),
    proofLeaves,
  };
}
