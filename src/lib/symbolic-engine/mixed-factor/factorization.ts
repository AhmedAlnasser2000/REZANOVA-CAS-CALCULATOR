import {
  addExactScalars,
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  parseExactPolynomial,
  type ExactPolynomial,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { normalizeAst } from '../normalize';
import { compactRepeatedProductFactors, isNodeArray } from '../patterns';

function exactScalarIsZero(value: ExactScalar) {
  return normalizeExactScalar(value).numerator === 0;
}

function exactScalarIsOne(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.numerator === 1 && normalized.denominator === 1;
}

function greatestCommonDivisor(left: number, right: number) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function leastCommonMultiple(left: number, right: number) {
  return Math.abs(left * right) / greatestCommonDivisor(left, right);
}

function positiveDivisors(value: number) {
  const absolute = Math.abs(value);
  if (absolute === 0) {
    return [0];
  }

  const divisors = new Set<number>();
  for (let candidate = 1; candidate <= absolute; candidate += 1) {
    if (absolute % candidate === 0) {
      divisors.add(candidate);
    }
  }
  return [...divisors];
}

function buildCoefficientArray(polynomial: ExactPolynomial) {
  const degree = exactPolynomialDegree(polynomial);
  return Array.from({ length: degree + 1 }, (_, index) =>
    getExactPolynomialCoefficient(polynomial, degree - index));
}

function evaluatePolynomialAtScalar(polynomial: ExactPolynomial, value: ExactScalar) {
  const coefficients = buildCoefficientArray(polynomial);
  let current = coefficients[0] ?? { numerator: 0, denominator: 1 };
  for (let index = 1; index < coefficients.length; index += 1) {
    current = addExactScalars(multiplyExactScalars(current, value), coefficients[index]);
  }
  return normalizeExactScalar(current);
}

function rationalRootCandidates(polynomial: ExactPolynomial) {
  const coefficients = buildCoefficientArray(polynomial).map((coefficient) => normalizeExactScalar(coefficient));
  const denominatorLcm = coefficients.reduce((current, coefficient) =>
    leastCommonMultiple(current, coefficient.denominator), 1);
  const integerCoefficients = coefficients.map((coefficient) =>
    coefficient.numerator * (denominatorLcm / coefficient.denominator));
  if (!integerCoefficients.every(Number.isInteger)) {
    return [] as ExactScalar[];
  }

  const leading = integerCoefficients[0] ?? 0;
  const constant = integerCoefficients[integerCoefficients.length - 1] ?? 0;
  if (leading === 0) {
    return [] as ExactScalar[];
  }

  const numerators = positiveDivisors(constant);
  const denominators = positiveDivisors(leading).filter((value) => value !== 0);
  const deduped = new Map<string, ExactScalar>();

  for (const numerator of numerators) {
    for (const denominator of denominators) {
      const signs = numerator === 0 ? [0] : [numerator, -numerator];
      for (const signedNumerator of signs) {
        const normalized = normalizeExactScalar({ numerator: signedNumerator, denominator });
        const key = `${normalized.numerator}/${normalized.denominator}`;
        if (!deduped.has(key)) {
          deduped.set(key, normalized);
        }
      }
    }
  }

  return [...deduped.values()];
}

function dividePolynomialByLinearFactor(polynomial: ExactPolynomial, root: ExactScalar) {
  const coefficients = buildCoefficientArray(polynomial);
  if (coefficients.length <= 1) {
    return null;
  }

  const quotientCoefficients: ExactScalar[] = [];
  let current = coefficients[0] ?? { numerator: 0, denominator: 1 };
  quotientCoefficients.push(current);

  for (let index = 1; index < coefficients.length - 1; index += 1) {
    current = addExactScalars(multiplyExactScalars(current, root), coefficients[index]);
    quotientCoefficients.push(current);
  }

  const remainder = addExactScalars(
    multiplyExactScalars(current, root),
    coefficients[coefficients.length - 1] ?? { numerator: 0, denominator: 1 },
  );

  const degree = exactPolynomialDegree(polynomial);
  const terms = new Map<number, ExactScalar>();
  quotientCoefficients.forEach((coefficient, index) => {
    const normalized = normalizeExactScalar(coefficient);
    const quotientDegree = degree - 1 - index;
    if (normalized.numerator !== 0) {
      terms.set(quotientDegree, normalized);
    }
  });

  return {
    quotient: {
      variable: polynomial.variable,
      terms,
    } satisfies ExactPolynomial,
    remainder: normalizeExactScalar(remainder),
  };
}

function buildLinearFactorNode(variable: string, root: ExactScalar) {
  return normalizeAst(['Add', variable, buildExactScalarNode(negateExactScalar(root))]);
}

export function factorLowDegreeCarrierPolynomial(polynomial: ExactPolynomial): unknown | null {
  if (exactPolynomialDegree(polynomial) !== 2) {
    return null;
  }

  for (const root of rationalRootCandidates(polynomial)) {
    if (!exactScalarIsZero(evaluatePolynomialAtScalar(polynomial, root))) {
      continue;
    }

    const division = dividePolynomialByLinearFactor(polynomial, root);
    if (!division || !exactScalarIsZero(division.remainder)) {
      continue;
    }

    const quotientDegree = exactPolynomialDegree(division.quotient);
    if (quotientDegree !== 1) {
      continue;
    }

    const leading = getExactPolynomialCoefficient(division.quotient, 1);
    const constant = getExactPolynomialCoefficient(division.quotient, 0);
    const secondRoot = divideExactScalars(negateExactScalar(constant), leading);
    if (!secondRoot) {
      continue;
    }

    const parts: unknown[] = [];
    if (!exactScalarIsOne(leading)) {
      parts.push(buildExactScalarNode(leading));
    }
    parts.push(buildLinearFactorNode(polynomial.variable, root));
    parts.push(buildLinearFactorNode(polynomial.variable, secondRoot));

    return compactRepeatedProductFactors(
      normalizeAst(parts.length === 1 ? parts[0] : ['Multiply', ...parts]),
    );
  }

  return null;
}

export function refineCarrierFactorizationNode(node: unknown, variable = 'u'): unknown {
  const normalized = normalizeAst(node);
  const polynomial = parseExactPolynomial(normalized, variable, 2);
  if (polynomial && exactPolynomialDegree(polynomial) === 2) {
    return factorLowDegreeCarrierPolynomial(polynomial) ?? normalized;
  }

  if (isNodeArray(normalized) && normalized[0] === 'Multiply') {
    return compactRepeatedProductFactors(
      normalizeAst(['Multiply', ...normalized.slice(1).map((factor) => refineCarrierFactorizationNode(factor, variable))]),
    );
  }

  return normalized;
}
