import {
  addExactScalars,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
} from './scalars';
import type { ExactPolynomial, ExactScalar } from './types';

export function polynomialFromScalar(variable: string, value: ExactScalar): ExactPolynomial {
  return {
    variable,
    terms: new Map<number, ExactScalar>([[0, normalizeExactScalar(value)]]),
  };
}

export function polynomialFromDegree(variable: string, degree: number, coefficient: ExactScalar): ExactPolynomial {
  return {
    variable,
    terms: new Map<number, ExactScalar>([[degree, normalizeExactScalar(coefficient)]]),
  };
}

function clonePolynomialTerms(terms: Map<number, ExactScalar>) {
  const clone = new Map<number, ExactScalar>();
  for (const [degree, coefficient] of terms.entries()) {
    clone.set(degree, coefficient);
  }
  return clone;
}

export function normalizeExactPolynomial(polynomial: ExactPolynomial): ExactPolynomial {
  const terms = new Map<number, ExactScalar>();
  for (const [degree, coefficient] of polynomial.terms.entries()) {
    const normalized = normalizeExactScalar(coefficient);
    if (normalized.numerator !== 0) {
      terms.set(degree, normalized);
    }
  }

  return {
    variable: polynomial.variable,
    terms,
  };
}

export function exactPolynomialIsZero(polynomial: ExactPolynomial) {
  return normalizeExactPolynomial(polynomial).terms.size === 0;
}

export function buildExactPolynomialFromCoefficients(
  variable: string,
  coefficients: ExactScalar[],
): ExactPolynomial {
  const degree = coefficients.length - 1;
  const terms = new Map<number, ExactScalar>();
  coefficients.forEach((coefficient, index) => {
    const normalized = normalizeExactScalar(coefficient);
    if (normalized.numerator !== 0) {
      terms.set(degree - index, normalized);
    }
  });
  return normalizeExactPolynomial({
    variable,
    terms,
  });
}

export function addExactPolynomials(
  left: ExactPolynomial,
  right: ExactPolynomial,
  sign: 1 | -1 = 1,
): ExactPolynomial {
  if (left.variable !== right.variable) {
    throw new Error('Cannot add polynomials with different variables.');
  }

  const terms = clonePolynomialTerms(left.terms);
  for (const [degree, coefficient] of right.terms.entries()) {
    const signed = sign === 1 ? coefficient : negateExactScalar(coefficient);
    const current = terms.get(degree);
    const next = current ? addExactScalars(current, signed) : signed;
    if (next.numerator === 0) {
      terms.delete(degree);
    } else {
      terms.set(degree, next);
    }
  }

  return {
    variable: left.variable,
    terms,
  };
}

export function scaleExactPolynomial(polynomial: ExactPolynomial, factor: ExactScalar): ExactPolynomial {
  const terms = new Map<number, ExactScalar>();
  for (const [degree, coefficient] of polynomial.terms.entries()) {
    const next = multiplyExactScalars(coefficient, factor);
    if (next.numerator !== 0) {
      terms.set(degree, next);
    }
  }

  return {
    variable: polynomial.variable,
    terms,
  };
}

export function multiplyExactPolynomials(
  left: ExactPolynomial,
  right: ExactPolynomial,
  maxDegree: number,
): ExactPolynomial | null {
  if (left.variable !== right.variable) {
    return null;
  }

  const terms = new Map<number, ExactScalar>();

  for (const [leftDegree, leftCoefficient] of left.terms.entries()) {
    for (const [rightDegree, rightCoefficient] of right.terms.entries()) {
      const degree = leftDegree + rightDegree;
      if (degree > maxDegree) {
        return null;
      }

      const coefficient = multiplyExactScalars(leftCoefficient, rightCoefficient);
      if (coefficient.numerator === 0) {
        continue;
      }

      const current = terms.get(degree);
      const next = current ? addExactScalars(current, coefficient) : coefficient;
      if (next.numerator === 0) {
        terms.delete(degree);
      } else {
        terms.set(degree, next);
      }
    }
  }

  return {
    variable: left.variable,
    terms,
  };
}

export function exactPolynomialDegree(polynomial: ExactPolynomial) {
  const degrees = [...normalizeExactPolynomial(polynomial).terms.keys()];
  return degrees.length === 0 ? 0 : Math.max(...degrees);
}

export function getExactPolynomialCoefficient(polynomial: ExactPolynomial, degree: number) {
  return polynomial.terms.get(degree) ?? { numerator: 0, denominator: 1 };
}

export function exactPolynomialLeadingCoefficient(polynomial: ExactPolynomial) {
  return getExactPolynomialCoefficient(polynomial, exactPolynomialDegree(polynomial));
}

export function exactPolynomialConstantTerm(polynomial: ExactPolynomial) {
  return getExactPolynomialCoefficient(polynomial, 0);
}

export function exactPolynomialCoefficientArray(polynomial: ExactPolynomial) {
  const normalized = normalizeExactPolynomial(polynomial);
  const degree = exactPolynomialDegree(normalized);
  return Array.from({ length: degree + 1 }, (_, index) =>
    getExactPolynomialCoefficient(normalized, degree - index));
}

