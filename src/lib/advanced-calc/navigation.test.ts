import { describe, expect, it } from 'vitest';
import {
  getAdvancedCalcParentScreen,
  getAdvancedCalcRouteMeta,
  getAdvancedCalcSoftActions,
  moveAdvancedCalcMenuIndex,
} from './navigation';

describe('advanced calc navigation', () => {
  it('returns route metadata and breadcrumbs', () => {
    expect(getAdvancedCalcRouteMeta('home').breadcrumb).toEqual(['Advanced Calc']);
    expect(getAdvancedCalcRouteMeta('taylor').breadcrumb).toEqual([
      'Advanced Calc',
      'Series',
      'Taylor',
    ]);
    expect(getAdvancedCalcRouteMeta('taylor').previewTitle).toBe('Generated Taylor Request');
    expect(getAdvancedCalcRouteMeta('taylor').previewSubtitle).toBe('Centered at a numeric value');
    expect(getAdvancedCalcRouteMeta('odeNumericIvp').emptyStateTitle).toBe('IVP data needed');
  });

  it('links route metadata to guide articles when expected', () => {
    expect(getAdvancedCalcRouteMeta('indefiniteIntegral').guideArticleId).toBe('advanced-integrals');
    expect(getAdvancedCalcRouteMeta('finiteLimit').guideArticleId).toBe('advanced-limits');
    expect(getAdvancedCalcRouteMeta('maclaurin').guideArticleId).toBe('advanced-series');
    expect(getAdvancedCalcRouteMeta('partialDerivative').guideArticleId).toBe('advanced-partials');
  });

  it('clamps menu movement by screen', () => {
    expect(moveAdvancedCalcMenuIndex('home', 0, -1)).toBe(0);
    expect(moveAdvancedCalcMenuIndex('home', 2, 10)).toBe(4);
    expect(moveAdvancedCalcMenuIndex('limitsHome', 1, 10)).toBe(1);
    expect(moveAdvancedCalcMenuIndex('partialsHome', 0, 10)).toBe(0);
  });

  it('returns expected parent routes', () => {
    expect(getAdvancedCalcParentScreen('home')).toBeNull();
    expect(getAdvancedCalcParentScreen('integralsHome')).toBe('home');
    expect(getAdvancedCalcParentScreen('improperIntegral')).toBe('integralsHome');
    expect(getAdvancedCalcParentScreen('partialsHome')).toBe('home');
    expect(getAdvancedCalcParentScreen('partialDerivative')).toBe('partialsHome');
    expect(getAdvancedCalcParentScreen('odeNumericIvp')).toBe('odeHome');
  });

  it('uses route-aware soft actions', () => {
    expect(getAdvancedCalcSoftActions('home').map((action) => action.id)).toEqual([
      'open',
      'guide',
      'back',
      'exit',
    ]);
    expect(getAdvancedCalcSoftActions('indefiniteIntegral').map((action) => action.id)).toEqual([
      'evaluate',
      'toEditor',
      'menu',
      'clear',
      'history',
    ]);
  });
});
