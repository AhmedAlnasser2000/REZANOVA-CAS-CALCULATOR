import type {
  CalculusDerivativeStrategy,
  CalculusIntegrationStrategy,
} from '../types/calculator';

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

export function getCalculusDerivativeStrategyBadge(
  strategy: CalculusDerivativeStrategy,
): CalculusStrategyBadge {
  switch (strategy) {
    case 'direct-rule':
      return { label: 'Direct rule' };
    case 'chain-rule':
      return { label: 'Chain rule' };
    case 'product-rule':
      return { label: 'Product rule' };
    case 'quotient-rule':
      return { label: 'Quotient rule' };
    case 'general-power':
      return { label: 'General power' };
    case 'function-power':
      return { label: 'Function power' };
    case 'inverse-trig':
      return { label: 'Inverse trig' };
    case 'inverse-hyperbolic':
      return { label: 'Inverse hyperbolic' };
    case 'compute-engine':
      return { label: 'Compute Engine' };
  }
}

export function getCalculusDerivativeStrategyBadges(
  strategies?: readonly CalculusDerivativeStrategy[],
) {
  return (strategies ?? []).map(getCalculusDerivativeStrategyBadge);
}
