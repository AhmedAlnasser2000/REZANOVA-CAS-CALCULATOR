import type {
  CanonicalMathValueV1,
  DisplayAnswerRowsReadback,
  DisplayBranchReadback,
  SerializableMathJson,
} from '../../../types/calculator';
import { tryProvenCanonicalMathValue } from '../../result-contract';
import type { MathJsonRouteId } from '../../result-contract/mathjson-route-registry';
import {
  createFiniteRootSet,
  renderFiniteRootSet,
} from '../solution/finite-root-set';
import type { EquationOwnedMathJsonLeaf } from './math-values';

type EquationMathJsonRouteId = Extract<MathJsonRouteId, `equation.${string}`>;

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

function assertUniqueBijection(input: {
  canonicalLatex: readonly string[];
  nodes: readonly SerializableMathJson[];
  nodeForProof: (node: SerializableMathJson) => SerializableMathJson;
  routeId: EquationMathJsonRouteId;
  source: string;
}) {
  if (input.canonicalLatex.length !== input.nodes.length) {
    throw new Error('Equation exact finite branch evidence has a missing or extra branch.');
  }
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
    canonicalLatex: readback.branchesLatex,
    nodes: native.branches,
    nodeForProof: (node) => node,
    routeId: input.routeId,
    source: `${input.source}:branch`,
  });
  const branchForNode = new Map(branchNodeIndexes.map((nodeIndex, branchIndex) => [
    nodeIndex,
    readback.branchesLatex[branchIndex],
  ]));
  const rendered = renderFiniteRootSet(createFiniteRootSet({
    targetLatex: readback.targetLatex,
    source: readback.source ?? input.source,
    branches: native.branches.map((node, index) => ({
      latex: branchForNode.get(index)!,
      node,
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
            ...(rowForNode.get(index)?.label ? { label: rowForNode.get(index)!.label } : {}),
          })),
        };
    input.answerRows.rows.forEach((row, rowIndex) => {
      const nodeIndex = rowNodeIndexes[rowIndex];
      rowLeaves.push({
        canonicalLatex: row.latex,
        mathJson: ['Equal', native.target, native.branches[nodeIndex]],
        source: `${input.source}:answer-row:${rowIndex}`,
      });
    });
  }

  const proofLeaves = uniqueLeaves([
    {
      canonicalLatex: input.primaryMath.canonicalLatex,
      mathJson: input.primaryMath.mathJson,
      source: `${input.source}:primary:original`,
    },
    {
      canonicalLatex: rendered.exactLatex,
      mathJson: rendered.primaryMath.mathJson,
      source: `${input.source}:primary:normalized`,
    },
    {
      canonicalLatex: readback.targetLatex,
      mathJson: native.target,
      source: `${input.source}:target`,
    },
    ...readback.branchesLatex.map((canonicalLatex, index) => ({
      canonicalLatex,
      mathJson: native.branches[branchNodeIndexes[index]],
      source: `${input.source}:branch:original:${index}`,
    })),
    ...rendered.branchesLatex.map((canonicalLatex, index) => ({
      canonicalLatex,
      mathJson: native.branches[index],
      source: `${input.source}:branch:normalized:${index}`,
    })),
    ...rowLeaves,
    ...(answerRows?.rows.map((row, index) => ({
      canonicalLatex: row.latex,
      mathJson: ['Equal', native.target, native.branches[index]] as SerializableMathJson,
      source: `${input.source}:answer-row:normalized:${index}`,
    })) ?? []),
  ]);

  return {
    exactLatex: resolvedExactLatex,
    primaryMath: resolvedPrimaryMath,
    ...(normalizedReadback ? { branchReadback: normalizedReadback } : {}),
    ...(answerRows ? { answerRows } : {}),
    proofLeaves,
  };
}
