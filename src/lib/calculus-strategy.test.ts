import { describe, expect, it } from 'vitest';
import {
  getCalculusDerivativeStrategyBadge,
  getCalculusStrategyBadge,
} from './calculus-strategy';

describe('calculus strategy badges', () => {
  it('maps all integration strategies to visible badge labels', () => {
    expect(getCalculusStrategyBadge('direct-rule')).toEqual({ label: 'Direct rule' });
    expect(getCalculusStrategyBadge('inverse-trig')).toEqual({ label: 'Inverse trig' });
    expect(getCalculusStrategyBadge('derivative-ratio')).toEqual({ label: 'Derivative ratio' });
    expect(getCalculusStrategyBadge('u-substitution')).toEqual({ label: 'U-substitution' });
    expect(getCalculusStrategyBadge('integration-by-parts')).toEqual({ label: 'Integration by parts' });
    expect(getCalculusStrategyBadge('affine-linear')).toEqual({ label: 'Affine linear' });
    expect(getCalculusStrategyBadge('compute-engine')).toEqual({ label: 'Compute Engine' });
  });

  it('maps all derivative strategies to visible badge labels', () => {
    expect(getCalculusDerivativeStrategyBadge('direct-rule')).toEqual({ label: 'Direct rule' });
    expect(getCalculusDerivativeStrategyBadge('chain-rule')).toEqual({ label: 'Chain rule' });
    expect(getCalculusDerivativeStrategyBadge('product-rule')).toEqual({ label: 'Product rule' });
    expect(getCalculusDerivativeStrategyBadge('quotient-rule')).toEqual({ label: 'Quotient rule' });
    expect(getCalculusDerivativeStrategyBadge('general-power')).toEqual({ label: 'General power' });
    expect(getCalculusDerivativeStrategyBadge('function-power')).toEqual({ label: 'Function power' });
    expect(getCalculusDerivativeStrategyBadge('inverse-trig')).toEqual({ label: 'Inverse trig' });
    expect(getCalculusDerivativeStrategyBadge('inverse-hyperbolic')).toEqual({ label: 'Inverse hyperbolic' });
    expect(getCalculusDerivativeStrategyBadge('compute-engine')).toEqual({ label: 'Compute Engine' });
  });
});
