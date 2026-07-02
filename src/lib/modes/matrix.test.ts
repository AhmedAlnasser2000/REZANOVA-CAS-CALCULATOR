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
