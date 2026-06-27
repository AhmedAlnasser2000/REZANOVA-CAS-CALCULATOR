import { buildExactScalarNode, readExactScalarNode } from '../../algebra/polynomial-core';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { isNodeArray } from '../../symbolic-engine/patterns';

function exactRationalNode(numerator: number, denominator: number) {
  return buildExactScalarNode({ numerator, denominator });
}

function isExactSquareExponent(node: unknown) {
  const exponent = readExactScalarNode(node);
  return exponent?.numerator === 2 && exponent.denominator === 1;
}

function doubleArgumentNode(argument: unknown) {
  return normalizeAst(['Multiply', 2, argument]);
}

function containsTrigSquareIdentityCandidate(node: unknown): boolean {
  if (!isNodeArray(node) || node.length === 0) {
    return false;
  }

  if (
    node[0] === 'Power'
    && node.length === 3
    && isExactSquareExponent(node[2])
    && isNodeArray(node[1])
    && node[1].length === 2
    && (node[1][0] === 'Sin' || node[1][0] === 'Cos' || node[1][0] === 'Tan' || node[1][0] === 'Cot')
  ) {
    return true;
  }

  return node.some((child, index) => index > 0 && containsTrigSquareIdentityCandidate(child));
}

function normalizeTrigSquareIdentities(node: unknown): unknown {
  if (!isNodeArray(node) || node.length === 0) {
    return node;
  }

  const normalizedChildren = node
    .slice(1)
    .map(normalizeTrigSquareIdentities);

  if (
    node[0] === 'Power'
    && normalizedChildren.length === 2
    && isExactSquareExponent(normalizedChildren[1])
    && isNodeArray(normalizedChildren[0])
    && normalizedChildren[0].length === 2
  ) {
    const [head, argument] = normalizedChildren[0];
    if (head === 'Sin') {
      return normalizeAst([
        'Add',
        exactRationalNode(1, 2),
        ['Multiply', exactRationalNode(-1, 2), ['Cos', doubleArgumentNode(argument)]],
      ]);
    }

    if (head === 'Cos') {
      return normalizeAst([
        'Add',
        exactRationalNode(1, 2),
        ['Multiply', exactRationalNode(1, 2), ['Cos', doubleArgumentNode(argument)]],
      ]);
    }

    if (head === 'Tan') {
      return normalizeAst(['Add', ['Power', ['Sec', argument], 2], -1]);
    }

    if (head === 'Cot') {
      return normalizeAst(['Add', ['Power', ['Csc', argument], 2], -1]);
    }
  }

  return normalizeAst([node[0], ...normalizedChildren]);
}

export function normalizeTrigSquareIdentityPair(left: unknown, right: unknown) {
  if (!containsTrigSquareIdentityCandidate(left) && !containsTrigSquareIdentityCandidate(right)) {
    return undefined;
  }

  return {
    left: normalizeTrigSquareIdentities(left),
    right: normalizeTrigSquareIdentities(right),
  };
}
