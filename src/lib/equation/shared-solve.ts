import type {
  ResultProducerDraft,
  GuardedSolveRequest,
} from '../../types/calculator';
import {
  listGuardedEquationStageDescriptors,
  runGuardedEquationSolve,
  runGuardedEquationSolveWithStageOrderAsync,
  runGuardedEquationSolveWithStageOrder,
  type GuardedEquationStageId,
  type GuardedEquationStageOrderedSolveResult,
  type GuardedEquationSolveOptions,
} from './guarded-solve';

export type SharedSolveRequest = GuardedSolveRequest;

export function listSharedEquationSolveStageOrder(): GuardedEquationStageId[] {
  return listGuardedEquationStageDescriptors().map((stage) => stage.id);
}

export function runSharedEquationSolveWithTrace(
  request: SharedSolveRequest,
  options: GuardedEquationSolveOptions = {},
): GuardedEquationStageOrderedSolveResult {
  return runGuardedEquationSolveWithStageOrder(
    request,
    listSharedEquationSolveStageOrder(),
    options,
  );
}

export function runSharedEquationSolveWithTraceAsync(
  request: SharedSolveRequest,
  options: GuardedEquationSolveOptions = {},
): Promise<GuardedEquationStageOrderedSolveResult> {
  return runGuardedEquationSolveWithStageOrderAsync(
    request,
    listSharedEquationSolveStageOrder(),
    options,
  );
}

export function runSharedEquationSolve(
  request: SharedSolveRequest,
  options: GuardedEquationSolveOptions = {},
): ResultProducerDraft {
  return runGuardedEquationSolve(request, 0, new Set<string>(), options);
}
