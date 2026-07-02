import { describe, expect, it } from 'vitest';
import { runMatrixMode } from './matrix';

describe('runMatrixMode', () => {
  it('uses editor expressions as Matrix result titles when present', () => {
    const expressionLatex = '\\det\\left(\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}\\right)';
    const result = runMatrixMode({
      operation: 'detA',
      matrixA: [[1, 2], [3, 4]],
      matrixB: [[5, 6], [7, 8]],
      editorExpressionLatex: expressionLatex,
      matrixOperandLatexA: '\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}',
    });

    expect(result.title).toBe(expressionLatex);
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      return;
    }
    expect(result.sourceMode).toBe('matrix');
  });

  it('labels Matrix basis operations for direct runs', () => {
    const result = runMatrixMode({
      operation: 'basisA',
      matrixA: [[1, 2], [3, 4]],
      matrixB: [[5, 6], [7, 8]],
    });

    expect(result.title).toBe('basis(A)');
    expect(result.kind).toBe('success');
  });

  it('uses editor expressions as Matrix coordinate titles', () => {
    const expressionLatex = '\\operatorname{coords}\\left(A,\\begin{bmatrix}5\\\\11\\end{bmatrix}\\right)';
    const result = runMatrixMode({
      operation: 'coordinatesA',
      matrixA: [[1, 2], [3, 4]],
      matrixB: [[5, 6], [7, 8]],
      coordinateVector: [5, 11],
      exactCoordinateVector: [
        { numerator: 5, denominator: 1 },
        { numerator: 11, denominator: 1 },
      ],
      editorExpressionLatex: expressionLatex,
      matrixOperandLatexA: 'A',
      coordinateVectorLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}',
    });

    expect(result.title).toBe(expressionLatex);
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      return;
    }
    expect(result.exactLatex).toBe('[\\begin{bmatrix}5\\\\11\\end{bmatrix}]_{A}=\\begin{bmatrix}1\\\\2\\end{bmatrix}');
    expect(result.detailSections?.map((section) => section.title)).toEqual(['Coordinate Facts', 'Coordinate Proof']);
  });

  it('labels change-of-basis runs with their conversion direction', () => {
    const result = runMatrixMode({
      operation: 'changeBasis',
      matrixA: [[1, 0], [0, 1]],
      matrixB: [[1, 1], [0, 1]],
    });

    expect(result.title).toBe('change(A,B)');
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      return;
    }
    expect(result.exactLatex).toBe('P_{B\\leftarrow A}=\\begin{bmatrix}1 & -1\\\\0 & 1\\end{bmatrix}');
    expect(result.detailSections?.[1]?.lines).toContain('P_{B\\leftarrow A}=B^{-1}A');
  });

  it('labels LU factorization runs directly', () => {
    const result = runMatrixMode({
      operation: 'luA',
      matrixA: [[2, 1], [4, 3]],
      matrixB: [[5, 6], [7, 8]],
    });

    expect(result.title).toBe('lu(A)');
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      return;
    }
    expect(result.exactLatex).toBe('A=LU');
    expect(result.detailSections?.map((section) => section.title)).toEqual([
      'LU Factors',
      'Factorization Row Steps',
      'LU Proof',
    ]);
  });

  it('labels PLU factorization runs directly', () => {
    const result = runMatrixMode({
      operation: 'pluA',
      matrixA: [[0, 1], [1, 0]],
      matrixB: [[5, 6], [7, 8]],
    });

    expect(result.title).toBe('plu(A)');
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      return;
    }
    expect(result.exactLatex).toBe('PA=LU');
    expect(result.detailSections?.map((section) => section.title)).toEqual([
      'PLU Factors',
      'PLU Row Swaps',
      'Factorization Row Steps',
      'PLU Proof',
    ]);
  });

  it('labels factor solve runs directly while carrying RHS readback', () => {
    const result = runMatrixMode({
      operation: 'luSolveA',
      matrixA: [[2, 1], [4, 3]],
      matrixB: [[5, 6], [7, 8]],
      systemRhs: [5, 11],
      exactSystemRhs: [
        { numerator: 5, denominator: 1 },
        { numerator: 11, denominator: 1 },
      ],
      systemRhsLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}',
    });

    expect(result.title).toBe('lusolve(A,b)');
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      return;
    }
    expect(result.exactLatex).toBe('x=\\begin{bmatrix}2\\\\1\\end{bmatrix}');
    expect(result.detailSections?.map((section) => section.title)).toEqual([
      'LU Factors',
      'Factorization Row Steps',
      'Factor Solve Proof',
    ]);
  });

  it('labels multi-RHS solve runs directly', () => {
    const result = runMatrixMode({
      operation: 'multiRhsSolve',
      matrixA: [[1, 2], [3, 4]],
      matrixB: [[5, 6], [11, 14]],
    });

    expect(result.title).toBe('AX=B');
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      return;
    }
    expect(result.exactLatex).toBe('X=\\begin{bmatrix}1 & 2\\\\2 & 2\\end{bmatrix}');
    expect(result.detailSections?.[0]?.title).toBe('Multi-RHS Proof');
  });

  it('adds an explicit Equation action for deferred eigen polynomial roots', () => {
    const result = runMatrixMode({
      operation: 'eigenA',
      matrixA: [[0, -1], [1, 0]],
      matrixB: [[1, 0], [0, 1]],
    });

    expect(result).toMatchObject({
      kind: 'error',
      title: 'eigen(A)',
      error: 'Complex eigenvalue and eigenvector readback is deferred for Matrix V1.',
      actions: [{ kind: 'send', target: 'equation', latex: '\\lambda^{2}+1=0' }],
    });
  });
});
