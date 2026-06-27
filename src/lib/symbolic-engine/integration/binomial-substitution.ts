import { backcheckAntiderivative } from '../../calculus/engine/verification';
import {
  addExactScalars,
  buildExactScalarNode,
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
import { boxLatex, flattenMultiply, isNodeArray, wrapGroupedLatex } from '../patterns';
import { scaleByExactScalar } from './rational';

const MAX_BINOMIAL_DEGREE = 12;
const MAX_BINOMIAL_POWER_ABS_EXPONENT = 12;

type BinomialPowerFactor = {
  base: unknown;
  exponent: number;
  coefficient: ExactScalar;
  degree: number;
  kind: 'polynomial' | 'reciprocal';
};

type ExactLaurentPolynomial = {
  terms: Map<number, ExactScalar>;
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

function normalizeLaurentPolynomial(polynomial: ExactLaurentPolynomial): ExactLaurentPolynomial {
  const terms = new Map<number, ExactScalar>();
  for (const [degree, coefficient] of polynomial.terms.entries()) {
    if (!exactScalarIsZero(coefficient)) {
      terms.set(degree, coefficient);
    }
  }
  return { terms };
}

function laurentFromScalar(value: ExactScalar): ExactLaurentPolynomial {
  return normalizeLaurentPolynomial({ terms: new Map([[0, value]]) });
}

function laurentFromDegree(degree: number, coefficient: ExactScalar): ExactLaurentPolynomial {
  return normalizeLaurentPolynomial({ terms: new Map([[degree, coefficient]]) });
}

function addExactLaurentPolynomials(
  left: ExactLaurentPolynomial,
  right: ExactLaurentPolynomial,
  sign: 1 | -1 = 1,
) {
  const terms = new Map(left.terms);
  for (const [degree, coefficient] of right.terms.entries()) {
    const signed = sign === 1
      ? coefficient
      : multiplyExactScalars(coefficient, { numerator: -1, denominator: 1 });
    const current = terms.get(degree);
    const next = current ? addExactScalars(current, signed) : signed;
    if (exactScalarIsZero(next)) {
      terms.delete(degree);
    } else {
      terms.set(degree, next);
    }
  }
  return normalizeLaurentPolynomial({ terms });
}

function multiplyExactLaurentPolynomials(
  left: ExactLaurentPolynomial,
  right: ExactLaurentPolynomial,
  maxAbsDegree: number,
) {
  const terms = new Map<number, ExactScalar>();
  for (const [leftDegree, leftCoefficient] of left.terms.entries()) {
    for (const [rightDegree, rightCoefficient] of right.terms.entries()) {
      const degree = leftDegree + rightDegree;
      if (Math.abs(degree) > maxAbsDegree) {
        return null;
      }
      const coefficient = multiplyExactScalars(leftCoefficient, rightCoefficient);
      const current = terms.get(degree);
      const next = current ? addExactScalars(current, coefficient) : coefficient;
      if (exactScalarIsZero(next)) {
        terms.delete(degree);
      } else {
        terms.set(degree, next);
      }
    }
  }
  return normalizeLaurentPolynomial({ terms });
}

function parseExactLaurentPolynomial(
  node: unknown,
  variable: string,
  maxAbsDegree: number,
): ExactLaurentPolynomial | null {
  const scalar = readExactScalarNode(node);
  if (scalar) {
    return laurentFromScalar(scalar);
  }

  if (node === variable) {
    return laurentFromDegree(1, { numerator: 1, denominator: 1 });
  }

  if (!isNodeArray(node) || node.length === 0 || typeof node[0] !== 'string') {
    return null;
  }

  const operator = node[0];
  if (operator === 'Negate' && node.length === 2) {
    const child = parseExactLaurentPolynomial(node[1], variable, maxAbsDegree);
    return child
      ? multiplyExactLaurentPolynomials(
        child,
        laurentFromScalar({ numerator: -1, denominator: 1 }),
        maxAbsDegree,
      )
      : null;
  }

  if (operator === 'Add' || operator === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    if (first === undefined) {
      return null;
    }

    const initial = parseExactLaurentPolynomial(first, variable, maxAbsDegree);
    if (!initial) {
      return null;
    }

    return rest.reduce<ExactLaurentPolynomial | null>((current, child) => {
      if (!current) {
        return null;
      }
      const parsedChild = parseExactLaurentPolynomial(child, variable, maxAbsDegree);
      return parsedChild
        ? addExactLaurentPolynomials(current, parsedChild, operator === 'Add' ? 1 : -1)
        : null;
    }, initial);
  }

  if (operator === 'Multiply') {
    return node.slice(1).reduce<ExactLaurentPolynomial | null>((current, factor) => {
      if (!current) {
        return null;
      }
      const parsedFactor = parseExactLaurentPolynomial(factor, variable, maxAbsDegree);
      return parsedFactor
        ? multiplyExactLaurentPolynomials(current, parsedFactor, maxAbsDegree)
        : null;
    }, laurentFromScalar({ numerator: 1, denominator: 1 }));
  }

  if (operator === 'Divide' && node.length === 3) {
    const numerator = parseExactLaurentPolynomial(node[1], variable, maxAbsDegree);
    const denominator = readExactScalarNode(node[2]);
    if (!numerator) {
      return null;
    }
    if (denominator) {
      if (exactScalarIsZero(denominator)) {
        return null;
      }
      const reciprocal = divideExactScalars({ numerator: 1, denominator: 1 }, denominator);
      return reciprocal
        ? multiplyExactLaurentPolynomials(numerator, laurentFromScalar(reciprocal), maxAbsDegree)
        : null;
    }

    const denominatorPolynomial = parseExactLaurentPolynomial(node[2], variable, maxAbsDegree);
    const denominatorTerms = denominatorPolynomial
      ? [...normalizeLaurentPolynomial(denominatorPolynomial).terms.entries()]
      : [];
    if (denominatorTerms.length !== 1) {
      return null;
    }
    const [denominatorDegree, denominatorCoefficient] = denominatorTerms[0];
    if (exactScalarIsZero(denominatorCoefficient)) {
      return null;
    }
    const reciprocal = divideExactScalars({ numerator: 1, denominator: 1 }, denominatorCoefficient);
    return reciprocal
      ? multiplyExactLaurentPolynomials(
        numerator,
        laurentFromDegree(-denominatorDegree, reciprocal),
        maxAbsDegree,
      )
      : null;
  }

  if (operator === 'Power' && node.length === 3 && node[1] === variable) {
    const exponent = exactInteger(node[2]);
    if (exponent === undefined || Math.abs(exponent) > maxAbsDegree) {
      return null;
    }
    return laurentFromDegree(exponent, { numerator: 1, denominator: 1 });
  }

  return null;
}

function laurentTermNode(variable: string, degree: number, coefficient: ExactScalar) {
  if (degree === 0) {
    return buildExactScalarNode(coefficient);
  }

  const variableNode = degree === 1
    ? variable
    : ['Power', variable, degree];
  if (coefficient.numerator === 1 && coefficient.denominator === 1) {
    return variableNode;
  }
  if (coefficient.numerator === -1 && coefficient.denominator === 1) {
    return ['Negate', variableNode];
  }
  return ['Multiply', buildExactScalarNode(coefficient), variableNode];
}

function laurentPolynomialToLatex(polynomial: ExactLaurentPolynomial, variable: string) {
  const entries = [...normalizeLaurentPolynomial(polynomial).terms.entries()]
    .sort((left, right) => right[0] - left[0]);
  const node = entries.length === 0
    ? 0
    : entries.length === 1
      ? laurentTermNode(variable, entries[0][0], entries[0][1])
      : ['Add', ...entries.map(([degree, coefficient]) =>
        laurentTermNode(variable, degree, coefficient))];
  return boxLatex(node);
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

function parseReciprocalBinomialBase(node: unknown, variable: string) {
  const polynomial = parseExactLaurentPolynomial(node, variable, MAX_BINOMIAL_DEGREE);
  if (!polynomial) {
    return undefined;
  }

  const terms = [...normalizeLaurentPolynomial(polynomial).terms.entries()];
  if (terms.length !== 2) {
    return undefined;
  }

  const constant = polynomial.terms.get(0);
  const reciprocalTerms = terms.filter(([degree]) => degree < 0);
  if (!constant || exactScalarIsZero(constant) || reciprocalTerms.length !== 1) {
    return undefined;
  }

  const [negativeDegree, coefficient] = reciprocalTerms[0];
  const degree = -negativeDegree;
  if (degree < 1 || degree > MAX_BINOMIAL_DEGREE || exactScalarIsZero(coefficient)) {
    return undefined;
  }

  return {
    coefficient,
    degree,
    latex: laurentPolynomialToLatex(polynomial, variable),
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
    if (base) {
      return {
        base: factor[1],
        exponent,
        coefficient: base.coefficient,
        degree: base.degree,
        kind: 'polynomial',
      };
    }

    const reciprocalBase = parseReciprocalBinomialBase(factor[1], variable);
    return reciprocalBase
      ? {
        base: factor[1],
        exponent,
        coefficient: reciprocalBase.coefficient,
        degree: reciprocalBase.degree,
        kind: 'reciprocal',
      }
      : undefined;
  }

  const base = parseBinomialBase(factor, variable);
  if (base) {
    return {
      base: factor,
      exponent: 1,
      coefficient: base.coefficient,
      degree: base.degree,
      kind: 'polynomial',
    };
  }

  const reciprocalBase = parseReciprocalBinomialBase(factor, variable);
  return reciprocalBase
    ? {
      base: factor,
      exponent: 1,
      coefficient: reciprocalBase.coefficient,
      degree: reciprocalBase.degree,
      kind: 'reciprocal',
    }
    : undefined;
}

function derivativeMonomialCoefficient(
  factors: unknown[],
  selectedIndex: number,
  expectedDegree: number,
  variable: string,
) {
  const remaining = factors.filter((_, index) => index !== selectedIndex);
  const polynomial = parseExactLaurentPolynomial(
    factorNode(remaining),
    variable,
    MAX_BINOMIAL_DEGREE + 1,
  );
  if (!polynomial) {
    return undefined;
  }

  for (const [termDegree, coefficient] of polynomial.terms.entries()) {
    if (termDegree !== expectedDegree && !exactScalarIsZero(coefficient)) {
      return undefined;
    }
  }

  const coefficient = polynomial.terms.get(expectedDegree);
  return !coefficient || exactScalarIsZero(coefficient) ? undefined : coefficient;
}

function binomialDerivativeDegree(factor: BinomialPowerFactor) {
  return factor.kind === 'reciprocal'
    ? -factor.degree - 1
    : factor.degree - 1;
}

function binomialDerivativeScale(factor: BinomialPowerFactor) {
  return multiplyExactScalars(factor.coefficient, {
    numerator: factor.kind === 'reciprocal' ? -factor.degree : factor.degree,
    denominator: 1,
  });
}

function binomialBaseLatex(factor: BinomialPowerFactor, variable: string) {
  if (factor.kind === 'reciprocal') {
    const polynomial = parseExactLaurentPolynomial(factor.base, variable, MAX_BINOMIAL_DEGREE);
    return polynomial ? laurentPolynomialToLatex(polynomial, variable) : undefined;
  }

  const basePolynomial = parseExactPolynomial(factor.base, variable, MAX_BINOMIAL_DEGREE);
  return basePolynomial ? exactPolynomialToLatex(basePolynomial) : undefined;
}

function binomialAntiderivativeLatex(
  factor: BinomialPowerFactor,
  derivativeCoefficient: ExactScalar,
  variable: string,
) {
  const derivativeScale = binomialDerivativeScale(factor);
  const outerScale = divideExactScalars(derivativeCoefficient, derivativeScale);
  if (!outerScale) {
    return undefined;
  }

  const baseLatex = binomialBaseLatex(factor, variable);
  if (!baseLatex) {
    return undefined;
  }

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

function tryBinomialDerivativeSubstitutionRuleForKinds(
  node: unknown,
  variable: string,
  allowedKinds: Set<BinomialPowerFactor['kind']>,
) {
  const factors = binomialFactors(node);
  for (let index = 0; index < factors.length; index += 1) {
    const factor = parseBinomialPowerFactor(factors[index], variable);
    if (!factor || !allowedKinds.has(factor.kind)) {
      continue;
    }

    const derivativeCoefficient = derivativeMonomialCoefficient(
      factors,
      index,
      binomialDerivativeDegree(factor),
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

export function tryReciprocalBinomialDerivativeSubstitutionRule(node: unknown, variable: string) {
  return tryBinomialDerivativeSubstitutionRuleForKinds(
    node,
    variable,
    new Set(['reciprocal']),
  );
}

export function tryBinomialDerivativeSubstitutionRule(node: unknown, variable: string) {
  return tryBinomialDerivativeSubstitutionRuleForKinds(
    node,
    variable,
    new Set(['polynomial', 'reciprocal']),
  );
}
