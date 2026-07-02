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
        exactMatrixA: [
          [{ numerator: 2, denominator: 1 }, { numerator: 0, denominator: 1 }],
          [{ numerator: 0, denominator: 1 }, { numerator: 3, denominator: 1 }],
        ],
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{rank}\\left(B\\right)',
      matrixA,
      matrixB,
    })).toEqual({
      ok: true,
      request: { operation: 'rankB', matrixA, matrixB },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{rref}\\left(\\begin{bmatrix}1&2\\\\2&4\\end{bmatrix}\\right)',
      matrixA,
      matrixB,
    })).toEqual({
      ok: true,
      request: {
        operation: 'rrefA',
        matrixA: [[1, 2], [2, 4]],
        matrixB,
        exactMatrixA: [
          [{ numerator: 1, denominator: 1 }, { numerator: 2, denominator: 1 }],
          [{ numerator: 2, denominator: 1 }, { numerator: 4, denominator: 1 }],
        ],
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{null}\\left(B\\right)',
      matrixA,
      matrixB,
    })).toEqual({
      ok: true,
      request: { operation: 'nullSpaceB', matrixA, matrixB },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{col}\\left(\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix}\\right)',
      matrixA,
      matrixB,
    })).toEqual({
      ok: true,
      request: {
        operation: 'columnSpaceA',
        matrixA: [[1, 1], [2, 2]],
        matrixB,
        exactMatrixA: [
          [{ numerator: 1, denominator: 1 }, { numerator: 1, denominator: 1 }],
          [{ numerator: 2, denominator: 1 }, { numerator: 2, denominator: 1 }],
        ],
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{invertible}\\left(B\\right)',
      matrixA,
      matrixB,
    })).toEqual({
      ok: true,
      request: { operation: 'invertibilityB', matrixA, matrixB },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{invertible}\\left(\\begin{bmatrix}\\frac{1}{2}&0\\\\0&0.125\\end{bmatrix}\\right)',
      matrixA,
      matrixB,
    })).toEqual({
      ok: true,
      request: {
        operation: 'invertibilityA',
        matrixA: [[0.5, 0], [0, 0.125]],
        matrixB,
        exactMatrixA: [
          [{ numerator: 1, denominator: 2 }, { numerator: 0, denominator: 1 }],
          [{ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 8 }],
        ],
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{eigen}\\left(B\\right)',
      matrixA,
      matrixB,
    })).toEqual({
      ok: true,
      request: { operation: 'eigenB', matrixA, matrixB },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{eigen}\\left(\\begin{bmatrix}2&1\\\\1&2\\end{bmatrix}\\right)',
      matrixA,
      matrixB,
    })).toEqual({
      ok: true,
      request: {
        operation: 'eigenA',
        matrixA: [[2, 1], [1, 2]],
        matrixB,
        exactMatrixA: [
          [{ numerator: 2, denominator: 1 }, { numerator: 1, denominator: 1 }],
          [{ numerator: 1, denominator: 1 }, { numerator: 2, denominator: 1 }],
        ],
      },
    });
  });

  it('preserves inline Matrix fractions and finite decimals as exact sidecars', () => {
    expect(dispatchMatrixEditorLatex({
      latex: '\\det\\left(\\begin{bmatrix}\\frac{1}{2}&0\\\\0&0.125\\end{bmatrix}\\right)',
      matrixA,
      matrixB,
    })).toEqual({
      ok: true,
      request: {
        operation: 'detA',
        matrixA: [[0.5, 0], [0, 0.125]],
        matrixB,
        exactMatrixA: [
          [{ numerator: 1, denominator: 2 }, { numerator: 0, denominator: 1 }],
          [{ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 8 }],
        ],
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
        exactSystemRhs: [
          { numerator: 5, denominator: 1 },
          { numerator: 11, denominator: 1 },
        ],
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
        exactSystemRhs: [
          { numerator: 5, denominator: 1 },
          { numerator: 11, denominator: 1 },
        ],
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
    expect(dispatchVectorEditorLatex({
      latex: '\\operatorname{proj}_{u}\\left(v\\right)',
      vectorA,
      vectorB,
      angleUnit: 'deg',
    })).toEqual({
      ok: true,
      request: { operation: 'projectionUofV', vectorA, vectorB, angleUnit: 'deg' },
    });
    expect(dispatchVectorEditorLatex({
      latex: '\\operatorname{orth}_{u}\\left(v\\right)',
      vectorA,
      vectorB,
      angleUnit: 'deg',
    })).toEqual({
      ok: true,
      request: { operation: 'orthogonalToU', vectorA, vectorB, angleUnit: 'deg' },
    });
    expect(dispatchVectorEditorLatex({
      latex: '\\operatorname{unit}\\left(v\\right)',
      vectorA,
      vectorB,
      angleUnit: 'rad',
    })).toEqual({
      ok: true,
      request: { operation: 'unitB', vectorA, vectorB, angleUnit: 'rad' },
    });
    expect(dispatchVectorEditorLatex({
      latex: '\\operatorname{orthogonal}\\left(u,v\\right)',
      vectorA,
      vectorB,
      angleUnit: 'deg',
    })).toEqual({
      ok: true,
      request: { operation: 'orthogonalCheck', vectorA, vectorB, angleUnit: 'deg' },
    });
    expect(dispatchVectorEditorLatex({
      latex: '\\operatorname{gram}\\left(u,v\\right)',
      vectorA,
      vectorB,
      angleUnit: 'deg',
    })).toEqual({
      ok: true,
      request: { operation: 'gramSchmidtUV', vectorA, vectorB, angleUnit: 'deg' },
    });
  });

  it('returns controlled stops for parsed but unsupported editor forms', () => {
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
