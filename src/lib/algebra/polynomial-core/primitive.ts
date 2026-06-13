import {
  buildExactPolynomialFromCoefficients,
  exactPolynomialCoefficientArray,
  exactPolynomialIsZero,
  exactPolynomialLeadingCoefficient,
  normalizeExactPolynomial,
  scaleExactPolynomial,
} from './arithmetic';
import {
  divideExactScalars,
  greatestCommonDivisor,
  lcm,
  normalizeExactScalar,
} from './scalars';
import type { ExactPolynomial, ExactScalar } from './types';

export function primitiveExactPolynomial(polynomial: ExactPolynomial): {
  scalar: ExactScalar;
  polynomial: ExactPolynomial;
} | null {
  const normalized = normalizeExactPolynomial(polynomial);
  if (exactPolynomialIsZero(normalized)) {
    return null;
  }

  const coefficients = exactPolynomialCoefficientArray(normalized);
  const denominatorLcm = coefficients.reduce((current, coefficient) =>
    lcm(current, normalizeExactScalar(coefficient).denominator), 1);
  const integerCoefficients = coefficients.map((coefficient) => {
    const normalizedCoefficient = normalizeExactScalar(coefficient);
    return normalizedCoefficient.numerator * (denominatorLcm / normalizedCoefficient.denominator);
  });

  if (!integerCoefficients.every(Number.isInteger)) {
    return null;
  }

  const nonZero = integerCoefficients.filter((value) => value !== 0);
  const content = nonZero.reduce((current, value) =>
    greatestCommonDivisor(current, value), Math.abs(nonZero[0]));
  const leading = integerCoefficients[0];
  const sign = leading < 0 ? -1 : 1;
  const divisor = content * sign;
  const primitiveCoefficients = integerCoefficients.map((value) => ({
    numerator: value / divisor,
    denominator: 1,
  }));

  return {
    scalar: normalizeExactScalar({ numerator: divisor, denominator: denominatorLcm }),
    polynomial: buildExactPolynomialFromCoefficients(polynomial.variable, primitiveCoefficients),
  };
}

export function exactPolynomialContent(polynomial: ExactPolynomial): ExactScalar | null {
  return primitiveExactPolynomial(polynomial)?.scalar ?? null;
}

export function makeMonicExactPolynomial(polynomial: ExactPolynomial): ExactPolynomial | null {
  const normalized = normalizeExactPolynomial(polynomial);
  if (exactPolynomialIsZero(normalized)) {
    return null;
  }

  const leading = exactPolynomialLeadingCoefficient(normalized);
  const reciprocal = divideExactScalars({ numerator: 1, denominator: 1 }, leading);
  return reciprocal ? scaleExactPolynomial(normalized, reciprocal) : null;
}

