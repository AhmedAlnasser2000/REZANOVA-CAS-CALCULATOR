import {
  exactPolynomialCoefficientArray,
  exactPolynomialDegree,
  exactPolynomialIsZero,
  normalizeExactScalar,
  type ExactPolynomial,
  type ExactScalar,
} from '../polynomial-core';
import {
  determinantExactMatrix,
  type ExactDeterminantSuccess,
  type ExactMatrix,
} from '../../linear-algebra/exact-matrix-core';
import {
  maxSylvesterDimension,
  polynomialEliminationStop,
  type PolynomialEliminationOptions,
  type PolynomialEliminationStop,
} from './types';

export type SylvesterMatrixSuccess = {
  kind: 'success';
  variable: string;
  leftDegree: number;
  rightDegree: number;
  matrix: ExactMatrix;
};

export type SylvesterMatrixResult = SylvesterMatrixSuccess | PolynomialEliminationStop;

export type ResultantSuccess = {
  kind: 'success';
  variable: string;
  leftDegree: number;
  rightDegree: number;
  sylvesterMatrix: ExactMatrix;
  determinant: ExactDeterminantSuccess;
  resultant: ExactScalar;
};

export type ResultantResult = ResultantSuccess | PolynomialEliminationStop;

function zeroScalar(): ExactScalar {
  return { numerator: 0, denominator: 1 };
}

function shiftedCoefficientRow(
  coefficients: ExactScalar[],
  shift: number,
  dimension: number,
): ExactScalar[] {
  return Array.from({ length: dimension }, (_, column) =>
    coefficients[column - shift]
      ? normalizeExactScalar(coefficients[column - shift])
      : zeroScalar());
}

export function buildSylvesterMatrix(
  left: ExactPolynomial,
  right: ExactPolynomial,
  options: PolynomialEliminationOptions = {},
): SylvesterMatrixResult {
  if (left.variable !== right.variable) {
    return polynomialEliminationStop('variable-mismatch');
  }

  if (exactPolynomialIsZero(left) || exactPolynomialIsZero(right)) {
    return polynomialEliminationStop('zero-polynomial');
  }

  const leftDegree = exactPolynomialDegree(left);
  const rightDegree = exactPolynomialDegree(right);
  if (leftDegree === 0 || rightDegree === 0) {
    return polynomialEliminationStop('constant-polynomial');
  }

  const dimension = leftDegree + rightDegree;
  if (dimension > maxSylvesterDimension(options)) {
    return polynomialEliminationStop('sylvester-dimension-limit');
  }

  const leftCoefficients = exactPolynomialCoefficientArray(left);
  const rightCoefficients = exactPolynomialCoefficientArray(right);
  const matrix: ExactMatrix = [
    ...Array.from({ length: rightDegree }, (_, index) =>
      shiftedCoefficientRow(leftCoefficients, index, dimension)),
    ...Array.from({ length: leftDegree }, (_, index) =>
      shiftedCoefficientRow(rightCoefficients, index, dimension)),
  ];

  return {
    kind: 'success',
    variable: left.variable,
    leftDegree,
    rightDegree,
    matrix,
  };
}

export function resultantExactPolynomials(
  left: ExactPolynomial,
  right: ExactPolynomial,
  options: PolynomialEliminationOptions = {},
): ResultantResult {
  const sylvester = buildSylvesterMatrix(left, right, options);
  if (sylvester.kind === 'stop') {
    return sylvester;
  }

  const determinant = determinantExactMatrix(sylvester.matrix, {
    maxDimension: maxSylvesterDimension(options),
    maxScalarAbs: options.maxScalarAbs,
  });

  if (determinant.kind === 'stop') {
    return {
      kind: 'stop',
      reason: 'exact-matrix-determinant-stop',
      exactMatrixReason: determinant.reason,
    };
  }

  return {
    kind: 'success',
    variable: sylvester.variable,
    leftDegree: sylvester.leftDegree,
    rightDegree: sylvester.rightDegree,
    sylvesterMatrix: sylvester.matrix,
    determinant,
    resultant: determinant.determinant,
  };
}
