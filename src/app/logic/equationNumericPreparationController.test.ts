import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DisplayOutcome } from '../../types/calculator';
import { createEquationRuntimeController } from './runtimeControllers';
import {
  EQUATION_USE_STORED_VALUES_ACTION,
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports missing stored values without launching the Equation solver pilot', () => {
    const commitOutcome = createCommitOutcomeSpy();
    const controller = createEquationRuntimeController({
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{x+c}-t=v^2',
      equationInputLatex: '\\sqrt{x+c}-t=v^2',
      equationSolveTarget: 'x',
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
      variableMemory: [],
      startTransition: (callback) => callback(),
      commitOutcome,
      switchToEquationWithLatex: vi.fn<(latex: string) => void>(),
      isSimultaneousEquationScreen: () => false,
    });

    controller.runEquationAlgebraTransformAction(EQUATION_USE_STORED_VALUES_ACTION);

    expect(runEquationModeWithOoePilot).not.toHaveBeenCalled();
    expect(commitOutcome).toHaveBeenCalledTimes(1);
    const [outcome, inputLatex, mode] = commitOutcome.mock.calls[0];
    expect(inputLatex).toBe('\\sqrt{x+c}-t=v^2');
    expect(mode).toBe('equation');
    expect(outcome.kind).toBe('error');
    if (outcome.kind !== 'error') {
      throw new Error('Expected a stored-value consent error outcome');
    }
    expect(outcome.title).toBe('Use Stored Values');
    expect(outcome.error).toContain('c');
    expect(outcome.error).toContain('t');
    expect(outcome.error).toContain('v');
    expect(JSON.stringify(outcome.detailSections)).toContain('Protected solve target: x.');
  });

  it('launches normal Equation Solve with one-shot stored-value substitution when consent succeeds', async () => {
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
      variableMemory: [
        { name: 'a', valueLatex: '2', numericValue: 2 },
        { name: 'z', valueLatex: '9', numericValue: 9 },
      ],
      startTransition: (callback) => callback(),
      commitOutcome,
      switchToEquationWithLatex: vi.fn<(latex: string) => void>(),
      isSimultaneousEquationScreen: () => false,
    });

    controller.runEquationAlgebraTransformAction(EQUATION_USE_STORED_VALUES_ACTION);

    await vi.waitFor(() => {
      expect(runEquationModeWithOoePilot).toHaveBeenCalled();
    });
    const [request] = vi.mocked(runEquationModeWithOoePilot).mock.calls[0];
    expect(request).toEqual(expect.objectContaining({
      equationLatex: 'z+a=5',
      equationSolveTarget: 'z',
      useStoredValueSubstitution: true,
      variableSubstitutionSnapshot: [
        { name: 'a', valueLatex: '2', numericValue: 2 },
      ],
    }));
    expect(request.variableSubstitutionSnapshot).not.toContainEqual(
      expect.objectContaining({ name: 'z' }),
    );
    await vi.waitFor(() => {
      expect(commitOutcome).toHaveBeenCalled();
    });
    const [outcome] = commitOutcome.mock.calls[0];
    expect(outcome.kind).toBe('success');
  });
});
