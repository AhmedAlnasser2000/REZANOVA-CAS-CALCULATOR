import { ComputeEngine } from '@cortex-js/compute-engine';
import type { NormalizedExpression } from '../../types/calculator';
import { buildPrecedenceTrace } from './precedence';
import { flattenAdd, flattenMultiply, isNodeArray, termKey } from './patterns';

const ce = new ComputeEngine();

function sortNodes(nodes: unknown[]) {
  return [...nodes].sort((left, right) => {
    const leftRank = typeof left === 'number' ? 0 : typeof left === 'string' ? 1 : 2;
    const rightRank = typeof right === 'number' ? 0 : typeof right === 'string' ? 1 : 2;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return termKey(left).localeCompare(termKey(right));
  });
}

export function normalizeAst(node: unknown): unknown {
  if (!isNodeArray(node) || node.length === 0) {
    return node;
  }

  const [head, ...children] = node;
  const normalizedChildren = children.map(normalizeAst);

  if (head === 'Add') {
    const flattened = normalizedChildren.flatMap((child) => flattenAdd(child));
    const sorted = sortNodes(flattened);
    return sorted.length === 1 ? sorted[0] : ['Add', ...sorted];
  }

  if (head === 'Multiply') {
    const flattened = normalizedChildren.flatMap((child) => flattenMultiply(child));
    const sorted = sortNodes(flattened);
    return sorted.length === 1 ? sorted[0] : ['Multiply', ...sorted];
  }

  if (head === 'Negate' && normalizedChildren.length === 1) {
    const child = normalizedChildren[0];
    if (typeof child === 'number') {
      return -child;
    }
    return ['Negate', child];
  }

  return [head, ...normalizedChildren];
}

export function normalizeLatex(latex: string): NormalizedExpression {
  const parsed = ce.parse(latex);
  const ast = normalizeAst(parsed.json);
  return {
    ast,
    latex: ce.box(ast as Parameters<typeof ce.box>[0]).latex,
    precedenceTrace: buildPrecedenceTrace(ast),
  };
}

export function normalizeNode(node: unknown): NormalizedExpression {
  const ast = normalizeAst(node);
  return {
    ast,
    latex: ce.box(ast as Parameters<typeof ce.box>[0]).latex,
    precedenceTrace: buildPrecedenceTrace(ast),
  };
}
