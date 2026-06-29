import {
  readExactScalarNode,
} from '../algebra/polynomial-core';
import { isNodeArray } from './patterns';

export type DerivativePreflightKind =
  | 'direct-symbolic'
  | 'compute-engine-fallback'
  | 'unsupported'
  | 'too-complex'
  | 'malformed';

export type DerivativePreflightLimits = {
  maxNodeCount: number;
  maxDepth: number;
  maxComputeEngineFallbackNodeCount: number;
  maxComputeEngineFallbackDepth: number;
  maxComputeEngineFallbackHeads: number;
};

export type DerivativePreflightResult = {
  kind: DerivativePreflightKind;
  nodeCount: number;
  maxDepth: number;
  unsupportedHeads: string[];
  computeEngineFallbackHeads: string[];
  reason: string;
};

export const DEFAULT_DERIVATIVE_PREFLIGHT_LIMITS: DerivativePreflightLimits = {
  maxNodeCount: 160,
  maxDepth: 18,
  maxComputeEngineFallbackNodeCount: 60,
  maxComputeEngineFallbackDepth: 10,
  maxComputeEngineFallbackHeads: 2,
};

const DIRECT_ARITY = new Map<string, number | 'variadic'>([
  ['Rational', 2],
  ['Negate', 1],
  ['Add', 'variadic'],
  ['Multiply', 'variadic'],
  ['Divide', 2],
  ['Power', 2],
  ['Ln', 1],
  ['Log', 1],
  ['Sin', 1],
  ['Cos', 1],
  ['Tan', 1],
  ['Cot', 1],
  ['Sec', 1],
  ['Csc', 1],
  ['Sqrt', 1],
  ['Abs', 1],
  ['Arcsin', 1],
  ['Arccos', 1],
  ['Arctan', 1],
  ['Arsinh', 1],
  ['Arcosh', 1],
  ['Artanh', 1],
]);

const HARD_UNSUPPORTED_HEADS = new Set([
  'Equal',
  'NotEqual',
  'Less',
  'LessEqual',
  'Greater',
  'GreaterEqual',
  'And',
  'Or',
  'Which',
  'Piecewise',
  'List',
  'Tuple',
  'Matrix',
  'Integrate',
  'Limit',
  'D',
  'Derivative',
  'Apply',
  'Sum',
  'Product',
]);

function uniqueSorted(values: Iterable<string>) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function arityIsValid(head: string, childCount: number) {
  const arity = DIRECT_ARITY.get(head);
  if (arity === undefined) {
    return true;
  }
  if (arity === 'variadic') {
    return childCount >= 1;
  }
  return childCount === arity;
}

export function classifyDerivativePreflight(
  node: unknown,
  _variable: string,
  limits: DerivativePreflightLimits = DEFAULT_DERIVATIVE_PREFLIGHT_LIMITS,
): DerivativePreflightResult {
  const unsupportedHeads = new Set<string>();
  const fallbackHeads = new Set<string>();
  let malformed = false;
  let nodeCount = 0;
  let maxDepth = 0;

  function visit(current: unknown, depth: number) {
    nodeCount += 1;
    maxDepth = Math.max(maxDepth, depth);

    if (typeof current === 'number' || typeof current === 'string') {
      return;
    }

    if (current === null || typeof current === 'boolean') {
      malformed = true;
      return;
    }

    if (readExactScalarNode(current)) {
      return;
    }

    if (isNodeArray(current)) {
      if (current.length === 0 || typeof current[0] !== 'string') {
        malformed = true;
        return;
      }

      const [head, ...children] = current;
      if (!arityIsValid(head, children.length)) {
        malformed = true;
      }

      if (HARD_UNSUPPORTED_HEADS.has(head)) {
        unsupportedHeads.add(head);
      } else if (!DIRECT_ARITY.has(head)) {
        fallbackHeads.add(head);
      }

      children.forEach((child) => visit(child, depth + 1));
      return;
    }

    malformed = true;
  }

  visit(node, 1);

  const unsupported = uniqueSorted(unsupportedHeads);
  const fallback = uniqueSorted(fallbackHeads);

  if (malformed) {
    return {
      kind: 'malformed',
      nodeCount,
      maxDepth,
      unsupportedHeads: unsupported,
      computeEngineFallbackHeads: fallback,
      reason: 'Derivative input is not a supported MathJSON expression.',
    };
  }

  if (nodeCount > limits.maxNodeCount || maxDepth > limits.maxDepth) {
    return {
      kind: 'too-complex',
      nodeCount,
      maxDepth,
      unsupportedHeads: unsupported,
      computeEngineFallbackHeads: fallback,
      reason: `Derivative input exceeds the current symbolic budget (${nodeCount} nodes, depth ${maxDepth}).`,
    };
  }

  if (unsupported.length > 0) {
    return {
      kind: 'unsupported',
      nodeCount,
      maxDepth,
      unsupportedHeads: unsupported,
      computeEngineFallbackHeads: fallback,
      reason: `Derivative input contains unsupported expression forms: ${unsupported.join(', ')}.`,
    };
  }

  if (fallback.length > 0) {
    const canUseFallback =
      nodeCount <= limits.maxComputeEngineFallbackNodeCount
      && maxDepth <= limits.maxComputeEngineFallbackDepth
      && fallback.length <= limits.maxComputeEngineFallbackHeads;

    return {
      kind: canUseFallback ? 'compute-engine-fallback' : 'unsupported',
      nodeCount,
      maxDepth,
      unsupportedHeads: unsupported,
      computeEngineFallbackHeads: fallback,
      reason: canUseFallback
        ? `Derivative input needs Compute Engine fallback for: ${fallback.join(', ')}.`
        : `Derivative input uses unsupported fallback-heavy expression forms: ${fallback.join(', ')}.`,
    };
  }

  return {
    kind: 'direct-symbolic',
    nodeCount,
    maxDepth,
    unsupportedHeads: unsupported,
    computeEngineFallbackHeads: fallback,
    reason: 'Derivative input fits the direct symbolic differentiator.',
  };
}
