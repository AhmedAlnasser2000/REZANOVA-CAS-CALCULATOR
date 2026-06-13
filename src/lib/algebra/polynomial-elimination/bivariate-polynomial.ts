import {
  addExactPolynomials,
  buildExactPolynomialFromCoefficients,
  exactPolynomialDegree,
  exactPolynomialIsZero,
  multiplyExactPolynomials,
  normalizeExactPolynomial,
  normalizeExactScalar,
  scaleExactPolynomial,
  type ExactPolynomial,
  type ExactScalar,
} from '../polynomial-core';
import {
  bivariateStop,
  scalarWithinCaps,
  type BivariateParseResult,
  type BivariatePolynomial,
  type PolynomialResult,
  type RequiredBivariateResultantOptions,
} from './types';

export const ZERO: ExactScalar = { numerator: 0, denominator: 1 };
export const ONE: ExactScalar = { numerator: 1, denominator: 1 };
export const NEGATIVE_ONE: ExactScalar = { numerator: -1, denominator: 1 };

export function validatePolynomial(
  polynomial: ExactPolynomial,
  options: RequiredBivariateResultantOptions,
): PolynomialResult {
  const normalized = normalizeExactPolynomial(polynomial);
  if (exactPolynomialDegree(normalized) > options.maxRetainedDegree) {
    return bivariateStop('degree-limit');
  }
  if (normalized.terms.size > options.maxTerms) {
    return bivariateStop('term-limit');
  }
  for (const coefficient of normalized.terms.values()) {
    if (!scalarWithinCaps(coefficient, options)) {
      return bivariateStop('scalar-growth-limit');
    }
  }
  return { kind: 'success', polynomial: normalized };
}

export function zeroPolynomial(variable: string) {
  return buildExactPolynomialFromCoefficients(variable, [ZERO]);
}

export function onePolynomial(variable: string) {
  return buildExactPolynomialFromCoefficients(variable, [ONE]);
}

function scalarPolynomial(variable: string, scalar: ExactScalar) {
  return buildExactPolynomialFromCoefficients(variable, [normalizeExactScalar(scalar)]);
}

function degreePolynomial(variable: string, degree: number, coefficient: ExactScalar = ONE) {
  return buildExactPolynomialFromCoefficients(
    variable,
    [
      normalizeExactScalar(coefficient),
      ...Array.from({ length: degree }, () => ZERO),
    ],
  );
}

export function validateBivariatePolynomial(
  polynomial: BivariatePolynomial,
  options: RequiredBivariateResultantOptions,
): BivariateParseResult {
  let totalTerms = 0;
  const terms = new Map<number, ExactPolynomial>();
  for (const [degree, coefficient] of polynomial.terms.entries()) {
    if (degree > options.maxEliminatedDegree) {
      return bivariateStop('degree-limit');
    }
    const validated = validatePolynomial(coefficient, options);
    if (validated.kind === 'stop') {
      return validated;
    }
    if (!exactPolynomialIsZero(validated.polynomial)) {
      totalTerms += validated.polynomial.terms.size;
      terms.set(degree, validated.polynomial);
    }
  }
  if (totalTerms > options.maxTerms) {
    return bivariateStop('term-limit');
  }
  return {
    kind: 'success',
    polynomial: {
      retainedVariable: polynomial.retainedVariable,
      eliminatedVariable: polynomial.eliminatedVariable,
      terms,
    },
  };
}

export function constantBivariate(
  retainedVariable: string,
  eliminatedVariable: string,
  scalar: ExactScalar,
): BivariatePolynomial {
  return {
    retainedVariable,
    eliminatedVariable,
    terms: new Map([[0, scalarPolynomial(retainedVariable, scalar)]]),
  };
}

export function retainedBivariate(retainedVariable: string, eliminatedVariable: string): BivariatePolynomial {
  return {
    retainedVariable,
    eliminatedVariable,
    terms: new Map([[0, degreePolynomial(retainedVariable, 1)]]),
  };
}

export function eliminatedBivariate(retainedVariable: string, eliminatedVariable: string): BivariatePolynomial {
  return {
    retainedVariable,
    eliminatedVariable,
    terms: new Map([[1, onePolynomial(retainedVariable)]]),
  };
}

export function addBivariatePolynomials(
  left: BivariatePolynomial,
  right: BivariatePolynomial,
  sign: 1 | -1,
  options: RequiredBivariateResultantOptions,
): BivariateParseResult {
  const terms = new Map<number, ExactPolynomial>(left.terms);
  for (const [degree, rightCoefficient] of right.terms.entries()) {
    const current = terms.get(degree) ?? zeroPolynomial(left.retainedVariable);
    const next = addExactPolynomials(current, rightCoefficient, sign);
    if (exactPolynomialIsZero(next)) {
      terms.delete(degree);
    } else {
      terms.set(degree, next);
    }
  }
  return validateBivariatePolynomial({
    retainedVariable: left.retainedVariable,
    eliminatedVariable: left.eliminatedVariable,
    terms,
  }, options);
}

export function multiplyBivariatePolynomials(
  left: BivariatePolynomial,
  right: BivariatePolynomial,
  options: RequiredBivariateResultantOptions,
): BivariateParseResult {
  const terms = new Map<number, ExactPolynomial>();
  for (const [leftDegree, leftCoefficient] of left.terms.entries()) {
    for (const [rightDegree, rightCoefficient] of right.terms.entries()) {
      const degree = leftDegree + rightDegree;
      if (degree > options.maxEliminatedDegree) {
        return bivariateStop('degree-limit');
      }
      const product = multiplyExactPolynomials(leftCoefficient, rightCoefficient, options.maxRetainedDegree);
      if (!product) {
        return bivariateStop('degree-limit');
      }
      const current = terms.get(degree) ?? zeroPolynomial(left.retainedVariable);
      const next = addExactPolynomials(current, product);
      if (exactPolynomialIsZero(next)) {
        terms.delete(degree);
      } else {
        terms.set(degree, next);
      }
    }
  }
  return validateBivariatePolynomial({
    retainedVariable: left.retainedVariable,
    eliminatedVariable: left.eliminatedVariable,
    terms,
  }, options);
}

export function scaleBivariatePolynomial(
  polynomial: BivariatePolynomial,
  scalar: ExactScalar,
  options: RequiredBivariateResultantOptions,
): BivariateParseResult {
  const terms = new Map<number, ExactPolynomial>();
  for (const [degree, coefficient] of polynomial.terms.entries()) {
    const next = scaleExactPolynomial(coefficient, scalar);
    if (!exactPolynomialIsZero(next)) {
      terms.set(degree, next);
    }
  }
  return validateBivariatePolynomial({
    retainedVariable: polynomial.retainedVariable,
    eliminatedVariable: polynomial.eliminatedVariable,
    terms,
  }, options);
}

export function powerBivariatePolynomial(
  polynomial: BivariatePolynomial,
  exponent: number,
  options: RequiredBivariateResultantOptions,
): BivariateParseResult {
  if (exponent < 0 || exponent > Math.max(options.maxEliminatedDegree, options.maxRetainedDegree)) {
    return bivariateStop('degree-limit');
  }
  let current = constantBivariate(polynomial.retainedVariable, polynomial.eliminatedVariable, ONE);
  for (let index = 0; index < exponent; index += 1) {
    const next = multiplyBivariatePolynomials(current, polynomial, options);
    if (next.kind === 'stop') {
      return next;
    }
    current = next.polynomial;
  }
  return validateBivariatePolynomial(current, options);
}

export function bivariateDegree(polynomial: BivariatePolynomial) {
  const degrees = [...polynomial.terms.keys()];
  return degrees.length === 0 ? 0 : Math.max(...degrees);
}

function bivariateCoefficient(polynomial: BivariatePolynomial, degree: number) {
  return polynomial.terms.get(degree) ?? zeroPolynomial(polynomial.retainedVariable);
}

export function bivariateCoefficientArray(polynomial: BivariatePolynomial) {
  const degree = bivariateDegree(polynomial);
  return Array.from({ length: degree + 1 }, (_, index) =>
    bivariateCoefficient(polynomial, degree - index));
}
