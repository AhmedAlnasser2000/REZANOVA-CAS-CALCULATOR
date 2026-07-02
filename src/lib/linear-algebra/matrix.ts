import type {
  MatrixRequest,
  MatrixResponse,
} from '../../types/calculator';
import { formatApproxNumber, matrixToLatex, scalarToLatex } from '../display/format';
import {
  determinantExactMatrix,
  inverseExactMatrix,
} from './exact-matrix-core';
import {
  exactMatrixFromNumeric,
  exactMatrixToLatex,
  exactScalarToLatex,
} from './exact-matrix-format';
import {
  runNumericMatrixOperation,
  solveNumericLinearSystem,
  type MatrixCoreResult,
  type MatrixCoreStopReason,
  type NumericMatrixRequest,
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

function exactMatrixReadback(req: MatrixRequest): string | null {
  const targetMatrix =
    req.operation === 'detA' || req.operation === 'inverseA'
      ? req.matrixA
      : req.operation === 'detB' || req.operation === 'inverseB'
        ? req.matrixB
        : undefined;
  if (!targetMatrix) {
    return null;
  }

  const exactMatrix = exactMatrixFromNumeric(targetMatrix);
  if (!exactMatrix) {
    return null;
  }

  if (req.operation === 'detA' || req.operation === 'detB') {
    const determinant = determinantExactMatrix(exactMatrix);
    return determinant.kind === 'success'
      ? exactScalarToLatex(determinant.determinant)
      : null;
  }

  if (req.operation === 'inverseA' || req.operation === 'inverseB') {
    const inverse = inverseExactMatrix(exactMatrix);
    return inverse.kind === 'success'
      ? exactMatrixToLatex(inverse.inverse)
      : null;
  }

  return null;
}

function matrixCoreResultToResponse(req: MatrixRequest, result: MatrixCoreResult): MatrixResponse {
  if (result.kind === 'error') {
    return {
      warnings: [],
      error: matrixStopReasonToMessage(result.reason),
    };
  }

  if (result.kind === 'scalar') {
    return {
      resultLatex: exactMatrixReadback(req) ?? scalarToLatex(result.value),
      approxText: formatApproxNumber(result.value),
      warnings: [],
    };
  }

  return {
    resultLatex: exactMatrixReadback(req) ?? matrixToLatex(result.value),
    warnings: [],
  };
}

export function solveLinearSystem(coefficients: number[][], constants: number[]) {
  return solveNumericLinearSystem(coefficients, constants);
}

export function runMatrixOperation(req: MatrixRequest): MatrixResponse {
  if (req.operation === 'linearSystem') {
    return {
      warnings: [],
      error: 'Structured Matrix systems run through the Matrix editor.',
    };
  }

  const numericRequest: NumericMatrixRequest = {
    operation: req.operation as NumericMatrixRequest['operation'],
    matrixA: req.matrixA,
    matrixB: req.matrixB,
  };
  return matrixCoreResultToResponse(req, runNumericMatrixOperation(numericRequest));
}
