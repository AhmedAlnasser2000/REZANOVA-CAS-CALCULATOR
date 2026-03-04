import { describe, expect, it } from 'vitest';
import {
  getEquationMenuEntries,
  getEquationParentScreen,
  getEquationSoftActions,
  isEquationMenuScreen,
  moveEquationMenuIndex,
} from './equation-navigation';

describe('equation navigation', () => {
  it('exposes the expected home entries', () => {
    const entries = getEquationMenuEntries('home');
    expect(entries.map((entry) => entry.label)).toEqual(['Symbolic', 'Polynomial', 'Simultaneous']);
    expect(entries[1]?.target).toBe('polynomialMenu');
  });

  it('exposes the expected polynomial submenu entries', () => {
    const entries = getEquationMenuEntries('polynomialMenu');
    expect(entries.map((entry) => entry.target)).toEqual(['quadratic', 'cubic', 'quartic']);
  });

  it('calculates back targets correctly', () => {
    expect(getEquationParentScreen('quartic')).toBe('polynomialMenu');
    expect(getEquationParentScreen('linear2')).toBe('simultaneousMenu');
    expect(getEquationParentScreen('symbolic')).toBe('home');
    expect(getEquationParentScreen('home')).toBeNull();
  });

  it('returns route-aware soft actions', () => {
    expect(getEquationSoftActions('home').map((action) => action.id)).toEqual(['open', 'history']);
    expect(getEquationSoftActions('quadratic').map((action) => action.id)).toEqual([
      'solve',
      'polynomialMenu',
      'clear',
      'history',
    ]);
    expect(getEquationSoftActions('quadratic')[1]?.label).toBe('Poly Menu');
  });

  it('clamps menu navigation and recognizes menu screens', () => {
    expect(moveEquationMenuIndex(0, -1, 3)).toBe(0);
    expect(moveEquationMenuIndex(1, 1, 3)).toBe(2);
    expect(isEquationMenuScreen('home')).toBe(true);
    expect(isEquationMenuScreen('quadratic')).toBe(false);
  });
});
