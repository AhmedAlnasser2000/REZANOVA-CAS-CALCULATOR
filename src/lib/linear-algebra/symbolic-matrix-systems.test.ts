import { describe, expect, it } from 'vitest';
import type {
  LinearAlgebraScalarMatrixOperandV1,
  LinearAlgebraScalarVectorOperandV1,
  LinearAlgebraScalarWireV1,
  MatrixOperation,
  ScalarMatrixRequestV1,
  VersionedResultProducerDraft,
} from '../../types/calculator';
import { runMatrixMode } from '../modes/matrix';
import { dispatchMatrixEditorLatex } from './editor-dispatch';
import { parseLinearAlgebraScalarWire } from './scalar-wire';

function nonPrompt(result: VersionedResultProducerDraft) {
  if (result.kind === 'prompt') throw new Error('Expected a completed Matrix result.');
  return result;
}

function scalar(latex: string) {
  const parsed = parseLinearAlgebraScalarWire(latex, 'real');
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

function matrix(values: readonly (readonly string[])[]) {
  return values.map((row) => row.map(scalar));
}

function matrixOperand(
  values: LinearAlgebraScalarWireV1[][],
): LinearAlgebraScalarMatrixOperandV1 {
  return { encoding: 'scalar-v1', source: values, resolved: values };
}

function vectorOperand(values: readonly string[]): LinearAlgebraScalarVectorOperandV1 {
  const entries = values.map(scalar);
  return { encoding: 'scalar-v1', source: entries, resolved: entries };
}

function request(
  operation: MatrixOperation,
  left: readonly (readonly string[])[],
  right: readonly (readonly string[])[] = left,
): ScalarMatrixRequestV1 & { matrixB: LinearAlgebraScalarMatrixOperandV1 } {
  return {
    operation,
    operandEncoding: 'scalar-v1',
    matrixA: matrixOperand(matrix(left)),
    matrixB: matrixOperand(matrix(right)),
    domain: 'real',
    substitutionMode: 'symbolic',
  };
}

describe('bounded symbolic Matrix systems', () => {
  it('classifies rank and RREF with standard V2 Which values', () => {
    for (const operation of ['rankA', 'rrefA'] as const) {
      const result = nonPrompt(runMatrixMode(request(operation, [['a']])));
      expect(result.kind).toBe('success');
      expect(result.canonicalResult?.version).toBe(2);
      expect(result.exactLatex).toContain(',');
      if (result.canonicalResult?.version !== 2) continue;
      const primary = result.canonicalResult.primary;
      expect(primary?.kind).toBe('math');
      if (primary?.kind === 'math') {
        expect(Array.isArray(primary.value.mathJson) && primary.value.mathJson[0]).toBe('Which');
      }
    }
  });

  it('solves [a]u=[1] with the locked nonzero and zero cases', () => {
    const result = nonPrompt(runMatrixMode({
      ...request('linearSystem', [['a']]),
      systemRhs: vectorOperand(['1']),
      systemUnknownVectorName: 'u',
    }));
    expect(result.kind).toBe('success');
    expect(result.exactLatex).toContain('u');
    expect(result.exactLatex).toContain('a\\ne0');
    expect(result.exactLatex).toContain('a=0');
    expect(result.exactLatex).toContain(',');
    expect(result.exactLatex).toContain('\\varnothing');
    expect(result.exactLatex).not.toContain('emptyset');
  });

  it('closes spaces, basis, invertibility, and profile on symbolic matrices', () => {
    const operations: MatrixOperation[] = [
      'nullSpaceA', 'columnSpaceA', 'basisA', 'invertibilityA', 'profileA',
    ];
    for (const operation of operations) {
      const result = nonPrompt(runMatrixMode(request(operation, [['1', 'a'], ['0', '1']])));
      expect(result.kind, operation).toBe('success');
      expect(result.canonicalResult?.version, operation).toBe(2);
    }
    const conditionalProfile = nonPrompt(runMatrixMode(request('profileA', [['a']])));
    expect(conditionalProfile.canonicalResult?.version).toBe(2);
    if (conditionalProfile.canonicalResult?.version === 2) {
      expect(conditionalProfile.canonicalResult.primary?.kind).toBe('math');
    }
  });

  it('returns symbolic LU/PLU and solve results without leaving V2', () => {
    for (const operation of ['luA', 'pluA'] as const) {
      const result = nonPrompt(runMatrixMode(request(operation, [['a', '1'], ['0', '1']])));
      expect(result.kind).toBe('success');
      expect(result.canonicalResult?.version).toBe(2);
      expect(result.exactSupplementLatex?.join(' ')).toContain('a');
    }
    const solved = nonPrompt(runMatrixMode({
      ...request('pluSolveA', [['1', 'a'], ['0', '1']]),
      systemRhs: vectorOperand(['1', '2']),
    }));
    expect(solved.kind).toBe('success');
    expect(solved.canonicalResult?.version).toBe(2);
  });

  it('keeps the full Milestone 11 exact-route closure on V2', () => {
    const base = request('rankA', [['1', 'a'], ['0', '1']], [['1', '0'], ['0', '1']]);
    const coordinate = vectorOperand(['g', 'h']);
    const rhs = vectorOperand(['1', '2']);
    const requests: ScalarMatrixRequestV1[] = [
      ...([
        'rankA', 'rankB', 'rrefA', 'rrefB', 'nullSpaceA', 'nullSpaceB',
        'columnSpaceA', 'columnSpaceB', 'basisA', 'basisB',
        'invertibilityA', 'invertibilityB', 'profileA', 'profileB',
        'luA', 'luB', 'pluA', 'pluB',
      ] as MatrixOperation[]).map((operation) => ({ ...base, operation })),
      { ...base, operation: 'coordinatesA', coordinateVector: coordinate },
      { ...base, operation: 'coordinatesB', coordinateVector: coordinate },
      { ...base, operation: 'changeBasis' },
      { ...base, operation: 'luSolveA', systemRhs: rhs },
      { ...base, operation: 'luSolveB', systemRhs: rhs },
      { ...base, operation: 'pluSolveA', systemRhs: rhs },
      { ...base, operation: 'pluSolveB', systemRhs: rhs },
      { ...base, operation: 'multiRhsSolve', systemUnknownVectorName: 'X' },
    ];
    for (const input of requests) {
      const result = nonPrompt(runMatrixMode(input as Parameters<typeof runMatrixMode>[0]));
      expect(result.kind, input.operation).toBe('success');
      expect(result.canonicalResult?.version, input.operation).toBe(2);
    }
  });

  it('parses arbitrary vector shorthand and explicit ordered unknowns', () => {
    const valueA = {
      id: 'matrix-a',
      name: 'A',
      encoding: 'scalar-v1' as const,
      value: matrix([['a', 'b'], ['c', 'd']]),
    };
    const valueB = { id: 'matrix-b', name: 'B', value: [[1, 0], [0, 1]] };
    const base = {
      matrixA: [[1, 0], [0, 1]],
      matrixB: [[1, 0], [0, 1]],
      matrixValues: [valueA, valueB],
      activeMatrixLeftId: valueA.id,
      activeMatrixRightId: valueB.id,
      domain: 'real' as const,
      substitutionMode: 'symbolic' as const,
      storedVariables: [],
      complexExactForm: 'rectangular' as const,
    };
    expect(dispatchMatrixEditorLatex({ ...base, latex: 'Az=[1,2]' })).toMatchObject({
      ok: true,
      request: { systemUnknownVectorName: 'z' },
    });
    expect(dispatchMatrixEditorLatex({ ...base, latex: 'A[u;v]=[1,2]' })).toMatchObject({
      ok: true,
      request: { systemUnknowns: ['u', 'v'] },
    });
    expect(dispatchMatrixEditorLatex({ ...base, latex: 'A[u;v]=[e;f]' })).toMatchObject({
      ok: true,
      request: {
        systemUnknowns: ['u', 'v'],
        systemRhs: { source: [{ canonicalLatex: 'e' }, { canonicalLatex: 'f' }] },
      },
    });
    const sixParameter = dispatchMatrixEditorLatex({ ...base, latex: 'A[u;v]=[g,h]' });
    expect(sixParameter).toMatchObject({
      ok: true,
      request: {
        systemUnknowns: ['u', 'v'],
        operandEncoding: 'scalar-v1',
        editorExpressionLatex: expect.stringContaining('\\begin{bmatrix}u\\\\v\\end{bmatrix}'),
      },
    });
    if (!sixParameter.ok) throw new Error(sixParameter.message);
    const result = nonPrompt(runMatrixMode(sixParameter.request));
    expect(result.kind).toBe('success');
    expect(result.canonicalResult?.version).toBe(2);
  });

  it('substitutes parameters while protecting declared system unknowns', () => {
    const valueA = {
      id: 'matrix-a',
      name: 'A',
      encoding: 'scalar-v1' as const,
      value: matrix([['u']]),
    };
    const valueB = { id: 'matrix-b', name: 'B', value: [[1]] };
    const dispatched = dispatchMatrixEditorLatex({
      latex: 'Au=[g]',
      matrixA: [[1]],
      matrixB: [[1]],
      matrixValues: [valueA, valueB],
      activeMatrixLeftId: valueA.id,
      activeMatrixRightId: valueB.id,
      domain: 'real',
      substitutionMode: 'use-stored-values',
      storedVariables: [
        { name: 'u', valueLatex: '9', numericValue: 9 },
        { name: 'g', valueLatex: '7', numericValue: 7 },
      ],
      complexExactForm: 'rectangular',
    });
    expect(dispatched).toMatchObject({
      ok: true,
      request: {
        matrixA: { source: [[{ canonicalLatex: 'u' }]], resolved: [[{ canonicalLatex: 'u' }]] },
        systemRhs: { source: [{ canonicalLatex: 'g' }], resolved: [{ canonicalLatex: '7' }] },
        substitutionSnapshot: [{ name: 'g', valueLatex: '7', numericValue: 7 }],
        protectedSubstitutionSnapshot: [{ name: 'u', valueLatex: '9', numericValue: 9 }],
      },
    });
  });

  it('never interprets i as a system unknown', () => {
    const result = dispatchMatrixEditorLatex({
      latex: 'Ai=[1]',
      matrixA: [[1]],
      matrixB: [[1]],
      matrixValues: [
        { id: 'matrix-a', name: 'A', value: [[1]] },
        { id: 'matrix-b', name: 'B', value: [[1]] },
      ],
      domain: 'real',
      substitutionMode: 'symbolic',
      storedVariables: [],
      complexExactForm: 'rectangular',
    });
    expect(result).toEqual({
      ok: false,
      message: 'The imaginary unit i requires Complex mode and cannot be used as a system unknown.',
    });
  });
});
