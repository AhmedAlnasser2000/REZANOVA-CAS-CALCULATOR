import { describe, expect, it, vi } from 'vitest';
import { handleKeypadWithDeps } from './keypadRouter';

function createDeps(): Parameters<typeof handleKeypadWithDeps>[0] {
  return {
    button: { id: 'history', label: 'history', variant: 'utility', command: 'history' },
    isLauncherOpen: false,
    currentMode: 'calculate',
    isCalculateMenuOpen: false,
    isCalculusMenuOpen: false,
    isGeometryMenuOpen: false,
    isStatisticsMenuOpen: false,
    isTrigMenuOpen: false,
    isEquationMenuOpen: false,
    isGeometryDraftFocused: vi.fn().mockReturnValue(false),
    isStatisticsDraftFocused: vi.fn().mockReturnValue(false),
    handleLauncherDigit: vi.fn(),
    goBackInLauncher: vi.fn(),
    moveCurrentLauncherSelection: vi.fn(),
    openSelectedLauncherEntry: vi.fn(),
    openGuideDigitEntry: vi.fn(),
    openGuideSearch: vi.fn(),
    goBackInGuide: vi.fn(),
    moveCurrentGuideSelection: vi.fn(),
    executePrimaryAction: vi.fn(),
    openCalculateMenuDigitEntry: vi.fn(),
    toggleHistoryOpen: vi.fn(),
    openCalculateStandard: vi.fn(),
    moveCurrentCalculateMenuSelection: vi.fn(),
    openSelectedCalculateMenuEntry: vi.fn(),
    openCalculusMenuDigitEntry: vi.fn(),
    goBackInCalculus: vi.fn(),
    moveCurrentCalculusMenuSelection: vi.fn(),
    openSelectedCalculusMenuEntry: vi.fn(),
    openGeometryMenuDigitEntry: vi.fn(),
    goBackInGeometry: vi.fn(),
    moveCurrentGeometryMenuSelection: vi.fn(),
    openSelectedGeometryMenuEntry: vi.fn(),
    openStatisticsMenuDigitEntry: vi.fn(),
    goBackInStatistics: vi.fn(),
    moveCurrentStatisticsMenuSelection: vi.fn(),
    openSelectedStatisticsMenuEntry: vi.fn(),
    openTrigMenuDigitEntry: vi.fn(),
    goBackInTrigonometry: vi.fn(),
    moveCurrentTrigMenuSelection: vi.fn(),
    openSelectedTrigMenuEntry: vi.fn(),
    openEquationMenuDigitEntry: vi.fn(),
    clearCurrentMode: vi.fn(),
    moveCurrentEquationMenuSelection: vi.fn(),
    openSelectedEquationMenuEntry: vi.fn(),
    insertLatex: vi.fn(),
    deleteBackward: vi.fn(),
    moveToPreviousChar: vi.fn(),
    moveToNextChar: vi.fn(),
    cycleAngleUnit: vi.fn(),
    openLauncher: vi.fn(),
    insertLimitPiecewiseTemplate: vi.fn(),
  };
}

describe('keypadRouter', () => {
  it('routes launcher digit through launcher handler', () => {
    const deps = createDeps();
    deps.isLauncherOpen = true;
    deps.button = { id: '2', label: '2', variant: 'digit', latex: '2' };

    handleKeypadWithDeps(deps);
    expect(deps.handleLauncherDigit).toHaveBeenCalledWith('2');
  });

  it('routes equation menu evaluate to open selected entry', () => {
    const deps = createDeps();
    deps.currentMode = 'equation';
    deps.isEquationMenuOpen = true;
    deps.button = { id: 'evaluate', label: 'EXE', variant: 'confirm', command: 'evaluate' };

    handleKeypadWithDeps(deps);
    expect(deps.openSelectedEquationMenuEntry).toHaveBeenCalledTimes(1);
  });

  it('routes the Limit piecewise key through the structured row editor action', () => {
    const deps = createDeps();
    deps.button = {
      id: 'limit-piecewise-template',
      label: 'Piecewise',
      variant: 'function',
      latex: '\\lim_{x\\to 0}\\begin{cases}&x<0\\\\&\\text{otherwise}\\end{cases}',
    };

    handleKeypadWithDeps(deps);

    expect(deps.insertLimitPiecewiseTemplate).toHaveBeenCalledTimes(1);
    expect(deps.insertLatex).not.toHaveBeenCalled();
  });
});
