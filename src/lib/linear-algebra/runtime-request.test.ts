import { describe, expect, it } from 'vitest';
import {
  buildActiveMatrixRuntimeRequest,
  buildActiveVectorRuntimeRequest,
  dispatchMatrixEditorLatex,
  dispatchVectorEditorLatex,
  type LinearAlgebraEquationHandoff,
  type LinearAlgebraMatrixNamedValue,
  type LinearAlgebraVectorNamedValue,
} from './runtime-request';

const matrixValues: LinearAlgebraMatrixNamedValue[] = [
  { id: 'matrix-a', name: 'A', value: [[1, 2], [3, 4]] },
  { id: 'matrix-b', name: 'B', value: [[5, 6], [7, 8]] },
  { id: 'matrix-c', name: 'C', value: [[2, 0], [0, 3]] },
];

const vectorValues: LinearAlgebraVectorNamedValue[] = [
  { id: 'vector-u', name: 'u', value: [1, 2] },
  { id: 'vector-v', name: 'v', value: [3, 4] },
  { id: 'vector-p', name: 'p', value: [1, 0] },
];

describe('linear algebra runtime request facade', () => {
  it('canonicalizes editor dispatch through the public runtime seam', () => {
    const matrixDispatch = dispatchMatrixEditorLatex({
      latex: 'eigen([[2,1],[1,2]])',
      matrixA: matrixValues[0].value,
      matrixB: matrixValues[1].value,
      matrixValues,
    });

    expect(matrixDispatch).toMatchObject({
      ok: true,
      request: {
        operation: 'eigenA',
        matrixA: [[2, 1], [1, 2]],
        matrixOperandLatexA: '\\begin{bmatrix}2&1\\\\1&2\\end{bmatrix}',
      },
    });
    if (!matrixDispatch.ok) {
      throw new Error('Expected Matrix editor dispatch to succeed');
    }
    expect(matrixDispatch.request.editorExpressionLatex).toBe(
      '\\operatorname{eigen}\\left(\\begin{bmatrix}2&1\\\\1&2\\end{bmatrix}\\right)',
    );

    const vectorDispatch = dispatchVectorEditorLatex({
      latex: 'gram([1,1],[1,0])',
      vectorA: vectorValues[0].value,
      vectorB: vectorValues[1].value,
      vectorValues,
      angleUnit: 'rad',
    });

    expect(vectorDispatch).toMatchObject({
      ok: true,
      request: {
        operation: 'gramSchmidtUV',
        vectorA: [1, 1],
        vectorB: [1, 0],
      },
    });
  });

  it('builds active named-operand requests without app-private imports', () => {
    expect(buildActiveMatrixRuntimeRequest(
      'detA',
      matrixValues,
      'matrix-c',
      'matrix-b',
    )).toMatchObject({
      inputLatex: 'det(C)',
      request: {
        operation: 'detA',
        matrixA: [[2, 0], [0, 3]],
        matrixB: [[5, 6], [7, 8]],
        matrixOperandLatexA: 'C',
        matrixOperandLatexB: 'B',
      },
    });

    expect(buildActiveVectorRuntimeRequest(
      'dot',
      vectorValues,
      'vector-p',
      'vector-v',
      'deg',
    )).toMatchObject({
      inputLatex: 'p·v',
      request: {
        operation: 'dot',
        vectorA: [1, 0],
        vectorB: [3, 4],
        angleUnit: 'deg',
        vectorOperandLatexA: 'p',
        vectorOperandLatexB: 'v',
      },
    });
  });

  it('exports the typed Equation handoff shape for app actions', () => {
    const handoff: LinearAlgebraEquationHandoff = {
      source: 'linear-algebra',
      sourceMode: 'matrix',
      latex: 'x^2=1',
      reason: 'unsupported-equation-shape',
      suggestedTarget: 'x',
    };

    expect(handoff.reason).toBe('unsupported-equation-shape');
  });
});
