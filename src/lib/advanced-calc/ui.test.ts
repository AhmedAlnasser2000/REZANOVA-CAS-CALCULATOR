import { describe, expect, it } from 'vitest';
import { getAdvancedCalcRouteMeta } from './navigation';
import { getAdvancedCalcProvenanceBadge } from './ui';

describe('advanced calc ui', () => {
  it('maps provenance badges for all supported origins', () => {
    expect(getAdvancedCalcProvenanceBadge('symbolic')).toEqual({
      label: 'Symbolic',
      variant: 'symbolic',
    });
    expect(getAdvancedCalcProvenanceBadge('rule-based-symbolic')).toEqual({
      label: 'Rule-based symbolic',
      variant: 'rule',
    });
    expect(getAdvancedCalcProvenanceBadge('heuristic-symbolic')).toEqual({
      label: 'Heuristic symbolic',
      variant: 'heuristic',
    });
    expect(getAdvancedCalcProvenanceBadge('numeric-fallback')).toEqual({
      label: 'Numeric fallback',
      variant: 'numeric',
    });
  });

  it('exposes preview copy and empty-state metadata', () => {
    const improper = getAdvancedCalcRouteMeta('improperIntegral');
    const taylor = getAdvancedCalcRouteMeta('taylor');
    const partial = getAdvancedCalcRouteMeta('partialDerivative');

    expect(improper.previewTitle).toBe('Generated Improper Integral');
    expect(improper.emptyStateDescription).toContain('improper integral');
    expect(improper.guideArticleId).toBe('advanced-integrals');
    expect(taylor.previewSubtitle).toBe('Centered at a numeric value');
    expect(taylor.emptyStateTitle).toBe('Body, center, and order needed');
    expect(partial.previewTitle).toBe('Generated Partial Derivative');
    expect(partial.emptyStateDescription).toContain('multivariable expression');
    expect(partial.guideArticleId).toBe('advanced-partials');
  });
});
