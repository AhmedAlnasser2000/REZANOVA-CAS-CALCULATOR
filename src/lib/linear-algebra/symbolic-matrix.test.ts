import { describe, expect, it } from 'vitest';
import type {
  LinearAlgebraScalarDomain,
  LinearAlgebraScalarMatrixOperandV1,
  MatrixOperation,
} from '../../types/calculator';
import { runMatrixMode } from '../modes/matrix';
import { dispatchMatrixEditorLatex } from './editor-dispatch';
import { parseLinearAlgebraScalarWire } from './scalar-wire';
import {
  determinantSymbolicMatrix,
  runSymbolicMatrixOperation,
  type SymbolicMatrix,
} from './symbolic-matrix';

function scalar(latex: string, domain: LinearAlgebraScalarDomain = 'real') {
  const parsed = parseLinearAlgebraScalarWire(latex, domain);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

function matrix(
  rows: readonly (readonly string[])[],
  domain: LinearAlgebraScalarDomain = 'real',
): SymbolicMatrix {
  return rows.map((row) => row.map((value) => scalar(value, domain)));
}

function operand(value: SymbolicMatrix): LinearAlgebraScalarMatrixOperandV1 {
  return { encoding: 'scalar-v1', source: value, resolved: value };
}

function response(
  operation: MatrixOperation,
  valueA: SymbolicMatrix,
  valueB = valueA,
  domain: LinearAlgebraScalarDomain = 'real',
  matrixPowerExponent?: number,
) {
  return runSymbolicMatrixOperation({
    operation,
    operandEncoding: 'scalar-v1',
    matrixA: operand(valueA),
    matrixB: operand(valueB),
    domain,
    ...(matrixPowerExponent !== undefined ? { matrixPowerExponent } : {}),
  });
}

describe('bounded symbolic Matrix arithmetic', () => {
  it('preserves the familiar 2 by 2 determinant identity', () => {
    const value = determinantSymbolicMatrix(matrix([['a', 'b'], ['c', 'd']]), 'real');
    expect(value.canonicalLatex.replaceAll(' ', '')).toMatch(/ad-bc|-bc\+ad/);
    expect(value.mathJson).toBeDefined();
  });

  it('adds, multiplies, and ordinarily transposes symbolic matrices', () => {
    const left = matrix([['a', 'b'], ['c', 'd']]);
    const right = matrix([['1', '0'], ['0', '1']]);
    expect(response('add', left, right).resultLatex).toContain('a+1');
    expect(response('multiply', left, right).resultLatex).toContain('a');
    expect(response('transposeA', left).resultLatex).toContain('a&c');
  });

  it('conjugates entries and transposes positions for the complex adjoint', () => {
    const value = matrix([['1', 'i'], ['a', '1-i']], 'complex');
    const result = response('adjointA', value, value, 'complex');
    expect(result.error).toBeUndefined();
    expect(result.resultLatex).toMatch(/-i|-\\imaginaryI/);
    expect(result.resultLatex).toMatch(/a\^\\star|a\^\{\\star\}|\\overline\{a\}|\\operatorname\{conj\}/);

    const proven = runMatrixMode({
      operation: 'adjointA',
      operandEncoding: 'scalar-v1',
      matrixA: operand(value),
      matrixB: operand(value),
      domain: 'complex',
    });
    expect(proven.kind).toBe('success');
    if (proven.kind !== 'success') throw new Error('Expected proven complex adjoint.');
    expect(proven.canonicalResult?.version).toBe(2);
  });

  it('returns inverse and negative-power conditions from the native determinant', () => {
    const value = matrix([['a', '0'], ['0', '1']]);
    const inverse = response('inverseA', value);
    expect(inverse.error).toBeUndefined();
    expect(inverse.exactSupplementLatex).toEqual([expect.stringContaining('a')]);

    const negativePower = response('spectralPowerA', value, value, 'real', -2);
    expect(negativePower.error).toBeUndefined();
    expect(negativePower.exactSupplementLatex).toEqual([expect.stringContaining('a')]);
  });

  it('enforces the dimension and literal exponent ceilings', () => {
    const five = Array.from({ length: 5 }, (_, row) =>
      Array.from({ length: 5 }, (_, column) => (row === column ? scalar('1') : scalar('0'))));
    expect(response('detA', five).error).toContain('through 4 by 4');
    expect(response('spectralPowerA', matrix([['1']]), matrix([['1']]), 'real', 13).error)
      .toContain('|n| <= 12');
  });

  it('emits V2 producer proof for symbolic matrices and determinant conditions', () => {
    const value = matrix([['a', '0'], ['0', '1']]);
    const result = runMatrixMode({
      operation: 'inverseA',
      operandEncoding: 'scalar-v1',
      matrixA: operand(value),
      matrixB: operand(value),
      domain: 'real',
    });
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') throw new Error('Expected symbolic inverse success.');
    const canonical = result.canonicalResult;
    expect(canonical?.version).toBe(2);
    if (canonical?.version !== 2) throw new Error('Expected V2 symbolic inverse proof.');
    expect(canonical.supplements).toHaveLength(1);
    expect(canonical.supplements?.[0]?.math.mathJson).toEqual([
      'NotEqual',
      expect.anything(),
      0,
    ]);
  });

  it('proves symbolic inverse output for mixed formal 2 by 2 entries', () => {
    const value = matrix([['u', 'v'], ['3', '2']]);
    const result = runMatrixMode({
      operation: 'inverseA',
      operandEncoding: 'scalar-v1',
      matrixA: operand(value),
      matrixB: operand(value),
      domain: 'real',
    });
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') throw new Error('Expected symbolic inverse success.');
    expect(result.canonicalResult?.version).toBe(2);
    expect(result.exactLatex).toContain('2u-3v');
    expect(result.exactSupplementLatex?.join(' ')).toContain('2u-3v');
  });
});

describe('symbolic Matrix editor aliases', () => {
  const complexA = {
    id: 'matrix-a',
    name: 'A',
    encoding: 'scalar-v1' as const,
    value: matrix([['1', 'i'], ['0', '1']], 'complex'),
  };
  const numericB = { id: 'matrix-b', name: 'B', value: [[1, 0], [0, 1]] };

  for (const latex of ['adjoint(A)', 'A^{\\dagger}', 'A^*']) {
    it(`accepts ${latex} as the distinct adjoint operation`, () => {
      const result = dispatchMatrixEditorLatex({
        latex,
        matrixA: [[1, 0], [0, 1]],
        matrixB: [[1, 0], [0, 1]],
        matrixValues: [complexA, numericB],
        activeMatrixLeftId: complexA.id,
        activeMatrixRightId: numericB.id,
        domain: 'complex',
        substitutionMode: 'symbolic',
        storedVariables: [],
        complexExactForm: 'rectangular',
      });
      expect(result).toMatchObject({
        ok: true,
        request: { operation: 'adjointA', operandEncoding: 'scalar-v1' },
      });
    });
  }
});
