import {
  changeExpressionBase,
  combineFractionsExpression,
  conjugateExpression,
  cancelFactorsExpression,
  rationalizeExpression,
  rewriteExpressionAsPower,
  rewriteExpressionAsRoot,
  rewriteWithLcdExpression,
} from './expression-transforms';
import {
  changeBaseEquation,
  combineFractionsEquation,
  conjugateEquation,
  cancelFactorsEquation,
  rationalizeEquation,
  rewriteAsPowerEquation,
  rewriteAsRootEquation,
  rewriteWithLcdEquation,
} from './equation-transforms';
import {
  normalizeLatexForComparison,
  parseEquationNode,
  parseExpressionNode,
  supportsAnySource,
  supportsChangeBaseSource,
  supportsPowerSource,
  supportsRootSource,
} from './parsing';
import type { AlgebraTransformAction, TransformDescriptor } from './types';

const TRANSFORM_DESCRIPTORS: readonly TransformDescriptor[] = [
  {
    action: 'rewriteAsRoot',
    label: 'Rewrite as Root',
    sourceSupportsExplicitTransform: supportsPowerSource,
    applyExpression: rewriteExpressionAsRoot,
    applyEquation: rewriteAsRootEquation,
  },
  {
    action: 'rewriteAsPower',
    label: 'Rewrite as Power',
    sourceSupportsExplicitTransform: supportsRootSource,
    applyExpression: rewriteExpressionAsPower,
    applyEquation: rewriteAsPowerEquation,
  },
  {
    action: 'changeBase',
    label: 'Change Base',
    sourceSupportsExplicitTransform: supportsChangeBaseSource,
    applyExpression: changeExpressionBase,
    applyEquation: changeBaseEquation,
  },
  {
    action: 'combineFractions',
    label: 'Combine Fractions',
    sourceSupportsExplicitTransform: supportsAnySource,
    applyExpression: combineFractionsExpression,
    applyEquation: combineFractionsEquation,
  },
  {
    action: 'cancelFactors',
    label: 'Cancel Factors',
    sourceSupportsExplicitTransform: supportsAnySource,
    applyExpression: cancelFactorsExpression,
    applyEquation: cancelFactorsEquation,
  },
  {
    action: 'useLCD',
    label: 'Use LCD',
    sourceSupportsExplicitTransform: supportsAnySource,
    applyExpression: rewriteWithLcdExpression,
    applyEquation: rewriteWithLcdEquation,
  },
  {
    action: 'rationalize',
    label: 'Rationalize',
    sourceSupportsExplicitTransform: supportsAnySource,
    applyExpression: rationalizeExpression,
    applyEquation: rationalizeEquation,
  },
  {
    action: 'conjugate',
    label: 'Conjugate',
    sourceSupportsExplicitTransform: supportsAnySource,
    applyExpression: conjugateExpression,
    applyEquation: conjugateEquation,
  },
] as const;

const TRANSFORM_DESCRIPTOR_MAP: Record<AlgebraTransformAction, TransformDescriptor> =
  TRANSFORM_DESCRIPTORS.reduce(
    (map, descriptor) => ({
      ...map,
      [descriptor.action]: descriptor,
    }),
    {} as Record<AlgebraTransformAction, TransformDescriptor>,
  );

function getTransformDescriptor(action: AlgebraTransformAction) {
  return TRANSFORM_DESCRIPTOR_MAP[action];
}

export function listTransformCoreActions(): AlgebraTransformAction[] {
  return TRANSFORM_DESCRIPTORS.map((descriptor) => descriptor.action);
}

export function getTransformCoreLabel(action: AlgebraTransformAction) {
  return getTransformDescriptor(action).label;
}

export function getEligibleExpressionTransformsForLatex(latex: string) {
  const parsed = parseExpressionNode(latex);
  if (!parsed) {
    return [] as AlgebraTransformAction[];
  }

  const normalizedInput = normalizeLatexForComparison(latex);
  return TRANSFORM_DESCRIPTORS
    .filter((descriptor) => descriptor.sourceSupportsExplicitTransform(latex))
    .filter((descriptor) => {
      const result = descriptor.applyExpression(parsed);
      return Boolean(
        result
        && normalizeLatexForComparison(result.exactLatex) !== normalizedInput,
      );
    })
    .map((descriptor) => descriptor.action);
}

export function applyExpressionTransformToLatex(
  latex: string,
  action: AlgebraTransformAction,
) {
  const parsed = parseExpressionNode(latex);
  if (!parsed) {
    return null;
  }

  return getTransformDescriptor(action).applyExpression(parsed);
}

export function getEligibleEquationTransformsForLatex(latex: string) {
  const equation = parseEquationNode(latex);
  if (!equation) {
    return [] as AlgebraTransformAction[];
  }

  const normalizedInput = normalizeLatexForComparison(latex);
  return TRANSFORM_DESCRIPTORS
    .filter((descriptor) => descriptor.sourceSupportsExplicitTransform(latex))
    .filter((descriptor) => {
      const result = descriptor.applyEquation(equation.left, equation.right);
      return Boolean(
        result
        && normalizeLatexForComparison(result.exactLatex) !== normalizedInput,
      );
    })
    .map((descriptor) => descriptor.action);
}

export function applyEquationTransformToLatex(
  latex: string,
  action: AlgebraTransformAction,
) {
  const equation = parseEquationNode(latex);
  if (!equation) {
    return null;
  }

  return getTransformDescriptor(action).applyEquation(equation.left, equation.right);
}
