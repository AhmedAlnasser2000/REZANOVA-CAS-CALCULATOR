import {
  addExactScalars,
  buildExactPolynomialFromCoefficients,
  buildExactScalarNode,
  exactPolynomialCoefficientArray,
  exactPolynomialDegree,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  primitiveExactPolynomial,
  type ExactPolynomial,
  type ExactScalar,
} from '../polynomial-core';
import { exactScalarIsInteger, exactScalarSign, nodeLatex, simplifyNode } from './math-json';
import type { BoundedPolynomialFactor, PrimitiveIntegerPolynomial } from './types';

type RationalRootExtractionOptions = {
  integerRootSearchBound?: number;
  divisorEnumerationLimit?: number;
};

export function positiveDivisors(value: number) {
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

export function allDivisors(value: number) {
  if (value === 0) {
    return [0];
  }
  const positives = positiveDivisors(value);
  const negatives = positives.map((candidate) => -candidate);
  return [...negatives, ...positives].sort((left, right) => left - right);
}

export function clearPolynomialDenominators(polynomial: ExactPolynomial): PrimitiveIntegerPolynomial | null {
  return primitiveExactPolynomial(polynomial);
}

function evaluatePolynomialAtScalar(polynomial: ExactPolynomial, value: ExactScalar) {
  const coefficients = exactPolynomialCoefficientArray(polynomial);
  let current = coefficients[0] ?? { numerator: 0, denominator: 1 };
  for (let index = 1; index < coefficients.length; index += 1) {
    current = addExactScalars(multiplyExactScalars(current, value), coefficients[index]);
  }
  return normalizeExactScalar(current);
}

function exactScalarKey(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return `${normalized.numerator}/${normalized.denominator}`;
}

function rationalRootCandidates(
  polynomial: ExactPolynomial,
  options: RationalRootExtractionOptions = {},
) {
  const leading = getExactPolynomialCoefficient(polynomial, exactPolynomialDegree(polynomial));
  const constant = getExactPolynomialCoefficient(polynomial, 0);
  if (!exactScalarIsInteger(leading) || !exactScalarIsInteger(constant)) {
    return [] as ExactScalar[];
  }

  const leadingValue = Math.abs(normalizeExactScalar(leading).numerator);
  const constantValue = Math.abs(normalizeExactScalar(constant).numerator);
  const candidates = new Map<string, ExactScalar>();

  const integerRootSearchBound = options.integerRootSearchBound ?? 0;
  for (let magnitude = 0; magnitude <= integerRootSearchBound; magnitude += 1) {
    const positive = { numerator: magnitude, denominator: 1 };
    candidates.set(exactScalarKey(positive), positive);
    if (magnitude > 0) {
      const negative = { numerator: -magnitude, denominator: 1 };
      candidates.set(exactScalarKey(negative), negative);
    }
  }

  if (constantValue === 0) {
    candidates.set('0/1', { numerator: 0, denominator: 1 });
  }

  if (
    options.divisorEnumerationLimit !== undefined
    && constantValue > options.divisorEnumerationLimit
  ) {
    return [...candidates.values()];
  }

  for (const numerator of positiveDivisors(constantValue)) {
    for (const denominator of positiveDivisors(leadingValue)) {
      const positive = normalizeExactScalar({ numerator, denominator });
      const negative = normalizeExactScalar({ numerator: -numerator, denominator });
      candidates.set(exactScalarKey(positive), positive);
      candidates.set(exactScalarKey(negative), negative);
    }
  }

  return [...candidates.values()];
}

function dividePolynomialByLinearRoot(polynomial: ExactPolynomial, root: ExactScalar): ExactPolynomial | null {
  const coefficients = exactPolynomialCoefficientArray(polynomial);
  if (coefficients.length < 2) {
    return null;
  }

  const quotient: ExactScalar[] = [coefficients[0]];
  for (let index = 1; index < coefficients.length - 1; index += 1) {
    quotient.push(addExactScalars(coefficients[index], multiplyExactScalars(root, quotient[index - 1])));
  }
  const remainder = addExactScalars(
    coefficients[coefficients.length - 1],
    multiplyExactScalars(root, quotient[quotient.length - 1]),
  );
  if (!exactScalarIsZero(remainder)) {
    return null;
  }

  return buildExactPolynomialFromCoefficients(polynomial.variable, quotient);
}

export function buildLinearFactorNode(variable: string, root: ExactScalar) {
  const rootNode = buildExactScalarNode(root);
  if (exactScalarIsZero(root)) {
    return variable;
  }
  if (exactScalarSign(root) > 0) {
    return ['Add', variable, ['Negate', rootNode]];
  }
  return ['Add', variable, buildExactScalarNode(negateExactScalar(root))];
}

export function extractRationalRootFactorization(
  polynomial: ExactPolynomial,
  options: RationalRootExtractionOptions = {},
) {
  const factors: BoundedPolynomialFactor[] = [];
  let current = polynomial;

  while (exactPolynomialDegree(current) >= 3) {
    const root = rationalRootCandidates(current, options)
      .find((candidate) => exactScalarIsZero(evaluatePolynomialAtScalar(current, candidate)));
    if (!root) {
      break;
    }

    let multiplicity = 0;
    while (true) {
      const divided = dividePolynomialByLinearRoot(current, root);
      if (!divided) {
        break;
      }
      current = divided;
      multiplicity += 1;
    }

    const factorNode = simplifyNode(buildLinearFactorNode(current.variable, root));
    factors.push({
      node: factorNode,
      latex: nodeLatex(factorNode),
      multiplicity,
      degree: 1,
    });
  }

  return {
    factors,
    remainder: current,
  };
}
