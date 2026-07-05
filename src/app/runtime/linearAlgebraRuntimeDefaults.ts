import {
  DEFAULT_MATRIX_LEFT_ID,
  DEFAULT_MATRIX_RIGHT_ID,
  DEFAULT_VECTOR_LEFT_ID,
  DEFAULT_VECTOR_RIGHT_ID,
  type LinearAlgebraMatrixNamedValue,
  type LinearAlgebraVectorNamedValue,
} from '../../lib/linear-algebra/runtime-request';

export function cloneMatrix(matrix: number[][]) {
  return matrix.map((row) => [...row]);
}

export function cloneVector(vector: number[]) {
  return [...vector];
}

export const DEFAULT_MATRIX_A = [
  [1, 2],
  [3, 4],
];

export const DEFAULT_MATRIX_B = [
  [5, 6],
  [7, 8],
];

export const DEFAULT_VECTOR_A = [1, 2, 3];
export const DEFAULT_VECTOR_B = [4, 5, 6];

export function defaultMatrixValues(): LinearAlgebraMatrixNamedValue[] {
  return [
    { id: DEFAULT_MATRIX_LEFT_ID, name: 'A', value: cloneMatrix(DEFAULT_MATRIX_A) },
    { id: DEFAULT_MATRIX_RIGHT_ID, name: 'B', value: cloneMatrix(DEFAULT_MATRIX_B) },
  ];
}

export function defaultVectorValues(): LinearAlgebraVectorNamedValue[] {
  return [
    { id: DEFAULT_VECTOR_LEFT_ID, name: 'u', value: cloneVector(DEFAULT_VECTOR_A) },
    { id: DEFAULT_VECTOR_RIGHT_ID, name: 'v', value: cloneVector(DEFAULT_VECTOR_B) },
  ];
}

export function matrixValuesFromCompatibility(
  matrixA: number[][],
  matrixB: number[][],
): LinearAlgebraMatrixNamedValue[] {
  return [
    { id: DEFAULT_MATRIX_LEFT_ID, name: 'A', value: cloneMatrix(matrixA) },
    { id: DEFAULT_MATRIX_RIGHT_ID, name: 'B', value: cloneMatrix(matrixB) },
  ];
}

export function vectorValuesFromCompatibility(
  vectorA: number[],
  vectorB: number[],
): LinearAlgebraVectorNamedValue[] {
  return [
    { id: DEFAULT_VECTOR_LEFT_ID, name: 'u', value: cloneVector(vectorA) },
    { id: DEFAULT_VECTOR_RIGHT_ID, name: 'v', value: cloneVector(vectorB) },
  ];
}
