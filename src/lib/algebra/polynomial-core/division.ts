import {
  addExactPolynomials,
  exactPolynomialDegree,
  exactPolynomialIsZero,
  exactPolynomialLeadingCoefficient,
  multiplyExactPolynomials,
  normalizeExactPolynomial,
  polynomialFromDegree,
  polynomialFromScalar,
} from './arithmetic';
import { makeMonicExactPolynomial } from './primitive';
import { divideExactScalars } from './scalars';
import type { ExactPolynomial, ExactPolynomialDivisionResult } from './types';

export function divideExactPolynomials(
  dividend: ExactPolynomial,
  divisor: ExactPolynomial,
): ExactPolynomialDivisionResult | null {
  if (dividend.variable !== divisor.variable) {
    return null;
  }

  let remainder = normalizeExactPolynomial(dividend);
  const normalizedDivisor = normalizeExactPolynomial(divisor);
  if (exactPolynomialIsZero(normalizedDivisor)) {
    return null;
  }

  let quotient = polynomialFromScalar(dividend.variable, { numerator: 0, denominator: 1 });
  const divisorDegree = exactPolynomialDegree(normalizedDivisor);
  const divisorLeading = exactPolynomialLeadingCoefficient(normalizedDivisor);

  while (!exactPolynomialIsZero(remainder) && exactPolynomialDegree(remainder) >= divisorDegree) {
    const degree = exactPolynomialDegree(remainder) - divisorDegree;
    const coefficient = divideExactScalars(exactPolynomialLeadingCoefficient(remainder), divisorLeading);
    if (!coefficient) {
      return null;
    }

    const term = polynomialFromDegree(dividend.variable, degree, coefficient);
    quotient = addExactPolynomials(quotient, term);
    const product = multiplyExactPolynomials(term, normalizedDivisor, exactPolynomialDegree(remainder));
    if (!product) {
      return null;
    }
    remainder = addExactPolynomials(remainder, product, -1);
  }

  return {
    quotient: normalizeExactPolynomial(quotient),
    remainder: normalizeExactPolynomial(remainder),
  };
}

export function exactPolynomialGcd(
  left: ExactPolynomial,
  right: ExactPolynomial,
): ExactPolynomial | null {
  if (left.variable !== right.variable) {
    return null;
  }

  let current = normalizeExactPolynomial(left);
  let next = normalizeExactPolynomial(right);

  if (exactPolynomialIsZero(current)) {
    return makeMonicExactPolynomial(next);
  }
  if (exactPolynomialIsZero(next)) {
    return makeMonicExactPolynomial(current);
  }

  while (!exactPolynomialIsZero(next)) {
    const divided = divideExactPolynomials(current, next);
    if (!divided) {
      return null;
    }
    current = next;
    next = divided.remainder;
  }

  return makeMonicExactPolynomial(current);
}

