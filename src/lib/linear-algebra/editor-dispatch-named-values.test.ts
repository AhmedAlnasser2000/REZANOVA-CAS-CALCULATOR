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
      latex: 'gram(p,q,r)',
      vectorA,
      vectorB,
      vectorValues: threeDimensionalVectorValues,
      angleUnit: 'rad',
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'gramSchmidtUV',
        vectorOperands: [[1, 0, 0], [0, 1, 0], [0, 0, 2]],
        vectorOperandLatexList: ['p', 'q', 'r'],
        editorExpressionLatex: '\\operatorname{gram}\\left(p,q,r\\right)',
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

  it('evaluates exact scalar/vector combinations through a dedicated request', () => {
    const values = [
      { id: 'vector-p', name: 'p', value: [3, 6] },
      { id: 'vector-q', name: 'q', value: [6, 3] },
    ];
    const input = {
      vectorA: [3, 6],
      vectorB: [6, 3],
      vectorValues: values,
      angleUnit: 'rad' as const,
    };

    const combination = dispatchVectorEditorLatex({ ...input, latex: '2p-q/3' });
    expect(combination).toMatchObject({
      ok: true,
      request: {
        operation: 'linearCombination',
        vectorA: [4, 11],
        exactVectorA: [
          { numerator: 4, denominator: 1 },
          { numerator: 11, denominator: 1 },
        ],
        editorExpressionLatex: '2p-\\frac{q}{3}',
      },
    });
    expect(combination.ok ? runVectorOperation(combination.request).resultLatex : '').toBe(
      '\\begin{bmatrix}4\\\\11\\end{bmatrix}',
    );

    const half = dispatchVectorEditorLatex({ ...input, latex: '\\frac{1}{2}(p+q)' });
    expect(half).toMatchObject({
      ok: true,
      request: {
        operation: 'linearCombination',
        vectorA: [4.5, 4.5],
        exactVectorA: [
          { numerator: 9, denominator: 2 },
          { numerator: 9, denominator: 2 },
        ],
      },
    });
    expect(half.ok ? runVectorOperation(half.request).resultLatex : '').toBe(
      '\\begin{bmatrix}\\frac{9}{2}\\\\\\frac{9}{2}\\end{bmatrix}',
    );

    const decimal = dispatchVectorEditorLatex({ ...input, latex: '0.125p' });
    expect(decimal.ok ? runVectorOperation(decimal.request).resultLatex : '').toBe(
      '\\begin{bmatrix}\\frac{3}{8}\\\\\\frac{3}{4}\\end{bmatrix}',
    );
    expect(dispatchVectorEditorLatex({ ...input, latex: 'p/0' })).toMatchObject({
      ok: false,
      message: 'A vector cannot be divided by zero.',
    });
    expect(dispatchVectorEditorLatex({ ...input, latex: 'ap' })).toMatchObject({
      ok: false,
      message: expect.stringContaining('Symbolic vector coefficients'),
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

  it('dispatches geometric measures with exact named operand snapshots', () => {
    const area = dispatchVectorEditorLatex({
      latex: 'parallelogramArea(p,q)',
      vectorA,
      vectorB,
      vectorValues: threeDimensionalVectorValues,
      angleUnit: 'rad',
    });
    expect(area).toMatchObject({
      ok: true,
      request: {
        operation: 'parallelogramArea',
        vectorA: [1, 0, 0],
        vectorB: [0, 1, 0],
        vectorOperands: [[1, 0, 0], [0, 1, 0]],
        vectorOperandLatexList: ['p', 'q'],
        editorExpressionLatex: '\\operatorname{parallelogramArea}\\left(p,q\\right)',
      },
    });
    expect(area.ok ? runVectorOperation(area.request).resultLatex : '').toBe('1');

    const volume = dispatchVectorEditorLatex({
      latex: 'volume(p,q,r)',
      vectorA,
      vectorB,
      vectorValues: threeDimensionalVectorValues,
      angleUnit: 'rad',
    });
    expect(volume).toMatchObject({
      ok: true,
      request: {
        operation: 'volume',
        vectorOperands: [[1, 0, 0], [0, 1, 0], [0, 0, 2]],
        exactVectorOperands: [
          [{ numerator: 1, denominator: 1 }, { numerator: 0, denominator: 1 }, { numerator: 0, denominator: 1 }],
          [{ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 1 }, { numerator: 0, denominator: 1 }],
          [{ numerator: 0, denominator: 1 }, { numerator: 0, denominator: 1 }, { numerator: 2, denominator: 1 }],
        ],
        vectorOperandLatexList: ['p', 'q', 'r'],
      },
    });
    expect(volume.ok ? runVectorOperation(volume.request).resultLatex : '').toBe('2');
  });

  it('dispatches variadic span and independence with exact operand snapshots', () => {
    const values = [
      { id: 'vector-p', name: 'p', value: [1, 0] },
      { id: 'vector-q', name: 'q', value: [0, 1] },
      { id: 'vector-r', name: 'r', value: [1, 1] },
    ];
    const input = {
      vectorA: [1, 0],
      vectorB: [0, 1],
      vectorValues: values,
      angleUnit: 'rad' as const,
    };
    const span = dispatchVectorEditorLatex({ ...input, latex: 'span(p,q,r)' });
    expect(span).toMatchObject({
      ok: true,
      request: {
        operation: 'span',
        vectorA: [1, 0],
        vectorB: [0, 1],
        vectorOperands: [[1, 0], [0, 1], [1, 1]],
        vectorOperandLatexList: ['p', 'q', 'r'],
        editorExpressionLatex: '\\operatorname{span}\\left(p,q,r\\right)',
      },
    });
    expect(span.ok ? runVectorOperation(span.request).resultLatex : '').toBe(
      '\\operatorname{span}\\left(p,q,r\\right)=\\operatorname{span}\\left\\{p,q\\right\\}',
    );

    const computed = dispatchVectorEditorLatex({ ...input, latex: 'independent(p,q+r)' });
    expect(computed).toMatchObject({
      ok: true,
      request: {
        operation: 'independent',
        vectorOperands: [[1, 0], [1, 2]],
        vectorOperandLatexList: ['p', 'q+r'],
      },
    });

    expect(dispatchVectorEditorLatex({
      ...input,
      latex: 'span([1,0],[0,1])',
    })).toMatchObject({
      ok: true,
      request: {
        operation: 'span',
        vectorOperands: [[1, 0], [0, 1]],
      },
    });

    expect(dispatchVectorEditorLatex({
      ...input,
      latex: 'span(s)',
      vectorValues: [...values, { id: 'vector-s', name: 's', value: Array(7).fill(1) }],
    })).toEqual({
      ok: false,
      message: 'Exact span and independence support one through 6 vectors with length up to 6.',
    });
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
