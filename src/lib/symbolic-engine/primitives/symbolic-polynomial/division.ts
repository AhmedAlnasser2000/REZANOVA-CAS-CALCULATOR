import {
  divideSymbolicCoefficients,
  mergeSymbolicCoefficientFacts,
} from '../coefficient-domain';
import {
  addSymbolicPolynomials,
  derivativeSymbolicPolynomial,
  makeMonicSymbolicPolynomial,
  monomialSymbolicPolynomial,
  multiplySymbolicPolynomials,
  normalizeSymbolicPolynomial,
  subtractSymbolicPolynomials,
  symbolicPolynomialIsZero,
  zeroSymbolicPolynomial,
} from './arithmetic';
import type {
  SymbolicPolynomial,
  SymbolicPolynomialDivisionResult,
  SymbolicPolynomialGcdResult,
  SymbolicPolynomialOptions,
  SymbolicSquarefreeReadinessResult,
} from './types';

function mergeFacts(...polynomials: SymbolicPolynomial[]) {
  return mergeSymbolicCoefficientFacts(polynomials.flatMap((polynomial) => polynomial.facts));
}

function zeroRemainderLike(polynomial: SymbolicPolynomial) {
  const zero = zeroSymbolicPolynomial(polynomial.variable);
  return zero.kind === 'success' ? zero.polynomial : undefined;
}

export function divideSymbolicPolynomials(
  dividend: SymbolicPolynomial,
  divisor: SymbolicPolynomial,
  options: SymbolicPolynomialOptions = {},
): SymbolicPolynomialDivisionResult {
  if (dividend.variable !== divisor.variable) {
    return { kind: 'stop', reason: 'variable-mismatch' };
  }
  const variable = dividend.variable;
  const normalizedDivisor = normalizeSymbolicPolynomial(divisor);
  if (symbolicPolynomialIsZero(normalizedDivisor)) {
    return { kind: 'stop', reason: 'zero-polynomial' };
  }

  const zero = zeroRemainderLike(dividend);
  if (!zero) {
    return { kind: 'stop', reason: 'coefficient-stop' };
  }
  let quotient = zero;
  let remainder = normalizeSymbolicPolynomial(dividend);
  const maxIterations = (options.maxDegree ?? Math.max(dividend.degree, divisor.degree)) + 2;
  let iterations = 0;

  while (!symbolicPolynomialIsZero(remainder) && remainder.degree >= normalizedDivisor.degree) {
    iterations += 1;
    if (iterations > maxIterations) {
      return { kind: 'stop', reason: 'division-iteration-cap' };
    }

    const degreeOffset = remainder.degree - normalizedDivisor.degree;
    const leadingQuotient = divideSymbolicCoefficients(
      remainder.coefficients[remainder.degree],
      normalizedDivisor.coefficients[normalizedDivisor.degree],
      variable,
    );
    if (leadingQuotient.kind === 'stop') {
      return {
        kind: 'stop',
        reason: 'coefficient-stop',
        coefficientReason: leadingQuotient.reason,
      };
    }

    const monomial = monomialSymbolicPolynomial(variable, degreeOffset, leadingQuotient.coefficient);
    if (monomial.kind === 'stop') {
      return monomial;
    }
    const nextQuotient = addSymbolicPolynomials(quotient, monomial.polynomial, options);
    if (nextQuotient.kind === 'stop') {
      return nextQuotient;
    }
    quotient = nextQuotient.polynomial;

    const product = multiplySymbolicPolynomials(normalizedDivisor, monomial.polynomial, options);
    if (product.kind === 'stop') {
      return product;
    }
    const nextRemainder = subtractSymbolicPolynomials(remainder, product.polynomial, options);
    if (nextRemainder.kind === 'stop') {
      return nextRemainder;
    }
    remainder = normalizeSymbolicPolynomial(nextRemainder.polynomial);
  }

  return {
    kind: 'success',
    quotient: normalizeSymbolicPolynomial(quotient),
    remainder: normalizeSymbolicPolynomial(remainder),
    facts: mergeFacts(quotient, remainder, normalizedDivisor),
  };
}

export function gcdSymbolicPolynomials(
  left: SymbolicPolynomial,
  right: SymbolicPolynomial,
  options: SymbolicPolynomialOptions = {},
): SymbolicPolynomialGcdResult {
  if (left.variable !== right.variable) {
    return { kind: 'stop', reason: 'variable-mismatch' };
  }
  const monicLeft = makeMonicSymbolicPolynomial(normalizeSymbolicPolynomial(left));
  if (monicLeft.kind === 'stop') {
    return monicLeft;
  }
  const monicRight = makeMonicSymbolicPolynomial(normalizeSymbolicPolynomial(right));
  if (monicRight.kind === 'stop') {
    return monicRight;
  }
  let current = monicLeft.polynomial;
  let next = monicRight.polynomial;
  const maxIterations = (options.maxDegree ?? Math.max(left.degree, right.degree)) + 2;
  let iterations = 0;

  while (!symbolicPolynomialIsZero(next)) {
    iterations += 1;
    if (iterations > maxIterations) {
      return { kind: 'stop', reason: 'division-iteration-cap' };
    }
    const divided = divideSymbolicPolynomials(current, next, options);
    if (divided.kind === 'stop') {
      return divided;
    }
    current = next;
    if (symbolicPolynomialIsZero(divided.remainder)) {
      next = divided.remainder;
    } else {
      const monicRemainder = makeMonicSymbolicPolynomial(divided.remainder);
      if (monicRemainder.kind === 'stop') {
        return monicRemainder;
      }
      next = monicRemainder.polynomial;
    }
  }

  const monic = makeMonicSymbolicPolynomial(current);
  if (monic.kind === 'stop') {
    return monic;
  }
  return {
    kind: 'success',
    gcd: monic.polynomial,
    facts: mergeFacts(left, right, monic.polynomial),
  };
}

export function squarefreeReadinessSymbolicPolynomial(
  polynomial: SymbolicPolynomial,
  options: SymbolicPolynomialOptions = {},
): SymbolicSquarefreeReadinessResult {
  if (symbolicPolynomialIsZero(polynomial)) {
    return { kind: 'stop', reason: 'zero-polynomial' };
  }
  const derivative = derivativeSymbolicPolynomial(polynomial);
  if (derivative.kind === 'stop') {
    return derivative;
  }
  if (symbolicPolynomialIsZero(derivative.polynomial)) {
    return { kind: 'stop', reason: 'constant-polynomial' };
  }

  const gcd = gcdSymbolicPolynomials(polynomial, derivative.polynomial, options);
  if (gcd.kind === 'stop') {
    return gcd;
  }
  if (gcd.gcd.degree === 0) {
    return {
      kind: 'success',
      squarefree: true,
      derivative: derivative.polynomial,
      repeatedFactor: null,
      squarefreePart: normalizeSymbolicPolynomial(polynomial),
      facts: mergeFacts(polynomial, derivative.polynomial, gcd.gcd),
    };
  }

  const quotient = divideSymbolicPolynomials(polynomial, gcd.gcd, options);
  if (quotient.kind === 'stop') {
    return quotient;
  }
  if (!symbolicPolynomialIsZero(quotient.remainder)) {
    return { kind: 'stop', reason: 'division-nonzero-remainder' };
  }

  return {
    kind: 'success',
    squarefree: false,
    derivative: derivative.polynomial,
    repeatedFactor: gcd.gcd,
    squarefreePart: quotient.quotient,
    facts: mergeSymbolicCoefficientFacts([
      ...polynomial.facts,
      ...derivative.polynomial.facts,
      ...gcd.gcd.facts,
      ...quotient.facts,
    ]),
  };
}
