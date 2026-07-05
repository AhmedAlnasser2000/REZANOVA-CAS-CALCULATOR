import { describe, expect, it, vi } from 'vitest';
import {
  activeExpressionLatexFromContext,
  editActiveExpressionWithDeps,
  pasteIntoEditorWithDeps,
} from './expressionRouting';

describe('expressionRouting', () => {
  it('returns active trig draft latex in trigonometry mode', () => {
    const latex = activeExpressionLatexFromContext({
      isLauncherOpen: false,
      isEquationMenuOpen: false,
      isTrigMenuOpen: false,
      isStatisticsMenuOpen: false,
      currentMode: 'trigonometry',
      calculateScreen: 'standard',
      calculateLatex: '',
      calculateWorkbenchExpressionLatex: '',
      equationInputLatex: '',
      isCalculusMenuOpen: false,
      calculusWorkbenchExpression: '',
      trigDraftLatex: '\\sin\\left(x\\right)',
      statisticsDraftLatex: '',
      geometryDraftLatex: '',
      tablePrimaryLatex: '',
    });

    expect(latex).toBe('\\sin\\left(x\\right)');
  });

  it('focuses trig editor instead of sending to calculate', () => {
    const focusTrigEditor = vi.fn();
    const focusStatisticsEditor = vi.fn();
    const focusGeometryEditor = vi.fn();
    const setClipboardNotice = vi.fn();
    const loadLatexIntoEditor = vi.fn();

    editActiveExpressionWithDeps({
      currentMode: 'trigonometry',
      focusTrigEditor,
      focusStatisticsEditor,
      focusGeometryEditor,
      setClipboardNotice,
      loadLatexIntoEditor,
      getActiveExpressionLatex: () => '\\cos\\left(x\\right)',
    });

    expect(focusTrigEditor).toHaveBeenCalledTimes(1);
    expect(setClipboardNotice).toHaveBeenCalledWith('Trigonometry editor focused');
    expect(loadLatexIntoEditor).not.toHaveBeenCalled();
  });

  it('pastes into active editor when a focused field exists', async () => {
    const insert = vi.fn();
    const focus = vi.fn();
    const setClipboardNotice = vi.fn();

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        clipboard: {
          readText: vi.fn().mockResolvedValue('\\sin\\left(30\\right)'),
        },
      },
      configurable: true,
    });

    await pasteIntoEditorWithDeps({
      isLauncherOpen: false,
      currentMode: 'calculate',
      geometryEditorIsEditable: false,
      statisticsEditorIsEditable: false,
      trigEditorIsEditable: false,
      equationScreen: 'symbolic',
      activeFieldRef: { current: { focus, insert } },
      geometryDraftFieldRef: { current: null },
      statisticsDraftFieldRef: { current: null },
      trigDraftFieldRef: { current: null },
      focusGeometryEditor: vi.fn(),
      focusStatisticsEditor: vi.fn(),
      focusTrigEditor: vi.fn(),
      setClipboardNotice,
      loadLatexIntoEditor: vi.fn(),
    });

    expect(focus).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith('\\sin\\left(30\\right)');
    expect(setClipboardNotice).toHaveBeenCalledWith('Pasted into editor');
  });

  it('canonicalizes pasted Calculate text before inserting into the active editor', async () => {
    const insert = vi.fn();
    const focus = vi.fn();
    const setClipboardNotice = vi.fn();

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        clipboard: {
          readText: vi.fn().mockResolvedValue('ln(x^2+1)'),
        },
      },
      configurable: true,
    });

    await pasteIntoEditorWithDeps({
      isLauncherOpen: false,
      currentMode: 'calculate',
      geometryEditorIsEditable: false,
      statisticsEditorIsEditable: false,
      trigEditorIsEditable: false,
      equationScreen: 'symbolic',
      activeFieldRef: { current: { focus, insert } },
      geometryDraftFieldRef: { current: null },
      statisticsDraftFieldRef: { current: null },
      trigDraftFieldRef: { current: null },
      focusGeometryEditor: vi.fn(),
      focusStatisticsEditor: vi.fn(),
      focusTrigEditor: vi.fn(),
      setClipboardNotice,
      loadLatexIntoEditor: vi.fn(),
    });

    expect(insert).toHaveBeenCalledWith('\\ln(x^2+1)');
  });

  it('uses Matrix paste naturalization for app Paste before inserting into the active editor', async () => {
    const insert = vi.fn();
    const focus = vi.fn();
    const setClipboardNotice = vi.fn();
    const canonicalizePastedText = vi.fn(() =>
      '\\operatorname{eigen}\\left(\\begin{bmatrix}2&1\\\\1&2\\end{bmatrix}\\right)');

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        clipboard: {
          readText: vi.fn().mockResolvedValue('eigen([[2,1],[1,2]])'),
        },
      },
      configurable: true,
    });

    await pasteIntoEditorWithDeps({
      isLauncherOpen: false,
      currentMode: 'matrix',
      geometryEditorIsEditable: false,
      statisticsEditorIsEditable: false,
      trigEditorIsEditable: false,
      equationScreen: 'symbolic',
      activeFieldRef: { current: { focus, insert } },
      geometryDraftFieldRef: { current: null },
      statisticsDraftFieldRef: { current: null },
      trigDraftFieldRef: { current: null },
      focusGeometryEditor: vi.fn(),
      focusStatisticsEditor: vi.fn(),
      focusTrigEditor: vi.fn(),
      setClipboardNotice,
      loadLatexIntoEditor: vi.fn(),
      canonicalizePastedText,
    });

    expect(canonicalizePastedText).toHaveBeenCalledWith('eigen([[2,1],[1,2]])', 'matrix');
    expect(focus).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(
      '\\operatorname{eigen}\\left(\\begin{bmatrix}2&1\\\\1&2\\end{bmatrix}\\right)',
    );
    expect(setClipboardNotice).toHaveBeenCalledWith('Pasted into editor');
  });

  it('keeps malformed Matrix paste text unchanged for app Paste', async () => {
    const insert = vi.fn();

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        clipboard: {
          readText: vi.fn().mockResolvedValue('eigen([[2,1],[bad]])'),
        },
      },
      configurable: true,
    });

    await pasteIntoEditorWithDeps({
      isLauncherOpen: false,
      currentMode: 'matrix',
      geometryEditorIsEditable: false,
      statisticsEditorIsEditable: false,
      trigEditorIsEditable: false,
      equationScreen: 'symbolic',
      activeFieldRef: { current: { insert } },
      geometryDraftFieldRef: { current: null },
      statisticsDraftFieldRef: { current: null },
      trigDraftFieldRef: { current: null },
      focusGeometryEditor: vi.fn(),
      focusStatisticsEditor: vi.fn(),
      focusTrigEditor: vi.fn(),
      setClipboardNotice: vi.fn(),
      loadLatexIntoEditor: vi.fn(),
      canonicalizePastedText: vi.fn(() => null),
    });

    expect(insert).toHaveBeenCalledWith('eigen([[2,1],[bad]])');
  });

  it('canonicalizes pasted Equation grouped quotients before inserting into the active editor', async () => {
    const insert = vi.fn();
    const focus = vi.fn();
    const setClipboardNotice = vi.fn();

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        clipboard: {
          readText: vi.fn().mockResolvedValue('ln((z^4+z+1)/(z-m))+c=b'),
        },
      },
      configurable: true,
    });

    await pasteIntoEditorWithDeps({
      isLauncherOpen: false,
      currentMode: 'equation',
      geometryEditorIsEditable: false,
      statisticsEditorIsEditable: false,
      trigEditorIsEditable: false,
      equationScreen: 'symbolic',
      activeFieldRef: { current: { focus, insert } },
      geometryDraftFieldRef: { current: null },
      statisticsDraftFieldRef: { current: null },
      trigDraftFieldRef: { current: null },
      focusGeometryEditor: vi.fn(),
      focusStatisticsEditor: vi.fn(),
      focusTrigEditor: vi.fn(),
      setClipboardNotice,
      loadLatexIntoEditor: vi.fn(),
    });

    expect(focus).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith('\\ln(\\frac{z^4+z+1}{z-m})+c=b');
    expect(setClipboardNotice).toHaveBeenCalledWith('Pasted into editor');
  });

  it('canonicalizes pasted slash, star, and function powers before app paste insertion', async () => {
    const insert = vi.fn();
    const focus = vi.fn();
    const setClipboardNotice = vi.fn();

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        clipboard: {
          readText: vi.fn().mockResolvedValue('1/2*(csc^2(x)-csc(x)cot(x))'),
        },
      },
      configurable: true,
    });

    await pasteIntoEditorWithDeps({
      isLauncherOpen: false,
      currentMode: 'calculus',
      geometryEditorIsEditable: false,
      statisticsEditorIsEditable: false,
      trigEditorIsEditable: false,
      equationScreen: 'symbolic',
      activeFieldRef: { current: { focus, insert } },
      geometryDraftFieldRef: { current: null },
      statisticsDraftFieldRef: { current: null },
      trigDraftFieldRef: { current: null },
      focusGeometryEditor: vi.fn(),
      focusStatisticsEditor: vi.fn(),
      focusTrigEditor: vi.fn(),
      setClipboardNotice,
      loadLatexIntoEditor: vi.fn(),
    });

    expect(insert).toHaveBeenCalledWith(
      '\\frac{1}{2}\\cdot (\\csc^{2}(x)-\\csc(x)\\cot(x))',
    );
  });
});
