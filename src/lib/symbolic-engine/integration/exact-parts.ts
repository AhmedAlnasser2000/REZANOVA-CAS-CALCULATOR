import {
  buildExactPolynomialFromCoefficients,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialToLatex,
  exactPolynomialToNode,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  parseExactPolynomial,
  subtractExactScalars,
  type ExactPolynomial,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { multiplyLatex, wrapGroupedLatex } from '../patterns';
import { BY_PARTS_POLYNOMIAL_DEGREE_CAP } from './types';

const EXACT_ZERO: ExactScalar = { numerator: 0, denominator: 1 };

function exactScalarFromInteger(value: number): ExactScalar {
  return { numerator: value, denominator: 1 };
}

function exactPolynomialToAscendingCoefficients(polynomial: ExactPolynomial) {
  const degree = exactPolynomialDegree(polynomial);
  return Array.from({ length: degree + 1 }, (_, index) =>
    getExactPolynomialCoefficient(polynomial, index));
}

function exactPolynomialFromAscendingCoefficients(
  coefficients: ExactScalar[],
  variable: string,
) {
  return buildExactPolynomialFromCoefficients(variable, [...coefficients].reverse());
}

function exactGaussianSolve(matrix: ExactScalar[][], rhs: ExactScalar[]) {
  const size = rhs.length;
  const augmented = matrix.map((row, index) => [...row, rhs[index]]);

  for (let pivot = 0; pivot < size; pivot += 1) {
    const best = augmented.findIndex((row, index) =>
      index >= pivot && !exactScalarIsZero(row[pivot]));
    if (best < pivot) {
      return undefined;
    }

    [augmented[pivot], augmented[best]] = [augmented[best], augmented[pivot]];
    const pivotValue = augmented[pivot][pivot];
    for (let column = pivot; column <= size; column += 1) {
      const normalized = divideExactScalars(augmented[pivot][column], pivotValue);
      if (!normalized) {
        return undefined;
      }
      augmented[pivot][column] = normalized;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivot || exactScalarIsZero(augmented[row][pivot])) {
        continue;
      }

      const factor = augmented[row][pivot];
      for (let column = pivot; column <= size; column += 1) {
        augmented[row][column] = subtractExactScalars(
          augmented[row][column],
          multiplyExactScalars(factor, augmented[pivot][column]),
        );
      }
    }
  }

  return augmented.map((row) => row[size]);
}

function buildExactTrigLinearSystem(
  polynomial: ExactPolynomial,
  slope: ExactScalar,
  kind: 'sin' | 'cos',
) {
  const degree = exactPolynomialDegree(polynomial);
  if (degree > BY_PARTS_POLYNOMIAL_DEGREE_CAP || exactScalarIsZero(slope)) {
    return undefined;
  }

  const size = degree + 1;
  const unknownCount = size * 2;
  const matrix: ExactScalar[][] = Array.from({ length: unknownCount }, () =>
    Array.from({ length: unknownCount }, () => EXACT_ZERO));
  const rhs = Array.from({ length: unknownCount }, () => EXACT_ZERO);
  const coefficients = exactPolynomialToAscendingCoefficients(polynomial);

  for (let power = 0; power <= degree; power += 1) {
    const sinRow = power;
    if (power + 1 <= degree) {
      matrix[sinRow][power + 1] = exactScalarFromInteger(power + 1);
    }
    matrix[sinRow][size + power] = multiplyExactScalars(slope, { numerator: -1, denominator: 1 });
    rhs[sinRow] = kind === 'sin' ? coefficients[power] : EXACT_ZERO;

    const cosRow = size + power;
    if (power + 1 <= degree) {
      matrix[cosRow][size + power + 1] = exactScalarFromInteger(power + 1);
    }
    matrix[cosRow][power] = slope;
    rhs[cosRow] = kind === 'cos' ? coefficients[power] : EXACT_ZERO;
  }

  const solution = exactGaussianSolve(matrix, rhs);
  return solution
    ? {
      sinCoefficients: solution.slice(0, size),
      cosCoefficients: solution.slice(size),
    }
    : undefined;
}

function groupPolynomialCoefficientLatex(latex: string) {
  return latex.includes('+') || latex.slice(1).includes('-')
    ? wrapGroupedLatex(latex)
    : latex;
}

export function parseExactAffineArgument(node: unknown, variable: string) {
  const polynomial = parseExactPolynomial(node, variable, 1);
  if (!polynomial || exactPolynomialDegree(polynomial) !== 1) {
    return undefined;
  }

  const slope = getExactPolynomialCoefficient(polynomial, 1);
  return exactScalarIsZero(slope)
    ? undefined
    : {
      slope,
      latex: exactPolynomialToLatex(polynomial),
      node: exactPolynomialToNode(polynomial),
    };
}

export function solveExactPolynomialTimesExponential(
  polynomial: ExactPolynomial,
  slope: ExactScalar,
  exponentLatex: string,
  exponentNode: unknown,
) {
  if (
    exactScalarIsZero(slope)
    || exactPolynomialDegree(polynomial) > BY_PARTS_POLYNOMIAL_DEGREE_CAP
  ) {
    return undefined;
  }

  const coefficients = exactPolynomialToAscendingCoefficients(polynomial);
  const antiderivative = Array.from({ length: coefficients.length }, () => EXACT_ZERO);
  const last = coefficients.length - 1;
  const leading = divideExactScalars(coefficients[last], slope);
  if (!leading) {
    return undefined;
  }
  antiderivative[last] = leading;

  for (let degree = last - 1; degree >= 0; degree -= 1) {
    const derivativeCarry = multiplyExactScalars(
      exactScalarFromInteger(degree + 1),
      antiderivative[degree + 1],
    );
    const numerator = subtractExactScalars(coefficients[degree], derivativeCarry);
    const solved = divideExactScalars(numerator, slope);
    if (!solved) {
      return undefined;
    }
    antiderivative[degree] = solved;
  }

  const polynomialResult = exactPolynomialFromAscendingCoefficients(
    antiderivative,
    polynomial.variable,
  );
  const polynomialLatex = exactPolynomialToLatex(polynomialResult);
  return {
    exactLatex: `e^{${exponentLatex}}\\left(${polynomialLatex}\\right)`,
    antiderivativeNode: [
      'Multiply',
      ['Power', 'ExponentialE', structuredClone(exponentNode)],
      exactPolynomialToNode(polynomialResult),
    ],
  };
}

export function solveExactPolynomialTimesTrig(
  polynomial: ExactPolynomial,
  slope: ExactScalar,
  angleLatex: string,
  angleNode: unknown,
  kind: 'sin' | 'cos',
) {
  const solution = buildExactTrigLinearSystem(polynomial, slope, kind);
  if (!solution) {
    return undefined;
  }

  const sinPolynomial = exactPolynomialFromAscendingCoefficients(
    solution.sinCoefficients,
    polynomial.variable,
  );
  const cosPolynomial = exactPolynomialFromAscendingCoefficients(
    solution.cosCoefficients,
    polynomial.variable,
  );
  const sinLatex = exactPolynomialToLatex(sinPolynomial);
  const cosLatex = exactPolynomialToLatex(cosPolynomial);
  const pieces: string[] = [];
  const nodes: unknown[] = [];
  if (sinLatex !== '0') {
    pieces.push(multiplyLatex(
      groupPolynomialCoefficientLatex(sinLatex),
      `\\sin\\left(${angleLatex}\\right)`,
    ));
    nodes.push([
      'Multiply',
      exactPolynomialToNode(sinPolynomial),
      ['Sin', structuredClone(angleNode)],
    ]);
  }
  if (cosLatex !== '0') {
    pieces.push(multiplyLatex(
      groupPolynomialCoefficientLatex(cosLatex),
      `\\cos\\left(${angleLatex}\\right)`,
    ));
    nodes.push([
      'Multiply',
      exactPolynomialToNode(cosPolynomial),
      ['Cos', structuredClone(angleNode)],
    ]);
  }
  return pieces.length === 0
    ? undefined
    : {
        exactLatex: pieces.join('+'),
        antiderivativeNode: nodes.length === 1 ? nodes[0] : ['Add', ...nodes],
      };
}
