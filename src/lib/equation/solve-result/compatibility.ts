import type { CandidateValidationResult, DisplayOutcome } from '../../../types/calculator';
import {
  projectDisplayOutcomeToCanonicalResult,
  resolveCanonicalResultForStorage,
  type CanonicalResultProjectionFailure,
} from '../../result-contract';
import {
  getEquationAnalysisEvidence,
  type EquationAnalysisEvidence,
} from '../analysis-evidence';
import type {
  EquationControlledStopV1,
  EquationSolveResultContractV1,
} from './contract';
import { buildEquationSolveResultContract } from './factory';

export type EquationSolveResultCompatibilityFailure =
  | { reason: 'projection'; projection: CanonicalResultProjectionFailure }
  | { reason: 'contract'; message: string };

export type EquationSolveResultCompatibilityResult =
  | { ok: true; result: EquationSolveResultContractV1 }
  | { ok: false; failure: EquationSolveResultCompatibilityFailure };

export type ProjectEquationDisplayOutcomeOptions = {
  candidateValidation?: CandidateValidationResult[];
  analysisEvidence?: EquationAnalysisEvidence[];
  controlledStop?: EquationControlledStopV1;
};

export function projectEquationDisplayOutcomeToSolveResult(
  outcome: DisplayOutcome,
  options: ProjectEquationDisplayOutcomeOptions = {},
): EquationSolveResultCompatibilityResult {
  if (outcome.kind === 'prompt') {
    const projected = projectDisplayOutcomeToCanonicalResult(outcome);
    if (!projected.ok) {
      return { ok: false, failure: { reason: 'projection', projection: projected.failure } };
    }
    return {
      ok: false,
      failure: { reason: 'contract', message: 'Equation prompts cannot carry solve results.' },
    };
  }
  const resolution = resolveCanonicalResultForStorage(outcome);
  if (!resolution.ok) {
    return {
      ok: false,
      failure: { reason: 'contract', message: resolution.message },
    };
  }
  const document = resolution.document;
  const controlledStop = document.outcomeKind === 'error'
    ? options.controlledStop ?? {
        code: 'compatibility-display-error',
        message: document.error ?? 'Equation stopped without an error message.',
        source: 'compatibility-boundary' as const,
      }
    : undefined;

  try {
    return {
      ok: true,
      result: buildEquationSolveResultContract({
        document,
        candidateValidation: options.candidateValidation,
        analysisEvidence: options.analysisEvidence ?? getEquationAnalysisEvidence(outcome),
        controlledStop,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      failure: {
        reason: 'contract',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
