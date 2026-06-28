import { describe, expect, it, vi } from 'vitest';
import type { DisplayOutcome } from '../../types/calculator';
import { createEquationRuntimeController } from './runtimeControllers';
import {
  EQUATION_PREPARE_NUMERIC_SOLVE_ACTION,
  runEquationModeWithOoePilot,
} from '../../lib/modes/equation';

vi.mock('../../lib/modes/equation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/modes/equation')>();
  return {
    ...actual,
    runEquationModeWithOoePilot: vi.fn(actual.runEquationModeWithOoePilot),
  };
});

function createCommitOutcomeSpy() {
  return vi.fn<
    (outcome: DisplayOutcome, inputLatex: string, mode: 'calculate' | 'equation', replayContext?: Record<string, unknown>) => void
  >();
}

describe('Equation numeric preparation controller action', () => {
  it('commits Equation numeric preparation without launching the Equation solver pilot', () => {
    const commitOutcome = createCommitOutcomeSpy();
    const controller = createEquationRuntimeController({
      equationScreen: 'symbolic',
      equationLatex: 'z+a=5',
      equationInputLatex: 'z+a=5',
      equationSolveTarget: 'z',
      quadraticCoefficients: [1, 0, 0],
      cubicCoefficients: [1, 0, 0, 0],
      quarticCoefficients: [1, 0, 0, 0, 0],
      polynomialSystem2Latex: ['x+y=3', 'x-y=1'],
      system2: [[0, 0, 0], [0, 0, 0]],
      system3: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      equationNumericSolvePanel: { enabled: false, start: '0', end: '1', subdivisions: 10 },
      currentMode: 'equation',
      displayOutcome: null,
      ansLatex: '0',
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      variableMemory: [{ name: 'a', valueLatex: '2', numericValue: 2 }],
      startTransition: (callback) => callback(),
      commitOutcome,
      switchToEquationWithLatex: vi.fn<(latex: string) => void>(),
      isSimultaneousEquationScreen: () => false,
    });

    controller.runEquationAlgebraTransformAction(EQUATION_PREPARE_NUMERIC_SOLVE_ACTION);

    expect(runEquationModeWithOoePilot).not.toHaveBeenCalled();
    expect(commitOutcome).toHaveBeenCalledTimes(1);
    const [outcome, inputLatex, mode] = commitOutcome.mock.calls[0];
    expect(inputLatex).toBe('z+a=5');
    expect(mode).toBe('equation');
    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') {
      throw new Error('Expected a preparation success outcome');
    }
    expect(outcome.title).toBe('Prepare Numeric Solve');
    expect(outcome.exactLatex).toBe('z+2=5');
    expect(outcome.approxText).toBeUndefined();
  });
});
