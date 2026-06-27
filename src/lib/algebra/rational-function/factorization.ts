import {
  buildExactPolynomialFromCoefficients,
  divideExactPolynomials,
  exactPolynomialCoefficientArray,
  exactPolynomialDegree,
  exactPolynomialGcd,
  exactPolynomialIsZero,
  exactPolynomialToLatex,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  makeMonicExactPolynomial,
  multiplyExactPolynomials,
  negateExactScalar,
  normalizeExactScalar,
  parseExactPolynomial,
  primitiveExactPolynomial,
  quadraticDiscriminant,
  type ExactPolynomial,
  type ExactScalar,
} from '../polynomial-core';
import { factorBoundedPolynomial } from '../polynomial-factor/factorization';
import { onePolynomial } from './arithmetic';
import type {
  IrreducibleQuadraticFactor,
  RationalDenominatorFactor,
  RationalFactorizationResult,
  RationalFunctionStopReason,
} from './types';

function isExactInteger(value: number) {
  return Number.isFinite(value) && Number.isInteger(value);
}

function positiveDivisors(value: number) {
  const absolute = Math.abs(value);
  if (absolute === 0) {
    return [0];
  }

  const divisors = new Set<number>();
  for (let candidate = 1; candidate * candidate <= absolute; candidate += 1) {
    if (absolute % candidate === 0) {
      divisors.add(candidate);
      divisors.add(absolute / candidate);
    }
  }
  return [...divisors].sort((left, right) => left - right);
}

export function exactScalarKey(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return `${normalized.numerator}/${normalized.denominator}`;
}

function exactScalarSign(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return Math.sign(normalized.numerator);
}

function exactScalarSquareRoot(value: ExactScalar): ExactScalar | null {
  const normalized = normalizeExactScalar(value);
  if (normalized.numerator < 0 || normalized.denominator <= 0) {
    return null;
  }

  const numeratorRoot = Math.sqrt(normalized.numerator);
  const denominatorRoot = Math.sqrt(normalized.denominator);
  if (!Number.isInteger(numeratorRoot) || !Number.isInteger(denominatorRoot)) {
    return null;
  }

  return normalizeExactScalar({
    numerator: numeratorRoot,
    denominator: denominatorRoot,
  });
}

function rationalRootCandidates(polynomial: ExactPolynomial) {
  const primitive = primitiveExactPolynomial(polynomial);
  if (!primitive) {
    return [] as ExactScalar[];
  }

  const coefficients = exactPolynomialCoefficientArray(primitive.polynomial);
  if (!coefficients.every((coefficient) =>
    coefficient.denominator === 1 && isExactInteger(coefficient.numerator))) {
    return [];
  }

  const leading = Math.abs(coefficients[0]?.numerator ?? 0);
  const constant = Math.abs(coefficients[coefficients.length - 1]?.numerator ?? 0);
  if (leading === 0) {
    return [];
  }

  const candidates = new Map<string, ExactScalar>();
  if (constant === 0) {
    candidates.set('0/1', { numerator: 0, denominator: 1 });
  }

  for (const numerator of positiveDivisors(constant)) {
    for (const denominator of positiveDivisors(leading)) {
      const positive = normalizeExactScalar({ numerator, denominator });
      const negative = normalizeExactScalar({ numerator: -numerator, denominator });
      candidates.set(exactScalarKey(positive), positive);
      candidates.set(exactScalarKey(negative), negative);
    }
  }

  return [...candidates.values()];
}

export function evaluatePolynomialAtScalar(polynomial: ExactPolynomial, value: ExactScalar) {
  const coefficients = exactPolynomialCoefficientArray(polynomial);
  let current = coefficients[0] ?? { numerator: 0, denominator: 1 };
  for (let index = 1; index < coefficients.length; index += 1) {
    current = normalizeExactScalar({
      numerator: current.numerator * value.numerator * coefficients[index].denominator
        + coefficients[index].numerator * current.denominator * value.denominator,
      denominator: current.denominator * value.denominator * coefficients[index].denominator,
    });
  }
  return current;
}

export function linearFactorForRoot(variable: string, root: ExactScalar) {
  return buildExactPolynomialFromCoefficients(variable, [
    { numerator: 1, denominator: 1 },
    negateExactScalar(root),
  ]);
}

export function polynomialPower(
  polynomial: ExactPolynomial,
  exponent: number,
): ExactPolynomial | null {
  let current = onePolynomial(polynomial.variable);
  for (let index = 0; index < exponent; index += 1) {
    const next = multiplyExactPolynomials(
      current,
      polynomial,
      exactPolynomialDegree(current) + exactPolynomialDegree(polynomial),
    );
    if (!next) {
      return null;
    }
    current = next;
  }
  return current;
}

function rationalFactorizationStop(reason: RationalFunctionStopReason): RationalFactorizationResult {
  return { kind: 'stop', reason };
}

function buildQuadraticFactor(polynomial: ExactPolynomial, multiplicity = 1): IrreducibleQuadraticFactor | null {
  const monic = makeMonicExactPolynomial(polynomial);
  if (!monic || exactPolynomialDegree(monic) !== 2) {
    return null;
  }

  const discriminant = quadraticDiscriminant(monic);
  if (!discriminant || exactScalarSign(discriminant) >= 0) {
    return null;
  }

  return {
    kind: 'irreducible-quadratic',
    multiplicity,
    polynomial: monic,
    latex: exactPolynomialToLatex(monic),
    linearCoefficient: getExactPolynomialCoefficient(monic, 1),
    constantCoefficient: getExactPolynomialCoefficient(monic, 0),
    discriminant,
  };
}

function polynomialDerivative(polynomial: ExactPolynomial): ExactPolynomial {
  const terms = new Map<number, ExactScalar>();
  for (const [degree, coefficient] of polynomial.terms.entries()) {
    if (degree <= 0) {
      continue;
    }
    terms.set(degree - 1, {
      numerator: coefficient.numerator * degree,
      denominator: coefficient.denominator,
    });
  }
  return { variable: polynomial.variable, terms };
}

function mergeQuadraticFactor(
  factors: IrreducibleQuadraticFactor[],
  factor: IrreducibleQuadraticFactor,
) {
  const existing = factors.find((candidate) =>
    exactPolynomialToLatex(candidate.polynomial) === exactPolynomialToLatex(factor.polynomial));
  if (!existing) {
    factors.push(factor);
    return true;
  }

  existing.multiplicity += factor.multiplicity;
  return existing.multiplicity <= 2;
}

function factorQuarticIntoQuadraticFactors(polynomial: ExactPolynomial) {
  const factorization = factorBoundedPolynomial(polynomial, { maxDegree: 4 });
  if (!factorization) {
    return null;
  }

  const factors: IrreducibleQuadraticFactor[] = [];
  for (const factor of factorization.factors) {
    if (factor.degree !== 2 || factor.multiplicity < 1 || factor.multiplicity > 2) {
      return null;
    }

    const polynomialFactor = parseExactPolynomial(factor.node, polynomial.variable, 2);
    const quadratic = polynomialFactor
      ? buildQuadraticFactor(polynomialFactor, factor.multiplicity)
      : null;
    if (!quadratic || !mergeQuadraticFactor(factors, quadratic)) {
      return null;
    }
  }

  return factors.length > 0 ? factors : null;
}

function factorResidualIntoQuadratics(polynomial: ExactPolynomial): IrreducibleQuadraticFactor[] | null {
  const degree = exactPolynomialDegree(polynomial);
  if (degree === 0) {
    return [];
  }

  if (degree === 2) {
    const quadratic = buildQuadraticFactor(polynomial);
    return quadratic ? [quadratic] : null;
  }

  if (degree === 4) {
    return factorQuarticIntoQuadraticFactors(polynomial);
  }

  return null;
}

function extractSupportedQuadraticFactors(polynomial: ExactPolynomial): IrreducibleQuadraticFactor[] | null {
  const degree = exactPolynomialDegree(polynomial);
  if (degree === 2 || degree === 4) {
    return factorResidualIntoQuadratics(polynomial);
  }

  if (degree !== 6 && degree !== 8) {
    return null;
  }

  const derivative = polynomialDerivative(polynomial);
  const repeatedPart = exactPolynomialGcd(polynomial, derivative);
  if (!repeatedPart || exactPolynomialDegree(repeatedPart) === 0) {
    return null;
  }

  const repeatedFactors = factorResidualIntoQuadratics(repeatedPart);
  if (!repeatedFactors || repeatedFactors.length === 0) {
    return null;
  }

  const factors: IrreducibleQuadraticFactor[] = [];
  let remainder = polynomial;
  for (const factor of repeatedFactors) {
    let multiplicity = 0;
    while (true) {
      const divided = divideExactPolynomials(remainder, factor.polynomial);
      if (!divided || !exactPolynomialIsZero(divided.remainder)) {
        break;
      }
      multiplicity += 1;
      remainder = divided.quotient;
    }

    if (multiplicity < 1 || multiplicity > 2) {
      return null;
    }

    if (!mergeQuadraticFactor(factors, { ...factor, multiplicity })) {
      return null;
    }
  }

  const residualFactors = factorResidualIntoQuadratics(remainder);
  if (!residualFactors) {
    return null;
  }
  for (const factor of residualFactors) {
    if (!mergeQuadraticFactor(factors, factor)) {
      return null;
    }
  }

  return factors.length > 0 && factors.length <= 2
    ? factors
    : null;
}

export function factorSupportedRationalDenominator(
  denominator: ExactPolynomial,
  options: { maxDegree?: number } = {},
): RationalFactorizationResult {
  const maxDegree = options.maxDegree ?? 8;
  if (exactPolynomialDegree(denominator) > maxDegree) {
    return rationalFactorizationStop('factorization-degree-limit');
  }

  let current = makeMonicExactPolynomial(denominator);
  if (!current) {
    return rationalFactorizationStop('zero-denominator');
  }
  const monicDenominator = current;

  const factors: RationalDenominatorFactor[] = [];
  while (exactPolynomialDegree(current) > 0) {
    const root = rationalRootCandidates(current)
      .find((candidate) => exactScalarIsZero(evaluatePolynomialAtScalar(current!, candidate)));

    if (root) {
      const factor = linearFactorForRoot(current.variable, root);
      let multiplicity = 0;

      while (true) {
        const divided = divideExactPolynomials(current, factor);
        if (!divided || !exactPolynomialIsZero(divided.remainder)) {
          break;
        }
        multiplicity += 1;
        current = divided.quotient;
      }

      factors.push({
        kind: 'linear',
        root,
        multiplicity,
        polynomial: factor,
        latex: exactPolynomialToLatex(factor),
      });
      continue;
    }

    const quadraticFactors = extractSupportedQuadraticFactors(current);
    if (quadraticFactors) {
      const currentQuadraticFactors = quadraticFactors.length;
      const totalQuadraticFactors = factors.filter((factor) => factor.kind === 'irreducible-quadratic').length
        + currentQuadraticFactors;
      if (totalQuadraticFactors > 2 || quadraticFactors.some((factor) => factor.multiplicity > 2)) {
        return rationalFactorizationStop('unsupported-factor-multiplicity');
      }
      factors.push(...quadraticFactors);
      current = onePolynomial(current.variable);
      continue;
    }

    if (exactPolynomialDegree(current) === 2) {
      const discriminant = quadraticDiscriminant(current);
      if (!discriminant) {
        return rationalFactorizationStop('unsupported-factorization');
      }

      const squareRoot = exactScalarSquareRoot(discriminant);
      if (exactScalarSign(discriminant) > 0 && !squareRoot) {
        return rationalFactorizationStop('algebraic-root-required');
      }
    }

    return rationalFactorizationStop('unsupported-factorization');
  }

  return {
    kind: 'success',
    variable: denominator.variable,
    denominator: monicDenominator,
    factors,
    squareFree: factors.every((factor) => factor.multiplicity === 1),
  };
}

export function factorDistinctLinearDenominator(
  denominator: ExactPolynomial,
): { kind: 'success'; roots: ExactScalar[] } | { kind: 'stop'; reason: RationalFunctionStopReason } {
  let current = makeMonicExactPolynomial(denominator);
  if (!current) {
    return { kind: 'stop', reason: 'zero-denominator' };
  }

  const roots: ExactScalar[] = [];
  while (exactPolynomialDegree(current) > 0) {
    const root = rationalRootCandidates(current)
      .find((candidate) => exactScalarIsZero(evaluatePolynomialAtScalar(current!, candidate)));
    if (!root) {
      return { kind: 'stop', reason: 'denominator-not-distinct-linear' };
    }

    const factor = linearFactorForRoot(current.variable, root);
    const firstDivision = divideExactPolynomials(current, factor);
    if (!firstDivision || !exactPolynomialIsZero(firstDivision.remainder)) {
      return { kind: 'stop', reason: 'denominator-not-distinct-linear' };
    }

    const secondDivision = divideExactPolynomials(firstDivision.quotient, factor);
    if (secondDivision && exactPolynomialIsZero(secondDivision.remainder)) {
      return { kind: 'stop', reason: 'repeated-linear-factor' };
    }

    roots.push(root);
    current = firstDivision.quotient;
  }

  return { kind: 'success', roots };
}
