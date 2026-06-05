import type {
  DisplayOutcome,
  GuardedSolveRequest,
} from '../../types/calculator';
import {
  listGuardedEquationStageDescriptors,
  runGuardedEquationSolve,
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

export function runSharedEquationSolve(
  request: SharedSolveRequest,
  options: GuardedEquationSolveOptions = {},
): DisplayOutcome {
  return runGuardedEquationSolve(request, 0, new Set<string>(), options);
}
