import { describe, expect, it } from 'vitest';
import { runMatrixLinearSystem } from './matrix-system';

describe('runMatrixLinearSystem', () => {
  it('classifies unique structured Matrix systems with exact readback', () => {
    expect(runMatrixLinearSystem({
      coefficients: [[2, 1], [1, -1]],
      constants: [5, 1],
      form: 'Ax=b',
    })).toMatchObject({
      kind: 'success',
      exactLatex: 'x=\\begin{bmatrix}2\\\\1\\end{bmatrix}',
      solveSummaryText: 'Unique solution.',
    });
  });

  it('classifies inconsistent structured Matrix systems', () => {
    expect(runMatrixLinearSystem({
      coefficients: [[1, 1], [2, 2]],
      constants: [1, 3],
      form: 'Ax=b',
    })).toMatchObject({
      kind: 'success',
      exactLatex: '\\text{No solution}',
      solveSummaryText: 'No solution.',
    });
  });

  it('classifies underdetermined structured Matrix systems', () => {
    expect(runMatrixLinearSystem({
      coefficients: [[1, 1], [2, 2]],
      constants: [2, 4],
      form: 'Ax+b=0',
    })).toMatchObject({
      kind: 'success',
      exactLatex: '\\text{Infinitely many solutions}',
      solveSummaryText: 'Infinitely many solutions.',
    });
  });

  it('returns controlled Matrix errors for unsupported system inputs', () => {
    expect(runMatrixLinearSystem({
      coefficients: [[1, 2]],
      constants: [1, 2],
      form: 'Ax=b',
    })).toMatchObject({
      kind: 'error',
      error: 'The RHS vector length must match the coefficient matrix row count.',
    });
    expect(runMatrixLinearSystem({
      coefficients: [[0.5, 1]],
      constants: [1],
      form: 'Ax=b',
    })).toMatchObject({
      kind: 'error',
      error: 'Structured Matrix systems need exact integer entries in this move.',
    });
  });
});
