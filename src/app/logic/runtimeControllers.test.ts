import { describe, expect, it, vi } from 'vitest';
import type { DisplayOutcome } from '../../types/calculator';
import {
  createCalculateRuntimeController,
  createEquationRuntimeController,
} from './runtimeControllers';

function createCommitOutcomeSpy() {
  return vi.fn<
    (outcome: DisplayOutcome, inputLatex: string, mode: 'calculate' | 'equation', replayContext?: Record<string, unknown>) => void
  >();
}

describe('runtimeControllers', () => {
  it('returns a workbench-specific calculate error before execution when generated input is blank', () => {
    const setDisplayOutcome = vi.fn<(outcome: DisplayOutcome) => void>();
    const controller = createCalculateRuntimeController({
      calculateLatex: '',
      calculateScreen: 'derivative',
      calculateRouteMeta: {
        screen: 'derivative',
        label: 'Derivative',
        breadcrumb: ['Calculate', 'Derivative'],
        description: '',
        helpText: '',
        focusTarget: 'body',
      },
      calculateWorkbenchExpression: { latex: '' },
      integralWorkbench: { kind: 'indefinite', bodyLatex: '', lower: '', upper: '' },
      limitWorkbench: { bodyLatex: '', target: '', direction: 'two-sided', targetKind: 'finite' },
      isCalculateToolOpen: true,
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      ansLatex: '0',
      startTransition: (callback) => callback(),
      setDisplayOutcome,
      commitOutcome: createCommitOutcomeSpy(),
      retitleOutcome: (outcome) => outcome,
    });

    controller.runCalculateWorkbenchAction();

    expect(setDisplayOutcome).toHaveBeenCalledWith({
      kind: 'error',
      title: 'Derivative',
      error: 'Enter an expression in x before differentiating.',
      warnings: [],
    });
  });

  it('opens prompt targets only for equation prompts', () => {
    const switchToEquationWithLatex = vi.fn<(latex: string) => void>();
    const controller = createEquationRuntimeController({
      equationScreen: 'symbolic',
      equationLatex: 'x=1',
      equationInputLatex: 'x=1',
      quadraticCoefficients: [1, 0, 0],
      cubicCoefficients: [1, 0, 0, 0],
      quarticCoefficients: [1, 0, 0, 0, 0],
      system2: [[0, 0, 0], [0, 0, 0]],
      system3: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      equationNumericSolvePanel: { enabled: false, start: '0', end: '1', subdivisions: 10 },
      currentMode: 'equation',
      displayOutcome: {
        kind: 'prompt',
        title: 'Calculate',
        message: 'Use Equation mode to solve this expression.',
        targetMode: 'equation',
        carryLatex: 'x^2=1',
        warnings: [],
      },
      ansLatex: '0',
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      startTransition: (callback) => callback(),
      commitOutcome: createCommitOutcomeSpy(),
      switchToEquationWithLatex,
      isSimultaneousEquationScreen: () => false,
    });

    controller.openPromptTarget();

    expect(switchToEquationWithLatex).toHaveBeenCalledWith('x^2=1');
  });

  it('keeps equation numeric solve panel hidden when a range guard has already blocked the solve', () => {
    const controller = createEquationRuntimeController({
      equationScreen: 'symbolic',
      equationLatex: 'sin(x)=2',
      equationInputLatex: 'sin(x)=2',
      quadraticCoefficients: [1, 0, 0],
      cubicCoefficients: [1, 0, 0, 0],
      quarticCoefficients: [1, 0, 0, 0, 0],
      system2: [[0, 0, 0], [0, 0, 0]],
      system3: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      equationNumericSolvePanel: { enabled: false, start: '0', end: '1', subdivisions: 10 },
      currentMode: 'equation',
      displayOutcome: {
        kind: 'error',
        title: 'Solve',
        error: 'No real solution.',
        warnings: [],
        solveBadges: ['Range Guard'],
      },
      ansLatex: '0',
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      startTransition: (callback) => callback(),
      commitOutcome: createCommitOutcomeSpy(),
      switchToEquationWithLatex: vi.fn<(latex: string) => void>(),
      isSimultaneousEquationScreen: () => false,
    });

    expect(controller.shouldAllowEquationNumericSolve()).toBe(false);
    expect(controller.shouldShowEquationNumericSolvePanel()).toBe(false);
  });
});
