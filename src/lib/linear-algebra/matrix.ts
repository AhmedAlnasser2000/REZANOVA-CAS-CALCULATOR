import type {
  MatrixRequest,
  MatrixResponse,
} from '../../types/calculator';
import { formatApproxNumber, matrixToLatex, scalarToLatex } from '../display/format';
import {
  runNumericMatrixOperation,
  solveNumericLinearSystem,
  type MatrixCoreResult,
  type MatrixCoreStopReason,
} from './matrix-core';

function matrixStopReasonToMessage(reason: MatrixCoreStopReason): string {
  switch (reason) {
    case 'matrix-a-incomplete':
      return 'Matrix A is incomplete.';
    case 'matrix-b-incomplete':
      return 'Matrix B is incomplete.';
    case 'add-subtract-dimension-mismatch':
      return 'Addition and subtraction require matching matrix dimensions.';
    case 'multiply-dimension-mismatch':
      return 'Matrix multiplication requires A columns to match B rows.';
    case 'det-a-non-square':
      return 'det(A) requires a square matrix.';
    case 'det-b-non-square':
      return 'det(B) requires a square Matrix B.';
    case 'inverse-a-singular-or-non-square':
      return 'Matrix A is singular or not square.';
    case 'inverse-b-singular-or-non-square':
      return 'Matrix B is singular or not square.';
    case 'unsupported-operation':
      return 'Unsupported matrix operation.';
  }
}

function matrixCoreResultToResponse(result: MatrixCoreResult): MatrixResponse {
  if (result.kind === 'error') {
    return {
      warnings: [],
      error: matrixStopReasonToMessage(result.reason),
    };
  }

  if (result.kind === 'scalar') {
    return {
      resultLatex: scalarToLatex(result.value),
      approxText: formatApproxNumber(result.value),
      warnings: [],
    };
  }

  return {
    resultLatex: matrixToLatex(result.value),
    warnings: [],
  };
}

export function solveLinearSystem(coefficients: number[][], constants: number[]) {
  return solveNumericLinearSystem(coefficients, constants);
}

export function runMatrixOperation(req: MatrixRequest): MatrixResponse {
  return matrixCoreResultToResponse(runNumericMatrixOperation(req));
}
