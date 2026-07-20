import {
  matrixValueById,
  numericMatrixFromNamedValue,
  numericVectorFromNamedValue,
  vectorValueById,
  type LinearAlgebraMatrixNamedValue,
  type LinearAlgebraVectorNamedValue,
} from '../../lib/linear-algebra/named-values';
import { clampLinearAlgebraEditingDimension } from '../../lib/linear-algebra/dimension-contract';
import { cloneMatrix, cloneVector } from './linearAlgebraRuntimeDefaults';

export function matrixValueForCompatibility(
  values: readonly LinearAlgebraMatrixNamedValue[],
  id: string,
  fallback: number[][],
) {
  const namedValue = matrixValueById(values, id);
  return namedValue ? numericMatrixFromNamedValue(namedValue) ?? cloneMatrix(fallback) : cloneMatrix(fallback);
}

export function vectorValueForCompatibility(
  values: readonly LinearAlgebraVectorNamedValue[],
  id: string,
  fallback: number[],
) {
  const namedValue = vectorValueById(values, id);
  return namedValue ? numericVectorFromNamedValue(namedValue) ?? cloneVector(fallback) : cloneVector(fallback);
}

export function resizeNumericMatrixValue(matrix: number[][], rowCount: number, columnCount: number) {
  const rows = clampLinearAlgebraEditingDimension(rowCount);
  const columns = clampLinearAlgebraEditingDimension(columnCount);
  return Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: columns }, (_, columnIndex) => {
      const currentValue = matrix[rowIndex]?.[columnIndex];
      return Number.isFinite(currentValue) ? currentValue : 0;
    }));
}

export function resizeNumericVectorValue(vector: number[], length: number) {
  const nextLength = clampLinearAlgebraEditingDimension(length);
  return Array.from({ length: nextLength }, (_, index) =>
    Number.isFinite(vector[index]) ? vector[index] : 0);
}
