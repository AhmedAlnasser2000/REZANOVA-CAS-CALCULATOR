import {
  EQUATION_SOLVE_CANCELLED_MESSAGE,
  type GuardedEquationCancellationPhase,
  type GuardedEquationStageContext,
  type GuardedEquationStageId,
} from './types';
import { errorOutcome } from './outcome';
import { proseSolveSummary } from '../../display/result-detail-lines';
import {
  buildEquationStageResultCarrier,
  type EquationStageResultCarrierV1,
} from '../solve-result/stage-carrier';

function cancellationCheckpointMessage(input: {
  phase: GuardedEquationCancellationPhase;
  depth: number;
  stageId?: GuardedEquationStageId;
  helperId?: string;
  family?: string;
  branchIndex?: number;
  candidateIndex?: number;
  message?: string;
}) {
  const stage = input.stageId ? ` stage ${input.stageId}` : '';
  const helper = input.helperId ? ` helper ${input.helperId}` : '';
  const family = input.family ? ` family ${input.family}` : '';
  const branch = input.branchIndex !== undefined ? ` branch ${input.branchIndex}` : '';
  const candidate = input.candidateIndex !== undefined ? ` candidate ${input.candidateIndex}` : '';
  const suffix = input.message ? ` ${input.message}` : '';
  return `Equation cancellation checkpoint ${input.phase}${stage}${helper}${family}${branch}${candidate} at depth ${input.depth}.${suffix}`;
}

function buildCancellationOutcome() {
  return buildEquationStageResultCarrier(errorOutcome(
    'Solve',
    EQUATION_SOLVE_CANCELLED_MESSAGE,
    [],
    [],
    [],
    proseSolveSummary('Equation solve stopped at an OOE cancellation checkpoint.'),
  ));
}

function checkpointAndMaybeCancel(
  context: Pick<GuardedEquationStageContext, 'control' | 'depth' | 'trace'>,
  input: {
    phase: GuardedEquationCancellationPhase;
    stageId?: GuardedEquationStageId;
    helperId?: string;
    family?: string;
    branchIndex?: number;
    candidateIndex?: number;
    message?: string;
  },
): EquationStageResultCarrierV1 | null {
  const message = cancellationCheckpointMessage({
    phase: input.phase,
    stageId: input.stageId,
    depth: context.depth,
    helperId: input.helperId,
    family: input.family,
    branchIndex: input.branchIndex,
    candidateIndex: input.candidateIndex,
    message: input.message,
  });
  context.control?.checkpoint?.(message);

  if (!context.control?.shouldCancel?.()) {
    return null;
  }

  if (context.trace && !context.trace.cancellation) {
    context.trace.cancellation = {
      depth: context.depth,
      stageId: input.stageId,
      phase: input.phase,
      reason: EQUATION_SOLVE_CANCELLED_MESSAGE,
      helperId: input.helperId,
      family: input.family,
      branchIndex: input.branchIndex,
      candidateIndex: input.candidateIndex,
      message: input.message,
    };
  }

  return buildCancellationOutcome();
}

async function checkpointYieldAndMaybeCancel(
  context: Pick<GuardedEquationStageContext, 'control' | 'depth' | 'trace'>,
  input: {
    phase: GuardedEquationCancellationPhase;
    stageId?: GuardedEquationStageId;
    helperId?: string;
    family?: string;
    branchIndex?: number;
    candidateIndex?: number;
    message?: string;
  },
): Promise<EquationStageResultCarrierV1 | null> {
  const beforeYieldCancellation = checkpointAndMaybeCancel(context, input);
  if (beforeYieldCancellation) {
    return beforeYieldCancellation;
  }

  const message = cancellationCheckpointMessage({
    ...input,
    depth: context.depth,
  });
  await context.control?.yieldIfBudgetExceeded?.(message);

  return checkpointAndMaybeCancel(context, {
    ...input,
    phase: 'helper-yield',
  });
}

export {
  checkpointAndMaybeCancel,
  checkpointYieldAndMaybeCancel,
};
