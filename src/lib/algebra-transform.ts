import { ComputeEngine } from '@cortex-js/compute-engine';
import type { TransformBadge } from '../types/calculator';
import { normalizeAst } from './symbolic-engine/normalize';
import {
  boxLatex,
  flattenAdd,
  isNodeArray,
  termKey,
} from './symbolic-engine/patterns';
import { normalizeExactRadicalNode, applyConjugateTransformNode } from './symbolic-engine/radical';
import { normalizeExactRationalNode } from './symbolic-engine/rational';

const ce = new ComputeEngine();

export type AlgebraTransformAction =
  | 'combineFractions'
  | 'cancelFactors'
  | 'useLCD'
  | 'rationalize'
  | 'conjugate';

export type AlgebraTransformResult = {
  exactLatex: string;
  exactSupplementLatex?: string[];
  transformBadges: TransformBadge[];
  transformSummaryText: string;
};

const ACTION_LABELS: Record<AlgebraTransformAction, string> = {
  combineFractions: 'Combine Fractions',
  cancelFactors: 'Cancel Factors',
  useLCD: 'Use LCD',
  rationalize: 'Rationalize',
  conjugate: 'Conjugate',
};

const ACTION_ORDER: AlgebraTransformAction[] = [
  'combineFractions',
  'cancelFactors',
  'useLCD',
  'rationalize',
  'conjugate',
];

function mergeSupplementLatex(left: string[] = [], right: string[] = []) {
  return [...new Set([...left, ...right])];
}

function hasAdditiveStructure(node: unknown) {
  return flattenAdd(normalizeAst(node)).length > 1;
}

function parseExpressionNode(latex: string) {
  try {
    return normalizeAst(ce.parse(latex).json);
  } catch {
    return null;
  }
}

function parseEquationNode(latex: string) {
  const parsed = parseExpressionNode(latex);
  if (!parsed || !isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  return {
    left: normalizeAst(parsed[1]),
    right: normalizeAst(parsed[2]),
  };
}

function combineFractionsExpression(node: unknown): AlgebraTransformResult | null {
  if (!hasAdditiveStructure(node)) {
    return null;
  }

  const rational = normalizeExactRationalNode(node, 'simplify');
  if (!rational?.changed) {
    return null;
  }

  return {
    exactLatex: rational.normalizedLatex,
    exactSupplementLatex: rational.exactSupplementLatex,
    transformBadges: ['Combine Fractions'],
    transformSummaryText: rational.denominatorLatex
      ? `Combined fractions over LCD ${rational.denominatorLatex}`
      : 'Combined fractions into one exact rational form',
  };
}

function cancelFactorsExpression(node: unknown): AlgebraTransformResult | null {
  const factored = normalizeExactRationalNode(node, 'factor');
  const simplified = normalizeExactRationalNode(node, 'simplify');
  if (!factored || !simplified) {
    return null;
  }

  if (termKey(factored.normalizedNode) === termKey(simplified.normalizedNode)) {
    return null;
  }

  return {
    exactLatex: simplified.normalizedLatex,
    exactSupplementLatex: simplified.exactSupplementLatex,
    transformBadges: ['Cancel Factors'],
    transformSummaryText: 'Canceled supported common factors while preserving original exclusions',
  };
}

function rewriteWithLcdExpression(node: unknown): AlgebraTransformResult | null {
  if (!hasAdditiveStructure(node)) {
    return null;
  }

  const rational = normalizeExactRationalNode(node, 'lcd');
  if (!rational?.changed) {
    return null;
  }

  return {
    exactLatex: rational.normalizedLatex,
    exactSupplementLatex: rational.exactSupplementLatex,
    transformBadges: ['Use LCD'],
    transformSummaryText: rational.denominatorLatex
      ? `Rewrote the expression over LCD ${rational.denominatorLatex}`
      : 'Rewrote the expression over an exact common denominator',
  };
}

function rationalizeExpression(node: unknown): AlgebraTransformResult | null {
  const radical = normalizeExactRadicalNode(node, 'simplify');
  if (!radical?.rationalized) {
    return null;
  }

  return {
    exactLatex: radical.normalizedLatex,
    exactSupplementLatex: radical.exactSupplementLatex,
    transformBadges: ['Rationalize'],
    transformSummaryText: 'Rationalized the supported radical denominator exactly',
  };
}

function conjugateExpression(node: unknown): AlgebraTransformResult | null {
  const conjugate = applyConjugateTransformNode(node);
  if (!conjugate) {
    return null;
  }

  return {
    exactLatex: conjugate.normalizedLatex,
    exactSupplementLatex: conjugate.exactSupplementLatex,
    transformBadges: ['Conjugate'],
    transformSummaryText: 'Applied a conjugate to remove a square-root denominator',
  };
}

function applyExpressionTransformNode(
  node: unknown,
  action: AlgebraTransformAction,
): AlgebraTransformResult | null {
  switch (action) {
    case 'combineFractions':
      return combineFractionsExpression(node);
    case 'cancelFactors':
      return cancelFactorsExpression(node);
    case 'useLCD':
      return rewriteWithLcdExpression(node);
    case 'rationalize':
      return rationalizeExpression(node);
    case 'conjugate':
      return conjugateExpression(node);
    default:
      return null;
  }
}

function combineEquationSideFractions(node: unknown) {
  if (!hasAdditiveStructure(node)) {
    return null;
  }

  const rational = normalizeExactRationalNode(node, 'simplify');
  if (!rational?.changed) {
    return null;
  }

  return {
    latex: rational.normalizedLatex,
    supplement: rational.exactSupplementLatex,
  };
}

function cancelEquationSideFactors(node: unknown) {
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
    supplement: simplified.exactSupplementLatex,
  };
}

function rationalizeEquationSide(node: unknown) {
  const radical = normalizeExactRadicalNode(node, 'simplify');
  if (!radical?.rationalized) {
    return null;
  }

  return {
    latex: radical.normalizedLatex,
    supplement: radical.exactSupplementLatex,
  };
}

function conjugateEquationSide(node: unknown) {
  const conjugate = applyConjugateTransformNode(node);
  if (!conjugate) {
    return null;
  }

  return {
    latex: conjugate.normalizedLatex,
    supplement: conjugate.exactSupplementLatex,
  };
}

function combineFractionsEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  const leftResult = combineEquationSideFractions(left);
  const rightResult = combineEquationSideFractions(right);
  if (!leftResult && !rightResult) {
    return null;
  }

  return {
    exactLatex: `${leftResult?.latex ?? boxLatex(left)}=${rightResult?.latex ?? boxLatex(right)}`,
    exactSupplementLatex: mergeSupplementLatex(leftResult?.supplement, rightResult?.supplement),
    transformBadges: ['Combine Fractions'],
    transformSummaryText: 'Combined supported fractions on each side into exact rational form',
  };
}

function cancelFactorsEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  const leftResult = cancelEquationSideFactors(left);
  const rightResult = cancelEquationSideFactors(right);
  if (!leftResult && !rightResult) {
    return null;
  }

  return {
    exactLatex: `${leftResult?.latex ?? boxLatex(left)}=${rightResult?.latex ?? boxLatex(right)}`,
    exactSupplementLatex: mergeSupplementLatex(leftResult?.supplement, rightResult?.supplement),
    transformBadges: ['Cancel Factors'],
    transformSummaryText: 'Canceled supported common factors within each side of the equation',
  };
}

function rewriteWithLcdEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
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
      ? `Cleared the equation by multiplying through by LCD ${rational.denominatorLatex}`
      : 'Cleared the equation with an exact LCD transform',
  };
}

function rationalizeEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  const leftResult = rationalizeEquationSide(left);
  const rightResult = rationalizeEquationSide(right);
  if (!leftResult && !rightResult) {
    return null;
  }

  return {
    exactLatex: `${leftResult?.latex ?? boxLatex(left)}=${rightResult?.latex ?? boxLatex(right)}`,
    exactSupplementLatex: mergeSupplementLatex(leftResult?.supplement, rightResult?.supplement),
    transformBadges: ['Rationalize'],
    transformSummaryText: 'Rationalized the supported radical denominator inside the equation',
  };
}

function conjugateEquation(left: unknown, right: unknown): AlgebraTransformResult | null {
  const leftResult = conjugateEquationSide(left);
  const rightResult = conjugateEquationSide(right);
  if (!leftResult && !rightResult) {
    return null;
  }

  return {
    exactLatex: `${leftResult?.latex ?? boxLatex(left)}=${rightResult?.latex ?? boxLatex(right)}`,
    exactSupplementLatex: mergeSupplementLatex(leftResult?.supplement, rightResult?.supplement),
    transformBadges: ['Conjugate'],
    transformSummaryText: 'Applied the bounded conjugate transform inside the equation',
  };
}

function applyEquationTransformNode(
  left: unknown,
  right: unknown,
  action: AlgebraTransformAction,
): AlgebraTransformResult | null {
  switch (action) {
    case 'combineFractions':
      return combineFractionsEquation(left, right);
    case 'cancelFactors':
      return cancelFactorsEquation(left, right);
    case 'useLCD':
      return rewriteWithLcdEquation(left, right);
    case 'rationalize':
      return rationalizeEquation(left, right);
    case 'conjugate':
      return conjugateEquation(left, right);
    default:
      return null;
  }
}

export function getAlgebraTransformLabel(action: AlgebraTransformAction) {
  return ACTION_LABELS[action];
}

export function getEligibleExpressionTransforms(latex: string) {
  const parsed = parseExpressionNode(latex);
  if (!parsed) {
    return [] as AlgebraTransformAction[];
  }

  return ACTION_ORDER.filter((action) => applyExpressionTransformNode(parsed, action));
}

export function applyExpressionTransform(latex: string, action: AlgebraTransformAction) {
  const parsed = parseExpressionNode(latex);
  if (!parsed) {
    return null;
  }

  return applyExpressionTransformNode(parsed, action);
}

export function getEligibleEquationTransforms(latex: string) {
  const equation = parseEquationNode(latex);
  if (!equation) {
    return [] as AlgebraTransformAction[];
  }

  return ACTION_ORDER.filter((action) => applyEquationTransformNode(equation.left, equation.right, action));
}

export function applyEquationTransform(latex: string, action: AlgebraTransformAction) {
  const equation = parseEquationNode(latex);
  if (!equation) {
    return null;
  }

  return applyEquationTransformNode(equation.left, equation.right, action);
}
