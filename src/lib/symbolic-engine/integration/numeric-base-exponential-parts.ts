import {
  buildExactScalarNode,
  exactPolynomialDegree,
  exactPolynomialToLatex,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  parseExactPolynomial,
  readExactScalarNode,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import type { AntiderivativeBackcheck } from '../../calculus/engine/verification';
import { boxLatex, isNodeArray, type PolynomialTerm, wrapGroupedLatex } from '../patterns';
import { numberLatex } from './node-helpers';
import { BY_PARTS_POLYNOMIAL_DEGREE_CAP } from './types';

function polynomialDegree(terms: PolynomialTerm[]) {
  return terms.length === 0 ? 0 : terms[0].degree;
}

function polynomialToAscendingCoefficients(terms: PolynomialTerm[]) {
  const degree = polynomialDegree(terms);
  const coefficients = Array.from({ length: degree + 1 }, () => 0);
  for (const term of terms) {
    coefficients[term.degree] = term.coefficient;
  }
  return coefficients;
}

function exactScalarLatex(value: ExactScalar) {
  return boxLatex(buildExactScalarNode(value));
}

function positiveNonUnitExactScalar(node: unknown): ExactScalar | undefined {
  const scalar = readExactScalarNode(node);
  if (!scalar || scalar.denominator === 0 || scalar.numerator <= 0 || scalar.numerator === scalar.denominator) {
    return undefined;
  }

  return scalar;
}

export function isNumericBaseExponentialFactor(node: unknown) {
  return isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && Boolean(positiveNonUnitExactScalar(node[1]));
}

function parseExactAffineExponent(node: unknown, variable: string) {
  const polynomial = parseExactPolynomial(node, variable, 1);
  if (!polynomial || exactPolynomialDegree(polynomial) !== 1) {
    return undefined;
  }

  const slope = getExactPolynomialCoefficient(polynomial, 1);
  if (exactScalarIsZero(slope)) {
    return undefined;
  }

  return {
    slope,
    latex: exactPolynomialToLatex(polynomial),
  };
}

function polynomialFromAscendingCoefficientsWithNumberLatex(coefficients: number[]) {
  const terms: string[] = [];
  for (let degree = coefficients.length - 1; degree >= 0; degree -= 1) {
    const coefficient = coefficients[degree];
    if (Math.abs(coefficient) < 1e-10) {
      continue;
    }

    const sign = coefficient < 0 ? '-' : '+';
    const absoluteCoefficient = Math.abs(coefficient);
    let term = '';

    if (degree === 0) {
      term = numberLatex(absoluteCoefficient);
    } else if (degree === 1) {
      term = absoluteCoefficient === 1 ? 'x' : `${numberLatex(absoluteCoefficient)}x`;
    } else {
      term = absoluteCoefficient === 1 ? `x^{${degree}}` : `${numberLatex(absoluteCoefficient)}x^{${degree}}`;
    }

    terms.push(terms.length === 0 ? (sign === '-' ? `-${term}` : term) : `${sign}${term}`);
  }

  return terms.join('') || '0';
}

function derivativePolynomialCoefficients(coefficients: number[]) {
  return coefficients.slice(1).map((coefficient, index) => coefficient * (index + 1));
}

function exactScalarPower(value: ExactScalar, power: number): ExactScalar {
  let result: ExactScalar = { numerator: 1, denominator: 1 };
  for (let index = 0; index < power; index += 1) {
    result = multiplyExactScalars(result, value);
  }
  return result;
}

function dividePolynomialByExactScalar(polynomialLatex: string, scalar: ExactScalar) {
  if (scalar.numerator === scalar.denominator) {
    return polynomialLatex;
  }

  if (scalar.numerator === -scalar.denominator) {
    return `-${wrapGroupedLatex(polynomialLatex)}`;
  }

  return `\\frac{${polynomialLatex}}{${exactScalarLatex(scalar)}}`;
}

function reciprocalLogFactor(logLatex: string, power: number) {
  return power === 1
    ? `\\frac{1}{${logLatex}}`
    : `\\frac{1}{${wrapGroupedLatex(logLatex)}^{${power}}}`;
}

function joinAdditiveParts(parts: string[]) {
  return parts
    .filter((part) => part !== '0')
    .reduce((joined, part, index) => {
      if (index === 0) {
        return part;
      }
      return part.startsWith('-') ? `${joined}${part}` : `${joined}+${part}`;
    }, '') || undefined;
}

export type NumericBaseExponentialPartsResult = {
  exactLatex: string;
  verification: AntiderivativeBackcheck;
};

function solvePolynomialTimesNumericBaseExponential(
  terms: PolynomialTerm[],
  exponentLatex: string,
  slope: ExactScalar,
  base: ExactScalar,
): NumericBaseExponentialPartsResult | undefined {
  if (polynomialDegree(terms) > BY_PARTS_POLYNOMIAL_DEGREE_CAP) {
    return undefined;
  }

  const baseLatex = exactScalarLatex(base);
  const logLatex = `\\ln\\left(${baseLatex}\\right)`;
  const pieces: string[] = [];
  let derivative = polynomialToAscendingCoefficients(terms);
  let sign = 1;
  let denominatorPower = 1;

  while (derivative.some((coefficient) => Math.abs(coefficient) > 1e-10)) {
    const polynomialLatex = polynomialFromAscendingCoefficientsWithNumberLatex(derivative);
    const slopePower = exactScalarPower(slope, denominatorPower);
    const polynomialOverSlope = dividePolynomialByExactScalar(polynomialLatex, slopePower);
    const logFactor = reciprocalLogFactor(logLatex, denominatorPower);
    const piece = `${wrapGroupedLatex(polynomialOverSlope)}${wrapGroupedLatex(logFactor)}`;
    pieces.push(sign < 0 ? `-${wrapGroupedLatex(piece)}` : piece);
    derivative = derivativePolynomialCoefficients(derivative);
    sign *= -1;
    denominatorPower += 1;
  }

  const polynomialPart = joinAdditiveParts(pieces);
  return polynomialPart
    ? {
      exactLatex: `${wrapGroupedLatex(baseLatex)}^{${wrapGroupedLatex(exponentLatex)}}\\left(${polynomialPart}\\right)`,
      verification: {
        status: 'verified-exact',
        reason: 'verified by finite numeric-base exponential integration-by-parts recurrence',
      },
    }
    : undefined;
}

export function tryPolynomialTimesNumericBaseExponential(
  exponential: unknown,
  terms: PolynomialTerm[],
  variable: string,
) {
  if (!isNodeArray(exponential) || exponential[0] !== 'Power' || exponential.length !== 3) {
    return undefined;
  }

  const base = positiveNonUnitExactScalar(exponential[1]);
  const affine = parseExactAffineExponent(exponential[2], variable);
  return base && affine
    ? solvePolynomialTimesNumericBaseExponential(terms, affine.latex, affine.slope, base)
    : undefined;
}
