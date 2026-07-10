import type { ExactScalar } from '../algebra/polynomial-core';
import {
  rrefExactMatrix,
  type ExactMatrix,
  type ExactMatrixCoreOptions,
  type ExactMatrixStop,
  type ExactRowOperation,
  type ExactVector,
} from './exact-matrix-core';

const ZERO: ExactScalar = { numerator: 0, denominator: 1 };
const ONE: ExactScalar = { numerator: 1, denominator: 1 };

export type ExactColumnFamilyAnalysis = {
  kind: 'success';
  matrix: ExactMatrix;
  rref: ExactMatrix;
  pivotColumns: number[];
  rank: number;
  nullity: number;
  kernelBasis: ExactVector[];
  imageBasis: ExactVector[];
  rowOperations: ExactRowOperation[];
};

export type ExactColumnFamilyAnalysisResult = ExactColumnFamilyAnalysis | ExactMatrixStop;

function negateScalar(value: ExactScalar): ExactScalar {
  return { numerator: -value.numerator, denominator: value.denominator };
}

export function exactMatrixFromColumnVectors(vectors: readonly ExactVector[]): ExactMatrix | null {
  const rows = vectors[0]?.length ?? 0;
  if (vectors.length === 0 || rows === 0 || vectors.some((vector) => vector.length !== rows)) {
    return null;
  }
  return Array.from({ length: rows }, (_, row) => vectors.map((vector) => vector[row]));
}

export function exactNullSpaceBasis(
  rref: ExactMatrix,
  pivotColumns: readonly number[],
  unknowns: number,
): ExactVector[] {
  const pivotSet = new Set(pivotColumns);
  const freeColumns = Array.from({ length: unknowns }, (_, index) => index)
    .filter((column) => !pivotSet.has(column));

  return freeColumns.map((freeColumn) => {
    const vector = Array.from({ length: unknowns }, () => ZERO);
    vector[freeColumn] = ONE;
    pivotColumns.forEach((pivotColumn, pivotRow) => {
      vector[pivotColumn] = negateScalar(rref[pivotRow][freeColumn]);
    });
    return vector;
  });
}

export function exactColumnSpaceBasis(
  matrix: ExactMatrix,
  pivotColumns: readonly number[],
): ExactVector[] {
  return pivotColumns.map((column) => matrix.map((row) => row[column]));
}

export function analyzeExactColumnFamily(
  matrix: ExactMatrix,
  options: ExactMatrixCoreOptions = {},
): ExactColumnFamilyAnalysisResult {
  const reduced = rrefExactMatrix(matrix, options);
  if (reduced.kind === 'stop') {
    return reduced;
  }

  const columns = matrix[0]?.length ?? 0;
  const pivotColumns = reduced.pivotColumns.filter((column) => column < columns);
  const rank = pivotColumns.length;
  return {
    kind: 'success',
    matrix,
    rref: reduced.matrix,
    pivotColumns,
    rank,
    nullity: columns - rank,
    kernelBasis: exactNullSpaceBasis(reduced.matrix, pivotColumns, columns),
    imageBasis: exactColumnSpaceBasis(matrix, pivotColumns),
    rowOperations: reduced.rowOperations,
  };
}
