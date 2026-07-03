import { describe, expect, it } from 'vitest';
import {
  dispatchMatrixEditorLatex,
  dispatchVectorEditorLatex,
} from './editor-dispatch';

const matrixA = [[1, 2], [3, 4]];
const matrixB = [[5, 6], [7, 8]];
const vectorA = [1, 2, 3];
const vectorB = [4, 5, 6];
const matrixValues = [
  { id: 'matrix-a', name: 'A', value: matrixA },
  { id: 'matrix-b', name: 'B', value: matrixB },
  { id: 'matrix-c', name: 'C', value: [[2, 0], [0, 3]] },
  { id: 'matrix-d', name: 'D', value: [[1, 1], [0, 1]] },
];
const vectorValues = [
  { id: 'vector-u', name: 'u', value: vectorA },
  { id: 'vector-v', name: 'v', value: vectorB },
  { id: 'vector-p', name: 'p', value: [1, 0, 0] },
  { id: 'vector-q', name: 'q', value: [2, 3, 4] },
];

describe('linear algebra editor dispatch named values', () => {
  it('maps configured Matrix and Vector names through existing request slots', () => {
    expect(dispatchMatrixEditorLatex({
      latex: 'C+D',
      matrixA,
      matrixB,
      matrixValues,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'add',
        matrixA: [[2, 0], [0, 3]],
        matrixB: [[1, 1], [0, 1]],
        matrixOperandLatexA: 'C',
        matrixOperandLatexB: 'D',
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\det\\left(C\\right)',
      matrixA,
      matrixB,
      matrixValues,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'detA',
        matrixA: [[2, 0], [0, 3]],
        matrixB,
        matrixOperandLatexA: 'C',
      },
    });
    expect(dispatchVectorEditorLatex({
      latex: 'p\\cdot q',
      vectorA,
      vectorB,
      vectorValues,
      angleUnit: 'rad',
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'dot',
        vectorA: [1, 0, 0],
        vectorB: [2, 3, 4],
        vectorOperandLatexA: 'p',
        vectorOperandLatexB: 'q',
      },
    });
  });
});
