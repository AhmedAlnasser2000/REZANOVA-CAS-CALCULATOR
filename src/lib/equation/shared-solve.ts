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
} from './guarded-solve';

export type SharedSolveRequest = GuardedSolveRequest;

export function listSharedEquationSolveStageOrder(): GuardedEquationStageId[] {
  return listGuardedEquationStageDescriptors().map((stage) => stage.id);
}

export function runSharedEquationSolveWithTrace(
  request: SharedSolveRequest,
): GuardedEquationStageOrderedSolveResult {
  return runGuardedEquationSolveWithStageOrder(
    request,
    listSharedEquationSolveStageOrder(),
  );
}

export function runSharedEquationSolve(request: SharedSolveRequest): DisplayOutcome {
  return runGuardedEquationSolve(request);
}
