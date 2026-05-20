import { describe, expect, it } from 'vitest';
import {
  addMatrices,
  canMultiplyMatrices,
  determinantMatrix,
  getMatrixShapeFacts,
  haveSameMatrixShape,
  inverseMatrix,
  multiplyMatrices,
  runNumericMatrixOperation,
  solveNumericLinearSystem,
  subtractMatrices,
  transposeMatrix,
} from './matrix-core';

describe('matrix-core shape facts', () => {
  it('classifies empty, ragged, rectangular, square, and compatible shapes', () => {
    expect(getMatrixShapeFacts([])).toEqual({
      rows: 0,
      columns: 0,
      isRectangular: false,
      isSquare: false,
    });
    expect(getMatrixShapeFacts([[1], [2, 3]])).toMatchObject({
      rows: 2,
      columns: 1,
      isRectangular: false,
      isSquare: false,
    });
    expect(getMatrixShapeFacts([[1, 2, 3], [4, 5, 6]])).toMatchObject({
      rows: 2,
      columns: 3,
      isRectangular: true,
      isSquare: false,
    });
    expect(getMatrixShapeFacts([[1, 2], [3, 4]])).toMatchObject({
      rows: 2,
      columns: 2,
      isRectangular: true,
      isSquare: true,
    });
    expect(haveSameMatrixShape([[1, 2]], [[3, 4]])).toBe(true);
    expect(haveSameMatrixShape([[1, 2]], [[3], [4]])).toBe(false);
    expect(canMultiplyMatrices([[1, 2]], [[3], [4]])).toBe(true);
    expect(canMultiplyMatrices([[1, 2]], [[3, 4]])).toBe(false);
  });
});

describe('matrix-core operations', () => {
  const matrixA = [[1, 2], [3, 4]];
  const matrixB = [[5, 6], [7, 8]];

  it('runs reusable numeric matrix arithmetic and transforms', () => {
    expect(addMatrices(matrixA, matrixB)).toEqual([[6, 8], [10, 12]]);
    expect(subtractMatrices(matrixA, matrixB)).toEqual([[-4, -4], [-4, -4]]);
    expect(multiplyMatrices(matrixA, matrixB)).toEqual([[19, 22], [43, 50]]);
    expect(transposeMatrix(matrixA)).toEqual([[1, 3], [2, 4]]);
  });

  it('runs reusable numeric determinant and inverse operations', () => {
    expect(determinantMatrix(matrixA)).toBe(-2);
    expect(determinantMatrix([[6, 1, 1], [4, -2, 5], [2, 8, 7]])).toBe(-306);
    expect(inverseMatrix(matrixA)).toEqual([[-2, 1], [1.5, -0.5]]);
  });

  it('returns typed matrix/scalar results from the operation boundary', () => {
    expect(runNumericMatrixOperation({ operation: 'add', matrixA, matrixB })).toEqual({
      kind: 'matrix',
      value: [[6, 8], [10, 12]],
    });
    expect(runNumericMatrixOperation({ operation: 'detA', matrixA, matrixB })).toEqual({
      kind: 'scalar',
      value: -2,
    });
  });

  it('returns typed stops for invalid numeric requests', () => {
    expect(runNumericMatrixOperation({ operation: 'add', matrixA: [], matrixB })).toEqual({
      kind: 'error',
      reason: 'matrix-a-incomplete',
    });
    expect(runNumericMatrixOperation({
      operation: 'add',
      matrixA,
      matrixB: [[1, 2, 3]],
    })).toEqual({
      kind: 'error',
      reason: 'add-subtract-dimension-mismatch',
    });
    expect(runNumericMatrixOperation({
      operation: 'multiply',
      matrixA,
      matrixB: [[1, 2]],
    })).toEqual({
      kind: 'error',
      reason: 'multiply-dimension-mismatch',
    });
    expect(runNumericMatrixOperation({
      operation: 'detA',
      matrixA: [[1, 2, 3], [4, 5, 6]],
      matrixB,
    })).toEqual({
      kind: 'error',
      reason: 'det-a-non-square',
    });
    expect(runNumericMatrixOperation({
      operation: 'inverseA',
      matrixA: [[1, 2], [2, 4]],
      matrixB,
    })).toEqual({
      kind: 'error',
      reason: 'inverse-a-singular-or-non-square',
    });
  });
});

describe('matrix-core numeric linear solve', () => {
  it('solves current numeric square systems', () => {
    expect(solveNumericLinearSystem([[2, 1], [1, -1]], [5, 1])).toEqual([2, 1]);
  });

  it('returns null for incomplete, mismatched, or singular numeric systems', () => {
    expect(solveNumericLinearSystem([], [])).toBeNull();
    expect(solveNumericLinearSystem([[1, 2]], [1, 2])).toBeNull();
    expect(solveNumericLinearSystem([[1, 2], [2, 4]], [3, 6])).toBeNull();
  });
});
