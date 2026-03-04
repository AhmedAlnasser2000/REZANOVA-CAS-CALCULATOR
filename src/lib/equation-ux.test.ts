import { describe, expect, it } from 'vitest';
import {
  getEquationDisplayTitle,
  getEquationMenuFooterText,
  getEquationRouteMeta,
} from './equation-ux';

describe('equation UX metadata', () => {
  it('returns breadcrumbs for home and quartic routes', () => {
    expect(getEquationRouteMeta('home').breadcrumb).toEqual(['Equation', 'Home']);
    expect(getEquationRouteMeta('quartic').breadcrumb).toEqual([
      'Equation',
      'Polynomial',
      'Quartic',
    ]);
  });

  it('returns focus targets for menu and work screens', () => {
    expect(getEquationRouteMeta('symbolic').focusTarget).toBe('symbolic');
    expect(getEquationRouteMeta('quadratic').focusTarget).toBe('polynomial');
    expect(getEquationRouteMeta('linear3').focusTarget).toBe('simultaneous');
  });

  it('returns route-aware menu footer text and titles', () => {
    expect(getEquationMenuFooterText('home')).toBe(
      '1-3: Open | ◂/▸: Move | EXE/F1: Select | F6: History',
    );
    expect(getEquationMenuFooterText('polynomialMenu')).toBe(
      '1-3: Open | ◂/▸: Move | EXE/F1: Select | F5/Esc: Back',
    );
    expect(getEquationDisplayTitle('quartic', null)).toBe('Quartic');
    expect(getEquationDisplayTitle('home', null)).toBe('Menu');
  });
});
