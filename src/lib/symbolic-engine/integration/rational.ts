import { resolveAntiderivativeRule } from '../../calculus/engine/antiderivative-rules';
import { backcheckAntiderivative } from '../../calculus/engine/verification';
import {
  decomposeDistinctLinearPartialFractions,
  decomposeRationalPartialFractionReadiness,
  normalizeExactRationalFunctionNode,
  type LinearPowerPartialFractionTerm,
  type QuadraticPartialFractionTerm,
  type RationalPartialFractionReadinessTerm,
} from '../../algebra/rational-function-core';
import {
  buildExactScalarNode,
  divideExactPolynomials,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialIsZero,
  exactPolynomialToLatex,
  exactPolynomialToNode,
  exactScalarEquals,
  exactScalarIsZero,
  exactScalarToNumber,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  normalizeExactScalar,
  parseExactPolynomial,
  readExactScalarNode,
  type ExactPolynomial,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import {
  buildSimplifyReadbackPolicy,
  canAdoptPolicyResult,
  equivalenceTrustFromAntiderivativeBackcheck,
  preservedFactsFromDomainHazards,
} from '../../algebra/simplify-policy';
import { boxLatex, divideByNumericCoefficient, isNodeArray, multiplyLatex, wrapGroupedLatex } from '../patterns';
import { collectIntegrationDomainHazards, containsRationalOperator } from './metadata';
import { rationalApproximation } from './node-helpers';

export function scaleLatex(latex: string, scale: number) {
  if (Math.abs(scale - 1) < 1e-10) {
    return latex;
  }

  if (Math.abs(scale + 1) < 1e-10) {
    return `-${wrapGroupedLatex(latex)}`;
  }

  const rational = rationalApproximation(scale);
  if (rational) {
    const sign = rational.numerator < 0 ? '-' : '';
    const numerator = Math.abs(rational.numerator);
    if (rational.denominator === 1) {
      return `${sign}${multiplyLatex(String(numerator), latex)}`;
    }

    if (numerator === 1) {
      const divided = divideByNumericCoefficient(latex, rational.denominator);
      return sign ? `-${wrapGroupedLatex(divided)}` : divided;
    }

    return `${sign}\\frac{${numerator}${wrapGroupedLatex(latex)}}{${rational.denominator}}`;
  }

  const reciprocal = 1 / scale;
  if (Math.abs(reciprocal - Math.round(reciprocal)) < 1e-10) {
    return divideByNumericCoefficient(latex, Math.round(reciprocal));
  }

  return multiplyLatex(boxLatex(scale), latex);
}

function joinAdditiveLatex(parts: string[]) {
  return parts
    .filter((part) => part !== '0')
    .reduce((joined, part, index) => {
      if (index === 0) {
        return part;
      }
      return part.startsWith('-') ? `${joined}${part}` : `${joined}+${part}`;
    }, '') || undefined;
}

function canAttachCoefficientDirectly(latex: string) {
  return latex.startsWith('\\ln')
    || latex.startsWith('\\arctan')
    || latex.startsWith('\\frac')
    || /^[a-zA-Z](?:\^\{?[-+]?\d+\}?)?$/.test(latex);
}

function coefficientTimesLatex(coefficientLatex: string, latex: string) {
  return canAttachCoefficientDirectly(latex)
    ? `${coefficientLatex}${latex}`
    : `${coefficientLatex}${wrapGroupedLatex(latex)}`;
}

function scaleByExactScalar(latex: string, coefficient: ExactScalar) {
  const normalized = normalizeExactScalar(coefficient);
  if (normalized.numerator === 0) {
    return '0';
  }

  if (normalized.numerator === 1 && normalized.denominator === 1) {
    return latex;
  }

  if (normalized.numerator === -1 && normalized.denominator === 1) {
    return canAttachCoefficientDirectly(latex) ? `-${latex}` : `-${wrapGroupedLatex(latex)}`;
  }

  if (normalized.denominator === 1) {
    return coefficientTimesLatex(boxLatex(buildExactScalarNode(normalized)), latex);
  }

  const sign = normalized.numerator < 0 ? '-' : '';
  const numerator = Math.abs(normalized.numerator);
  const coefficientLatex = numerator === 1
    ? `\\frac{1}{${normalized.denominator}}`
    : `\\frac{${numerator}}{${normalized.denominator}}`;

  return `${sign}${coefficientTimesLatex(coefficientLatex, latex)}`;
}

function integratePolynomial(polynomial: ExactPolynomial, variable: string) {
  return resolveAntiderivativeRule(exactPolynomialToNode(polynomial), variable);
}

function integratePartialFractionDenominator(denominator: ExactPolynomial, coefficient: ExactScalar) {
  const denominatorLatex = exactPolynomialToLatex(denominator);
  return scaleByExactScalar(
    `\\ln\\left|${denominatorLatex}\\right|`,
    coefficient,
  );
}

function exactScalarLatex(value: ExactScalar) {
  return boxLatex(buildExactScalarNode(normalizeExactScalar(value)));
}

function scalarSquareRoot(value: ExactScalar): ExactScalar | undefined {
  const normalized = normalizeExactScalar(value);
  if (normalized.numerator < 0 || normalized.denominator <= 0) {
    return undefined;
  }

  const numeratorRoot = Math.sqrt(normalized.numerator);
  const denominatorRoot = Math.sqrt(normalized.denominator);
  if (!Number.isInteger(numeratorRoot) || !Number.isInteger(denominatorRoot)) {
    return undefined;
  }

  return normalizeExactScalar({
    numerator: numeratorRoot,
    denominator: denominatorRoot,
  });
}

function exactScalarCube(value: ExactScalar) {
  return multiplyExactScalars(multiplyExactScalars(value, value), value);
}

function positiveScalarSqrtLatex(value: ExactScalar) {
  const exactRoot = scalarSquareRoot(value);
  if (exactRoot) {
    return exactScalarLatex(exactRoot);
  }

  return `\\sqrt{${exactScalarLatex(value)}}`;
}

function exactScalarSignLatex(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  if (normalized.numerator === 0) {
    return '';
  }

  const absoluteLatex = exactScalarLatex({
    numerator: Math.abs(normalized.numerator),
    denominator: normalized.denominator,
  });
  return normalized.numerator > 0 ? `+${absoluteLatex}` : `-${absoluteLatex}`;
}

type ExactAffineForm = {
  slope: ExactScalar;
  latex: string;
};

function isExactScalarValue(value: ExactScalar, numerator: number, denominator = 1) {
  return exactScalarEquals(value, { numerator, denominator });
}

function exponentIs(node: unknown, expected: number) {
  const scalar = readExactScalarNode(node);
  return scalar !== null && isExactScalarValue(scalar, expected);
}

function squaredExactAffineTerm(node: unknown, variable: string): ExactAffineForm | undefined {
  if (!isNodeArray(node) || node[0] !== 'Power' || node.length !== 3 || !exponentIs(node[2], 2)) {
    return undefined;
  }

  const polynomial = parseExactPolynomial(node[1], variable, 1);
  if (!polynomial || exactPolynomialDegree(polynomial) !== 1) {
    return undefined;
  }

  const slope = getExactPolynomialCoefficient(polynomial, 1);
  if (exactScalarIsZero(slope)) {
    return undefined;
  }

  return {
    slope,
    latex: exactPolynomialToLatex(polynomial),
  };
}

function reciprocalQuadraticSquareBase(node: unknown) {
  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3 && exponentIs(node[2], -2)) {
    return node[1];
  }

  if (
    isNodeArray(node)
    && node[0] === 'Divide'
    && node.length === 3
    && isExactScalarValue(readExactScalarNode(node[1]) ?? { numerator: 0, denominator: 1 }, 1)
    && isNodeArray(node[2])
    && node[2][0] === 'Power'
    && node[2].length === 3
    && exponentIs(node[2][2], 2)
  ) {
    return node[2][1];
  }

  return undefined;
}

function repeatedQuadraticReciprocalForm(node: unknown, variable: string) {
  const base = reciprocalQuadraticSquareBase(node);
  if (!isNodeArray(base) || base[0] !== 'Add' || base.length !== 3) {
    return undefined;
  }

  const leftScalar = readExactScalarNode(base[1]);
  const rightScalar = readExactScalarNode(base[2]);
  const constant = leftScalar ?? rightScalar;
  const squaredAffine = leftScalar
    ? squaredExactAffineTerm(base[2], variable)
    : squaredExactAffineTerm(base[1], variable);
  if (!constant || !squaredAffine || exactScalarToNumber(constant) <= 0) {
    return undefined;
  }

  const constantRoot = scalarSquareRoot(constant);
  if (!constantRoot) {
    return undefined;
  }

  return {
    baseLatex: boxLatex(base),
    constant,
    constantRoot,
    affine: squaredAffine,
  };
}

function exactAffineRatioLatex(affineLatex: string, denominator: ExactScalar) {
  const normalized = normalizeExactScalar(denominator);
  if (normalized.numerator === normalized.denominator) {
    return affineLatex;
  }

  return `\\frac{${affineLatex}}{${exactScalarLatex(normalized)}}`;
}

function tryRepeatedQuadraticReciprocalPowerRule(node: unknown, variable: string) {
  const form = repeatedQuadraticReciprocalForm(node, variable);
  if (!form) {
    return undefined;
  }

  const doubleSlope = multiplyExactScalars({ numerator: 2, denominator: 1 }, form.affine.slope);
  const firstDenominator = multiplyExactScalars(doubleSlope, form.constant);
  const firstCoefficient = divideExactScalars({ numerator: 1, denominator: 1 }, firstDenominator);
  if (!firstCoefficient) {
    return undefined;
  }

  const rootCubed = exactScalarCube(form.constantRoot);
  const secondDenominator = multiplyExactScalars(doubleSlope, rootCubed);
  const secondCoefficient = divideExactScalars({ numerator: 1, denominator: 1 }, secondDenominator);
  if (!secondCoefficient) {
    return undefined;
  }

  const rationalTerm = scaleByExactScalar(
    `\\frac{${form.affine.latex}}{${wrapGroupedLatex(form.baseLatex)}}`,
    firstCoefficient,
  );
  const arctanTerm = scaleByExactScalar(
    `\\arctan\\left(${exactAffineRatioLatex(form.affine.latex, form.constantRoot)}\\right)`,
    secondCoefficient,
  );
  const candidate = joinAdditiveLatex([rationalTerm, arctanTerm]);
  if (!candidate || !canAdoptAntiderivativeLatex(candidate, node, variable)) {
    return undefined;
  }

  return candidate;
}

function linearFactorLatex(variable: string, root: ExactScalar) {
  const normalized = normalizeExactScalar(root);
  if (normalized.numerator === 0) {
    return variable;
  }

  const absoluteRoot = exactScalarLatex({
    numerator: Math.abs(normalized.numerator),
    denominator: normalized.denominator,
  });
  return normalized.numerator > 0
    ? `${variable}-${absoluteRoot}`
    : `${variable}+${absoluteRoot}`;
}

function linearPowerReciprocalLatex(variable: string, root: ExactScalar, power: number) {
  const factor = linearFactorLatex(variable, root);
  const denominator = power === 1 ? factor : `${wrapGroupedLatex(factor)}^{${power}}`;
  return `\\frac{1}{${denominator}}`;
}

function integrateLinearPowerTerm(
  term: LinearPowerPartialFractionTerm,
  variable: string,
) {
  if (term.power === 1) {
    return integratePartialFractionDenominator(term.denominator, term.coefficient);
  }

  const coefficient = divideExactScalars(
    { numerator: -term.coefficient.numerator, denominator: term.coefficient.denominator },
    { numerator: term.power - 1, denominator: 1 },
  );
  if (!coefficient) {
    return undefined;
  }

  return scaleByExactScalar(
    linearPowerReciprocalLatex(variable, term.root, term.power - 1),
    coefficient,
  );
}

function affineQuadraticArgumentLatex(
  variable: string,
  linearCoefficient: ExactScalar,
  denominatorRoot: ExactScalar | undefined,
  denominatorLatex: string,
) {
  if (denominatorRoot && Math.abs(exactScalarToNumber(denominatorRoot) - 2) < 1e-12) {
    const halfB = divideExactScalars(linearCoefficient, { numerator: 2, denominator: 1 });
    const offset = halfB ? exactScalarSignLatex(halfB) : '';
    return `${variable}${offset}`;
  }

  const numerator = `2${variable}${exactScalarSignLatex(linearCoefficient)}`;
  if (denominatorRoot && Math.abs(exactScalarToNumber(denominatorRoot) - 1) < 1e-12) {
    return numerator;
  }

  return `\\frac{${numerator}}{${denominatorLatex}}`;
}

function scaleByIrrationalDenominator(
  latex: string,
  numerator: ExactScalar,
  denominatorLatex: string,
) {
  const normalized = normalizeExactScalar(numerator);
  if (normalized.numerator === 0) {
    return undefined;
  }

  const sign = normalized.numerator < 0 ? '-' : '';
  const absolute = {
    numerator: Math.abs(normalized.numerator),
    denominator: normalized.denominator,
  };
  const coefficientNumerator = exactScalarLatex(absolute);
  const coefficientLatex = absolute.numerator === absolute.denominator
    ? `\\frac{1}{${denominatorLatex}}`
    : `\\frac{${coefficientNumerator}}{${denominatorLatex}}`;

  return `${sign}${coefficientTimesLatex(coefficientLatex, latex)}`;
}

function integrateQuadraticTerm(
  term: QuadraticPartialFractionTerm,
  variable: string,
) {
  const pieces: string[] = [];
  if (!exactScalarIsZero(term.derivativeCoefficient)) {
    pieces.push(scaleByExactScalar(
      `\\ln\\left(${term.factor.latex}\\right)`,
      term.derivativeCoefficient,
    ));
  }

  if (!exactScalarIsZero(term.residualConstant)) {
    const positiveDiscriminant = normalizeExactScalar({
      numerator: -term.factor.discriminant.numerator,
      denominator: term.factor.discriminant.denominator,
    });
    const exactRoot = scalarSquareRoot(positiveDiscriminant);
    const rootLatex = positiveScalarSqrtLatex(positiveDiscriminant);
    const argumentLatex = affineQuadraticArgumentLatex(
      variable,
      term.factor.linearCoefficient,
      exactRoot,
      rootLatex,
    );
    const arctanLatex = `\\arctan\\left(${argumentLatex}\\right)`;
    const numerator = multiplyExactScalars(
      term.residualConstant,
      { numerator: 2, denominator: 1 },
    );

    const scaled = exactRoot
      ? scaleByExactScalar(arctanLatex, divideExactScalars(numerator, exactRoot) ?? numerator)
      : scaleByIrrationalDenominator(arctanLatex, numerator, rootLatex);
    if (scaled) {
      pieces.push(scaled);
    }
  }

  return joinAdditiveLatex(pieces);
}

function integrateReadinessTerm(
  term: RationalPartialFractionReadinessTerm,
  variable: string,
) {
  switch (term.kind) {
    case 'linear-power':
      return integrateLinearPowerTerm(term, variable);
    case 'irreducible-quadratic':
      return integrateQuadraticTerm(term, variable);
  }
}

function canAdoptAntiderivativeLatex(
  antiderivativeLatex: string,
  integrand: unknown,
  variable: string,
) {
  const verification = backcheckAntiderivative({
    antiderivativeLatex,
    integrand,
    variable,
  });
  const policy = buildSimplifyReadbackPolicy({
    formIntent: 'partial-fraction',
    equivalenceTrust: equivalenceTrustFromAntiderivativeBackcheck(verification.status),
    preservedFacts: preservedFactsFromDomainHazards(collectIntegrationDomainHazards(integrand)),
    notes: ['Rational integration candidate accepted through INT-RAT2 readback policy.'],
  });
  return canAdoptPolicyResult(policy);
}

export function tryRationalPartialFractionRule(node: unknown, variable: string) {
  if (!containsRationalOperator(node)) {
    return undefined;
  }

  const repeatedQuadratic = tryRepeatedQuadraticReciprocalPowerRule(node, variable);
  if (repeatedQuadratic) {
    return repeatedQuadratic;
  }

  const normalized = normalizeExactRationalFunctionNode(node, { variable, maxDegree: 8 });
  if (normalized.kind === 'stop') {
    return undefined;
  }

  const division = divideExactPolynomials(
    normalized.rational.numerator,
    normalized.rational.denominator,
  );
  if (!division) {
    return undefined;
  }

  const parts: string[] = [];
  if (!exactPolynomialIsZero(division.quotient)) {
    const quotientIntegral = integratePolynomial(division.quotient, normalized.rational.variable);
    if (!quotientIntegral) {
      return undefined;
    }
    parts.push(quotientIntegral);
  }

  if (!exactPolynomialIsZero(division.remainder)) {
    const distinctLinear = decomposeDistinctLinearPartialFractions({
      variable: normalized.rational.variable,
      numerator: division.remainder,
      denominator: normalized.rational.denominator,
    });

    if (distinctLinear.kind === 'success') {
      parts.push(
        ...distinctLinear.terms.map((term) =>
          integratePartialFractionDenominator(term.denominator, term.coefficient)),
      );
    } else {
      const decomposed = decomposeRationalPartialFractionReadiness({
        variable: normalized.rational.variable,
        numerator: division.remainder,
        denominator: normalized.rational.denominator,
      });
      if (decomposed.kind === 'stop') {
        return undefined;
      }

      const widenedParts = decomposed.terms.map((term) =>
        integrateReadinessTerm(term, normalized.rational.variable));
      if (widenedParts.some((part) => part === undefined)) {
        return undefined;
      }

      parts.push(...widenedParts as string[]);
    }
  }

  const candidate = joinAdditiveLatex(parts);
  if (!candidate || !canAdoptAntiderivativeLatex(candidate, node, variable)) {
    return undefined;
  }

  return candidate;
}
