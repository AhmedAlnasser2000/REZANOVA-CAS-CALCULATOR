import { mergeExactSupplementLatex } from '../exact-supplements';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { boxLatex, termKey } from '../../symbolic-engine/patterns';
import { normalizeExactPowerLogNode } from '../../symbolic-engine/power-log';
import { applyConjugateTransformNode, normalizeExactRadicalNode } from '../../symbolic-engine/radical';
import { normalizeExactRationalNode } from '../../symbolic-engine/rational';
import { hasAdditiveStructure } from './parsing';
import { buildTwoSideEquationResult } from './result';
import type { AlgebraTransformResult, TransformSideResult } from './types';
import type { SerializableMathJson } from '../../../types/calculator';

function rewriteEquationSideAsRoot(node: unknown): TransformSideResult | null {
  const normalized = normalizeExactPowerLogNode(node, 'rewrite-root');
  if (!normalized) {
    return null;
  }

  return {
    latex: normalized.normalizedLatex,
    node: normalized.normalizedNode as SerializableMathJson,
    supplement: normalized.exactSupplementLatex,
    constraints: normalized.conditionConstraints,
  };
}

function rewriteEquationSideAsPower(node: unknown): TransformSideResult | null {
  const normalized = normalizeExactPowerLogNode(node, 'rewrite-power');
  if (!normalized) {
    return null;
  }

  return {
    latex: normalized.normalizedLatex,
    node: normalized.normalizedNode as SerializableMathJson,
    supplement: normalized.exactSupplementLatex,
    constraints: normalized.conditionConstraints,
  };
}

function changeEquationSideBase(node: unknown): TransformSideResult | null {
  const normalized = normalizeExactPowerLogNode(node, 'change-base');
  if (!normalized) {
    return null;
  }

  return {
    latex: normalized.normalizedLatex,
    node: normalized.normalizedNode as SerializableMathJson,
    supplement: normalized.exactSupplementLatex,
    constraints: normalized.conditionConstraints,
  };
}

function combineEquationSideFractions(node: unknown): TransformSideResult | null {
  if (!hasAdditiveStructure(node)) {
    return null;
  }

  const rational = normalizeExactRationalNode(node, 'simplify');
  if (!rational?.changed) {
    return null;
  }

  return {
    latex: rational.normalizedLatex,
    node: rational.normalizedNode as SerializableMathJson,
    supplement: rational.exactSupplementLatex,
    constraints: rational.exclusionConstraints,
  };
}

function cancelEquationSideFactors(node: unknown): TransformSideResult | null {
  const factored = normalizeExactRationalNode(node, 'factor');
  const simplified = normalizeExactRationalNode(node, 'simplify');
  if (!factored || !simplified) {
    return null;
  }

  if (termKey(factored.normalizedNode) === termKey(simplified.normalizedNode)) {
    return null;
  }

  return {
    latex: simplified.normalizedLatex,
    node: simplified.normalizedNode as SerializableMathJson,
    supplement: simplified.exactSupplementLatex,
    constraints: simplified.exclusionConstraints,
  };
}

function rationalizeEquationSide(node: unknown): TransformSideResult | null {
  const radical = normalizeExactRadicalNode(node, 'simplify');
  if (!radical?.rationalized) {
    return null;
  }

  return {
    latex: radical.normalizedLatex,
    node: radical.normalizedNode as SerializableMathJson,
    supplement: mergeExactSupplementLatex(
      { latex: radical.exactSupplementLatex, source: 'legacy' },
    ),
    constraints: radical.conditionConstraints,
  };
}

function conjugateEquationSide(node: unknown): TransformSideResult | null {
  const conjugate = applyConjugateTransformNode(node);
  if (!conjugate) {
    return null;
  }

  return {
    latex: conjugate.normalizedLatex,
    node: conjugate.normalizedNode as SerializableMathJson,
    supplement: mergeExactSupplementLatex(
      { latex: conjugate.exactSupplementLatex, source: 'legacy' },
    ),
    constraints: conjugate.conditionConstraints,
  };
}

export function rewriteAsRootEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  return buildTwoSideEquationResult(
    left,
    right,
    rewriteEquationSideAsRoot(left),
    rewriteEquationSideAsRoot(right),
    ['Rewrite as Root'],
    'Rewrote supported rational exponents as exact root notation',
  );
}

export function rewriteAsPowerEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  return buildTwoSideEquationResult(
    left,
    right,
    rewriteEquationSideAsPower(left),
    rewriteEquationSideAsPower(right),
    ['Rewrite as Power'],
    'Rewrote supported roots as exact rational exponents',
  );
}

export function changeBaseEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  return buildTwoSideEquationResult(
    left,
    right,
    changeEquationSideBase(left),
    changeEquationSideBase(right),
    ['Change Base'],
    'Rewrote supported explicit-base logs with exact natural-log change of base',
  );
}

export function combineFractionsEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  return buildTwoSideEquationResult(
    left,
    right,
    combineEquationSideFractions(left),
    combineEquationSideFractions(right),
    ['Combine Fractions'],
    'Combined supported fractions on each side into exact rational form',
  );
}

export function cancelFactorsEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  return buildTwoSideEquationResult(
    left,
    right,
    cancelEquationSideFactors(left),
    cancelEquationSideFactors(right),
    ['Cancel Factors'],
    'Canceled supported common factors within each side of the equation',
  );
}

export function rewriteWithLcdEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  const zeroForm = normalizeAst(['Add', left, ['Negate', right]]);
  const rational = normalizeExactRationalNode(zeroForm, 'lcd');
  if (!rational?.denominatorNode) {
    return null;
  }

  const exactLatex = `${rational.numeratorLatex}=0`;
  const originalLatex = `${boxLatex(left)}=${boxLatex(right)}`;
  if (exactLatex === originalLatex) {
    return null;
  }

  return {
    exactLatex,
    exactSupplementLatex: rational.exactSupplementLatex,
    transformBadges: ['Use LCD'],
    transformSummaryText: rational.denominatorLatex
      ? 'Cleared the equation by multiplying through by LCD'
      : 'Cleared the equation with an exact LCD transform',
    transformSummaryLatex: rational.denominatorLatex,
  };
}

export function rationalizeEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  return buildTwoSideEquationResult(
    left,
    right,
    rationalizeEquationSide(left),
    rationalizeEquationSide(right),
    ['Rationalize'],
    'Rationalized the supported radical denominator inside the equation',
  );
}

export function conjugateEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  return buildTwoSideEquationResult(
    left,
    right,
    conjugateEquationSide(left),
    conjugateEquationSide(right),
    ['Conjugate'],
    'Applied the bounded conjugate transform inside the equation',
  );
}
