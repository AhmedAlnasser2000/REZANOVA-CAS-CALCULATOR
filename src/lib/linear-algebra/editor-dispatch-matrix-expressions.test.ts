import { describe, expect, it } from 'vitest';
import { dispatchMatrixEditorLatex } from './editor-dispatch';

const matrixA = [[1, 2], [3, 4]];
const matrixB = [[5, 6], [7, 8]];
const matrixValues = [
  { id: 'matrix-a', name: 'A', value: matrixA },
  { id: 'matrix-b', name: 'B', value: matrixB },
  { id: 'matrix-c', name: 'C', value: [[1, 0], [0, 1]] },
  { id: 'matrix-d', name: 'D', value: [[2, 1], [4, 3]] },
  { id: 'matrix-e', name: 'E', value: [[1, 2], [0, 1]] },
  { id: 'matrix-f', name: 'F', value: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] },
];

describe('multi-matrix editor expressions', () => {
  it('evaluates Matrix editor expressions with more than the active two operands', () => {
    expect(dispatchMatrixEditorLatex({
      latex: 'CDE',
      matrixA,
      matrixB,
      matrixValues,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'multiply',
        matrixA: [[2, 1], [4, 3]],
        matrixB: [[1, 2], [0, 1]],
        exactMatrixA: [
          [{ numerator: 2, denominator: 1 }, { numerator: 1, denominator: 1 }],
          [{ numerator: 4, denominator: 1 }, { numerator: 3, denominator: 1 }],
        ],
        exactMatrixB: [
          [{ numerator: 1, denominator: 1 }, { numerator: 2, denominator: 1 }],
          [{ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 1 }],
        ],
        editorExpressionLatex: 'C\\times D\\times E',
        matrixOperandLatexA: 'C\\times D',
        matrixOperandLatexB: 'E',
      },
    });

    expect(dispatchMatrixEditorLatex({
      latex: '\\det\\left(CD\\right)',
      matrixA,
      matrixB,
      matrixValues,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'detA',
        matrixA: [[2, 1], [4, 3]],
        exactMatrixA: [
          [{ numerator: 2, denominator: 1 }, { numerator: 1, denominator: 1 }],
          [{ numerator: 4, denominator: 1 }, { numerator: 3, denominator: 1 }],
        ],
        editorExpressionLatex: '\\det\\left(C\\times D\\right)',
        matrixOperandLatexA: 'C\\times D',
      },
    });

    expect(dispatchMatrixEditorLatex({
      latex: '(C+D)^T',
      matrixA,
      matrixB,
      matrixValues,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'transposeA',
        matrixA: [[3, 1], [4, 4]],
        exactMatrixA: [
          [{ numerator: 3, denominator: 1 }, { numerator: 1, denominator: 1 }],
          [{ numerator: 4, denominator: 1 }, { numerator: 4, denominator: 1 }],
        ],
        editorExpressionLatex: '\\left(C+D\\right)^{\\mathsf{T}}',
        matrixOperandLatexA: 'C+D',
      },
    });

    expect(dispatchMatrixEditorLatex({
      latex: 'C+F',
      matrixA,
      matrixB,
      matrixValues,
    })).toEqual({
      ok: false,
      message: 'Addition and subtraction require matching matrix dimensions.',
    });
  });
});
