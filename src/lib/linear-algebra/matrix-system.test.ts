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
      solveSummaryText: 'Exactly one solution. Only this vector x satisfies the system.',
    });
    const outcome = runMatrixLinearSystem({
      coefficients: [[2, 1], [1, -1]],
      constants: [5, 1],
      form: 'Ax=b',
    });
    expect(outcome.kind === 'success' ? outcome.detailSections?.[0] : undefined).toMatchObject({
      title: 'System Proof',
      lines: expect.arrayContaining([
        '\\operatorname{rank}(A)=\\operatorname{rank}([A|b])=2',
        '\\operatorname{unknowns}=2',
      ]),
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
    const outcome = runMatrixLinearSystem({
      coefficients: [[1, 1], [2, 2]],
      constants: [1, 3],
      form: 'Ax=b',
    });
    expect(outcome.kind === 'success' ? outcome.detailSections?.[0] : undefined).toMatchObject({
      title: 'System Proof',
      lines: expect.arrayContaining([
        '\\operatorname{rank}(A)=1',
        '\\operatorname{rank}([A|b])=2',
        '0=1',
      ]),
    });
  });

  it('classifies underdetermined structured Matrix systems', () => {
    expect(runMatrixLinearSystem({
      coefficients: [[1, 1], [2, 2]],
      constants: [2, 4],
      form: 'Ax+b=0',
    })).toMatchObject({
      kind: 'success',
      exactLatex: 'x=\\begin{bmatrix}2-t\\\\t\\end{bmatrix}\\quad t\\in\\mathbb{R}',
      solveSummaryText: 'Infinitely many solutions. The parameterized vector describes all solution vectors.',
    });
    const outcome = runMatrixLinearSystem({
      coefficients: [[1, 1], [2, 2]],
      constants: [2, 4],
      form: 'Ax+b=0',
    });
    expect(outcome.kind === 'success' ? outcome.detailSections?.[0] : undefined).toMatchObject({
      title: 'Solution Family',
      lines: [
        'x=\\begin{bmatrix}2-t\\\\t\\end{bmatrix}',
        't\\in\\mathbb{R}',
      ],
    });
    expect(outcome.kind === 'success' ? outcome.detailSections?.[1] : undefined).toMatchObject({
      title: 'System Proof',
      lines: expect.arrayContaining([
        '\\operatorname{rank}(A)=\\operatorname{rank}([A|b])=1',
        '\\operatorname{unknowns}=2',
        '\\operatorname{free\\ variables}=1',
      ]),
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
