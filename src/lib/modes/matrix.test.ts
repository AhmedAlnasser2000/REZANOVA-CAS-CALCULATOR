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
