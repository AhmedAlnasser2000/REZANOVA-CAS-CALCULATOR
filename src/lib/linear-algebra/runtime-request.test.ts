import { describe, expect, it } from 'vitest';
import {
  buildActiveMatrixRuntimeRequest,
  buildActiveScalarMatrixRuntimeRequest,
  buildActiveScalarVectorRuntimeRequest,
  buildActiveVectorRuntimeRequest,
  dispatchMatrixEditorLatex,
  dispatchVectorEditorLatex,
  parseLinearAlgebraScalarWire,
  type LinearAlgebraEquationHandoff,
  type LinearAlgebraNumericMatrixNamedValue,
  type LinearAlgebraNumericVectorNamedValue,
} from './runtime-request';

const matrixValues: LinearAlgebraNumericMatrixNamedValue[] = [
  { id: 'matrix-a', name: 'A', value: [[1, 2], [3, 4]] },
  { id: 'matrix-b', name: 'B', value: [[5, 6], [7, 8]] },
  { id: 'matrix-c', name: 'C', value: [[2, 0], [0, 3]] },
];

const vectorValues: LinearAlgebraNumericVectorNamedValue[] = [
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

  it('builds scalar-v1 requests with source, resolved operands, and exact substitution snapshots', () => {
    const parameter = parseLinearAlgebraScalarWire('a', 'real');
    expect(parameter.ok).toBe(true);
    if (!parameter.ok) return;
    const matrices = [
      { id: 'matrix-a', name: 'A', encoding: 'scalar-v1' as const, value: [[parameter.value]] },
      matrixValues[1],
    ];
    const matrix = buildActiveScalarMatrixRuntimeRequest('add', matrices, 'matrix-a', 'matrix-b', {
      domain: 'real',
      substitutionMode: 'use-stored-values',
      storedVariables: [{ name: 'a', valueLatex: '7', numericValue: 7 }],
      complexExactForm: 'rectangular',
    });
    expect(matrix).toMatchObject({
      request: {
        operandEncoding: 'scalar-v1',
        matrixA: {
          source: [[{ canonicalLatex: 'a' }]],
          resolved: [[{ canonicalLatex: '7' }]],
        },
        substitutionSnapshot: [{ name: 'a', valueLatex: '7', numericValue: 7 }],
      },
    });
    if ('request' in matrix) expect('exactMatrixA' in matrix.request).toBe(false);

    const vectors = [
      { id: 'vector-u', name: 'u', encoding: 'scalar-v1' as const, value: [parameter.value] },
      vectorValues[1],
    ];
    const vector = buildActiveScalarVectorRuntimeRequest('dot', vectors, 'vector-u', 'vector-v', 'rad', {
      domain: 'complex',
      substitutionMode: 'symbolic',
      storedVariables: [],
      complexExactForm: 'cis',
    });
    expect(vector).toMatchObject({
      request: {
        operandEncoding: 'scalar-v1',
        domain: 'complex',
        complexExactForm: 'cis',
        vectorA: { source: [{ canonicalLatex: 'a' }], resolved: [{ canonicalLatex: 'a' }] },
      },
    });
  });
});
