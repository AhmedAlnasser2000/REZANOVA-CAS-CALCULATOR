import type {
  MatrixRequest,
  MatrixResponse,
} from '../../types/calculator';
import { formatApproxNumber, matrixToLatex, scalarToLatex } from '../display/format';
import {
  determinantExactMatrix,
  inverseExactMatrix,
  rrefExactMatrix,
} from './exact-matrix-core';
import {
  exactMatrixFromNumeric,
  exactMatrixFromWire,
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
import { runMatrixSpaceOperation } from './matrix-spaces';

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
  const targetExactMatrix =
    req.operation === 'detA' || req.operation === 'inverseA'
      ? req.exactMatrixA
      : req.operation === 'detB' || req.operation === 'inverseB'
        ? req.exactMatrixB
        : undefined;
  if (!targetMatrix) {
    return null;
  }

  const exactMatrix = exactMatrixFromWire(targetExactMatrix) ?? exactMatrixFromNumeric(targetMatrix);
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

function exactRankRrefResponse(req: MatrixRequest): MatrixResponse | null {
  const targetMatrix =
    req.operation === 'rankA' || req.operation === 'rrefA'
      ? req.matrixA
      : req.operation === 'rankB' || req.operation === 'rrefB'
        ? req.matrixB
        : undefined;
  const targetExactMatrix =
    req.operation === 'rankA' || req.operation === 'rrefA'
      ? req.exactMatrixA
      : req.operation === 'rankB' || req.operation === 'rrefB'
        ? req.exactMatrixB
        : undefined;
  if (!targetMatrix) {
    return null;
  }

  const exactMatrix = exactMatrixFromWire(targetExactMatrix) ?? exactMatrixFromNumeric(targetMatrix);
  if (!exactMatrix) {
    return {
      warnings: [],
      error: 'Rank and RREF need exact Matrix entries in this move.',
    };
  }

  const reduced = rrefExactMatrix(exactMatrix);
  if (reduced.kind === 'stop') {
    return {
      warnings: [],
      error: reduced.reason === 'dimension-limit'
        ? 'Rank and RREF currently support matrices up to 6 by 6.'
        : 'Rank and RREF need a complete rectangular Matrix.',
    };
  }

  if (req.operation === 'rankA' || req.operation === 'rankB') {
    return {
      resultLatex: `${reduced.rank}`,
      approxText: formatApproxNumber(reduced.rank),
      warnings: [],
    };
  }

  return {
    resultLatex: exactMatrixToLatex(reduced.matrix),
    warnings: [],
  };
}

function exactSpaceResponse(req: MatrixRequest): MatrixResponse | null {
  if (req.operation === 'nullSpaceA' || req.operation === 'columnSpaceA') {
    return runMatrixSpaceOperation({
      kind: req.operation === 'nullSpaceA' ? 'nullSpace' : 'columnSpace',
      label: 'A',
      matrix: req.matrixA,
      exactMatrix: req.exactMatrixA,
    });
  }

  if (req.operation === 'nullSpaceB' || req.operation === 'columnSpaceB') {
    return req.matrixB
      ? runMatrixSpaceOperation({
          kind: req.operation === 'nullSpaceB' ? 'nullSpace' : 'columnSpace',
          label: 'B',
          matrix: req.matrixB,
          exactMatrix: req.exactMatrixB,
        })
      : {
          warnings: [],
          error: 'Matrix B is incomplete.',
        };
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

  const exactResponse = exactRankRrefResponse(req);
  if (exactResponse) {
    return exactResponse;
  }

  const spaceResponse = exactSpaceResponse(req);
  if (spaceResponse) {
    return spaceResponse;
  }

  const numericRequest: NumericMatrixRequest = {
    operation: req.operation as NumericMatrixRequest['operation'],
    matrixA: req.matrixA,
    matrixB: req.matrixB,
  };
  return matrixCoreResultToResponse(req, runNumericMatrixOperation(numericRequest));
}
