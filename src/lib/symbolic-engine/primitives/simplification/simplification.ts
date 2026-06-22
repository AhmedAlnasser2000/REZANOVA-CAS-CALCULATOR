import {
  addExactScalars,
  buildExactScalarNode,
  divideExactScalars,
  exactScalarIsZero,
  multiplyExactScalars,
  negateExactScalar,
  readExactScalarNode,
  type ExactScalar,
} from '../../../algebra/polynomial-core';
import { normalizeAst } from '../../normalize';
import { compactRepeatedProductFactors, isNodeArray, termKey } from '../../patterns';

export type MathJsonSimplificationUnsupportedReason = 'node-limit';

export type MathJsonSimplificationOptions = {
  maxNodeCount?: number;
};

export type MathJsonSimplificationOk = {
  kind: 'ok';
  node: unknown;
  changed: boolean;
  nodeCount: number;
};

export type MathJsonSimplificationUnsupported = {
  kind: 'unsupported';
  reason: MathJsonSimplificationUnsupportedReason;
  message: string;
  node: unknown;
  changed: false;
  nodeCount: number;
};

export type MathJsonSimplificationResult =
  | MathJsonSimplificationOk
  | MathJsonSimplificationUnsupported;

const DEFAULT_MAX_NODE_COUNT = 2000;
const EXACT_ZERO: ExactScalar = { numerator: 0, denominator: 1 };
const EXACT_ONE: ExactScalar = { numerator: 1, denominator: 1 };

function nodeCount(node: unknown): number {
  if (!isNodeArray(node)) {
    return 1;
  }

  return 1 + node.slice(1).reduce<number>((sum, child) => sum + nodeCount(child), 0);
}

function normalizeOptions(options: MathJsonSimplificationOptions = {}) {
  return {
    maxNodeCount: Math.max(1, Math.floor(options.maxNodeCount ?? DEFAULT_MAX_NODE_COUNT)),
  };
}

function finish(node: unknown, original: unknown, options: MathJsonSimplificationOptions): MathJsonSimplificationResult {
  const normalized = normalizeAst(node);
  const count = nodeCount(normalized);
  const { maxNodeCount } = normalizeOptions(options);
  if (count > maxNodeCount) {
    return {
      kind: 'unsupported',
      reason: 'node-limit',
      message: `Simplification result exceeded the node limit of ${maxNodeCount}.`,
      node: normalized,
      changed: false,
      nodeCount: count,
    };
  }

  return {
    kind: 'ok',
    node: normalized,
    changed: normalizedStructuralKey(normalized) !== normalizedStructuralKey(normalizeAst(original)),
    nodeCount: count,
  };
}

function scalarNode(value: ExactScalar): unknown {
  return buildExactScalarNode(value);
}

function scalarIsOne(value: ExactScalar) {
  return value.numerator === value.denominator;
}

function pushFlattened(operator: 'Add' | 'Multiply', node: unknown, target: unknown[]) {
  if (isNodeArray(node) && node[0] === operator) {
    target.push(...node.slice(1));
    return;
  }
  target.push(node);
}

function simplifyInternal(node: unknown): unknown {
  if (!isNodeArray(node) || node.length === 0) {
    return node;
  }

  const [operator, ...children] = node;
  switch (operator) {
    case 'Add':
      return addMathJsonNodes(...children.map(simplifyInternal));
    case 'Subtract':
      if (children.length === 2) {
        return subtractMathJsonNodes(simplifyInternal(children[0]), simplifyInternal(children[1]));
      }
      return [operator, ...children.map(simplifyInternal)];
    case 'Negate':
      if (children.length === 1) {
        return negateMathJsonNode(simplifyInternal(children[0]));
      }
      return [operator, ...children.map(simplifyInternal)];
    case 'Multiply':
      return multiplyMathJsonNodes(...children.map(simplifyInternal));
    case 'Divide':
      if (children.length === 2) {
        return divideMathJsonNodes(simplifyInternal(children[0]), simplifyInternal(children[1]));
      }
      return [operator, ...children.map(simplifyInternal)];
    case 'Power':
      if (children.length === 2) {
        const base = simplifyInternal(children[0]);
        const exponent = simplifyInternal(children[1]);
        if (readExactScalarNode(exponent)?.numerator === 1 && readExactScalarNode(exponent)?.denominator === 1) {
          return base;
        }
        return ['Power', base, exponent];
      }
      return [operator, ...children.map(simplifyInternal)];
    default:
      return [operator, ...children.map(simplifyInternal)];
  }
}

export function addMathJsonNodes(...nodes: unknown[]): unknown {
  const flattened: unknown[] = [];
  for (const node of nodes) {
    pushFlattened('Add', node, flattened);
  }

  let scalarSum = EXACT_ZERO;
  const terms: unknown[] = [];
  for (const term of flattened) {
    const scalar = readExactScalarNode(term);
    if (scalar) {
      scalarSum = addExactScalars(scalarSum, scalar);
      continue;
    }
    terms.push(term);
  }

  if (!exactScalarIsZero(scalarSum)) {
    terms.push(scalarNode(scalarSum));
  }
  if (terms.length === 0) {
    return 0;
  }
  return terms.length === 1 ? terms[0] : normalizeAst(['Add', ...terms]);
}

export function multiplyMathJsonNodes(...nodes: unknown[]): unknown {
  const flattened: unknown[] = [];
  for (const node of nodes) {
    pushFlattened('Multiply', node, flattened);
  }

  let scalarProduct = EXACT_ONE;
  const factors: unknown[] = [];
  for (const factor of flattened) {
    const scalar = readExactScalarNode(factor);
    if (scalar) {
      scalarProduct = multiplyExactScalars(scalarProduct, scalar);
      continue;
    }
    factors.push(factor);
  }

  if (exactScalarIsZero(scalarProduct)) {
    return 0;
  }
  if (!scalarIsOne(scalarProduct)) {
    factors.unshift(scalarNode(scalarProduct));
  }
  if (factors.length === 0) {
    return 1;
  }
  if (factors.length === 1) {
    return factors[0];
  }
  return normalizeAst(compactRepeatedProductFactors(['Multiply', ...factors]));
}

export function negateMathJsonNode(node: unknown): unknown {
  const scalar = readExactScalarNode(node);
  if (scalar) {
    return scalarNode(negateExactScalar(scalar));
  }
  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return node[1];
  }
  if (isNodeArray(node) && node[0] === 'Add') {
    return addMathJsonNodes(...node.slice(1).map(negateMathJsonNode));
  }
  return ['Negate', node];
}

export function subtractMathJsonNodes(left: unknown, right: unknown): unknown {
  return addMathJsonNodes(left, negateMathJsonNode(right));
}

export function divideMathJsonNodes(left: unknown, right: unknown): unknown {
  const leftScalar = readExactScalarNode(left);
  const rightScalar = readExactScalarNode(right);
  if (leftScalar && rightScalar) {
    const divided = divideExactScalars(leftScalar, rightScalar);
    if (divided) {
      return scalarNode(divided);
    }
  }
  if (leftScalar?.numerator === 0) {
    return 0;
  }
  if (rightScalar && rightScalar.numerator === rightScalar.denominator) {
    return left;
  }
  return ['Divide', left, right];
}

export function squareMathJsonNode(node: unknown): unknown {
  return multiplyMathJsonNodes(node, node);
}

export function splitAdditiveTerms(node: unknown): unknown[] {
  const simplified = simplifyMathJsonNodeOrOriginal(node);
  if (isNodeArray(simplified) && simplified[0] === 'Add') {
    return simplified.slice(1);
  }
  return [simplified];
}

function normalizedStructuralKey(node: unknown): string {
  return termKey(normalizeAst(node));
}

export function structuralKey(node: unknown): string {
  return normalizedStructuralKey(simplifyMathJsonNodeOrOriginal(node));
}

export function simplifyMathJsonNode(
  node: unknown,
  options: MathJsonSimplificationOptions = {},
): MathJsonSimplificationResult {
  return finish(simplifyInternal(node), node, options);
}

export function simplifyMathJsonNodeOrOriginal(
  node: unknown,
  options: MathJsonSimplificationOptions = {},
): unknown {
  const result = simplifyMathJsonNode(node, options);
  return result.kind === 'ok' ? result.node : normalizeAst(node);
}
