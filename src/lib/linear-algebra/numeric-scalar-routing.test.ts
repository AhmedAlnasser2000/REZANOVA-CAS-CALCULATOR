import { describe, expect, it } from 'vitest';
import { dispatchMatrixEditorLatex, dispatchVectorEditorLatex } from './editor-dispatch';
import { parseLinearAlgebraScalarWire } from './scalar-wire';

function scalar(latex: string) {
  const parsed = parseLinearAlgebraScalarWire(latex, 'real');
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

const scalarMatrix = (id: string, name: string, values: string[][]) => ({
  id,
  name,
  encoding: 'scalar-v1' as const,
  value: values.map((row) => row.map(scalar)),
});

const scalarVector = (id: string, name: string, values: string[]) => ({
  id,
  name,
  encoding: 'scalar-v1' as const,
  value: values.map(scalar),
});

const scalarContext = {
  domain: 'real' as const,
  substitutionMode: 'symbolic' as const,
  storedVariables: [],
  complexExactForm: 'rectangular' as const,
};

describe('Linear Algebra finite-real scalar routing', () => {
  it('routes numeric scalar Matrix expressions through numeric authority with exact evidence', () => {
    const matrixValues = [
      scalarMatrix('matrix-a', 'A', [['1', '1/3'], ['0', '2']]),
      scalarMatrix('matrix-b', 'B', [['1', '0'], ['0', '1']]),
      scalarMatrix('matrix-c', 'C', [['c']]),
    ];
    const profile = dispatchMatrixEditorLatex({
      ...scalarContext,
      latex: 'profile(A)',
      matrixA: [[0]],
      matrixB: [[0]],
      matrixValues,
      activeMatrixLeftId: 'matrix-a',
      activeMatrixRightId: 'matrix-b',
    });
    expect(profile).toMatchObject({
      ok: true,
      request: {
        operation: 'profileA',
        matrixA: [[1, 1 / 3], [0, 2]],
        exactMatrixA: [
          [{ numerator: 1, denominator: 1 }, { numerator: 1, denominator: 3 }],
          [{ numerator: 0, denominator: 1 }, { numerator: 2, denominator: 1 }],
        ],
      },
    });
    if (profile.ok) expect(profile.request.operandEncoding).not.toBe('scalar-v1');

    expect(dispatchMatrixEditorLatex({
      ...scalarContext,
      latex: 'charpoly(C)',
      matrixA: [[0]],
      matrixB: [[0]],
      matrixValues,
      activeMatrixLeftId: 'matrix-a',
      activeMatrixRightId: 'matrix-b',
    })).toMatchObject({
      ok: true,
      request: { operation: 'charpolyA', operandEncoding: 'scalar-v1' },
    });
  });

  it('keeps numeric-only Matrix routes available after scalar-cell editing', () => {
    const result = dispatchMatrixEditorLatex({
      ...scalarContext,
      latex: 'pinv(A)',
      matrixA: [[0]],
      matrixB: [[0]],
      matrixValues: [
        scalarMatrix('matrix-a', 'A', [['3', '0'], ['4', '0']]),
        scalarMatrix('matrix-b', 'B', [['1']]),
      ],
      activeMatrixLeftId: 'matrix-a',
      activeMatrixRightId: 'matrix-b',
    });
    expect(result).toMatchObject({
      ok: true,
      request: { operation: 'pinvA', matrixA: [[3, 0], [4, 0]] },
    });
    if (result.ok) expect(result.request.operandEncoding).not.toBe('scalar-v1');
  });

  it('routes numeric Vector families through numeric authority while ignoring unused formal values', () => {
    const vectorValues = [
      scalarVector('vector-p', 'p', ['1', '0', '0']),
      scalarVector('vector-q', 'q', ['0', '1', '0']),
      scalarVector('vector-r', 'r', ['1', '1', '0']),
      scalarVector('vector-s', 's', ['a', '0', '0']),
    ];
    const span = dispatchVectorEditorLatex({
      ...scalarContext,
      latex: 'span(p,q,r)',
      vectorA: [0],
      vectorB: [0],
      vectorValues,
      angleUnit: 'rad',
    });
    expect(span).toMatchObject({
      ok: true,
      request: {
        operation: 'span',
        vectorOperands: [[1, 0, 0], [0, 1, 0], [1, 1, 0]],
        exactVectorOperands: [
          [{ numerator: 1, denominator: 1 }, { numerator: 0, denominator: 1 }, { numerator: 0, denominator: 1 }],
          [{ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 1 }, { numerator: 0, denominator: 1 }],
          [{ numerator: 1, denominator: 1 }, { numerator: 1, denominator: 1 }, { numerator: 0, denominator: 1 }],
        ],
      },
    });
    if (span.ok) expect(span.request.operandEncoding).not.toBe('scalar-v1');

    expect(dispatchVectorEditorLatex({
      ...scalarContext,
      latex: 'independent(s)',
      vectorA: [0],
      vectorB: [0],
      vectorValues,
      angleUnit: 'rad',
    })).toMatchObject({
      ok: true,
      request: { operation: 'independent', operandEncoding: 'scalar-v1' },
    });
  });

  it('preserves numeric controlled errors without switching producers', () => {
    const result = dispatchMatrixEditorLatex({
      ...scalarContext,
      latex: 'A+B',
      matrixA: [[0]],
      matrixB: [[0]],
      matrixValues: [
        scalarMatrix('matrix-a', 'A', [['1', '2']]),
        scalarMatrix('matrix-b', 'B', [['3'], ['4']]),
      ],
      activeMatrixLeftId: 'matrix-a',
      activeMatrixRightId: 'matrix-b',
    });
    expect(result).toEqual({
      ok: false,
      message: 'Addition and subtraction require matching matrix dimensions.',
    });
  });
});
