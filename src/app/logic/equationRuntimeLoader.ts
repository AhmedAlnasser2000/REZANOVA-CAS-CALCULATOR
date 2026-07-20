import type { ResultProducerDraft } from '../../types/calculator';
import type { RunEquationModeRequest } from '../../lib/modes/equation/types';
import type { EquationAlgebraAction } from '../../lib/modes/equation/transform-contract';

export async function runEquationModeWithOoePilot(
  request: RunEquationModeRequest,
  options?: Parameters<
    typeof import('../../lib/modes/equation/run').runEquationModeWithOoePilot
  >[1],
) {
  const runtime = await import('../../lib/modes/equation/run');
  return runtime.runEquationModeWithOoePilot(request, options);
}

export async function loadEquationAlgebraTransform(): Promise<(
  input: {
    action: Exclude<EquationAlgebraAction, 'useStoredValues'>;
    equationLatex: string;
    angleUnit: 'deg' | 'rad' | 'grad';
  },
) => ResultProducerDraft> {
  const runtime = await import('../../lib/modes/equation/transforms');
  return runtime.runEquationAlgebraTransform;
}

export async function prepareEquationStoredValueSolveConsent(
  input: Parameters<
    typeof import('../../lib/modes/equation/stored-values').prepareEquationStoredValueSolveConsent
  >[0],
) {
  const runtime = await import('../../lib/modes/equation/stored-values');
  return runtime.prepareEquationStoredValueSolveConsent(input);
}

export async function finalizeEquationCanonicalRuntimeOutcome(
  outcome: ResultProducerDraft,
) {
  const runtime = await import('../../lib/equation/equation-solve-result');
  return runtime.finalizeEquationCanonicalRuntimeOutcome(outcome);
}
