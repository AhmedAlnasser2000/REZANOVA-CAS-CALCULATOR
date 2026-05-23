import { describe, expect, it } from 'vitest';
import {
  determinantExactMatrix,
  getExactMatrixShapeFacts,
  inverseExactMatrix,
  rrefExactMatrix,
  scalar,
  solveExactLinearSystem,
  validateExactMatrix,
  type ExactMatrix,
} from './exact-matrix-core';

const s = scalar;

function m(values: Array<Array<number | [number, number]>>): ExactMatrix {
  return values.map((row) =>
    row.map((value) => Array.isArray(value) ? s(value[0], value[1]) : s(value)));
}

describe('exact-matrix-core validation', () => {
  it('classifies exact matrix shape facts', () => {
    expect(getExactMatrixShapeFacts([])).toEqual({
      rows: 0,
      columns: 0,
      isRectangular: false,
      isSquare: false,
    });
    expect(getExactMatrixShapeFacts(m([[1, 2], [3, 4]]))).toEqual({
      rows: 2,
      columns: 2,
      isRectangular: true,
      isSquare: true,
    });
    expect(getExactMatrixShapeFacts([[s(1)], [s(2), s(3)]])).toMatchObject({
      rows: 2,
      columns: 1,
      isRectangular: false,
      isSquare: false,
    });
  });

  it('returns typed stops for invalid exact matrices', () => {
    expect(validateExactMatrix([])).toEqual({ kind: 'stop', reason: 'empty-matrix' });
    expect(validateExactMatrix([[s(1)], [s(2), s(3)]])).toEqual({ kind: 'stop', reason: 'ragged-matrix' });
    expect(validateExactMatrix(m([[1, 2, 3, 4, 5, 6, 7]]))).toEqual({
      kind: 'stop',
      reason: 'dimension-limit',
    });
    expect(validateExactMatrix([[{ numerator: 1, denominator: 0 }]])).toEqual({
      kind: 'stop',
      reason: 'invalid-scalar',
    });
    expect(validateExactMatrix([[{ numerator: 1.5, denominator: 1 }]])).toEqual({
      kind: 'stop',
      reason: 'invalid-scalar',
    });
    expect(validateExactMatrix(m([[11]]), { maxScalarAbs: 10 })).toEqual({
      kind: 'stop',
      reason: 'scalar-growth-limit',
    });
  });
});

describe('exact-matrix-core determinant', () => {
  it('computes exact determinants over integers and rationals', () => {
    expect(determinantExactMatrix(m([[1, 2], [3, 4]]))).toMatchObject({
      kind: 'success',
      determinant: s(-2),
      rowSwaps: 0,
      rank: 2,
    });
    expect(determinantExactMatrix(m([[[1, 2], 1], [1, 3]]))).toMatchObject({
      kind: 'success',
      determinant: s(1, 2),
    });
    expect(determinantExactMatrix(m([[0, 1], [2, 3]]))).toMatchObject({
      kind: 'success',
      determinant: s(-2),
      rowSwaps: 1,
    });
  });

  it('returns zero determinant and exact stops for blocked determinant shapes', () => {
    expect(determinantExactMatrix(m([[1, 2], [2, 4]]))).toMatchObject({
      kind: 'success',
      determinant: s(0),
      rank: 1,
    });
    expect(determinantExactMatrix(m([[1, 2, 3], [4, 5, 6]]))).toEqual({
      kind: 'stop',
      reason: 'non-square-matrix',
    });
    expect(determinantExactMatrix(m([[11, 0], [0, 1]]), { maxScalarAbs: 10 })).toEqual({
      kind: 'stop',
      reason: 'scalar-growth-limit',
    });
  });
});

describe('exact-matrix-core RREF and rank', () => {
  it('computes exact RREF with rational pivots and pivot metadata', () => {
    const result = rrefExactMatrix(m([[2, 1], [1, 1]]));

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.matrix).toEqual(m([[1, 0], [0, 1]]));
      expect(result.pivotColumns).toEqual([0, 1]);
      expect(result.rank).toBe(2);
      expect(result.rowOperations.length).toBeGreaterThan(0);
    }
  });

  it('tracks rank for rectangular exact matrices', () => {
    const result = rrefExactMatrix(m([[1, 2, 1], [2, 4, 2], [0, 1, 3]]));

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.pivotColumns).toEqual([0, 1]);
      expect(result.rank).toBe(2);
    }
  });
});

describe('exact-matrix-core linear solve', () => {
  it('solves small square exact linear systems', () => {
    expect(solveExactLinearSystem(m([[2, 1], [1, -1]]), [s(5), s(1)])).toMatchObject({
      kind: 'success',
      solution: [s(2), s(1)],
      pivotColumns: [0, 1],
      rank: 2,
    });
  });

  it('returns typed stops for unsupported or non-unique exact systems', () => {
    expect(solveExactLinearSystem(m([[1, 1], [2, 2]]), [s(1), s(3)])).toEqual({
      kind: 'stop',
      reason: 'inconsistent-system',
    });
    expect(solveExactLinearSystem(m([[1, 1], [2, 2]]), [s(2), s(4)])).toEqual({
      kind: 'stop',
      reason: 'underdetermined-system',
    });
    expect(solveExactLinearSystem(m([[1, 1]]), [s(2)])).toEqual({
      kind: 'stop',
      reason: 'underdetermined-system',
    });
    expect(solveExactLinearSystem(m([[1, 2], [3, 4]]), [s(1)])).toEqual({
      kind: 'stop',
      reason: 'rhs-dimension-mismatch',
    });
  });
});

describe('exact-matrix-core inverse', () => {
  it('computes exact inverse for square full-rank matrices', () => {
    expect(inverseExactMatrix(m([[1, 2], [3, 4]]))).toMatchObject({
      kind: 'success',
      inverse: m([[-2, 1], [[3, 2], [-1, 2]]]),
      pivotColumns: [0, 1],
      rank: 2,
    });
  });

  it('returns typed stops for inverse failure modes', () => {
    expect(inverseExactMatrix(m([[1, 2, 3], [4, 5, 6]]))).toEqual({
      kind: 'stop',
      reason: 'non-square-matrix',
    });
    expect(inverseExactMatrix(m([[1, 2], [2, 4]]))).toEqual({
      kind: 'stop',
      reason: 'singular-matrix',
    });
  });
});
