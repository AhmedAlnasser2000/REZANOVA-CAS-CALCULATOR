import { describe, expect, it } from 'vitest';
import {
  getTrigParentScreen,
  getTrigRouteMeta,
  getTrigSoftActions,
  moveTrigMenuIndex,
} from './navigation';
import { trigRequestToScreen } from './parser';

describe('trigonometry navigation', () => {
  it('returns route metadata and guide links', () => {
    expect(getTrigRouteMeta('home').breadcrumb).toEqual(['Trigonometry']);
    expect(getTrigRouteMeta('identityConvert').breadcrumb).toEqual([
      'Trigonometry',
      'Identities',
      'Convert',
    ]);
    expect(getTrigRouteMeta('equationSolve').guideArticleId).toBe('trig-equations');
  });

  it('clamps menu movement within bounds', () => {
    expect(moveTrigMenuIndex('home', 0, -1)).toBe(0);
    expect(moveTrigMenuIndex('home', 3, 10)).toBe(5);
    expect(moveTrigMenuIndex('equationsHome', 0, 10)).toBe(0);
  });

  it('returns correct parent screens', () => {
    expect(getTrigParentScreen('home')).toBeNull();
    expect(getTrigParentScreen('identitySimplify')).toBe('identitiesHome');
    expect(getTrigParentScreen('cosineRule')).toBe('trianglesHome');
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
    expect(
      trigRequestToScreen({ kind: 'function', expressionLatex: '\\cos\\left(\\frac{\\pi}{3}\\right)' }, 'specialAngles'),
    ).toBe('specialAngles');
  });
});
