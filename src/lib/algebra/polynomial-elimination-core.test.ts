import { describe, expect, it } from 'vitest';
import { scalar, type ExactMatrix } from '../linear-algebra/exact-matrix-core';
import { buildExactPolynomialFromCoefficients, type ExactPolynomial } from './polynomial-core';
import {
  buildSylvesterMatrix,
  resultantExactPolynomials,
} from './polynomial-elimination-core';

const s = scalar;

function polynomial(variable: string, coefficients: Array<number | [number, number]>): ExactPolynomial {
  return buildExactPolynomialFromCoefficients(
    variable,
    coefficients.map((value) => Array.isArray(value) ? s(value[0], value[1]) : s(value)),
  );
}

function matrix(values: Array<Array<number | [number, number]>>): ExactMatrix {
  return values.map((row) =>
    row.map((value) => Array.isArray(value) ? s(value[0], value[1]) : s(value)));
}

describe('polynomial-elimination-core Sylvester matrices', () => {
  it('builds Sylvester matrices for linear and quadratic pairs', () => {
    const linear = buildSylvesterMatrix(
      polynomial('x', [1, -1]),
      polynomial('x', [1, -2]),
    );
    const quadratic = buildSylvesterMatrix(
      polynomial('x', [1, 0, -2]),
      polynomial('x', [1, -3]),
    );

    expect(linear).toMatchObject({
      kind: 'success',
      variable: 'x',
      leftDegree: 1,
      rightDegree: 1,
      matrix: matrix([[1, -1], [1, -2]]),
    });
    expect(quadratic).toMatchObject({
      kind: 'success',
      variable: 'x',
      leftDegree: 2,
      rightDegree: 1,
      matrix: matrix([[1, 0, -2], [1, -3, 0], [0, 1, -3]]),
    });
  });
});

describe('polynomial-elimination-core resultants', () => {
  it('computes bounded exact resultants over integer coefficients', () => {
    expect(resultantExactPolynomials(
      polynomial('x', [1, -1]),
      polynomial('x', [1, -2]),
    )).toMatchObject({
      kind: 'success',
      resultant: s(-1),
      leftDegree: 1,
      rightDegree: 1,
    });

    expect(resultantExactPolynomials(
      polynomial('x', [1, 0, -1]),
      polynomial('x', [1, -1]),
    )).toMatchObject({
      kind: 'success',
      resultant: s(0),
    });

    expect(resultantExactPolynomials(
      polynomial('x', [1, 0, -2]),
      polynomial('x', [1, -3]),
    )).toMatchObject({
      kind: 'success',
      resultant: s(7),
      determinant: {
        determinant: s(7),
      },
    });
  });

  it('computes bounded exact resultants over rational coefficients', () => {
    expect(resultantExactPolynomials(
      polynomial('x', [[1, 2], 1]),
      polynomial('x', [1, -2]),
    )).toMatchObject({
      kind: 'success',
      resultant: s(-2),
    });
  });

  it('returns controlled stops for unsupported resultant requests', () => {
    expect(resultantExactPolynomials(
      polynomial('x', [1, -1]),
      polynomial('y', [1, -2]),
    )).toEqual({
      kind: 'stop',
      reason: 'variable-mismatch',
    });

    expect(resultantExactPolynomials(
      polynomial('x', [0]),
      polynomial('x', [1, -1]),
    )).toEqual({
      kind: 'stop',
      reason: 'zero-polynomial',
    });

    expect(resultantExactPolynomials(
      polynomial('x', [3]),
      polynomial('x', [1, -1]),
    )).toEqual({
      kind: 'stop',
      reason: 'constant-polynomial',
    });

    expect(resultantExactPolynomials(
      polynomial('x', [1, 0, 0, 0]),
      polynomial('x', [1, 0, 0, 0]),
      { maxSylvesterDimension: 5 },
    )).toEqual({
      kind: 'stop',
      reason: 'sylvester-dimension-limit',
    });
  });

  it('propagates exact matrix determinant safety stops', () => {
    expect(resultantExactPolynomials(
      polynomial('x', [11, 0]),
      polynomial('x', [1, -1]),
      { maxScalarAbs: 10 },
    )).toEqual({
      kind: 'stop',
      reason: 'exact-matrix-determinant-stop',
      exactMatrixReason: 'scalar-growth-limit',
    });
  });
});
