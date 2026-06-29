import {
  addSymbolicCoefficients,
  mergeSymbolicCoefficientFacts,
  multiplySymbolicCoefficients,
  negateSymbolicCoefficient,
  zeroSymbolicCoefficient,
  type SymbolicCoefficient,
} from '../coefficient-domain';
import {
  getSymbolicPolynomialCoefficient,
  normalizeSymbolicPolynomial,
  symbolicPolynomialIsZero,
} from './arithmetic';
import {
  DEFAULT_SYMBOLIC_POLYNOMIAL_MAX_DETERMINANT_TERMS,
  DEFAULT_SYMBOLIC_POLYNOMIAL_MAX_SYLVESTER_DIMENSION,
  type SymbolicPolynomial,
  type SymbolicPolynomialOptions,
  type SymbolicPolynomialStop,
  type SymbolicResultantResult,
  type SymbolicSylvesterMatrixResult,
} from './types';

type SymbolicDeterminantResult =
  | { kind: 'success'; coefficient: SymbolicCoefficient }
  | SymbolicPolynomialStop;

function zero(variable: string) {
  const parsed = zeroSymbolicCoefficient(variable);
  if (parsed.kind === 'stop') {
    throw new Error('zero coefficient construction failed');
  }
  return parsed.coefficient;
}

function shiftedDescendingCoefficientRow(
  polynomial: SymbolicPolynomial,
  shift: number,
  dimension: number,
): SymbolicCoefficient[] {
  const row = Array.from({ length: dimension }, () => zero(polynomial.variable));
  for (let degree = polynomial.degree; degree >= 0; degree -= 1) {
    const column = shift + (polynomial.degree - degree);
    row[column] = getSymbolicPolynomialCoefficient(polynomial, degree);
  }
  return row;
}

export function buildSymbolicSylvesterMatrix(
  left: SymbolicPolynomial,
  right: SymbolicPolynomial,
  options: SymbolicPolynomialOptions = {},
): SymbolicSylvesterMatrixResult {
  if (left.variable !== right.variable) {
    return { kind: 'stop', reason: 'variable-mismatch' };
  }
  const normalizedLeft = normalizeSymbolicPolynomial(left);
  const normalizedRight = normalizeSymbolicPolynomial(right);
  if (symbolicPolynomialIsZero(normalizedLeft) || symbolicPolynomialIsZero(normalizedRight)) {
    return { kind: 'stop', reason: 'zero-polynomial' };
  }
  if (normalizedLeft.degree === 0 || normalizedRight.degree === 0) {
    return { kind: 'stop', reason: 'constant-polynomial' };
  }

  const dimension = normalizedLeft.degree + normalizedRight.degree;
  if (dimension > (options.maxSylvesterDimension ?? DEFAULT_SYMBOLIC_POLYNOMIAL_MAX_SYLVESTER_DIMENSION)) {
    return { kind: 'stop', reason: 'sylvester-dimension-limit' };
  }

  return {
    kind: 'success',
    variable: normalizedLeft.variable,
    leftDegree: normalizedLeft.degree,
    rightDegree: normalizedRight.degree,
    matrix: [
      ...Array.from({ length: normalizedRight.degree }, (_, index) =>
        shiftedDescendingCoefficientRow(normalizedLeft, index, dimension)),
      ...Array.from({ length: normalizedLeft.degree }, (_, index) =>
        shiftedDescendingCoefficientRow(normalizedRight, index, dimension)),
    ],
  };
}

function minor(matrix: SymbolicCoefficient[][], columnToRemove: number) {
  return matrix.slice(1).map((row) => row.filter((_, column) => column !== columnToRemove));
}

function determinantSymbolicMatrix(
  matrix: SymbolicCoefficient[][],
  variable: string,
  options: Required<Pick<SymbolicPolynomialOptions, 'maxDeterminantTerms'>>,
  counter: { terms: number },
): SymbolicDeterminantResult {
  if (matrix.length === 1) {
    return { kind: 'success', coefficient: matrix[0][0] };
  }

  let sum = zero(variable);
  for (let column = 0; column < matrix.length; column += 1) {
    counter.terms += 1;
    if (counter.terms > options.maxDeterminantTerms) {
      return { kind: 'stop', reason: 'determinant-cap' };
    }
    const child = determinantSymbolicMatrix(minor(matrix, column), variable, options, counter);
    if (child.kind === 'stop') {
      return child;
    }
    const product = multiplySymbolicCoefficients(matrix[0][column], child.coefficient, variable);
    if (product.kind === 'stop') {
      return { kind: 'stop', reason: 'coefficient-stop', coefficientReason: product.reason };
    }
    const signed = column % 2 === 0
      ? product
      : negateSymbolicCoefficient(product.coefficient, variable);
    if (signed.kind === 'stop') {
      return { kind: 'stop', reason: 'coefficient-stop', coefficientReason: signed.reason };
    }
    const added = addSymbolicCoefficients(sum, signed.coefficient, variable);
    if (added.kind === 'stop') {
      return { kind: 'stop', reason: 'coefficient-stop', coefficientReason: added.reason };
    }
    sum = added.coefficient;
  }
  return { kind: 'success', coefficient: sum };
}

export function resultantSymbolicPolynomials(
  left: SymbolicPolynomial,
  right: SymbolicPolynomial,
  options: SymbolicPolynomialOptions = {},
): SymbolicResultantResult {
  const sylvester = buildSymbolicSylvesterMatrix(left, right, options);
  if (sylvester.kind === 'stop') {
    return sylvester;
  }

  const determinant = determinantSymbolicMatrix(
    sylvester.matrix,
    sylvester.variable,
    { maxDeterminantTerms: options.maxDeterminantTerms ?? DEFAULT_SYMBOLIC_POLYNOMIAL_MAX_DETERMINANT_TERMS },
    { terms: 0 },
  );
  if (determinant.kind === 'stop') {
    return determinant;
  }

  return {
    kind: 'success',
    variable: sylvester.variable,
    leftDegree: sylvester.leftDegree,
    rightDegree: sylvester.rightDegree,
    sylvesterMatrix: sylvester.matrix,
    resultant: determinant.coefficient,
    facts: mergeSymbolicCoefficientFacts([
      ...left.facts,
      ...right.facts,
      ...determinant.coefficient.facts,
    ]),
  };
}
