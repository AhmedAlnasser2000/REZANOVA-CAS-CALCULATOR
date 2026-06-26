import { backcheckAntiderivative } from '../../calculus/engine/verification';
import {
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialToLatex,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  parseExactPolynomial,
  readExactScalarNode,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { flattenMultiply, isNodeArray, wrapGroupedLatex } from '../patterns';
import { scaleByExactScalar } from './rational';

const MAX_BINOMIAL_DEGREE = 12;
const MAX_BINOMIAL_POWER_ABS_EXPONENT = 12;

type BinomialPowerFactor = {
  base: unknown;
  exponent: number;
  coefficient: ExactScalar;
  degree: number;
};

function exactInteger(node: unknown) {
  const scalar = readExactScalarNode(node);
  if (!scalar || scalar.denominator !== 1) {
    return undefined;
  }

  return scalar.numerator;
}

function reciprocalFactor(node: unknown): unknown {
  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3) {
    const exponent = exactInteger(node[2]);
    if (exponent !== undefined) {
      return ['Power', node[1], -exponent];
    }
  }

  return ['Power', node, -1];
}

function binomialFactors(node: unknown): unknown[] {
  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3) {
    return [
      ...binomialFactors(node[1]),
      ...binomialFactors(node[2]).map(reciprocalFactor),
    ];
  }

  if (isNodeArray(node) && node[0] === 'Multiply') {
    return flattenMultiply(node).flatMap(binomialFactors);
  }

  return [node];
}

function factorNode(factors: unknown[]) {
  const meaningful = factors.filter((factor) => {
    const scalar = readExactScalarNode(factor);
    return !scalar || !exactScalarIsZero(scalar);
  });
  if (meaningful.length === 0) {
    return 1;
  }

  return meaningful.length === 1 ? meaningful[0] : ['Multiply', ...meaningful];
}

function parseBinomialBase(node: unknown, variable: string) {
  const polynomial = parseExactPolynomial(node, variable, MAX_BINOMIAL_DEGREE);
  if (!polynomial) {
    return undefined;
  }

  const degree = exactPolynomialDegree(polynomial);
  if (degree < 2 || degree > MAX_BINOMIAL_DEGREE) {
    return undefined;
  }

  for (const [termDegree, coefficient] of polynomial.terms.entries()) {
    if (termDegree !== 0 && termDegree !== degree && !exactScalarIsZero(coefficient)) {
      return undefined;
    }
  }

  const constant = getExactPolynomialCoefficient(polynomial, 0);
  const leading = getExactPolynomialCoefficient(polynomial, degree);
  if (exactScalarIsZero(constant) || exactScalarIsZero(leading)) {
    return undefined;
  }

  return {
    coefficient: leading,
    degree,
    latex: exactPolynomialToLatex(polynomial),
  };
}

function parseBinomialPowerFactor(factor: unknown, variable: string): BinomialPowerFactor | undefined {
  if (isNodeArray(factor) && factor[0] === 'Power' && factor.length === 3) {
    const exponent = exactInteger(factor[2]);
    if (
      exponent === undefined
      || Math.abs(exponent) > MAX_BINOMIAL_POWER_ABS_EXPONENT
    ) {
      return undefined;
    }

    const base = parseBinomialBase(factor[1], variable);
    return base
      ? {
        base: factor[1],
        exponent,
        coefficient: base.coefficient,
        degree: base.degree,
      }
      : undefined;
  }

  const base = parseBinomialBase(factor, variable);
  return base
    ? {
      base: factor,
      exponent: 1,
      coefficient: base.coefficient,
      degree: base.degree,
    }
    : undefined;
}

function derivativeMonomialCoefficient(
  factors: unknown[],
  selectedIndex: number,
  degree: number,
  variable: string,
) {
  const remaining = factors.filter((_, index) => index !== selectedIndex);
  const polynomial = parseExactPolynomial(factorNode(remaining), variable, degree - 1);
  if (!polynomial || exactPolynomialDegree(polynomial) !== degree - 1) {
    return undefined;
  }

  for (const [termDegree, coefficient] of polynomial.terms.entries()) {
    if (termDegree !== degree - 1 && !exactScalarIsZero(coefficient)) {
      return undefined;
    }
  }

  const coefficient = getExactPolynomialCoefficient(polynomial, degree - 1);
  return exactScalarIsZero(coefficient) ? undefined : coefficient;
}

function binomialAntiderivativeLatex(
  factor: BinomialPowerFactor,
  derivativeCoefficient: ExactScalar,
  variable: string,
) {
  const degreeScalar = { numerator: factor.degree, denominator: 1 };
  const derivativeScale = multiplyExactScalars(factor.coefficient, degreeScalar);
  const outerScale = divideExactScalars(derivativeCoefficient, derivativeScale);
  if (!outerScale) {
    return undefined;
  }

  const basePolynomial = parseExactPolynomial(factor.base, variable, MAX_BINOMIAL_DEGREE);
  if (!basePolynomial) {
    return undefined;
  }

  const baseLatex = exactPolynomialToLatex(basePolynomial);
  if (factor.exponent === -1) {
    return scaleByExactScalar(
      `\\ln\\left|${wrapGroupedLatex(baseLatex)}\\right|`,
      outerScale,
    );
  }

  const nextExponent = factor.exponent + 1;
  if (nextExponent === 0) {
    return undefined;
  }

  const coefficient = divideExactScalars(outerScale, {
    numerator: nextExponent,
    denominator: 1,
  });
  if (!coefficient) {
    return undefined;
  }

  const wrappedBase = wrapGroupedLatex(baseLatex);
  const powered = nextExponent < 0
    ? `\\frac{1}{${Math.abs(nextExponent) === 1 ? wrappedBase : `${wrappedBase}^{${Math.abs(nextExponent)}}`}}`
    : nextExponent === 1
      ? wrappedBase
      : `${wrappedBase}^{${nextExponent}}`;

  return scaleByExactScalar(powered, coefficient);
}

export function tryBinomialDerivativeSubstitutionRule(node: unknown, variable: string) {
  const factors = binomialFactors(node);
  for (let index = 0; index < factors.length; index += 1) {
    const factor = parseBinomialPowerFactor(factors[index], variable);
    if (!factor) {
      continue;
    }

    const derivativeCoefficient = derivativeMonomialCoefficient(
      factors,
      index,
      factor.degree,
      variable,
    );
    if (!derivativeCoefficient) {
      continue;
    }

    const candidate = binomialAntiderivativeLatex(factor, derivativeCoefficient, variable);
    if (!candidate) {
      continue;
    }

    const verification = backcheckAntiderivative({
      antiderivativeLatex: candidate,
      integrand: node,
      variable,
    });
    if (verification.status === 'verified-exact') {
      return candidate;
    }
  }

  return undefined;
}
