import type { CalculusIntegrationStrategy } from '../types/calculator';

export type CalculusStrategyBadge = {
  label: string;
};

export function getCalculusStrategyBadge(
  strategy?: CalculusIntegrationStrategy,
): CalculusStrategyBadge | undefined {
  switch (strategy) {
    case 'direct-rule':
      return { label: 'Direct rule' };
    case 'inverse-trig':
      return { label: 'Inverse trig' };
    case 'derivative-ratio':
      return { label: 'Derivative ratio' };
    case 'u-substitution':
      return { label: 'U-substitution' };
    case 'integration-by-parts':
      return { label: 'Integration by parts' };
    case 'affine-linear':
      return { label: 'Affine linear' };
    case 'compute-engine':
      return { label: 'Compute Engine' };
    default:
      return undefined;
  }
}
