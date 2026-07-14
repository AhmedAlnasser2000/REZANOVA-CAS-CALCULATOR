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
      solveSummaryParts: [[{
        kind: 'text',
        text: 'Exactly one solution. Only this vector x satisfies the system.',
      }]],
    });
    const outcome = runMatrixLinearSystem({
      coefficients: [[2, 1], [1, -1]],
      constants: [5, 1],
      form: 'Ax=b',
    });
    expect(outcome.kind === 'success' ? outcome.detailSections?.[0] : undefined).toMatchObject({
      title: 'System Proof',
      lines: [
        'Coefficient rank: 2.',
        'Augmented rank: 2.',
        'Unknowns: 2.',
        'The ranks match, so the system is consistent. Because the shared rank equals the number of unknowns, every unknown is fixed by a pivot. Only this vector x satisfies the system.',
      ],
      lineParts: expect.arrayContaining([
        expect.arrayContaining([{ kind: 'math', latex: '2' }]),
      ]),
    });
  });

  it('solves structured systems with exact fraction and decimal sidecars', () => {
    const outcome = runMatrixLinearSystem({
      coefficients: [[0.5, 0], [0, 1 / 3]],
      constants: [1, 1],
      form: 'Ax=b',
      exactCoefficients: [
        [{ numerator: 1, denominator: 2 }, { numerator: 0, denominator: 1 }],
        [{ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 3 }],
      ],
      exactConstants: [
        { numerator: 1, denominator: 1 },
        { numerator: 1, denominator: 1 },
      ],
    });

    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.exactLatex).toBe('x=\\begin{bmatrix}2\\\\3\\end{bmatrix}');
    }
  });

  it('uses editor expression and inline operand labels in structured-system cards', () => {
    const coefficientLatex = '\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}';
    const rhsLatex = '\\begin{bmatrix}5\\\\11\\end{bmatrix}';
    const expressionLatex = `${coefficientLatex}x=${rhsLatex}`;
    const outcome = runMatrixLinearSystem({
      coefficients: [[1, 2], [3, 4]],
      constants: [5, 11],
      form: 'Ax=b',
      editorExpressionLatex: expressionLatex,
      coefficientMatrixLatex: coefficientLatex,
      rhsVectorLatex: rhsLatex,
    });

    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.title).toBe(expressionLatex);
      expect(outcome.detailSections?.[0]?.lines).toEqual(expect.arrayContaining([
        'Coefficient rank: 2.',
        'Augmented rank: 2.',
      ]));
      expect(outcome.detailSections?.[1]?.lines).toEqual([
        'Coefficient rank: 2.',
        'Augmented rank: 2.',
        'Unknowns: 2.',
      ]);
    }
  });

  it('classifies inconsistent structured Matrix systems', () => {
    expect(runMatrixLinearSystem({
      coefficients: [[1, 1], [2, 2]],
      constants: [1, 3],
      form: 'Ax=b',
    })).toMatchObject({
      kind: 'success',
      exactLatex: '\\text{No solution}',
      solveSummaryParts: [[{ kind: 'text', text: 'No solution.' }]],
    });
    const outcome = runMatrixLinearSystem({
      coefficients: [[1, 1], [2, 2]],
      constants: [1, 3],
      form: 'Ax=b',
    });
    expect(outcome.kind === 'success' ? outcome.detailSections?.[0] : undefined).toMatchObject({
      title: 'System Proof',
      lines: expect.arrayContaining([
        'Coefficient rank: 1.',
        'Augmented rank: 2.',
        'Contradiction: 0=1.',
      ]),
      lineParts: expect.arrayContaining([
        [
          { kind: 'text', text: 'Contradiction: ' },
          { kind: 'math', latex: '0=1' },
          { kind: 'text', text: '.' },
        ],
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
      solveSummaryParts: [[{
        kind: 'text',
        text: 'Infinitely many solutions. The parameterized vector describes all solution vectors.',
      }]],
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
        'Coefficient rank: 1.',
        'Augmented rank: 1.',
        'Unknowns: 2.',
        'Free variables: 1.',
      ]),
      lineParts: expect.arrayContaining([
        [
          { kind: 'text', text: 'Free variables: ' },
          { kind: 'math', latex: '1' },
          { kind: 'text', text: '.' },
        ],
      ]),
    });
    expect(outcome.kind === 'success' ? outcome.detailSections?.at(-1) : undefined).toMatchObject({
      title: 'Row Reduction Steps',
      lines: ['R_{2}\\leftarrow R_{2}-2R_{1}'],
      lineKind: 'math',
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
      error: 'Structured Matrix systems need exact Matrix entries in this move.',
    });
  });
});
