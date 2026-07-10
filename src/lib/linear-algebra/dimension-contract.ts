export const LINEAR_ALGEBRA_MIN_EDITING_DIMENSION = 1;
export const LINEAR_ALGEBRA_MATRIX_MAX_ROWS = 8;
export const LINEAR_ALGEBRA_MATRIX_MAX_COLUMNS = 8;
export const LINEAR_ALGEBRA_VECTOR_MAX_LENGTH = 8;

export const LINEAR_ALGEBRA_EXACT_MATRIX_MAX_DIMENSION = 6;
export const LINEAR_ALGEBRA_EXACT_EXPRESSION_MAX_DIMENSION = 8;
export const LINEAR_ALGEBRA_SINGLE_RHS_AUGMENTED_MAX_DIMENSION = 7;
export const LINEAR_ALGEBRA_MULTI_RHS_AUGMENTED_MAX_DIMENSION = 12;
export const LINEAR_ALGEBRA_SPECTRAL_V1_MATRIX_SIZE = 2;
export const LINEAR_ALGEBRA_EXACT_MATRIX_POWER_ABS_LIMIT = 12;
export const LINEAR_ALGEBRA_EXACT_SCALAR_ABS_LIMIT = 1_000_000_000;

export const LINEAR_ALGEBRA_DIMENSION_PROFILES = {
  'editor-matrix': {
    maxRows: LINEAR_ALGEBRA_MATRIX_MAX_ROWS,
    maxColumns: LINEAR_ALGEBRA_MATRIX_MAX_COLUMNS,
    execution: 'input',
    fallback: 'stop',
  },
  'editor-vector': {
    maxLength: LINEAR_ALGEBRA_VECTOR_MAX_LENGTH,
    execution: 'input',
    fallback: 'stop',
  },
  'exact-expression': {
    maxRows: LINEAR_ALGEBRA_EXACT_EXPRESSION_MAX_DIMENSION,
    maxColumns: LINEAR_ALGEBRA_EXACT_EXPRESSION_MAX_DIMENSION,
    maxScalarAbs: LINEAR_ALGEBRA_EXACT_SCALAR_ABS_LIMIT,
    execution: 'exact',
    fallback: 'stop',
  },
  'exact-elimination': {
    maxRows: LINEAR_ALGEBRA_EXACT_MATRIX_MAX_DIMENSION,
    maxColumns: LINEAR_ALGEBRA_EXACT_MATRIX_MAX_DIMENSION,
    maxScalarAbs: LINEAR_ALGEBRA_EXACT_SCALAR_ABS_LIMIT,
    execution: 'exact',
    fallback: 'stop',
  },
  'exact-single-rhs-augmented': {
    maxRows: LINEAR_ALGEBRA_EXACT_MATRIX_MAX_DIMENSION,
    maxColumns: LINEAR_ALGEBRA_SINGLE_RHS_AUGMENTED_MAX_DIMENSION,
    execution: 'exact',
    fallback: 'stop',
  },
  'exact-multi-rhs-augmented': {
    maxRows: LINEAR_ALGEBRA_EXACT_MATRIX_MAX_DIMENSION,
    maxColumns: LINEAR_ALGEBRA_MULTI_RHS_AUGMENTED_MAX_DIMENSION,
    execution: 'exact',
    fallback: 'stop',
  },
  'exact-matrix-power': {
    maxAbsExponent: LINEAR_ALGEBRA_EXACT_MATRIX_POWER_ABS_LIMIT,
    maxScalarAbs: LINEAR_ALGEBRA_EXACT_SCALAR_ABS_LIMIT,
    execution: 'exact',
    fallback: 'stop',
  },
  'spectral-v1': {
    maxRows: LINEAR_ALGEBRA_SPECTRAL_V1_MATRIX_SIZE,
    maxColumns: LINEAR_ALGEBRA_SPECTRAL_V1_MATRIX_SIZE,
    execution: 'exact',
    fallback: 'stop',
  },
} as const;

export type LinearAlgebraDimensionProfileId = keyof typeof LINEAR_ALGEBRA_DIMENSION_PROFILES;

export function clampLinearAlgebraEditingDimension(value: number) {
  if (!Number.isFinite(value)) {
    return LINEAR_ALGEBRA_MIN_EDITING_DIMENSION;
  }
  return Math.min(
    LINEAR_ALGEBRA_MATRIX_MAX_ROWS,
    Math.max(LINEAR_ALGEBRA_MIN_EDITING_DIMENSION, Math.trunc(value)),
  );
}

function matrixShape(matrix: readonly (readonly unknown[])[]) {
  return {
    rows: matrix.length,
    columns: matrix.reduce((maximum, row) => Math.max(maximum, row.length), 0),
  };
}

export function matrixEditingDimensionError(
  matrix: readonly (readonly unknown[])[],
): string | null {
  const shape = matrixShape(matrix);
  if (
    shape.rows <= LINEAR_ALGEBRA_MATRIX_MAX_ROWS
    && shape.columns <= LINEAR_ALGEBRA_MATRIX_MAX_COLUMNS
  ) {
    return null;
  }

  return `Matrix inputs support up to ${LINEAR_ALGEBRA_MATRIX_MAX_ROWS} by ${LINEAR_ALGEBRA_MATRIX_MAX_COLUMNS}; received ${shape.rows} by ${shape.columns}. Resize the matrix before running.`;
}

export function vectorEditingDimensionError(vector: readonly unknown[]): string | null {
  if (vector.length <= LINEAR_ALGEBRA_VECTOR_MAX_LENGTH) {
    return null;
  }

  return `Vector inputs support up to ${LINEAR_ALGEBRA_VECTOR_MAX_LENGTH} entries; received ${vector.length}. Resize the vector before running.`;
}

export function exactMatrixDimensionLimitMessage(subject: string) {
  return `The exact matrix limit for ${subject} is ${LINEAR_ALGEBRA_EXACT_MATRIX_MAX_DIMENSION} by ${LINEAR_ALGEBRA_EXACT_MATRIX_MAX_DIMENSION}.`;
}

export function exactVectorFamilyDimensionLimitMessage() {
  return `Exact span and independence support one through ${LINEAR_ALGEBRA_EXACT_MATRIX_MAX_DIMENSION} vectors with length up to ${LINEAR_ALGEBRA_EXACT_MATRIX_MAX_DIMENSION}.`;
}
