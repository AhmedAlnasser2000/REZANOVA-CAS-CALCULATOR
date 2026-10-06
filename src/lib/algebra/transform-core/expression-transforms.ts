import type { SerializableMathJson } from '../../../types/calculator';
import { mergeExactSupplementLatex } from '../exact-supplements';
import {
  boxLatex,
  compactRepeatedProductFactors,
  termKey,
} from '../../symbolic-engine/patterns';
import { normalizeExactPowerLogNode } from '../../symbolic-engine/power-log';
import { applyConjugateTransformNode, normalizeExactRadicalNode } from '../../symbolic-engine/radical';
import { normalizeExactRationalNode } from '../../symbolic-engine/rational';
import { hasAdditiveStructure } from './parsing';
import type { AlgebraTransformResult } from './types';
import { profileSharedAlgebraResult } from '../../display/printer';

export function rewriteExpressionAsRoot(node: unknown): AlgebraTransformResult | null {
  const normalized = normalizeExactPowerLogNode(node, 'rewrite-root');
  if (!normalized) {
    return null;
  }

  return {
    exactLatex: normalized.normalizedLatex,
    exactMathJson: normalized.normalizedNode as SerializableMathJson,
    domainConstraints: normalized.conditionConstraints,
    exactSupplementLatex: normalized.exactSupplementLatex,
    transformBadges: ['Rewrite as Root'],
    transformSummaryText: 'Rewrote the supported power form as exact root notation',
  };
}

export function rewriteExpressionAsPower(node: unknown): AlgebraTransformResult | null {
  const normalized = normalizeExactPowerLogNode(node, 'rewrite-power');
  if (!normalized) {
    return null;
  }

  return {
    exactLatex: normalized.normalizedLatex,
    exactMathJson: normalized.normalizedNode as SerializableMathJson,
    domainConstraints: normalized.conditionConstraints,
    exactSupplementLatex: normalized.exactSupplementLatex,
    transformBadges: ['Rewrite as Power'],
    transformSummaryText: 'Rewrote the supported root form as an exact rational exponent',
  };
}

export function changeExpressionBase(node: unknown): AlgebraTransformResult | null {
  const normalized = normalizeExactPowerLogNode(node, 'change-base');
  if (!normalized) {
    return null;
  }

  return {
    exactLatex: normalized.normalizedLatex,
    exactMathJson: normalized.normalizedNode as SerializableMathJson,
    domainConstraints: normalized.conditionConstraints,
    exactSupplementLatex: normalized.exactSupplementLatex,
    transformBadges: ['Change Base'],
    transformSummaryText: 'Rewrote the logarithm using exact natural-log change of base',
  };
}

export function combineFractionsExpression(node: unknown): AlgebraTransformResult | null {
  if (!hasAdditiveStructure(node)) {
    return null;
  }

  const rational = normalizeExactRationalNode(node, 'simplify');
  if (!rational?.changed) {
    return null;
  }

  return {
    exactLatex: rational.normalizedLatex,
    exactMathJson: rational.normalizedNode as SerializableMathJson,
    domainConstraints: rational.exclusionConstraints,
    exactSupplementLatex: rational.exactSupplementLatex,
    transformBadges: ['Combine Fractions'],
    transformSummaryText: rational.denominatorLatex
      ? 'Combined fractions over LCD'
      : 'Combined fractions into one exact rational form',
    transformSummaryLatex: rational.denominatorLatex,
    transformSummaryMathJson: rational.denominatorNode as SerializableMathJson | undefined,
  };
}

export function cancelFactorsExpression(node: unknown): AlgebraTransformResult | null {
  const factored = normalizeExactRationalNode(node, 'factor');
  const simplified = normalizeExactRationalNode(node, 'simplify');
  if (!factored || !simplified) {
    return null;
  }

  if (termKey(factored.normalizedNode) === termKey(simplified.normalizedNode)) {
    return null;
  }

  const factoredSimplified = normalizeExactRationalNode(simplified.normalizedNode, 'factor');
  const compactedFactoredNode = factoredSimplified
    ? compactRepeatedProductFactors(factoredSimplified.normalizedNode)
    : null;

  return profileSharedAlgebraResult({
    exactLatex: compactedFactoredNode && factoredSimplified
      ? boxLatex(compactedFactoredNode)
      : simplified.normalizedLatex,
    exactMathJson: (compactedFactoredNode ?? simplified.normalizedNode) as SerializableMathJson,
    domainConstraints: simplified.exclusionConstraints,
    exactSupplementLatex: simplified.exactSupplementLatex,
    transformBadges: ['Cancel Factors'],
    transformSummaryText: 'Canceled supported common factors while preserving original exclusions',
  });
}

export function rewriteWithLcdExpression(node: unknown): AlgebraTransformResult | null {
  if (!hasAdditiveStructure(node)) {
    return null;
  }

  const rational = normalizeExactRationalNode(node, 'lcd');
  if (!rational?.changed) {
    return null;
  }

  return {
    exactLatex: rational.normalizedLatex,
    exactMathJson: rational.normalizedNode as SerializableMathJson,
    domainConstraints: rational.exclusionConstraints,
    exactSupplementLatex: rational.exactSupplementLatex,
    transformBadges: ['Use LCD'],
    transformSummaryText: rational.denominatorLatex
      ? 'Rewrote the expression over LCD'
      : 'Rewrote the expression over an exact common denominator',
    transformSummaryLatex: rational.denominatorLatex,
    transformSummaryMathJson: rational.denominatorNode as SerializableMathJson | undefined,
  };
}

export function rationalizeExpression(node: unknown): AlgebraTransformResult | null {
  const radical = normalizeExactRadicalNode(node, 'simplify');
  if (!radical?.rationalized) {
    return null;
  }

  return {
    exactLatex: radical.normalizedLatex,
    exactMathJson: radical.normalizedNode as SerializableMathJson,
    domainConstraints: radical.conditionConstraints,
    exactSupplementLatex: mergeExactSupplementLatex(
      { latex: radical.exactSupplementLatex, source: 'legacy' },
    ),
    transformBadges: ['Rationalize'],
    transformSummaryText: 'Rationalized the supported radical denominator exactly',
  };
}

export function conjugateExpression(node: unknown): AlgebraTransformResult | null {
  const conjugate = applyConjugateTransformNode(node);
  if (!conjugate) {
    return null;
  }

  return {
    exactLatex: conjugate.normalizedLatex,
    exactMathJson: conjugate.normalizedNode as SerializableMathJson,
    domainConstraints: conjugate.conditionConstraints,
    exactSupplementLatex: mergeExactSupplementLatex(
      { latex: conjugate.exactSupplementLatex, source: 'legacy' },
    ),
    transformBadges: ['Conjugate'],
    transformSummaryText: 'Applied a conjugate to remove a square-root denominator',
  };
}
