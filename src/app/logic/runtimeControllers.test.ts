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
      variableMemory: [],
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

  it('runs generated derivative workbench input with derivative substitution policy', async () => {
    const commitOutcome = createCommitOutcomeSpy();
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
      calculateWorkbenchExpression: { latex: '\\frac{d}{df}\\left(cx+4fx^2\\right)' },
      integralWorkbench: { kind: 'indefinite', bodyLatex: '', lower: '', upper: '' },
      limitWorkbench: { bodyLatex: '', target: '', direction: 'two-sided', targetKind: 'finite' },
      isCalculateToolOpen: true,
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      ansLatex: '0',
      variableMemory: [
        { name: 'c', valueLatex: '4', numericValue: 4 },
        { name: 'f', valueLatex: '2', numericValue: 2 },
      ],
      startTransition: (callback) => callback(),
      setDisplayOutcome: vi.fn(),
      commitOutcome,
      retitleOutcome: (outcome) => outcome,
    });

    controller.runCalculateWorkbenchAction();

    await vi.waitFor(() => {
      expect(commitOutcome).toHaveBeenCalled();
    });

    const [outcome, inputLatex] = commitOutcome.mock.calls[0];
    expect(inputLatex).toBe('\\frac{d}{df}\\left(cx+4fx^2\\right)');
    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(outcome.variableSubstitutions).toEqual([
      { name: 'c', valueLatex: '4', numericValue: 4 },
    ]);
    expect(outcome.exactLatex).toContain('x^2');
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
      polynomialSystem2Latex: ['x+y=3', 'x-y=1'],
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
      variableMemory: [],
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
      polynomialSystem2Latex: ['x+y=3', 'x-y=1'],
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
        runtimeAdvisories: {
          equationNumericSolve: { kind: 'blocked', reason: 'range-guard' },
        },
      },
      ansLatex: '0',
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      variableMemory: [],
      startTransition: (callback) => callback(),
      commitOutcome: createCommitOutcomeSpy(),
      switchToEquationWithLatex: vi.fn<(latex: string) => void>(),
      isSimultaneousEquationScreen: () => false,
    });

    expect(controller.shouldAllowEquationNumericSolve()).toBe(false);
    expect(controller.shouldShowEquationNumericSolvePanel()).toBe(false);
  });

  it('shows the equation numeric solve panel only for advisory-eligible symbolic errors', () => {
    const controller = createEquationRuntimeController({
      equationScreen: 'symbolic',
      equationLatex: 'x^3+x+1=0',
      equationInputLatex: 'x^3+x+1=0',
      quadraticCoefficients: [1, 0, 0],
      cubicCoefficients: [1, 0, 0, 0],
      quarticCoefficients: [1, 0, 0, 0, 0],
      polynomialSystem2Latex: ['x+y=3', 'x-y=1'],
      system2: [[0, 0, 0], [0, 0, 0]],
      system3: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      equationNumericSolvePanel: { enabled: false, start: '0', end: '1', subdivisions: 10 },
      currentMode: 'equation',
      displayOutcome: {
        kind: 'error',
        title: 'Solve',
        error: 'This equation is outside the supported symbolic solve families for this milestone.',
        warnings: [],
        runtimeAdvisories: {
          equationNumericSolve: { kind: 'suggest-on-error' },
        },
      },
      ansLatex: '0',
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      variableMemory: [],
      startTransition: (callback) => callback(),
      commitOutcome: createCommitOutcomeSpy(),
      switchToEquationWithLatex: vi.fn<(latex: string) => void>(),
      isSimultaneousEquationScreen: () => false,
    });

    expect(controller.shouldAllowEquationNumericSolve()).toBe(true);
    expect(controller.shouldShowEquationNumericSolvePanel()).toBe(true);
  });

  it('keeps invalid symbolic requests from surfacing the equation numeric solve panel', () => {
    const controller = createEquationRuntimeController({
      equationScreen: 'symbolic',
      equationLatex: '2+2',
      equationInputLatex: '2+2',
      quadraticCoefficients: [1, 0, 0],
      cubicCoefficients: [1, 0, 0, 0],
      quarticCoefficients: [1, 0, 0, 0, 0],
      polynomialSystem2Latex: ['x+y=3', 'x-y=1'],
      system2: [[0, 0, 0], [0, 0, 0]],
      system3: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      equationNumericSolvePanel: { enabled: false, start: '0', end: '1', subdivisions: 10 },
      currentMode: 'equation',
      displayOutcome: {
        kind: 'error',
        title: 'Solve',
        error: 'Enter an equation containing x.',
        warnings: [],
        runtimeAdvisories: {
          equationNumericSolve: { kind: 'blocked', reason: 'invalid-request' },
        },
      },
      ansLatex: '0',
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      variableMemory: [],
      startTransition: (callback) => callback(),
      commitOutcome: createCommitOutcomeSpy(),
      switchToEquationWithLatex: vi.fn<(latex: string) => void>(),
      isSimultaneousEquationScreen: () => false,
    });

    expect(controller.shouldAllowEquationNumericSolve()).toBe(false);
    expect(controller.shouldShowEquationNumericSolvePanel()).toBe(false);
  });
});
