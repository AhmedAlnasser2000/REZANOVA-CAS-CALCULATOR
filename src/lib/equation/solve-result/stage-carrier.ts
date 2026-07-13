import type { DisplayOutcome } from '../../../types/calculator';
import { projectCanonicalResultToDisplayOutcome } from '../../result-contract';
import { attachEquationAnalysisEvidence } from '../analysis-evidence';
import { projectEquationDisplayOutcomeToSolveResult } from './compatibility';
import type { EquationSolveResultContractV1 } from './contract';

export type EquationStageResultCarrierV1 = EquationSolveResultContractV1;
export type EquationStageResultReadModel = Exclude<DisplayOutcome, { kind: 'prompt' }>;

export function buildEquationStageResultCarrier(
  outcome: DisplayOutcome,
): EquationStageResultCarrierV1 {
  const projection = projectEquationDisplayOutcomeToSolveResult(outcome);
  if (!projection.ok) {
    const message = projection.failure.reason === 'projection'
      ? projection.failure.projection.message
      : projection.failure.message;
    throw new Error(`Equation stage carrier rejected ${projection.failure.reason}: ${message}`);
  }
  return projection.result;
}

export function readEquationStageResultCarrier(
  carrier: EquationStageResultCarrierV1,
): EquationStageResultReadModel {
  return attachEquationAnalysisEvidence(
    projectCanonicalResultToDisplayOutcome(carrier.document),
    carrier.diagnostics.analysisEvidence,
  );
}
