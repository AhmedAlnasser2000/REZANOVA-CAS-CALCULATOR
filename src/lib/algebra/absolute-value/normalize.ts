import type { AbsoluteValueNormalizationResult } from '../../../types/calculator';
import {
  buildConditionSupplementLatex,
  detectSingleVariable,
  expressionHasVariable,
} from '../radical-core';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { boxLatex, isNodeArray } from '../../symbolic-engine/patterns';
import { buildAbsoluteValueNode } from './families';
import {
  buildScalarNode,
  parsePositiveEvenInteger,
  readExactScalar,
  simplifyNode,
  stripNegation,
} from './shared';

type AbsoluteNodeResult = {
  node: unknown;
  changed: boolean;
};

function normalizeAbsoluteNode(node: unknown): AbsoluteNodeResult {
  const normalized = normalizeAst(node);

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return {
      node: normalized,
      changed: false,
    };
  }

  const normalizedChildren = normalized.slice(1).map((child) => normalizeAbsoluteNode(child));
  const rebuilt = normalizedChildren.some((child) => child.changed)
    ? normalizeAst([normalized[0], ...normalizedChildren.map((child) => child.node)])
    : normalized;

  if (isNodeArray(rebuilt) && rebuilt[0] === 'Abs' && rebuilt.length === 2) {
    const inner = normalizeAst(rebuilt[1]);
    const scalar = readExactScalar(inner);
    if (scalar) {
      const absoluteScalar = {
        numerator: Math.abs(scalar.numerator),
        denominator: scalar.denominator,
      };
      return {
        node: buildScalarNode(absoluteScalar),
        changed: true,
      };
    }

    if (isNodeArray(inner) && inner[0] === 'Abs' && inner.length === 2) {
      return {
        node: inner,
        changed: true,
      };
    }

    const strippedNegation = stripNegation(inner);
    if (strippedNegation) {
      return {
        node: buildAbsoluteValueNode(strippedNegation),
        changed: true,
      };
    }

    if (
      isNodeArray(inner)
      && inner[0] === 'Power'
      && inner.length === 3
      && parsePositiveEvenInteger(inner[2]) !== null
    ) {
      return {
        node: inner,
        changed: true,
      };
    }
  }

  if (
    isNodeArray(rebuilt)
    && rebuilt[0] === 'Power'
    && rebuilt.length === 3
    && isNodeArray(rebuilt[1])
    && rebuilt[1][0] === 'Abs'
    && rebuilt[1].length === 2
  ) {
    const evenExponent = parsePositiveEvenInteger(rebuilt[2]);
    if (evenExponent !== null) {
      return {
        node: simplifyNode(['Power', rebuilt[1][1], rebuilt[2]]),
        changed: true,
      };
    }
  }

  return {
    node: rebuilt,
    changed: normalizedChildren.some((child) => child.changed),
  };
}

export function normalizeExactAbsoluteValueNode(
  node: unknown,
): AbsoluteValueNormalizationResult | null {
  const detectedVariable = detectSingleVariable(node);
  if (detectedVariable === null && expressionHasVariable(node)) {
    return null;
  }

  const normalized = normalizeAbsoluteNode(node);
  if (!normalized.changed) {
    return null;
  }

  const normalizedNode = normalizeAst(normalized.node);
  return {
    changed: true,
    normalizedNode,
    normalizedLatex: boxLatex(normalizedNode),
    exactSupplementLatex: buildConditionSupplementLatex([]),
  };
}
