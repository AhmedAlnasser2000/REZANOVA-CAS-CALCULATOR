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
    expect(rref.detailSections).toEqual([{
      title: 'Row Reduction Steps',
      lines: ['R_{2}\\leftarrow R_{2}-2R_{1}'],
      lineKind: 'math',
    }]);
  });

  it('keeps rank and RREF off decimal grids without exact sidecars', () => {
    expect(runMatrixOperation({
      operation: 'rankA',
      matrixA: [[0.5, 1]],
      matrixB,
    }).error).toBe('Rank and RREF need exact Matrix entries in this move.');
  });

  it('keeps decimal Matrix inverse output on the numeric readback path', () => {
    const inverse = runMatrixOperation({
      operation: 'inverseA',
      matrixA: [[0.5, 0], [0, 2]],
      matrixB,
    });

    expect(inverse.resultLatex).toBe('\\begin{bmatrix}2 & 0\\\\0 & 0.5\\end{bmatrix}');
  });

  it('uses exact sidecars for editor-entered fractions and finite decimals', () => {
    const determinant = runMatrixOperation({
      operation: 'detA',
      matrixA: [[0.5, 0], [0, 1 / 3]],
      matrixB,
      exactMatrixA: [
        [{ numerator: 1, denominator: 2 }, { numerator: 0, denominator: 1 }],
        [{ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 3 }],
      ],
    });
    const rref = runMatrixOperation({
      operation: 'rrefA',
      matrixA: [[0.5, 1], [1, 2]],
      matrixB,
      exactMatrixA: [
        [{ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 1 }],
        [{ numerator: 1, denominator: 1 }, { numerator: 2, denominator: 1 }],
      ],
    });

    expect(determinant.resultLatex).toBe('\\frac{1}{6}');
    expect(rref.resultLatex).toBe('\\begin{bmatrix}1 & 2\\\\0 & 0\\end{bmatrix}');
  });

  it('computes Matrix null space and column space bases from RREF pivots', () => {
    const nullSpace = runMatrixOperation({
      operation: 'nullSpaceA',
      matrixA: [[1, 1], [2, 2]],
      matrixB,
    });
    const columnSpace = runMatrixOperation({
      operation: 'columnSpaceA',
      matrixA: [[1, 1], [2, 2]],
      matrixB,
    });

    expect(nullSpace.resultLatex).toBe(
      '\\operatorname{Null}(A)=\\operatorname{span}\\left\\{\\begin{bmatrix}-1\\\\1\\end{bmatrix}\\right\\}',
    );
    expect(nullSpace.approxText).toBe('dimension 1');
    expect(nullSpace.detailSections?.[0]?.lines).toContain('\\operatorname{nullity}(A)=1');
    expect(columnSpace.resultLatex).toBe(
      '\\operatorname{Col}(A)=\\operatorname{span}\\left\\{\\begin{bmatrix}1\\\\2\\end{bmatrix}\\right\\}',
    );
    expect(columnSpace.approxText).toBe('dimension 1');
    expect(columnSpace.detailSections?.[0]?.lines).toContain('\\dim\\operatorname{Col}(A)=\\operatorname{rank}(A)=1');
  });

  it('reports zero-subspace Matrix spaces cleanly', () => {
    const nullSpace = runMatrixOperation({
      operation: 'nullSpaceA',
      matrixA: [[1, 0], [0, 1]],
      matrixB,
    });
    const columnSpace = runMatrixOperation({
      operation: 'columnSpaceA',
      matrixA: [[0, 0], [0, 0]],
      matrixB,
    });

    expect(nullSpace.resultLatex).toBe('\\operatorname{Null}(A)=\\{0\\}');
    expect(columnSpace.resultLatex).toBe('\\operatorname{Col}(A)=\\{0\\}');
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
