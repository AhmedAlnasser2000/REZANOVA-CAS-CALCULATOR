import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  dependsOnVariable,
  flattenAdd,
  flattenMultiply,
  isFiniteNumber,
  isNodeArray,
  termKey,
} from '../symbolic-engine/patterns';
import { normalizeAst } from '../symbolic-engine/normalize';

const ce = new ComputeEngine();
const EPSILON = 1e-9;

export type TrigFunctionKind = 'sin' | 'cos' | 'tan';

export type TrigCallMatch = {
  kind: TrigFunctionKind;
  argument: unknown;
  argumentLatex: string;
};

export type TrigSquareMatch = TrigCallMatch;

export type AffineVariableArgumentMatch = {
  coefficient: number;
  offsetNode: unknown;
  offsetLatex: string;
  argumentLatex: string;
};

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function numericFromNode(node: unknown): number | null {
  if (typeof node === 'number' && Number.isFinite(node)) {
    return node;
  }

  try {
    const numeric = ce.box(node as Parameters<typeof ce.box>[0]).N?.();
    const json = numeric?.json;
    if (typeof json === 'number' && Number.isFinite(json)) {
      return json;
    }
    if (json && typeof json === 'object' && 'num' in json) {
      const value = Number((json as { num: string }).num);
      return Number.isFinite(value) ? value : null;
    }
  } catch {
    return null;
  }

  return null;
}

function isZeroNode(node: unknown) {
  const numeric = numericFromNode(node);
  return numeric !== null && Math.abs(numeric) < EPSILON;
}

type AffineParts = {
  coefficient: number;
  offsetNode: unknown;
};

function scaleNode(node: unknown, scalar: number): unknown {
  if (Math.abs(scalar) < EPSILON || isZeroNode(node)) {
    return 0;
  }

  if (Math.abs(scalar - 1) < EPSILON) {
    return node;
  }

  return normalizeAst(['Multiply', scalar, node]);
}

function addNodes(left: unknown, right: unknown): unknown {
  if (isZeroNode(left)) {
    return right;
  }

  if (isZeroNode(right)) {
    return left;
  }

  return normalizeAst(['Add', left, right]);
}

function extractAffineParts(node: unknown, depth = 0): AffineParts | null {
  if (depth > 12) {
    return null;
  }

  const normalized = normalizeAst(node);
  if (normalized === 'x') {
    return { coefficient: 1, offsetNode: 0 };
  }

  if (!dependsOnVariable(normalized, 'x')) {
    return { coefficient: 0, offsetNode: normalized };
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  const [head] = normalized;
  if (head === 'Negate' && normalized.length === 2) {
    const child = extractAffineParts(normalized[1], depth + 1);
    if (!child) {
      return null;
    }

    return {
      coefficient: -child.coefficient,
      offsetNode: scaleNode(child.offsetNode, -1),
    };
  }

  if (head === 'Add') {
    let coefficient = 0;
    let offsetNode: unknown = 0;
    for (const term of flattenAdd(normalized)) {
      const parts = extractAffineParts(term, depth + 1);
      if (!parts) {
        return null;
      }
      coefficient += parts.coefficient;
      offsetNode = addNodes(offsetNode, parts.offsetNode);
    }

    return {
      coefficient,
      offsetNode: normalizeAst(offsetNode),
    };
  }

  if (head === 'Multiply') {
    let scalar = 1;
    let variablePart: AffineParts | null = null;
    for (const factor of flattenMultiply(normalized)) {
      if (dependsOnVariable(factor, 'x')) {
        if (variablePart) {
          return null;
        }
        variablePart = extractAffineParts(factor, depth + 1);
        if (!variablePart) {
          return null;
        }
      } else {
        const numeric = numericFromNode(factor);
        if (numeric === null) {
          return null;
        }
        scalar *= numeric;
      }
    }

    if (!variablePart) {
      return { coefficient: 0, offsetNode: normalized };
    }

    return {
      coefficient: variablePart.coefficient * scalar,
      offsetNode: scaleNode(variablePart.offsetNode, scalar),
    };
  }

  return null;
}

function compactRepeatedFactors(node: unknown): unknown {
  if (!isNodeArray(node) || node.length === 0) {
    return node;
  }

  const [head, ...children] = node;
  const compactedChildren = children.map((child) => compactRepeatedFactors(child));
  if (head !== 'Multiply') {
    return [head, ...compactedChildren];
  }

  const factors = compactedChildren.flatMap((child) => flattenMultiply(child));
  const numericFactors = factors.filter((factor) => typeof factor === 'number');
  const symbolicFactors = factors.filter((factor) => typeof factor !== 'number');
  const grouped = new Map<string, { node: unknown; exponent: number }>();

  for (const factor of symbolicFactors) {
    const key = termKey(normalizeAst(factor));
    const current = grouped.get(key);
    grouped.set(key, {
      node: normalizeAst(factor),
      exponent: (current?.exponent ?? 0) + 1,
    });
  }

  const rebuiltFactors: unknown[] = [];
  if (numericFactors.length > 0) {
    const product = numericFactors.reduce((current, value) => current * value, 1);
    if (product !== 1 || grouped.size === 0) {
      rebuiltFactors.push(product);
    }
  }

  for (const entry of grouped.values()) {
    rebuiltFactors.push(entry.exponent === 1 ? entry.node : ['Power', entry.node, entry.exponent]);
  }

  if (rebuiltFactors.length === 0) {
    return 1;
  }

  if (rebuiltFactors.length === 1) {
    return rebuiltFactors[0];
  }

  return ['Multiply', ...rebuiltFactors];
}

export function normalizeTrigAst(node: unknown) {
  return normalizeAst(compactRepeatedFactors(node));
}

export function normalizeTrigLatex(latex: string) {
  return boxLatex(normalizeTrigAst(ce.parse(latex).json));
}

export function matchTrigCall(node: unknown): TrigCallMatch | null {
  if (!isNodeArray(node) || node.length !== 2 || typeof node[0] !== 'string') {
    return null;
  }

  const [operator, argument] = node;
  const kind =
    operator === 'Sin'
      ? 'sin'
      : operator === 'Cos'
        ? 'cos'
        : operator === 'Tan'
          ? 'tan'
          : null;
  if (!kind) {
    return null;
  }

  return {
    kind,
    argument,
    argumentLatex: boxLatex(argument),
  };
}

export function matchTrigSquare(node: unknown): TrigSquareMatch | null {
  if (!isNodeArray(node) || node[0] !== 'Power' || node.length !== 3 || !isFiniteNumber(node[2]) || node[2] !== 2) {
    return null;
  }

  return matchTrigCall(node[1]);
}

export function sameTrigArgument(left: TrigCallMatch | TrigSquareMatch | null, right: TrigCallMatch | TrigSquareMatch | null) {
  if (!left || !right) {
    return false;
  }

  return termKey(normalizeAst(left.argument)) === termKey(normalizeAst(right.argument));
}

export function unwrapNegate(node: unknown) {
  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return { negative: true, value: node[1] };
  }

  return { negative: false, value: node };
}

export function matchScaledVariableArgument(node: unknown) {
  const affine = matchAffineVariableArgument(node);
  if (!affine || !isZeroNode(affine.offsetNode)) {
    return null;
  }

  return {
    coefficient: affine.coefficient,
    body: 'x',
    bodyLatex: 'x',
  };
}

export function matchAffineVariableArgument(
  node: unknown,
  options?: { maxCoefficient?: number },
): AffineVariableArgumentMatch | null {
  const parts = extractAffineParts(node);
  if (!parts) {
    return null;
  }

  const coefficient = parts.coefficient;
  if (
    !Number.isInteger(coefficient)
    || coefficient <= 0
    || (options?.maxCoefficient !== undefined && coefficient > options.maxCoefficient)
  ) {
    return null;
  }

  const offsetNode = normalizeAst(parts.offsetNode);
  return {
    coefficient,
    offsetNode,
    offsetLatex: isZeroNode(offsetNode) ? '0' : boxLatex(offsetNode),
    argumentLatex: boxLatex(normalizeAst(node)),
  };
}
