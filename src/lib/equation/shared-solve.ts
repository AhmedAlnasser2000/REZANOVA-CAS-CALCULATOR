import type {
  DisplayOutcome,
  GuardedSolveRequest,
} from '../../types/calculator';
import { runGuardedEquationSolve } from './guarded-solve';

export type SharedSolveRequest = GuardedSolveRequest;

export function runSharedEquationSolve(request: SharedSolveRequest): DisplayOutcome {
  return runGuardedEquationSolve(request);
}
