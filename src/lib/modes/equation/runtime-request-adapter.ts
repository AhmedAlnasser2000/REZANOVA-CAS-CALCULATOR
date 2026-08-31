import { resolveEquationSolveTarget } from '../../equation/equation-target-resolution';
import {
  runEquationModeForIsolatedWorker as runFrozenEquationModeForIsolatedWorker,
} from './run';
import type {
  EquationModeIsolatedWorkerRunResult,
  RunEquationModeRequest,
} from './types';

export function normalizeEquationRuntimeRequest(
  request: RunEquationModeRequest,
): RunEquationModeRequest {
  if (request.equationScreen !== 'symbolic') {
    return request;
  }

  const equationSolveTarget = resolveEquationSolveTarget(
    request.equationLatex,
    request.equationSolveTarget,
  ).selectedTarget ?? request.equationSolveTarget;

  return equationSolveTarget === request.equationSolveTarget
    ? request
    : { ...request, equationSolveTarget };
}

export function runEquationModeForIsolatedWorker(
  request: RunEquationModeRequest,
): Promise<EquationModeIsolatedWorkerRunResult> {
  return runFrozenEquationModeForIsolatedWorker(
    normalizeEquationRuntimeRequest(request),
  );
}
