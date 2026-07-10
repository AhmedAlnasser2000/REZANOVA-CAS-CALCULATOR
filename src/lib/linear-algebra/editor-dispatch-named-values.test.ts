import { describe, expect, it } from 'vitest';
import {
  dispatchMatrixEditorLatex,
  dispatchVectorEditorLatex,
} from './editor-dispatch';
import { runVectorOperation } from './vector';

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
  { id: 'vector-z', name: 'z', value: Array(9).fill(1) },
];
const twoDimensionalVectorValues = [
  { id: 'vector-p', name: 'p', value: [1, 1] },
  { id: 'vector-q', name: 'q', value: [1, 0] },
  { id: 'vector-r', name: 'r', value: [0, 1] },
];
const threeDimensionalVectorValues = [
  { id: 'vector-p', name: 'p', value: [1, 0, 0] },
  { id: 'vector-q', name: 'q', value: [0, 1, 0] },
  { id: 'vector-r', name: 'r', value: [0, 0, 2] },
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

  it('evaluates arbitrary named Vector expressions through existing request slots', () => {
    expect(dispatchVectorEditorLatex({
      latex: 'p+q-r',
      vectorA,
      vectorB,
      vectorValues: twoDimensionalVectorValues,
      angleUnit: 'rad',
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'add',
        vectorA: [1, 1],
        vectorB: [1, -1],
        vectorOperandLatexA: 'p',
        vectorOperandLatexB: 'q-r',
      },
    });
    expect(dispatchVectorEditorLatex({
      latex: 'norm(p-q)',
      vectorA,
      vectorB,
      vectorValues: twoDimensionalVectorValues,
      angleUnit: 'rad',
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'normA',
        vectorA: [0, 1],
        vectorOperandLatexA: 'p-q',
      },
    });
    expect(dispatchVectorEditorLatex({
      latex: 'unit(p+q)',
      vectorA,
      vectorB,
      vectorValues: twoDimensionalVectorValues,
      angleUnit: 'rad',
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'unitA',
        vectorA: [2, 1],
        vectorOperandLatexA: 'p+q',
      },
    });
    expect(dispatchVectorEditorLatex({
      latex: 'gram(p,q)',
      vectorA,
      vectorB,
      vectorValues: twoDimensionalVectorValues,
      angleUnit: 'rad',
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'gramSchmidtUV',
        vectorA: [1, 1],
        vectorB: [1, 0],
        vectorOperandLatexA: 'p',
        vectorOperandLatexB: 'q',
      },
    });
  });

  it('supports general projection, cross product, and scalar triple product notation', () => {
    const projection = dispatchVectorEditorLatex({
      latex: 'proj(p,q)',
      vectorA,
      vectorB,
      vectorValues: twoDimensionalVectorValues,
      angleUnit: 'rad',
    });
    expect(projection).toMatchObject({
      ok: true,
      request: {
        operation: 'projectionUofV',
        vectorA: [1, 1],
        vectorB: [1, 0],
        vectorOperandLatexA: 'p',
        vectorOperandLatexB: 'q',
      },
    });
    expect(projection.ok ? runVectorOperation(projection.request).resultLatex : '').toBe(
      '\\begin{bmatrix}\\frac{1}{2}\\\\\\frac{1}{2}\\end{bmatrix}',
    );

    const cross = dispatchVectorEditorLatex({
      latex: 'cross(p,q)',
      vectorA,
      vectorB,
      vectorValues: threeDimensionalVectorValues,
      angleUnit: 'rad',
    });
    expect(cross).toMatchObject({
      ok: true,
      request: {
        operation: 'cross',
        vectorA: [1, 0, 0],
        vectorB: [0, 1, 0],
      },
    });
    expect(cross.ok ? runVectorOperation(cross.request).resultLatex : '').toBe(
      '\\begin{bmatrix}0\\\\0\\\\1\\end{bmatrix}',
    );

    const triple = dispatchVectorEditorLatex({
      latex: 'triple(p,q,r)',
      vectorA,
      vectorB,
      vectorValues: threeDimensionalVectorValues,
      angleUnit: 'rad',
    });
    expect(triple).toMatchObject({
      ok: true,
      request: {
        operation: 'dot',
        vectorA: [1, 0, 0],
        vectorB: [2, 0, 0],
        vectorOperandLatexA: 'p',
        vectorOperandLatexB: 'q\\times r',
      },
    });
    expect(triple.ok ? runVectorOperation(triple.request).resultLatex : '').toBe('2');
  });

  it('stops named and inline vectors above the length-8 editor contract', () => {
    expect(dispatchVectorEditorLatex({
      latex: 'norm(z)',
      vectorA,
      vectorB,
      vectorValues,
      angleUnit: 'rad',
    })).toEqual({
      ok: false,
      message: 'Vector inputs support up to 8 entries; received 9. Resize the vector before running.',
    });

    expect(dispatchVectorEditorLatex({
      latex: 'norm([1,2,3,4,5,6,7,8,9])',
      vectorA,
      vectorB,
      vectorValues,
      angleUnit: 'rad',
    })).toEqual({
      ok: false,
      message: 'Vector inputs support up to 8 entries; received 9. Resize the vector before running.',
    });
  });
});
