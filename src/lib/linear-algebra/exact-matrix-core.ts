import {
  exactScalarEquals,
  exactScalarIsZero,
  normalizeExactScalar,
  type ExactScalar,
} from '../algebra/polynomial-core';

export const DEFAULT_EXACT_MATRIX_MAX_DIMENSION = 6;
export const DEFAULT_EXACT_MATRIX_SCALAR_ABS_LIMIT = 1_000_000_000;

const ZERO: ExactScalar = { numerator: 0, denominator: 1 };
const ONE: ExactScalar = { numerator: 1, denominator: 1 };

export type ExactMatrix = ExactScalar[][];
export type ExactVector = ExactScalar[];

export type ExactMatrixShapeFacts = {
  rows: number;
  columns: number;
  isRectangular: boolean;
  isSquare: boolean;
};

export type ExactMatrixCoreOptions = {
  maxDimension?: number;
  maxScalarAbs?: number;
};

export type ExactMatrixStopReason =
  | 'empty-matrix'
  | 'ragged-matrix'
  | 'dimension-limit'
  | 'non-square-matrix'
  | 'rhs-dimension-mismatch'
  | 'invalid-scalar'
  | 'scalar-growth-limit'
  | 'singular-matrix'
  | 'inconsistent-system'
  | 'underdetermined-system';

export type ExactMatrixStop = {
  kind: 'stop';
  reason: ExactMatrixStopReason;
};

export type ExactMatrixValidationSuccess = {
  kind: 'success';
  matrix: ExactMatrix;
  shape: ExactMatrixShapeFacts;
};

export type ExactMatrixValidationResult = ExactMatrixValidationSuccess | ExactMatrixStop;

export type ExactRowOperation =
  | { kind: 'swap'; rowA: number; rowB: number }
  | { kind: 'scale'; row: number; factor: ExactScalar }
  | { kind: 'eliminate'; targetRow: number; pivotRow: number; factor: ExactScalar };

export type ExactRrefSuccess = {
  kind: 'success';
  matrix: ExactMatrix;
  pivotColumns: number[];
  rank: number;
  rowOperations: ExactRowOperation[];
};

export type ExactRrefResult = ExactRrefSuccess | ExactMatrixStop;

export type ExactDeterminantSuccess = {
  kind: 'success';
  determinant: ExactScalar;
  rowSwaps: number;
  rank: number;
};

export type ExactDeterminantResult = ExactDeterminantSuccess | ExactMatrixStop;

export type ExactLinearSolveSuccess = {
  kind: 'success';
  solution: ExactVector;
  rref: ExactMatrix;
  pivotColumns: number[];
  rank: number;
};

export type ExactLinearSolveResult = ExactLinearSolveSuccess | ExactMatrixStop;

export type ExactInverseSuccess = {
  kind: 'success';
  inverse: ExactMatrix;
  rref: ExactMatrix;
  pivotColumns: number[];
  rank: number;
};

export type ExactInverseResult = ExactInverseSuccess | ExactMatrixStop;

type ExactScalarResult =
  | { kind: 'success'; value: ExactScalar }
  | ExactMatrixStop;

function optionsWithDefaults(options: ExactMatrixCoreOptions = {}) {
  return {
    maxDimension: options.maxDimension ?? DEFAULT_EXACT_MATRIX_MAX_DIMENSION,
    maxScalarAbs: options.maxScalarAbs ?? DEFAULT_EXACT_MATRIX_SCALAR_ABS_LIMIT,
  };
}

function stop(reason: ExactMatrixStopReason): ExactMatrixStop {
  return { kind: 'stop', reason };
}

function cloneMatrix(matrix: ExactMatrix): ExactMatrix {
  return matrix.map((row) => row.map((value) => normalizeExactScalar(value)));
}

export function getExactMatrixShapeFacts(matrix: ExactMatrix): ExactMatrixShapeFacts {
  const rows = matrix.length;
  const columns = matrix[0]?.length ?? 0;
  const isRectangular = rows > 0 && columns > 0 && matrix.every((row) => row.length === columns);

  return {
    rows,
    columns,
    isRectangular,
    isSquare: isRectangular && rows === columns,
  };
}

function isValidInteger(value: number) {
  return Number.isFinite(value) && Number.isInteger(value) && Number.isSafeInteger(value);
}

function validateScalar(
  value: ExactScalar,
  options: Required<ExactMatrixCoreOptions>,
): ExactScalarResult {
  if (!isValidInteger(value.numerator) || !isValidInteger(value.denominator) || value.denominator === 0) {
    return stop('invalid-scalar');
  }

  const normalized = normalizeExactScalar(value);
  if (!isValidInteger(normalized.numerator) || !isValidInteger(normalized.denominator) || normalized.denominator <= 0) {
    return stop('invalid-scalar');
  }

  if (
    Math.abs(normalized.numerator) > options.maxScalarAbs
    || Math.abs(normalized.denominator) > options.maxScalarAbs
  ) {
    return stop('scalar-growth-limit');
  }

  return { kind: 'success', value: normalized };
}

function checkedAddNumber(left: number, right: number): number | null {
  const result = left + right;
  return isValidInteger(result) ? result : null;
}

function checkedMultiplyNumber(left: number, right: number): number | null {
  if (left !== 0 && Math.abs(right) > Math.floor(Number.MAX_SAFE_INTEGER / Math.abs(left))) {
    return null;
  }
  const result = left * right;
  return isValidInteger(result) ? result : null;
}

function checkedAddScalars(
  left: ExactScalar,
  right: ExactScalar,
  options: Required<ExactMatrixCoreOptions>,
): ExactScalarResult {
  const leftNumerator = checkedMultiplyNumber(left.numerator, right.denominator);
  const rightNumerator = checkedMultiplyNumber(right.numerator, left.denominator);
  const denominator = checkedMultiplyNumber(left.denominator, right.denominator);
  if (leftNumerator === null || rightNumerator === null || denominator === null) {
    return stop('scalar-growth-limit');
  }

  const numerator = checkedAddNumber(leftNumerator, rightNumerator);
  if (numerator === null) {
    return stop('scalar-growth-limit');
  }

  return validateScalar({ numerator, denominator }, options);
}

function checkedSubtractScalars(
  left: ExactScalar,
  right: ExactScalar,
  options: Required<ExactMatrixCoreOptions>,
): ExactScalarResult {
  return checkedAddScalars(left, { numerator: -right.numerator, denominator: right.denominator }, options);
}

function checkedMultiplyScalars(
  left: ExactScalar,
  right: ExactScalar,
  options: Required<ExactMatrixCoreOptions>,
): ExactScalarResult {
  const numerator = checkedMultiplyNumber(left.numerator, right.numerator);
  const denominator = checkedMultiplyNumber(left.denominator, right.denominator);
  if (numerator === null || denominator === null) {
    return stop('scalar-growth-limit');
  }

  return validateScalar({ numerator, denominator }, options);
}

function checkedDivideScalars(
  left: ExactScalar,
  right: ExactScalar,
  options: Required<ExactMatrixCoreOptions>,
): ExactScalarResult {
  if (exactScalarIsZero(right)) {
    return stop('singular-matrix');
  }

  const numerator = checkedMultiplyNumber(left.numerator, right.denominator);
  const denominator = checkedMultiplyNumber(left.denominator, right.numerator);
  if (numerator === null || denominator === null) {
    return stop('scalar-growth-limit');
  }

  return validateScalar({ numerator, denominator }, options);
}

function validateVector(
  vector: ExactVector,
  expectedLength: number,
  options: Required<ExactMatrixCoreOptions>,
): { kind: 'success'; vector: ExactVector } | ExactMatrixStop {
  if (vector.length !== expectedLength) {
    return stop('rhs-dimension-mismatch');
  }

  const normalized: ExactVector = [];
  for (const value of vector) {
    const scalar = validateScalar(value, options);
    if (scalar.kind === 'stop') {
      return scalar;
    }
    normalized.push(scalar.value);
  }

  return { kind: 'success', vector: normalized };
}

export function validateExactMatrix(
  matrix: ExactMatrix,
  options: ExactMatrixCoreOptions = {},
): ExactMatrixValidationResult {
  const resolved = optionsWithDefaults(options);
  const shape = getExactMatrixShapeFacts(matrix);

  if (shape.rows === 0 || shape.columns === 0) {
    return stop('empty-matrix');
  }

  if (!shape.isRectangular) {
    return stop('ragged-matrix');
  }

  if (shape.rows > resolved.maxDimension || shape.columns > resolved.maxDimension) {
    return stop('dimension-limit');
  }

  const normalized: ExactMatrix = [];
  for (const row of matrix) {
    const normalizedRow: ExactScalar[] = [];
    for (const value of row) {
      const scalar = validateScalar(value, resolved);
      if (scalar.kind === 'stop') {
        return scalar;
      }
      normalizedRow.push(scalar.value);
    }
    normalized.push(normalizedRow);
  }

  return {
    kind: 'success',
    matrix: normalized,
    shape,
  };
}

function rrefUnchecked(
  matrix: ExactMatrix,
  options: Required<ExactMatrixCoreOptions>,
): ExactRrefResult {
  const working = cloneMatrix(matrix);
  const rows = working.length;
  const columns = working[0]?.length ?? 0;
  const pivotColumns: number[] = [];
  const rowOperations: ExactRowOperation[] = [];
  let pivotRow = 0;

  for (let column = 0; column < columns && pivotRow < rows; column += 1) {
    let nextPivotRow = pivotRow;
    while (nextPivotRow < rows && exactScalarIsZero(working[nextPivotRow][column])) {
      nextPivotRow += 1;
    }

    if (nextPivotRow === rows) {
      continue;
    }

    if (nextPivotRow !== pivotRow) {
      [working[pivotRow], working[nextPivotRow]] = [working[nextPivotRow], working[pivotRow]];
      rowOperations.push({ kind: 'swap', rowA: pivotRow, rowB: nextPivotRow });
    }

    const pivotValue = working[pivotRow][column];
    const pivotReciprocal = checkedDivideScalars(ONE, pivotValue, options);
    if (pivotReciprocal.kind === 'stop') {
      return pivotReciprocal;
    }

    for (let index = 0; index < columns; index += 1) {
      const scaled = checkedMultiplyScalars(working[pivotRow][index], pivotReciprocal.value, options);
      if (scaled.kind === 'stop') {
        return scaled;
      }
      working[pivotRow][index] = scaled.value;
    }
    rowOperations.push({ kind: 'scale', row: pivotRow, factor: pivotReciprocal.value });

    for (let row = 0; row < rows; row += 1) {
      if (row === pivotRow || exactScalarIsZero(working[row][column])) {
        continue;
      }

      const factor = working[row][column];
      for (let index = 0; index < columns; index += 1) {
        const product = checkedMultiplyScalars(factor, working[pivotRow][index], options);
        if (product.kind === 'stop') {
          return product;
        }
        const next = checkedSubtractScalars(working[row][index], product.value, options);
        if (next.kind === 'stop') {
          return next;
        }
        working[row][index] = next.value;
      }
      rowOperations.push({ kind: 'eliminate', targetRow: row, pivotRow, factor });
    }

    pivotColumns.push(column);
    pivotRow += 1;
  }

  return {
    kind: 'success',
    matrix: working,
    pivotColumns,
    rank: pivotColumns.length,
    rowOperations,
  };
}

export function rrefExactMatrix(
  matrix: ExactMatrix,
  options: ExactMatrixCoreOptions = {},
): ExactRrefResult {
  const validated = validateExactMatrix(matrix, options);
  if (validated.kind === 'stop') {
    return validated;
  }

  return rrefUnchecked(validated.matrix, optionsWithDefaults(options));
}

export function determinantExactMatrix(
  matrix: ExactMatrix,
  options: ExactMatrixCoreOptions = {},
): ExactDeterminantResult {
  const validated = validateExactMatrix(matrix, options);
  if (validated.kind === 'stop') {
    return validated;
  }

  if (!validated.shape.isSquare) {
    return stop('non-square-matrix');
  }

  const resolved = optionsWithDefaults(options);
  const working = cloneMatrix(validated.matrix);
  const size = validated.shape.rows;
  let determinant = ONE;
  let rowSwaps = 0;
  let rank = 0;

  for (let column = 0; column < size; column += 1) {
    let pivotRow = column;
    while (pivotRow < size && exactScalarIsZero(working[pivotRow][column])) {
      pivotRow += 1;
    }

    if (pivotRow === size) {
      return {
        kind: 'success',
        determinant: ZERO,
        rowSwaps,
        rank,
      };
    }

    if (pivotRow !== column) {
      [working[column], working[pivotRow]] = [working[pivotRow], working[column]];
      rowSwaps += 1;
    }

    const pivotValue = working[column][column];
    const nextDeterminant = checkedMultiplyScalars(determinant, pivotValue, resolved);
    if (nextDeterminant.kind === 'stop') {
      return nextDeterminant;
    }
    determinant = nextDeterminant.value;
    rank += 1;

    for (let row = column + 1; row < size; row += 1) {
      if (exactScalarIsZero(working[row][column])) {
        continue;
      }

      const factor = checkedDivideScalars(working[row][column], pivotValue, resolved);
      if (factor.kind === 'stop') {
        return factor;
      }

      for (let index = column; index < size; index += 1) {
        const product = checkedMultiplyScalars(factor.value, working[column][index], resolved);
        if (product.kind === 'stop') {
          return product;
        }
        const next = checkedSubtractScalars(working[row][index], product.value, resolved);
        if (next.kind === 'stop') {
          return next;
        }
        working[row][index] = next.value;
      }
    }
  }

  if (rowSwaps % 2 === 1) {
    determinant = { numerator: -determinant.numerator, denominator: determinant.denominator };
  }

  return {
    kind: 'success',
    determinant: normalizeExactScalar(determinant),
    rowSwaps,
    rank,
  };
}

function identityMatrix(size: number): ExactMatrix {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => (row === column ? ONE : ZERO)));
}

function isZeroRow(row: ExactScalar[], throughColumn: number) {
  return row.slice(0, throughColumn).every((value) => exactScalarIsZero(value));
}

function hasInconsistentRow(rref: ExactMatrix, coefficientColumns: number) {
  return rref.some((row) =>
    isZeroRow(row, coefficientColumns) && !exactScalarIsZero(row[coefficientColumns]));
}

export function solveExactLinearSystem(
  coefficients: ExactMatrix,
  constants: ExactVector,
  options: ExactMatrixCoreOptions = {},
): ExactLinearSolveResult {
  const resolved = optionsWithDefaults(options);
  const validated = validateExactMatrix(coefficients, options);
  if (validated.kind === 'stop') {
    return validated;
  }

  const rhs = validateVector(constants, validated.shape.rows, resolved);
  if (rhs.kind === 'stop') {
    return rhs;
  }

  const augmented = validated.matrix.map((row, rowIndex) => [...row, rhs.vector[rowIndex]]);
  const reduced = rrefUnchecked(augmented, resolved);
  if (reduced.kind === 'stop') {
    return reduced;
  }

  const coefficientColumns = validated.shape.columns;
  const pivotColumns = reduced.pivotColumns.filter((column) => column < coefficientColumns);
  const rank = pivotColumns.length;

  if (hasInconsistentRow(reduced.matrix, coefficientColumns)) {
    return stop('inconsistent-system');
  }

  if (rank < coefficientColumns || validated.shape.rows < coefficientColumns) {
    return stop('underdetermined-system');
  }

  if (!validated.shape.isSquare) {
    return stop('non-square-matrix');
  }

  return {
    kind: 'success',
    solution: reduced.matrix.slice(0, coefficientColumns).map((row) => normalizeExactScalar(row[coefficientColumns])),
    rref: reduced.matrix,
    pivotColumns,
    rank,
  };
}

export function inverseExactMatrix(
  matrix: ExactMatrix,
  options: ExactMatrixCoreOptions = {},
): ExactInverseResult {
  const resolved = optionsWithDefaults(options);
  const validated = validateExactMatrix(matrix, options);
  if (validated.kind === 'stop') {
    return validated;
  }

  if (!validated.shape.isSquare) {
    return stop('non-square-matrix');
  }

  const size = validated.shape.rows;
  const augmented = validated.matrix.map((row, rowIndex) => [
    ...row,
    ...identityMatrix(size)[rowIndex],
  ]);
  const reduced = rrefUnchecked(augmented, resolved);
  if (reduced.kind === 'stop') {
    return reduced;
  }

  const pivotColumns = reduced.pivotColumns.filter((column) => column < size);
  if (pivotColumns.length < size) {
    return stop('singular-matrix');
  }

  const left = reduced.matrix.map((row) => row.slice(0, size));
  const isIdentity = left.every((row, rowIndex) =>
    row.every((value, columnIndex) =>
      exactScalarEquals(value, rowIndex === columnIndex ? ONE : ZERO)));
  if (!isIdentity) {
    return stop('singular-matrix');
  }

  return {
    kind: 'success',
    inverse: reduced.matrix.map((row) => row.slice(size).map((value) => normalizeExactScalar(value))),
    rref: reduced.matrix,
    pivotColumns,
    rank: pivotColumns.length,
  };
}

export function scalar(numerator: number, denominator = 1): ExactScalar {
  return normalizeExactScalar({ numerator, denominator });
}
