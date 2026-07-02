import { describe, expect, it } from 'vitest';
import { runMatrixOperation, solveLinearSystem } from './matrix';

describe('runMatrixOperation', () => {
  const matrixA = [[1, 2], [3, 4]];
  const matrixB = [[5, 6], [7, 8]];

  it('runs shipped numeric matrix arithmetic and transforms', () => {
    expect(runMatrixOperation({ operation: 'add', matrixA, matrixB }).resultLatex).toBe(
      '\\begin{bmatrix}6 & 8\\\\10 & 12\\end{bmatrix}',
    );
    expect(runMatrixOperation({ operation: 'subtract', matrixA, matrixB }).resultLatex).toBe(
      '\\begin{bmatrix}-4 & -4\\\\-4 & -4\\end{bmatrix}',
    );
    expect(runMatrixOperation({ operation: 'multiply', matrixA, matrixB }).resultLatex).toBe(
      '\\begin{bmatrix}19 & 22\\\\43 & 50\\end{bmatrix}',
    );
    expect(runMatrixOperation({ operation: 'transposeA', matrixA, matrixB }).resultLatex).toBe(
      '\\begin{bmatrix}1 & 3\\\\2 & 4\\end{bmatrix}',
    );
  });

  it('runs shipped numeric determinant and inverse operations', () => {
    const determinant = runMatrixOperation({ operation: 'detA', matrixA, matrixB });
    const inverse = runMatrixOperation({ operation: 'inverseA', matrixA, matrixB });

    expect(determinant.resultLatex).toBe('-2');
    expect(determinant.approxText).toBe('-2');
    expect(inverse.resultLatex).toBe('\\begin{bmatrix}-2 & 1\\\\\\frac{3}{2} & -\\frac{1}{2}\\end{bmatrix}');
  });

  it('runs exact rank and RREF operations', () => {
    const rank = runMatrixOperation({
      operation: 'rankA',
      matrixA: [[1, 2], [2, 4]],
      matrixB,
    });
    const rref = runMatrixOperation({
      operation: 'rrefA',
      matrixA: [[1, 2], [2, 4]],
      matrixB,
    });

    expect(rank.resultLatex).toBe('1');
    expect(rank.approxText).toBe('1');
    expect(rref.resultLatex).toBe('\\begin{bmatrix}1 & 2\\\\0 & 0\\end{bmatrix}');
  });

  it('keeps rank and RREF on exact Matrix entries in this move', () => {
    expect(runMatrixOperation({
      operation: 'rankA',
      matrixA: [[0.5, 1]],
      matrixB,
    }).error).toBe('Rank and RREF need exact integer Matrix entries in this move.');
  });

  it('keeps decimal Matrix inverse output on the numeric readback path', () => {
    const inverse = runMatrixOperation({
      operation: 'inverseA',
      matrixA: [[0.5, 0], [0, 2]],
      matrixB,
    });

    expect(inverse.resultLatex).toBe('\\begin{bmatrix}2 & 0\\\\0 & 0.5\\end{bmatrix}');
  });

  it('stops on incomplete, mismatched, singular, and non-square requests', () => {
    expect(runMatrixOperation({ operation: 'add', matrixA: [], matrixB }).error).toBe(
      'Matrix A is incomplete.',
    );
    expect(runMatrixOperation({
      operation: 'add',
      matrixA,
      matrixB: [[1, 2, 3]],
    }).error).toBe('Addition and subtraction require matching matrix dimensions.');
    expect(runMatrixOperation({
      operation: 'multiply',
      matrixA,
      matrixB: [[1, 2]],
    }).error).toBe('Matrix multiplication requires A columns to match B rows.');
    expect(runMatrixOperation({
      operation: 'detA',
      matrixA: [[1, 2, 3], [4, 5, 6]],
      matrixB,
    }).error).toBe('det(A) requires a square matrix.');
    expect(runMatrixOperation({
      operation: 'inverseA',
      matrixA: [[1, 2], [2, 4]],
      matrixB,
    }).error).toBe('Matrix A is singular or not square.');
  });
});

describe('solveLinearSystem', () => {
  it('solves current numeric square systems', () => {
    expect(solveLinearSystem([[2, 1], [1, -1]], [5, 1])).toEqual([2, 1]);
  });

  it('returns null for incomplete or singular numeric systems', () => {
    expect(solveLinearSystem([[1, 2]], [1, 2])).toBeNull();
    expect(solveLinearSystem([[1, 2], [2, 4]], [3, 6])).toBeNull();
  });
});
