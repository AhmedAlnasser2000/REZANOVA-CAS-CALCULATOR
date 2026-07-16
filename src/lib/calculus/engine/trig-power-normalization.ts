import { buildExactScalarNode } from '../../algebra/polynomial-core';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { isNodeArray } from '../../symbolic-engine/patterns';
import {
  binomial,
  exact,
  expansionNode,
  parseAffineArgument,
  parsePositiveIntegerExponent,
} from './trig-power-identities';

function normalizeSinCosPowers(node: unknown, variable: string): { node: unknown; changed: boolean } {
  if (!isNodeArray(node)) {
    return { node, changed: false };
  }

  if (node[0] === 'Power' && node.length === 3 && isNodeArray(node[1]) && node[1].length === 2) {
    const head = node[1][0];
    const exponent = parsePositiveIntegerExponent(node[2]);
    const affine = (head === 'Sin' || head === 'Cos') ? parseAffineArgument(node[1][1], variable) : undefined;
    const expanded = affine && exponent !== undefined
      ? expansionNode(head as 'Sin' | 'Cos', exponent, affine, variable)
      : undefined;
    if (expanded) {
      return { node: expanded, changed: true };
    }
  }

  let changed = false;
  const children = node.slice(1).map((child) => {
    const normalized = normalizeSinCosPowers(child, variable);
    changed ||= normalized.changed;
    return normalized.node;
  });

  return {
    node: changed ? normalizeAst([node[0], ...children]) : node,
    changed,
  };
}

export function normalizeTrigSinCosPowerIdentityPair(left: unknown, right: unknown, variable: string) {
  const normalizedLeft = normalizeSinCosPowers(left, variable);
  const normalizedRight = normalizeSinCosPowers(right, variable);
  if (!normalizedLeft.changed && !normalizedRight.changed) {
    return undefined;
  }

  return {
    left: normalizedLeft.node,
    right: normalizedRight.node,
  };
}

function normalizeEvenSecCscPowers(node: unknown): { node: unknown; changed: boolean } {
  if (!isNodeArray(node)) {
    return { node, changed: false };
  }

  if (
    node[0] === 'Power'
    && node.length === 3
    && isNodeArray(node[1])
    && node[1].length === 2
    && (node[1][0] === 'Sec' || node[1][0] === 'Csc')
  ) {
    const exponent = parsePositiveIntegerExponent(node[2]);
    if (exponent !== undefined && exponent >= 2 && exponent <= 12 && exponent % 2 === 0) {
      const argument = node[1][1];
      const baseHead = node[1][0] === 'Sec' ? 'Tan' : 'Cot';
      const halfExponent = exponent / 2;
      const terms = Array.from({ length: halfExponent + 1 }, (_, index) => {
        if (index === 0) {
          return buildExactScalarNode(exact(binomial(halfExponent, index)));
        }

        const powerNode = ['Power', [baseHead, argument], 2 * index];
        const coefficient = exact(binomial(halfExponent, index));
        return coefficient.numerator === coefficient.denominator
          ? powerNode
          : normalizeAst(['Multiply', buildExactScalarNode(coefficient), powerNode]);
      });
      return {
        node: normalizeAst(['Add', ...terms]),
        changed: true,
      };
    }
  }

  let changed = false;
  const children = node.slice(1).map((child) => {
    const normalized = normalizeEvenSecCscPowers(child);
    changed ||= normalized.changed;
    return normalized.node;
  });

  return {
    node: changed ? normalizeAst([node[0], ...children]) : node,
    changed,
  };
}

export function normalizeTrigTanSecCotCscPowerIdentityPair(left: unknown, right: unknown) {
  const normalizedLeft = normalizeEvenSecCscPowers(left);
  const normalizedRight = normalizeEvenSecCscPowers(right);
  if (!normalizedLeft.changed && !normalizedRight.changed) {
    return undefined;
  }

  return {
    left: normalizedLeft.node,
    right: normalizedRight.node,
  };
}
