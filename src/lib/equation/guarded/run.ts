import type {
  ResultProducerDraft,
  GuardedSolveRequest,
} from '../../../types/calculator';
import { algebraTransformSolve } from './algebra-stage';
import { directTrigSolve } from './direct-trig-stage';
import { rewriteTrigSolve } from './rewrite-trig-stage';
import { substitutionSolve, substitutionSolveAsync } from './substitution-stage';
import { numericIntervalSolve } from './numeric-stage';
import { compositionSolve } from '../composition/stage';
import { runBoundedPolynomialSolve } from './polynomial-stage';
import { runDirectSymbolicStage, runGuardedDirectSymbolicFallback } from './direct-symbolic';
import {
  runGuardedEquationSolveInternal,
  runGuardedEquationSolveInternalAsync,
} from './orchestrator';
import type {
  GuardedEquationSolveOptions,
  GuardedEquationStageDescriptor,
  GuardedEquationStageId,
  GuardedEquationStageOrderedSolveResult,
  GuardedEquationStageReplayTrace,
} from './types';
import {
  buildOptionalEquationStageResultCarrier,
  readEquationStageResultCarrier,
} from '../solve-result/stage-carrier';
export {
  EQUATION_SOLVE_CANCELLED_MESSAGE,
} from './types';
export type {
  GuardedEquationCancellationEvidence,
  GuardedEquationCancellationPhase,
  GuardedEquationCooperativeCheckpoint,
  GuardedEquationDirectSymbolicHostEvidence,
  GuardedEquationDirectSymbolicRunner,
  GuardedEquationDirectSymbolicRunnerResult,
  GuardedEquationSolveControl,
  GuardedEquationSolveOptions,
  GuardedEquationStageId,
  GuardedEquationStageOrderedSolveResult,
  GuardedEquationStageReplayTrace,
} from './types';
export { runGuardedDirectSymbolicFallback };

const GUARDED_EQUATION_STAGE_DESCRIPTORS: GuardedEquationStageDescriptor[] = [
  {
    id: 'numeric-interval',
    label: 'Numeric Interval',
    execute: ({ preparedRequest }) => buildOptionalEquationStageResultCarrier(
      preparedRequest.numericInterval ? numericIntervalSolve(preparedRequest) : null,
    ),
  },
  {
    id: 'bounded-polynomial',
    label: 'Bounded Polynomial',
    execute: ({ preparedRequest, depth, trail, runner }) => buildOptionalEquationStageResultCarrier(runBoundedPolynomialSolve(
      preparedRequest,
      depth,
      trail,
      runner,
    )),
  },
  {
    id: 'algebra-transform',
    label: 'Algebra Transform',
    canRecurse: true,
    execute: ({ preparedRequest, depth, trail, executionBudget, runner }) => buildOptionalEquationStageResultCarrier(algebraTransformSolve(
      preparedRequest,
      depth,
      trail,
      executionBudget,
      runner,
    )),
  },
  {
    id: 'composition',
    label: 'Composition',
    canRecurse: true,
    execute: ({ preparedRequest, depth, trail, executionBudget, runner }) => buildOptionalEquationStageResultCarrier(compositionSolve(
      preparedRequest,
      depth,
      trail,
      executionBudget,
      runner,
    )),
  },
  {
    id: 'direct-trig',
    label: 'Direct Trig',
    execute: ({ preparedRequest }) => buildOptionalEquationStageResultCarrier(directTrigSolve(preparedRequest)),
  },
  {
    id: 'rewrite-trig',
    label: 'Rewrite Trig',
    execute: ({ preparedRequest }) => buildOptionalEquationStageResultCarrier(rewriteTrigSolve(preparedRequest)),
  },
  {
    id: 'substitution',
    label: 'Substitution',
    canRecurse: true,
    execute: ({ preparedRequest, depth, trail, executionBudget, runner }) => buildOptionalEquationStageResultCarrier(substitutionSolve(
      preparedRequest,
      depth,
      trail,
      executionBudget,
      runner,
    )),
    executeAsync: async ({ preparedRequest, depth, trail, executionBudget, asyncRunner, cooperativeCheckpoint }) => buildOptionalEquationStageResultCarrier(await substitutionSolveAsync(
      preparedRequest,
      depth,
      trail,
      executionBudget,
      asyncRunner,
      cooperativeCheckpoint,
    )),
  },
  {
    id: 'direct-symbolic',
    label: 'Direct Symbolic',
    execute: (context) => buildOptionalEquationStageResultCarrier(runDirectSymbolicStage(context)),
  },
];

function listGuardedEquationStageDescriptors(): GuardedEquationStageDescriptor[] {
  return GUARDED_EQUATION_STAGE_DESCRIPTORS;
}

function validateStageOrder(
  stageOrder: GuardedEquationStageId[],
): GuardedEquationStageDescriptor[] {
  const defaultIds = GUARDED_EQUATION_STAGE_DESCRIPTORS.map((descriptor) => descriptor.id);
  const seen = new Set<GuardedEquationStageId>();
  for (const stageId of stageOrder) {
    if (seen.has(stageId)) {
      throw new Error(`Duplicate guarded equation stage id in custom order: ${stageId}`);
    }
    seen.add(stageId);
  }

  const missing = defaultIds.filter((stageId) => !seen.has(stageId));
  const extras = stageOrder.filter((stageId) => !defaultIds.includes(stageId));
  if (missing.length > 0 || extras.length > 0 || stageOrder.length !== defaultIds.length) {
    throw new Error(
      `Custom guarded equation stage order must be an exact permutation of registered stages. Missing: ${missing.join(', ') || 'none'}. Extra: ${extras.join(', ') || 'none'}.`,
    );
  }

  return stageOrder.map((stageId) => {
    const descriptor = GUARDED_EQUATION_STAGE_DESCRIPTORS.find((candidate) => candidate.id === stageId);
    if (!descriptor) {
      throw new Error(`Unknown guarded equation stage id in custom order: ${stageId}`);
    }
    return descriptor;
  });
}

function runGuardedEquationSolve(
  request: GuardedSolveRequest,
  depth = 0,
  trail = new Set<string>(),
  options: GuardedEquationSolveOptions = {},
): ResultProducerDraft {
  return readEquationStageResultCarrier(runGuardedEquationSolveInternal(
    request,
    depth,
    trail,
    GUARDED_EQUATION_STAGE_DESCRIPTORS,
    options,
  ));
}

function runGuardedEquationSolveWithStageOrder(
  request: GuardedSolveRequest,
  stageOrder: GuardedEquationStageId[],
  options: GuardedEquationSolveOptions = {},
): GuardedEquationStageOrderedSolveResult {
  const descriptors = validateStageOrder(stageOrder);
  const trace: GuardedEquationStageReplayTrace = { attempts: [] };
  const outcome = runGuardedEquationSolveInternal(
    request,
    0,
    new Set<string>(),
    descriptors,
    options,
    trace,
  );
  const winningAttempt = trace.cancellation
    ? undefined
    : trace.attempts.find((attempt) => attempt.depth === 0 && attempt.returnedOutcome);
  if (winningAttempt) {
    trace.winningStageId = winningAttempt.stageId;
  }
  return {
    outcome: readEquationStageResultCarrier(outcome),
    trace,
  };
}

async function runGuardedEquationSolveWithStageOrderAsync(
  request: GuardedSolveRequest,
  stageOrder: GuardedEquationStageId[],
  options: GuardedEquationSolveOptions = {},
): Promise<GuardedEquationStageOrderedSolveResult> {
  const descriptors = validateStageOrder(stageOrder);
  const trace: GuardedEquationStageReplayTrace = { attempts: [] };
  const outcome = await runGuardedEquationSolveInternalAsync(
    request,
    0,
    new Set<string>(),
    descriptors,
    options,
    trace,
  );
  const winningAttempt = trace.cancellation
    ? undefined
    : trace.attempts.find((attempt) => attempt.depth === 0 && attempt.returnedOutcome);
  if (winningAttempt) {
    trace.winningStageId = winningAttempt.stageId;
  }
  return {
    outcome: readEquationStageResultCarrier(outcome),
    trace,
  };
}

export {
  listGuardedEquationStageDescriptors,
  runGuardedEquationSolve,
  runGuardedEquationSolveWithStageOrder,
  runGuardedEquationSolveWithStageOrderAsync,
};
