import { describe, expect, it } from 'vitest';
import { getCalculusStrategyBadge } from './calculus-strategy';

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
});
