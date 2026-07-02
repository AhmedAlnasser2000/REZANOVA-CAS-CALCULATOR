import { describe, expect, it } from 'vitest';
import {
  dispatchMatrixEditorLatex,
  dispatchVectorEditorLatex,
} from './editor-dispatch';

const matrixA = [[1, 2], [3, 4]];
const matrixB = [[5, 6], [7, 8]];
const vectorA = [1, 2, 3];
const vectorB = [4, 5, 6];

describe('linear algebra editor dispatch', () => {
  it('maps Matrix editor expressions to existing Matrix requests', () => {
    expect(dispatchMatrixEditorLatex({ latex: 'A+B', matrixA, matrixB })).toEqual({
      ok: true,
      request: { operation: 'add', matrixA, matrixB },
    });
    expect(dispatchMatrixEditorLatex({ latex: 'A\\times B', matrixA, matrixB })).toMatchObject({
      ok: true,
      request: { operation: 'multiply' },
    });
    expect(dispatchMatrixEditorLatex({ latex: '\\det\\left(B\\right)', matrixA, matrixB })).toEqual({
      ok: true,
      request: { operation: 'detB', matrixA, matrixB },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\det\\left(\\begin{bmatrix}2&0\\\\0&3\\end{bmatrix}\\right)',
      matrixA,
      matrixB,
    })).toEqual({
      ok: true,
      request: {
        operation: 'detA',
        matrixA: [[2, 0], [0, 3]],
        matrixB,
      },
    });
  });

  it('maps structured Matrix systems to Matrix system requests', () => {
    expect(dispatchMatrixEditorLatex({
      latex: 'A x = \\begin{bmatrix}5\\\\11\\end{bmatrix}',
      matrixA,
      matrixB,
    })).toEqual({
      ok: true,
      request: {
        operation: 'linearSystem',
        matrixA,
        matrixB,
        systemRhs: [5, 11],
        systemForm: 'Ax=b',
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: 'A x + \\begin{bmatrix}-5\\\\-11\\end{bmatrix}=0',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'linearSystem',
        systemRhs: [5, 11],
        systemForm: 'Ax+b=0',
      },
    });
  });

  it('returns explicit Equation handoffs for unsupported equation-shaped editor input', () => {
    expect(dispatchMatrixEditorLatex({
      latex: 'A=b',
      matrixA,
      matrixB,
    })).toEqual({
      ok: false,
      message: 'This equation is outside Matrix/Vector structured forms. Open it in Equation for free-form solving.',
      handoff: {
        source: 'linear-algebra',
        sourceMode: 'matrix',
        latex: 'A=b',
        reason: 'unsupported-equation-shape',
        suggestedTarget: 'x',
      },
    });
  });

  it('maps Vector editor expressions to existing Vector requests', () => {
    expect(dispatchVectorEditorLatex({
      latex: 'u\\cdot v',
      vectorA,
      vectorB,
      angleUnit: 'deg',
    })).toEqual({
      ok: true,
      request: { operation: 'dot', vectorA, vectorB, angleUnit: 'deg' },
    });
    expect(dispatchVectorEditorLatex({
      latex: '\\left\\lVert v\\right\\rVert',
      vectorA,
      vectorB,
      angleUnit: 'rad',
    })).toEqual({
      ok: true,
      request: { operation: 'normB', vectorA, vectorB, angleUnit: 'rad' },
    });
    expect(dispatchVectorEditorLatex({
      latex: '\\angle\\left(u,v\\right)',
      vectorA,
      vectorB,
      angleUnit: 'grad',
    })).toMatchObject({
      ok: true,
      request: { operation: 'angle', angleUnit: 'grad' },
    });
  });

  it('returns controlled stops for parsed but unsupported editor forms', () => {
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{rank}\\left(A\\right)',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: false,
      message: expect.stringContaining('Rank and RREF'),
    });
    expect(dispatchMatrixEditorLatex({
      latex: 'A=b',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: false,
      message: expect.stringContaining('Open it in Equation'),
    });
    expect(dispatchVectorEditorLatex({
      latex: '\\det\\left(A\\right)',
      vectorA,
      vectorB,
      angleUnit: 'deg',
    })).toMatchObject({
      ok: false,
      message: expect.stringContaining('Vector'),
    });
  });
});
