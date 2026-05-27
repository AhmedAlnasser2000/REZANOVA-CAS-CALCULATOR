import type { AlgebraTransformAction } from './transform-core';
import type { TransformBadge } from '../../types/calculator';

const TRANSFORM_LABELS: Record<AlgebraTransformAction, TransformBadge> = {
  rewriteAsRoot: 'Rewrite as Root',
  rewriteAsPower: 'Rewrite as Power',
  changeBase: 'Change Base',
  combineFractions: 'Combine Fractions',
  cancelFactors: 'Cancel Factors',
  useLCD: 'Use LCD',
  rationalize: 'Rationalize',
  conjugate: 'Conjugate',
};

export type { AlgebraTransformAction };

export function getAlgebraTransformLabel(action: AlgebraTransformAction) {
  return TRANSFORM_LABELS[action];
}
