import type { ExactScalarWire } from '../../types/calculator';
import {
  addExactScalars,
  exactScalarToNumber,
  multiplyExactScalars,
  subtractExactScalars,
  type ExactScalar,
} from '../algebra/polynomial-core';
import {
  inverseExactMatrix,
  scalar,
  validateExactMatrix,
  type ExactMatrix,
} from './exact-matrix-core';

const MAX_EXACT_EXPRESSION_DIMENSION = 8;
const MAX_EXACT_EXPRESSION_POWER_ABS = 12;

function zero() {
  return scalar(0);
}

function one() {
  return scalar(1);
}

function cloneExactMatrix(matrix: ExactMatrix): ExactMatrix {
  return matrix.map((row) => row.map((value) => scalar(value.numerator, value.denominator)));
}

function matrixShape(matrix: readonly unknown[][]) {
  const rows = matrix.length;
  const columns = matrix[0]?.length ?? 0;
  const rectangular = rows > 0 && columns > 0 && matrix.every((row) => row.length === columns);
  return { rows, columns, rectangular, square: rectangular && rows === columns };
}

function validateExpressionMatrix(matrix: ExactMatrix): ExactMatrix | null {
  const validated = validateExactMatrix(matrix, { maxDimension: MAX_EXACT_EXPRESSION_DIMENSION });
  return validated.kind === 'success' ? validated.matrix : null;
}

export function exactMatrixToWire(matrix: ExactMatrix): ExactScalarWire[][] {
  return matrix.map((row) => row.map((value) => ({
    numerator: value.numerator,
    denominator: value.denominator,
  })));
}

export function exactMatrixToNumeric(matrix: ExactMatrix): number[][] {
  return matrix.map((row) => row.map(exactScalarToNumber));
}

export function exactAddMatrices(left: ExactMatrix, right: ExactMatrix): ExactMatrix | null {
  const leftShape = matrixShape(left);
  const rightShape = matrixShape(right);
  if (!leftShape.rectangular || !rightShape.rectangular || leftShape.rows !== rightShape.rows || leftShape.columns !== rightShape.columns) {
    return null;
  }

  return validateExpressionMatrix(left.map((row, rowIndex) =>
    row.map((value, columnIndex) => addExactScalars(value, right[rowIndex][columnIndex]))));
}

export function exactSubtractMatrices(left: ExactMatrix, right: ExactMatrix): ExactMatrix | null {
  const leftShape = matrixShape(left);
  const rightShape = matrixShape(right);
  if (!leftShape.rectangular || !rightShape.rectangular || leftShape.rows !== rightShape.rows || leftShape.columns !== rightShape.columns) {
    return null;
  }

  return validateExpressionMatrix(left.map((row, rowIndex) =>
    row.map((value, columnIndex) => subtractExactScalars(value, right[rowIndex][columnIndex]))));
}

export function exactMultiplyMatrices(left: ExactMatrix, right: ExactMatrix): ExactMatrix | null {
  const leftShape = matrixShape(left);
  const rightShape = matrixShape(right);
  if (!leftShape.rectangular || !rightShape.rectangular || leftShape.columns !== rightShape.rows) {
    return null;
  }

  const result = Array.from({ length: leftShape.rows }, () =>
    Array.from<ExactScalar>({ length: rightShape.columns }).fill(zero()));
  for (let row = 0; row < leftShape.rows; row += 1) {
    for (let column = 0; column < rightShape.columns; column += 1) {
      let sum = zero();
      for (let pivot = 0; pivot < leftShape.columns; pivot += 1) {
        sum = addExactScalars(sum, multiplyExactScalars(left[row][pivot], right[pivot][column]));
      }
      result[row][column] = sum;
    }
  }

  return validateExpressionMatrix(result);
}

export function exactTransposeMatrix(matrix: ExactMatrix): ExactMatrix | null {
  const shape = matrixShape(matrix);
  if (!shape.rectangular) {
    return null;
  }
  return validateExpressionMatrix(matrix[0].map((_, columnIndex) =>
    matrix.map((row) => row[columnIndex])));
}

function identityExactMatrix(size: number): ExactMatrix {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => (row === column ? one() : zero())));
}

export function exactInverseMatrixForExpression(matrix: ExactMatrix): ExactMatrix | null {
  const inverse = inverseExactMatrix(matrix, { maxDimension: MAX_EXACT_EXPRESSION_DIMENSION });
  return inverse.kind === 'success' ? inverse.inverse : null;
}

export function exactPowerMatrix(matrix: ExactMatrix, exponent: number): ExactMatrix | null {
  if (!Number.isInteger(exponent) || Math.abs(exponent) > MAX_EXACT_EXPRESSION_POWER_ABS) {
    return null;
  }

  const shape = matrixShape(matrix);
  if (!shape.square) {
    return null;
  }

  let base = cloneExactMatrix(matrix);
  if (exponent < 0) {
    const inverse = exactInverseMatrixForExpression(base);
    if (!inverse) {
      return null;
    }
    base = inverse;
  }

  let result = identityExactMatrix(shape.rows);
  for (let index = 0; index < Math.abs(exponent); index += 1) {
    const next = exactMultiplyMatrices(result, base);
    if (!next) {
      return null;
    }
    result = next;
  }
  return validateExpressionMatrix(result);
}

export { MAX_EXACT_EXPRESSION_POWER_ABS };
