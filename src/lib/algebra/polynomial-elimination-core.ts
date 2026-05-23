import {
  exactPolynomialCoefficientArray,
  exactPolynomialDegree,
  exactPolynomialIsZero,
  normalizeExactScalar,
  type ExactPolynomial,
  type ExactScalar,
} from './polynomial-core';
import {
  determinantExactMatrix,
  type ExactDeterminantSuccess,
  type ExactMatrix,
  type ExactMatrixStopReason,
} from '../linear-algebra/exact-matrix-core';

export const DEFAULT_RESULTANT_MAX_SYLVESTER_DIMENSION = 6;

export type PolynomialEliminationStopReason =
  | 'variable-mismatch'
  | 'zero-polynomial'
  | 'constant-polynomial'
  | 'sylvester-dimension-limit'
  | 'exact-matrix-determinant-stop';

export type PolynomialEliminationOptions = {
  maxSylvesterDimension?: number;
  maxScalarAbs?: number;
};

export type PolynomialEliminationStop = {
  kind: 'stop';
  reason: PolynomialEliminationStopReason;
  exactMatrixReason?: ExactMatrixStopReason;
};

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

function stop(reason: PolynomialEliminationStopReason): PolynomialEliminationStop {
  return { kind: 'stop', reason };
}

function maxSylvesterDimension(options: PolynomialEliminationOptions = {}) {
  return options.maxSylvesterDimension ?? DEFAULT_RESULTANT_MAX_SYLVESTER_DIMENSION;
}

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
    return stop('variable-mismatch');
  }

  if (exactPolynomialIsZero(left) || exactPolynomialIsZero(right)) {
    return stop('zero-polynomial');
  }

  const leftDegree = exactPolynomialDegree(left);
  const rightDegree = exactPolynomialDegree(right);
  if (leftDegree === 0 || rightDegree === 0) {
    return stop('constant-polynomial');
  }

  const dimension = leftDegree + rightDegree;
  if (dimension > maxSylvesterDimension(options)) {
    return stop('sylvester-dimension-limit');
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
