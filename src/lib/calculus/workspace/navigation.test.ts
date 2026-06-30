import { describe, expect, it } from 'vitest';
import {
  getCalculusMenuEntries,
  getCalculusParentScreen,
  getCalculusRouteMeta,
  getCalculusSoftActions,
  moveCalculusMenuIndex,
} from './navigation';

describe('calculus navigation', () => {
  it('returns route metadata and breadcrumbs', () => {
    expect(getCalculusRouteMeta('home').breadcrumb).toEqual(['Calculus']);
    expect(getCalculusRouteMeta('derivative').breadcrumb).toEqual([
      'Calculus',
      'Derivatives',
      'Derivative',
    ]);
    expect(getCalculusRouteMeta('taylor').breadcrumb).toEqual([
      'Calculus',
      'Series',
      'Taylor',
    ]);
    expect(getCalculusRouteMeta('taylor').previewTitle).toBe('Generated Taylor Request');
    expect(getCalculusRouteMeta('taylor').previewSubtitle).toBe('Centered at a numeric value');
    expect(getCalculusRouteMeta('laplace').previewTitle).toBe('Generated Laplace Request');
    expect(getCalculusRouteMeta('laplace').previewSubtitle).toContain('source variable t');
    expect(getCalculusRouteMeta('odeNumericIvp').emptyStateTitle).toBe('IVP data needed');
  });

  it('links route metadata to guide articles when expected', () => {
    expect(getCalculusRouteMeta('derivative').guideArticleId).toBe('calculus-derivatives');
    expect(getCalculusRouteMeta('derivativePoint').guideArticleId).toBe('calculus-derivatives');
    expect(getCalculusRouteMeta('indefiniteIntegral').guideArticleId).toBe('calculus-integrals');
    expect(getCalculusRouteMeta('finiteLimit').guideArticleId).toBe('calculus-limits');
    expect(getCalculusRouteMeta('maclaurin').guideArticleId).toBe('calculus-series');
    expect(getCalculusRouteMeta('laplace').guideArticleId).toBe('calculus-odes');
    expect(getCalculusRouteMeta('partialDerivative').guideArticleId).toBe('calculus-partials');
    expect(getCalculusRouteMeta('implicitDerivative').guideArticleId).toBe('calculus-derivatives');
  });

  it('clamps menu movement by screen', () => {
    expect(moveCalculusMenuIndex('home', 0, -1)).toBe(0);
    expect(moveCalculusMenuIndex('home', 2, 10)).toBe(5);
    expect(moveCalculusMenuIndex('derivativesHome', 0, 10)).toBe(3);
    expect(moveCalculusMenuIndex('limitsHome', 1, 10)).toBe(1);
    expect(moveCalculusMenuIndex('partialsHome', 0, 10)).toBe(0);
  });

  it('keeps partial derivatives under the derivatives menu', () => {
    expect(getCalculusMenuEntries('home').map((entry) => entry.label)).not.toContain('Partials');
    expect(getCalculusMenuEntries('derivativesHome').map((entry) => entry.label)).toEqual([
      'Derivative',
      'Derivative at Point',
      'Partial Derivative',
      'Implicit Derivative',
    ]);
  });

  it('returns expected parent routes', () => {
    expect(getCalculusParentScreen('home')).toBeNull();
    expect(getCalculusParentScreen('derivativesHome')).toBe('home');
    expect(getCalculusParentScreen('derivative')).toBe('derivativesHome');
    expect(getCalculusParentScreen('derivativePoint')).toBe('derivativesHome');
    expect(getCalculusParentScreen('integralsHome')).toBe('home');
    expect(getCalculusParentScreen('improperIntegral')).toBe('integralsHome');
    expect(getCalculusParentScreen('laplace')).toBe('home');
    expect(getCalculusParentScreen('partialsHome')).toBe('home');
    expect(getCalculusParentScreen('partialDerivative')).toBe('derivativesHome');
    expect(getCalculusParentScreen('implicitDerivative')).toBe('derivativesHome');
    expect(getCalculusParentScreen('odeNumericIvp')).toBe('odeHome');
  });

  it('uses route-aware soft actions', () => {
    expect(getCalculusSoftActions('home').map((action) => action.id)).toEqual([
      'open',
      'guide',
      'back',
      'exit',
    ]);
    expect(getCalculusSoftActions('indefiniteIntegral').map((action) => action.id)).toEqual([
      'evaluate',
      'toEditor',
      'menu',
      'clear',
      'history',
    ]);
    expect(getCalculusSoftActions('indefiniteIntegral').find((action) => action.id === 'toEditor')?.label)
      .toBe('Focus Editor');
    expect(getCalculusSoftActions('laplace').find((action) => action.id === 'toEditor')?.label)
      .toBe('Focus Editor');
    expect(getCalculusSoftActions('derivative').find((action) => action.id === 'toEditor')?.label)
      .toBe('Focus Editor');
    expect(getCalculusSoftActions('derivativePoint').find((action) => action.id === 'toEditor')?.label)
      .toBe('Focus Editor');
    expect(getCalculusSoftActions('partialDerivative').find((action) => action.id === 'toEditor')?.label)
      .toBe('Focus Editor');
    expect(getCalculusSoftActions('implicitDerivative').find((action) => action.id === 'toEditor')?.label)
      .toBe('Focus Editor');
  });
});
