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
    expect(dispatchMatrixEditorLatex({ latex: 'A+B', matrixA, matrixB })).toMatchObject({
      ok: true,
      request: {
        operation: 'add',
        matrixA,
        matrixB,
        editorExpressionLatex: 'A+B',
        matrixOperandLatexA: 'A',
        matrixOperandLatexB: 'B',
      },
    });
    expect(dispatchMatrixEditorLatex({ latex: 'A\\times B', matrixA, matrixB })).toMatchObject({
      ok: true,
      request: { operation: 'multiply' },
    });
    expect(dispatchMatrixEditorLatex({ latex: '\\det\\left(B\\right)', matrixA, matrixB })).toMatchObject({
      ok: true,
      request: {
        operation: 'detB',
        matrixA,
        matrixB,
        editorExpressionLatex: '\\det\\left(B\\right)',
        matrixOperandLatexB: 'B',
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\det\\left(\\begin{bmatrix}2&0\\\\0&3\\end{bmatrix}\\right)',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'detA',
        matrixA: [[2, 0], [0, 3]],
        matrixB,
        exactMatrixA: [
          [{ numerator: 2, denominator: 1 }, { numerator: 0, denominator: 1 }],
          [{ numerator: 0, denominator: 1 }, { numerator: 3, denominator: 1 }],
        ],
        editorExpressionLatex: '\\det\\left(\\begin{bmatrix}2&0\\\\0&3\\end{bmatrix}\\right)',
        matrixOperandLatexA: '\\begin{bmatrix}2&0\\\\0&3\\end{bmatrix}',
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{rank}\\left(B\\right)',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'rankB',
        matrixA,
        matrixB,
        editorExpressionLatex: '\\operatorname{rank}\\left(B\\right)',
        matrixOperandLatexB: 'B',
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{rref}\\left(\\begin{bmatrix}1&2\\\\2&4\\end{bmatrix}\\right)',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'rrefA',
        matrixA: [[1, 2], [2, 4]],
        matrixB,
        exactMatrixA: [
          [{ numerator: 1, denominator: 1 }, { numerator: 2, denominator: 1 }],
          [{ numerator: 2, denominator: 1 }, { numerator: 4, denominator: 1 }],
        ],
        editorExpressionLatex: '\\operatorname{rref}\\left(\\begin{bmatrix}1&2\\\\2&4\\end{bmatrix}\\right)',
        matrixOperandLatexA: '\\begin{bmatrix}1&2\\\\2&4\\end{bmatrix}',
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{null}\\left(B\\right)',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'nullSpaceB',
        matrixA,
        matrixB,
        editorExpressionLatex: '\\operatorname{null}\\left(B\\right)',
        matrixOperandLatexB: 'B',
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{col}\\left(\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix}\\right)',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'columnSpaceA',
        matrixA: [[1, 1], [2, 2]],
        matrixB,
        exactMatrixA: [
          [{ numerator: 1, denominator: 1 }, { numerator: 1, denominator: 1 }],
          [{ numerator: 2, denominator: 1 }, { numerator: 2, denominator: 1 }],
        ],
        editorExpressionLatex: '\\operatorname{col}\\left(\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix}\\right)',
        matrixOperandLatexA: '\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix}',
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{basis}\\left(\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}\\right)',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'basisA',
        matrixA,
        exactMatrixA: [
          [{ numerator: 1, denominator: 1 }, { numerator: 2, denominator: 1 }],
          [{ numerator: 3, denominator: 1 }, { numerator: 4, denominator: 1 }],
        ],
        editorExpressionLatex: '\\operatorname{basis}\\left(\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}\\right)',
        matrixOperandLatexA: '\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}',
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{lu}\\left(B\\right)',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'luB',
        matrixA,
        matrixB,
        editorExpressionLatex: '\\operatorname{lu}\\left(B\\right)',
        matrixOperandLatexB: 'B',
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{lu}\\left(\\begin{bmatrix}2&1\\\\4&3\\end{bmatrix}\\right)',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'luA',
        matrixA: [[2, 1], [4, 3]],
        matrixB,
        exactMatrixA: [
          [{ numerator: 2, denominator: 1 }, { numerator: 1, denominator: 1 }],
          [{ numerator: 4, denominator: 1 }, { numerator: 3, denominator: 1 }],
        ],
        editorExpressionLatex: '\\operatorname{lu}\\left(\\begin{bmatrix}2&1\\\\4&3\\end{bmatrix}\\right)',
        matrixOperandLatexA: '\\begin{bmatrix}2&1\\\\4&3\\end{bmatrix}',
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{coords}\\left(A,\\begin{bmatrix}5\\\\11\\end{bmatrix}\\right)',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'coordinatesA',
        matrixA,
        matrixB,
        coordinateVector: [5, 11],
        exactCoordinateVector: [
          { numerator: 5, denominator: 1 },
          { numerator: 11, denominator: 1 },
        ],
        editorExpressionLatex: '\\operatorname{coords}\\left(A,\\begin{bmatrix}5\\\\11\\end{bmatrix}\\right)',
        matrixOperandLatexA: 'A',
        coordinateVectorLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}',
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{coords}\\left(\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix},\\begin{bmatrix}5\\\\11\\end{bmatrix}\\right)',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'coordinatesA',
        matrixA,
        matrixB,
        exactMatrixA: [
          [{ numerator: 1, denominator: 1 }, { numerator: 2, denominator: 1 }],
          [{ numerator: 3, denominator: 1 }, { numerator: 4, denominator: 1 }],
        ],
        coordinateVector: [5, 11],
        exactCoordinateVector: [
          { numerator: 5, denominator: 1 },
          { numerator: 11, denominator: 1 },
        ],
        matrixOperandLatexA: '\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}',
        coordinateVectorLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}',
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{change}\\left(A,B\\right)',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'changeBasis',
        matrixA,
        matrixB,
        editorExpressionLatex: '\\operatorname{change}\\left(A,B\\right)',
        matrixOperandLatexA: 'A',
        matrixOperandLatexB: 'B',
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{change}\\left(\\begin{bmatrix}1&0\\\\0&1\\end{bmatrix},\\begin{bmatrix}1&1\\\\0&1\\end{bmatrix}\\right)',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'changeBasis',
        matrixA: [[1, 0], [0, 1]],
        matrixB: [[1, 1], [0, 1]],
        exactMatrixA: [
          [{ numerator: 1, denominator: 1 }, { numerator: 0, denominator: 1 }],
          [{ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 1 }],
        ],
        exactMatrixB: [
          [{ numerator: 1, denominator: 1 }, { numerator: 1, denominator: 1 }],
          [{ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 1 }],
        ],
        matrixOperandLatexA: '\\begin{bmatrix}1&0\\\\0&1\\end{bmatrix}',
        matrixOperandLatexB: '\\begin{bmatrix}1&1\\\\0&1\\end{bmatrix}',
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{invertible}\\left(B\\right)',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'invertibilityB',
        matrixA,
        matrixB,
        editorExpressionLatex: '\\operatorname{invertible}\\left(B\\right)',
        matrixOperandLatexB: 'B',
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{invertible}\\left(\\begin{bmatrix}\\frac{1}{2}&0\\\\0&0.125\\end{bmatrix}\\right)',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'invertibilityA',
        matrixA: [[0.5, 0], [0, 0.125]],
        matrixB,
        exactMatrixA: [
          [{ numerator: 1, denominator: 2 }, { numerator: 0, denominator: 1 }],
          [{ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 8 }],
        ],
        editorExpressionLatex: '\\operatorname{invertible}\\left(\\begin{bmatrix}\\frac{1}{2}&0\\\\0&0.125\\end{bmatrix}\\right)',
        matrixOperandLatexA: '\\begin{bmatrix}\\frac{1}{2}&0\\\\0&0.125\\end{bmatrix}',
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{eigen}\\left(B\\right)',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'eigenB',
        matrixA,
        matrixB,
        editorExpressionLatex: '\\operatorname{eigen}\\left(B\\right)',
        matrixOperandLatexB: 'B',
      },
    });
    expect(dispatchMatrixEditorLatex({
      latex: '\\operatorname{eigen}\\left(\\begin{bmatrix}2&1\\\\1&2\\end{bmatrix}\\right)',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'eigenA',
        matrixA: [[2, 1], [1, 2]],
        matrixB,
        exactMatrixA: [
          [{ numerator: 2, denominator: 1 }, { numerator: 1, denominator: 1 }],
          [{ numerator: 1, denominator: 1 }, { numerator: 2, denominator: 1 }],
        ],
        editorExpressionLatex: '\\operatorname{eigen}\\left(\\begin{bmatrix}2&1\\\\1&2\\end{bmatrix}\\right)',
        matrixOperandLatexA: '\\begin{bmatrix}2&1\\\\1&2\\end{bmatrix}',
      },
    });
  });

  it('preserves inline Matrix fractions and finite decimals as exact sidecars', () => {
    expect(dispatchMatrixEditorLatex({
      latex: '\\det\\left(\\begin{bmatrix}\\frac{1}{2}&0\\\\0&0.125\\end{bmatrix}\\right)',
      matrixA,
      matrixB,
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'detA',
        matrixA: [[0.5, 0], [0, 0.125]],
        matrixB,
        exactMatrixA: [
          [{ numerator: 1, denominator: 2 }, { numerator: 0, denominator: 1 }],
          [{ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 8 }],
        ],
        editorExpressionLatex: '\\det\\left(\\begin{bmatrix}\\frac{1}{2}&0\\\\0&0.125\\end{bmatrix}\\right)',
        matrixOperandLatexA: '\\begin{bmatrix}\\frac{1}{2}&0\\\\0&0.125\\end{bmatrix}',
      },
    });
  });

  it('maps structured Matrix systems to Matrix system requests', () => {
    expect(dispatchMatrixEditorLatex({
      latex: 'A x = \\begin{bmatrix}5\\\\11\\end{bmatrix}',
      matrixA,
      matrixB,
    })).toMatchObject({
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
        editorExpressionLatex: 'A x = \\begin{bmatrix}5\\\\11\\end{bmatrix}',
        matrixOperandLatexA: 'A',
        systemRhsLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}',
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
        editorExpressionLatex: 'A x + \\begin{bmatrix}-5\\\\-11\\end{bmatrix}=0',
        matrixOperandLatexA: 'A',
        systemRhsLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}',
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
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'dot',
        vectorA,
        vectorB,
        angleUnit: 'deg',
        editorExpressionLatex: 'u\\cdot v',
        vectorOperandLatexA: 'u',
        vectorOperandLatexB: 'v',
      },
    });
    expect(dispatchVectorEditorLatex({
      latex: '\\left\\lVert v\\right\\rVert',
      vectorA,
      vectorB,
      angleUnit: 'rad',
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'normB',
        vectorA,
        vectorB,
        angleUnit: 'rad',
        editorExpressionLatex: '\\left\\lVert v\\right\\rVert',
        vectorOperandLatexB: 'v',
      },
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
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'projectionUofV',
        vectorA,
        vectorB,
        angleUnit: 'deg',
        editorExpressionLatex: '\\operatorname{proj}_{u}\\left(v\\right)',
        vectorOperandLatexA: 'u',
        vectorOperandLatexB: 'v',
      },
    });
    expect(dispatchVectorEditorLatex({
      latex: '\\operatorname{proj}_{u}\\left(\\begin{bmatrix}\\frac{1}{2}\\\\3\\end{bmatrix}\\right)',
      vectorA: [1, 0],
      vectorB,
      angleUnit: 'deg',
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'projectionUofV',
        vectorA: [1, 0],
        vectorB: [0.5, 3],
        exactVectorB: [
          { numerator: 1, denominator: 2 },
          { numerator: 3, denominator: 1 },
        ],
        angleUnit: 'deg',
        editorExpressionLatex: '\\operatorname{proj}_{u}\\left(\\begin{bmatrix}\\frac{1}{2}\\\\3\\end{bmatrix}\\right)',
        vectorOperandLatexA: 'u',
        vectorOperandLatexB: '\\begin{bmatrix}\\frac{1}{2}\\\\3\\end{bmatrix}',
      },
    });
    expect(dispatchVectorEditorLatex({
      latex: '\\operatorname{orth}_{u}\\left(v\\right)',
      vectorA,
      vectorB,
      angleUnit: 'deg',
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'orthogonalToU',
        vectorA,
        vectorB,
        angleUnit: 'deg',
        editorExpressionLatex: '\\operatorname{orth}_{u}\\left(v\\right)',
        vectorOperandLatexA: 'u',
        vectorOperandLatexB: 'v',
      },
    });
    expect(dispatchVectorEditorLatex({
      latex: '\\operatorname{unit}\\left(v\\right)',
      vectorA,
      vectorB,
      angleUnit: 'rad',
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'unitB',
        vectorA,
        vectorB,
        angleUnit: 'rad',
        editorExpressionLatex: '\\operatorname{unit}\\left(v\\right)',
        vectorOperandLatexB: 'v',
      },
    });
    expect(dispatchVectorEditorLatex({
      latex: '\\operatorname{orthogonal}\\left(u,v\\right)',
      vectorA,
      vectorB,
      angleUnit: 'deg',
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'orthogonalCheck',
        vectorA,
        vectorB,
        angleUnit: 'deg',
        editorExpressionLatex: '\\operatorname{orthogonal}\\left(u,v\\right)',
        vectorOperandLatexA: 'u',
        vectorOperandLatexB: 'v',
      },
    });
    expect(dispatchVectorEditorLatex({
      latex: '\\operatorname{gram}\\left(u,v\\right)',
      vectorA,
      vectorB,
      angleUnit: 'deg',
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'gramSchmidtUV',
        vectorA,
        vectorB,
        angleUnit: 'deg',
        editorExpressionLatex: '\\operatorname{gram}\\left(u,v\\right)',
        vectorOperandLatexA: 'u',
        vectorOperandLatexB: 'v',
      },
    });
    expect(dispatchVectorEditorLatex({
      latex: '\\operatorname{gram}\\left(\\begin{bmatrix}1\\\\1\\end{bmatrix},\\begin{bmatrix}1\\\\0\\end{bmatrix}\\right)',
      vectorA,
      vectorB,
      angleUnit: 'deg',
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'gramSchmidtUV',
        vectorA: [1, 1],
        vectorB: [1, 0],
        exactVectorA: [
          { numerator: 1, denominator: 1 },
          { numerator: 1, denominator: 1 },
        ],
        exactVectorB: [
          { numerator: 1, denominator: 1 },
          { numerator: 0, denominator: 1 },
        ],
        angleUnit: 'deg',
      },
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
