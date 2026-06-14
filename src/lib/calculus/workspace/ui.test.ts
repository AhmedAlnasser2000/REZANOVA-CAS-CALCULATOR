import { describe, expect, it } from 'vitest';
import { getCalculusRouteMeta } from './navigation';
import { getCalculusProvenanceBadge } from './ui';

describe('advanced calc ui', () => {
  it('maps provenance badges for all supported origins', () => {
    expect(getCalculusProvenanceBadge('symbolic')).toEqual({
      label: 'Symbolic',
      variant: 'symbolic',
    });
    expect(getCalculusProvenanceBadge('rule-based-symbolic')).toEqual({
      label: 'Rule-based symbolic',
      variant: 'rule',
    });
    expect(getCalculusProvenanceBadge('heuristic-symbolic')).toEqual({
      label: 'Heuristic symbolic',
      variant: 'heuristic',
    });
    expect(getCalculusProvenanceBadge('numeric-fallback')).toEqual({
      label: 'Numeric fallback',
      variant: 'numeric',
    });
  });

  it('exposes preview copy and empty-state metadata', () => {
    const improper = getCalculusRouteMeta('improperIntegral');
    const taylor = getCalculusRouteMeta('taylor');
    const partial = getCalculusRouteMeta('partialDerivative');

    expect(improper.previewTitle).toBe('Generated Improper Integral');
    expect(improper.emptyStateDescription).toContain('improper integral');
    expect(improper.guideArticleId).toBe('calculus-integrals');
    expect(taylor.previewSubtitle).toBe('Centered at a numeric value');
    expect(taylor.emptyStateTitle).toBe('Body, center, and order needed');
    expect(partial.previewTitle).toBe('Generated Partial Derivative');
    expect(partial.emptyStateDescription).toContain('multivariable expression');
    expect(partial.guideArticleId).toBe('calculus-partials');
  });
});
