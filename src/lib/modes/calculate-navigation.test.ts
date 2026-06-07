import { describe, expect, it } from 'vitest';
import {
  getCalculateMenuEntries,
  getCalculateParentScreen,
  getCalculateRouteMeta,
  getCalculateSoftActions,
  moveCalculateMenuIndex,
} from './calculate-navigation';

describe('calculate navigation', () => {
  it('returns the expected route breadcrumbs', () => {
    expect(getCalculateRouteMeta('calculusHome').breadcrumb).toEqual(['Calculus']);
    expect(getCalculateRouteMeta('derivative').breadcrumb).toEqual([
      'Calculus',
      'Derivatives',
      'Derivative',
    ]);
    expect(getCalculateRouteMeta('limit').breadcrumb).toEqual([
      'Calculus',
      'Limits',
      'Limit',
    ]);
    expect(getCalculateRouteMeta('integral').previewTitle).toBe('Generated Integral');
    expect(getCalculateRouteMeta('limit').emptyStateDescription).toContain('limit expression');
    expect(getCalculateRouteMeta('derivative').guideArticleId).toBe('calculus-derivatives');
  });

  it('exposes the unified calculus section menu without duplicate basics', () => {
    expect(getCalculateMenuEntries('calculusHome').map((entry) => entry.label)).toEqual([
      'Derivatives',
      'Integrals',
      'Limits',
      'Series',
      'Differential Equations',
      'Partials',
    ]);
    expect(getCalculateMenuEntries('derivativesHome').map((entry) => entry.label)).toEqual([
      'Derivative',
      'Derivative at Point',
    ]);
  });

  it('clamps calculus menu movement at bounds', () => {
    expect(moveCalculateMenuIndex('calculusHome', 0, -1)).toBe(0);
    expect(moveCalculateMenuIndex('calculusHome', 1, 10)).toBe(5);
    expect(moveCalculateMenuIndex('derivativesHome', 1, 10)).toBe(1);
  });

  it('returns the right parent screens', () => {
    expect(getCalculateParentScreen('standard')).toBeNull();
    expect(getCalculateParentScreen('calculusHome')).toBe('standard');
    expect(getCalculateParentScreen('derivative')).toBe('derivativesHome');
    expect(getCalculateParentScreen('integral')).toBe('calculusHome');
  });

  it('uses route-aware soft actions for workbench screens', () => {
    expect(getCalculateSoftActions('standard').map((action) => action.id)).toEqual([
      'simplify',
      'factor',
      'expand',
      'algebra',
      'clear',
      'history',
    ]);
    expect(getCalculateSoftActions('limit').map((action) => action.id)).toEqual([
      'evaluate',
      'toEditor',
      'cycleLimitDirection',
      'clear',
      'history',
    ]);
  });
});
