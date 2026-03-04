import { describe, expect, it } from 'vitest';
import {
  getCalculateParentScreen,
  getCalculateRouteMeta,
  getCalculateSoftActions,
  moveCalculateMenuIndex,
} from './calculate-navigation';

describe('calculate navigation', () => {
  it('returns the expected route breadcrumbs', () => {
    expect(getCalculateRouteMeta('calculusHome').breadcrumb).toEqual([
      'Calculate',
      'Calculus',
    ]);
    expect(getCalculateRouteMeta('limit').breadcrumb).toEqual([
      'Calculate',
      'Calculus',
      'Limit',
    ]);
    expect(getCalculateRouteMeta('integral').previewTitle).toBe('Generated Integral');
    expect(getCalculateRouteMeta('limit').emptyStateDescription).toContain('limit expression');
    expect(getCalculateRouteMeta('derivative').guideArticleId).toBe('calculus-derivatives');
  });

  it('clamps calculus menu movement at bounds', () => {
    expect(moveCalculateMenuIndex(0, -1)).toBe(0);
    expect(moveCalculateMenuIndex(1, 10)).toBe(3);
  });

  it('returns the right parent screens', () => {
    expect(getCalculateParentScreen('standard')).toBeNull();
    expect(getCalculateParentScreen('calculusHome')).toBe('standard');
    expect(getCalculateParentScreen('integral')).toBe('calculusHome');
  });

  it('uses route-aware soft actions for workbench screens', () => {
    expect(getCalculateSoftActions('standard').map((action) => action.id)).toEqual([
      'simplify',
      'factor',
      'expand',
      'numeric',
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
