import { describe, expect, it } from 'vitest';
import {
  getTrigMenuEntries,
  getTrigMenuFooterText,
  getTrigParentScreen,
  getTrigRouteMeta,
  getTrigSoftActions,
  moveTrigMenuIndex,
} from './navigation';
import { trigRequestToScreen } from './parser';

describe('trigonometry navigation', () => {
  it('returns route metadata and guide links', () => {
    expect(getTrigRouteMeta('home').breadcrumb).toEqual(['Trigonometry']);
    expect(getTrigRouteMeta('home').helpText).toContain('keys 1-4');
    expect(getTrigRouteMeta('identityConvert').breadcrumb).toEqual([
      'Trigonometry',
      'Identities',
      'Convert',
    ]);
    expect(getTrigRouteMeta('equationSolve').guideArticleId).toBe('trig-equations');
  });

  it('clamps menu movement within bounds', () => {
    expect(moveTrigMenuIndex('home', 0, -1)).toBe(0);
    expect(moveTrigMenuIndex('home', 2, 10)).toBe(3);
    expect(moveTrigMenuIndex('equationsHome', 0, 10)).toBe(0);
  });

  it('keeps the visible home surface focused on guided trig workflows', () => {
    expect(getTrigMenuEntries('home').map((entry) => entry.label)).toEqual([
      'Identities',
      'Triangles',
      'Angle Convert',
      'Period & Phase',
    ]);
    expect(getTrigMenuEntries('home').map((entry) => entry.target)).not.toContain('functions');
    expect(getTrigMenuEntries('home').map((entry) => entry.target)).not.toContain('equationsHome');
    expect(getTrigMenuEntries('home').map((entry) => entry.target)).not.toContain('specialAngles');
    expect(getTrigMenuFooterText('home')).toContain('1-4: Open');
  });

  it('returns correct parent screens', () => {
    expect(getTrigParentScreen('home')).toBeNull();
    expect(getTrigParentScreen('identitySimplify')).toBe('identitiesHome');
    expect(getTrigParentScreen('cosineRule')).toBe('trianglesHome');
    expect(getTrigParentScreen('periodPhase')).toBe('home');
    expect(getTrigParentScreen('specialAngles')).toBe('home');
  });

  it('uses menu-aware and tool-aware soft actions', () => {
    expect(getTrigSoftActions('home').map((action) => action.id)).toEqual([
      'open',
      'guide',
      'back',
      'exit',
    ]);
    expect(getTrigSoftActions('functions').map((action) => action.id)).toEqual([
      'evaluate',
      'sendToCalc',
      'menu',
      'clear',
      'history',
    ]);
    expect(getTrigSoftActions('equationSolve').map((action) => action.id)).toEqual([
      'evaluate',
      'sendToEquation',
      'menu',
      'clear',
      'history',
    ]);
  });

  it('marks trig leaf screens as editable and maps parsed requests back to screens', () => {
    expect(getTrigRouteMeta('functions').editorMode).toBe('editable');
    expect(getTrigRouteMeta('rightTriangle').focusTarget).toBe('guidedForm');
    expect(getTrigRouteMeta('periodPhase').focusTarget).toBe('editor');
    expect(
      trigRequestToScreen({ kind: 'function', expressionLatex: '\\cos\\left(\\frac{\\pi}{3}\\right)' }, 'specialAngles'),
    ).toBe('specialAngles');
    expect(
      trigRequestToScreen({ kind: 'periodPhase', expressionLatex: '2\\sin(3x-\\pi)+1', variable: 'x' }),
    ).toBe('periodPhase');
  });
});
