import {
  addExactPolynomials,
  exactPolynomialIsZero,
  multiplyExactPolynomials,
  type ExactPolynomial,
} from '../polynomial-core';
import {
  bivariateCoefficientArray,
  bivariateDegree,
  onePolynomial,
  validatePolynomial,
  zeroPolynomial,
} from './bivariate-polynomial';
import {
  bivariateStop,
  type BivariatePolynomial,
  type BivariateResultantStop,
  type PolynomialResult,
  type RequiredBivariateResultantOptions,
} from './types';

function shiftedCoefficientRow(
  coefficients: ExactPolynomial[],
  shift: number,
  dimension: number,
  variable: string,
) {
  return Array.from({ length: dimension }, (_, column) =>
    coefficients[column - shift] ?? zeroPolynomial(variable));
}

export function buildBivariateSylvesterMatrix(
  left: BivariatePolynomial,
  right: BivariatePolynomial,
  options: RequiredBivariateResultantOptions,
): { kind: 'success'; matrix: ExactPolynomial[][]; leftDegree: number; rightDegree: number } | BivariateResultantStop {
  if (left.retainedVariable !== right.retainedVariable || left.eliminatedVariable !== right.eliminatedVariable) {
    return bivariateStop('projection-ambiguity');
  }
  if (left.terms.size === 0 || right.terms.size === 0) {
    return bivariateStop('zero-polynomial');
  }
  const leftDegree = bivariateDegree(left);
  const rightDegree = bivariateDegree(right);
  if (leftDegree === 0 || rightDegree === 0) {
    return bivariateStop('constant-polynomial');
  }
  const dimension = leftDegree + rightDegree;
  if (dimension > options.maxSylvesterDimension) {
    return bivariateStop('sylvester-dimension-limit');
  }
  const leftCoefficients = bivariateCoefficientArray(left);
  const rightCoefficients = bivariateCoefficientArray(right);
  return {
    kind: 'success',
    leftDegree,
    rightDegree,
    matrix: [
      ...Array.from({ length: rightDegree }, (_, index) =>
        shiftedCoefficientRow(leftCoefficients, index, dimension, left.retainedVariable)),
      ...Array.from({ length: leftDegree }, (_, index) =>
        shiftedCoefficientRow(rightCoefficients, index, dimension, left.retainedVariable)),
    ],
  };
}

function multiplyPolynomialChecked(
  left: ExactPolynomial,
  right: ExactPolynomial,
  options: RequiredBivariateResultantOptions,
): PolynomialResult {
  const product = multiplyExactPolynomials(left, right, options.maxRetainedDegree);
  return product ? validatePolynomial(product, options) : bivariateStop('degree-limit');
}

function addPolynomialChecked(
  left: ExactPolynomial,
  right: ExactPolynomial,
  sign: 1 | -1,
  options: RequiredBivariateResultantOptions,
): PolynomialResult {
  return validatePolynomial(addExactPolynomials(left, right, sign), options);
}

export function determinantPolynomialMatrix(
  matrix: ExactPolynomial[][],
  variable: string,
  options: RequiredBivariateResultantOptions,
): PolynomialResult {
  if (matrix.length === 0) {
    return { kind: 'success', polynomial: onePolynomial(variable) };
  }
  if (matrix.length === 1) {
    return validatePolynomial(matrix[0][0] ?? zeroPolynomial(variable), options);
  }

  let determinant = zeroPolynomial(variable);
  for (let column = 0; column < matrix[0].length; column += 1) {
    const coefficient = matrix[0][column] ?? zeroPolynomial(variable);
    if (exactPolynomialIsZero(coefficient)) {
      continue;
    }
    const minor = matrix.slice(1).map((row) => row.filter((_, index) => index !== column));
    const minorDeterminant = determinantPolynomialMatrix(minor, variable, options);
    if (minorDeterminant.kind === 'stop') {
      return minorDeterminant;
    }
    const product = multiplyPolynomialChecked(coefficient, minorDeterminant.polynomial, options);
    if (product.kind === 'stop') {
      return product;
    }
    const added = addPolynomialChecked(determinant, product.polynomial, column % 2 === 0 ? 1 : -1, options);
    if (added.kind === 'stop') {
      return added;
    }
    determinant = added.polynomial;
  }
  return validatePolynomial(determinant, options);
}
