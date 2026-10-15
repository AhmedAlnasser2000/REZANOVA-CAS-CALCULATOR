import { describe, expect, it, vi } from 'vitest';
import type { CanonicalRuntimeOutcome } from '../../types/calculator';
import { createEquationRuntimeController } from './runtimeControllers';

/** The retired old Equation controller is inert; Calculate's controller tests are excluded with Calculate. */
function createCommitOutcomeSpy() {
  return vi.fn<
    (outcome: CanonicalRuntimeOutcome, inputLatex: string, mode: 'calculate' | 'equation', replayContext?: Record<string, unknown>) => void
  >();
}

describe('retired Equation runtime controller', () => {
  it('opens prompt targets only for equation prompts', () => {
    const switchToEquationWithLatex = vi.fn<(latex: string) => void>();
    const controller = createEquationRuntimeController({
      displayOutcome: {
        kind: 'prompt',
        title: 'Calculate',
        message: 'Use Equation mode to solve this expression.',
        targetMode: 'equation',
        carryLatex: 'x^2=1',
        warnings: [],
      },
      equationInputLatex: 'x=1',
      commitOutcome: createCommitOutcomeSpy(),
      switchToEquationWithLatex,
    });

    controller.openPromptTarget();

    expect(switchToEquationWithLatex).toHaveBeenCalledWith('x^2=1');
  });

  it('commits the typed retired-engine stop for the old Equation solve action', () => {
    const commitOutcome = createCommitOutcomeSpy();
    const controller = createEquationRuntimeController({
      displayOutcome: null,
      equationInputLatex: 'x=1',
      commitOutcome,
      switchToEquationWithLatex: vi.fn(),
    });

    controller.runEquationAction();

    expect(commitOutcome).toHaveBeenCalledTimes(1);
    expect(commitOutcome.mock.calls[0][0]).toMatchObject({ kind: 'error' });
    expect(commitOutcome.mock.calls[0][1]).toBe('x=1');
    expect(controller.shouldShowEquationNumericSolvePanel()).toBe(false);
  });
});
