import type { AntiderivativeBackcheck } from '../../../calculus/engine/verification';
import { readExactScalarNode } from '../../../algebra/polynomial-core';
import {
  addMathJsonNodes,
  divideMathJsonNodes,
  multiplyMathJsonNodes,
  negateMathJsonNode,
  simplifyMathJsonNodeOrOriginal,
} from '../../primitives/simplification/simplification';
import { isSymbolicCoefficientZero, type SymbolicCoefficient } from '../../primitives/coefficient-domain';
import {
  getSymbolicPolynomialCoefficient,
  parseSymbolicPolynomial,
  type SymbolicPolynomial,
} from '../../primitives/symbolic-polynomial';
import {
  boxLatex,
  isNodeArray,
  wrapGroupedLatex,
} from '../../patterns';
import { normalizeGeneratedIntegrationLatex } from '../readback-hygiene';
import {
  algebraicGenus0BranchValidityFact,
  algebraicGenus0CoefficientDenominatorFact,
  algebraicGenus0FactsToExactSupplementLatex,
  algebraicGenus0SlopeNonzeroFact,
  type AlgebraicGenus0Fact,
} from './facts';
import { profileSymbolicIntegrationResult } from '../../../display/printer';

export type AlgebraicGenus0SymbolicStandardRadicalRule = {
  antiderivativeNode: unknown;
  exactLatex: string;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex: string[];
};

type RadicalShape =
  | { kind: 'radical'; radicand: unknown }
  | { kind: 'reciprocal-radical'; radicand: unknown };

type CenteredQuadraticFamily = 'minus' | 'outside' | 'plus';

const THREE_HALVES = ['Divide', 3, 2];

function proof(): AntiderivativeBackcheck {
  return {
    status: 'verified-exact',
    reason: 'verified by algebraic genus-0 symbolic branch rule proof',
  };
}

function isExactOne(node: unknown) {
  const scalar = readExactScalarNode(node);
  return Boolean(scalar && scalar.numerator === scalar.denominator);
}

function isExactNegativeOne(node: unknown) {
  const scalar = readExactScalarNode(node);
  return Boolean(scalar && scalar.numerator === -scalar.denominator);
}

function shapeOf(node: unknown): RadicalShape | undefined {
  if (isNodeArray(node) && node[0] === 'Sqrt' && node.length === 2) {
    const rawRadicand = node[1];
    if (
      isNodeArray(rawRadicand)
      && rawRadicand[0] === 'Divide'
      && rawRadicand.length === 3
      && isExactOne(rawRadicand[1])
    ) {
      return { kind: 'reciprocal-radical', radicand: rawRadicand[2] };
    }
    return { kind: 'radical', radicand: rawRadicand };
  }

  if (
    isNodeArray(node)
    && node[0] === 'Divide'
    && node.length === 3
    && isExactOne(node[1])
    && isNodeArray(node[2])
    && node[2][0] === 'Sqrt'
    && node[2].length === 2
  ) {
    return { kind: 'reciprocal-radical', radicand: node[2][1] };
  }

  return undefined;
}

function sqrt(node: unknown) {
  return ['Sqrt', node];
}

function power(node: unknown, exponent: unknown) {
  return ['Power', node, exponent];
}

function coefficientFacts(polynomial: SymbolicPolynomial): AlgebraicGenus0Fact[] {
  return polynomial.facts.map((item) =>
    algebraicGenus0CoefficientDenominatorFact(item.expressionLatex));
}

function radicandLatex(radicand: unknown) {
  return boxLatex(simplifyMathJsonNodeOrOriginal(radicand));
}

function finish(input: {
  node: unknown;
  exactSupplementFacts: AlgebraicGenus0Fact[];
  exactLatex?: string;
  variable: string;
}): AlgebraicGenus0SymbolicStandardRadicalRule {
  const antiderivativeNode = simplifyMathJsonNodeOrOriginal(input.node);
  return profileSymbolicIntegrationResult({
    antiderivativeNode,
    exactLatex: normalizeGeneratedIntegrationLatex(
      input.exactLatex ?? boxLatex(antiderivativeNode),
      input.variable,
    ),
    verification: proof(),
    exactSupplementLatex: algebraicGenus0FactsToExactSupplementLatex(input.exactSupplementFacts),
  });
}

function tryAffineRadical(
  shape: RadicalShape,
  variable: string,
): AlgebraicGenus0SymbolicStandardRadicalRule | undefined {
  const parsed = parseSymbolicPolynomial(shape.radicand, variable, 1);
  if (parsed.kind !== 'success' || parsed.polynomial.degree !== 1) {
    return undefined;
  }

  const slope = getSymbolicPolynomialCoefficient(parsed.polynomial, 1);
  if (isSymbolicCoefficientZero(slope)) {
    return undefined;
  }

  const facts = [
    ...coefficientFacts(parsed.polynomial),
    algebraicGenus0SlopeNonzeroFact(slope.latex),
    algebraicGenus0BranchValidityFact(radicandLatex(shape.radicand), '\\ge0'),
  ];
  if (shape.kind === 'radical') {
    const slopeLatex = boxLatex(simplifyMathJsonNodeOrOriginal(slope.node));
    const groupedRadicandLatex = wrapGroupedLatex(radicandLatex(shape.radicand));
    return finish(profileSymbolicIntegrationResult({
      node: divideMathJsonNodes(
        multiplyMathJsonNodes(2, power(shape.radicand, THREE_HALVES)),
        multiplyMathJsonNodes(3, slope.node),
      ),
      exactLatex: slopeLatex === '1'
        ? `\\frac{2}{3}${groupedRadicandLatex}^{\\frac{3}{2}}`
        : `\\frac{2${groupedRadicandLatex}^{\\frac{3}{2}}}{3${wrapGroupedLatex(slopeLatex)}}`,
      exactSupplementFacts: facts,
      variable,
    }));
  }

  const slopeLatex = boxLatex(simplifyMathJsonNodeOrOriginal(slope.node));
  const radicandRootLatex = `\\sqrt{${radicandLatex(shape.radicand)}}`;
  return finish(profileSymbolicIntegrationResult({
    node: divideMathJsonNodes(
      multiplyMathJsonNodes(2, sqrt(shape.radicand)),
      slope.node,
    ),
    exactLatex: slopeLatex === '1'
      ? `2${radicandRootLatex}`
      : `\\frac{2}{${wrapGroupedLatex(slopeLatex)}}${radicandRootLatex}`,
    exactSupplementFacts: facts,
    variable,
  }));
}

function stripLeadingNegative(node: unknown): unknown | undefined {
  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return node[1];
  }

  if (isNodeArray(node) && node[0] === 'Multiply') {
    const [, first, ...rest] = node;
    if (isExactNegativeOne(first)) {
      return rest.length === 1 ? rest[0] : ['Multiply', ...rest];
    }
  }

  const scalar = readExactScalarNode(node);
  if (scalar && scalar.numerator < 0) {
    return ['Divide', -scalar.numerator, scalar.denominator];
  }

  return undefined;
}

function centeredQuadraticFamily(input: {
  leading: SymbolicCoefficient;
  constant: SymbolicCoefficient;
}): { family: CenteredQuadraticFamily; radius: unknown } | undefined {
  if (isExactNegativeOne(input.leading.node)) {
    return { family: 'minus', radius: input.constant.node };
  }

  if (!isExactOne(input.leading.node)) {
    return undefined;
  }

  const positiveRadius = stripLeadingNegative(input.constant.node);
  if (positiveRadius) {
    return { family: 'outside', radius: positiveRadius };
  }

  return { family: 'plus', radius: input.constant.node };
}

function inverseFunctionNode(input: {
  family: CenteredQuadraticFamily;
  variable: string;
  radius: unknown;
}) {
  const head = input.family === 'minus'
    ? 'Arcsin'
    : input.family === 'plus'
      ? 'Arsinh'
      : 'Arcosh';
  return [head, divideMathJsonNodes(input.variable, sqrt(input.radius))];
}

function tryCenteredQuadraticRadical(
  shape: RadicalShape,
  variable: string,
): AlgebraicGenus0SymbolicStandardRadicalRule | undefined {
  const parsed = parseSymbolicPolynomial(shape.radicand, variable, 2);
  if (parsed.kind !== 'success' || parsed.polynomial.degree !== 2) {
    return undefined;
  }

  const linear = getSymbolicPolynomialCoefficient(parsed.polynomial, 1);
  if (!isSymbolicCoefficientZero(linear)) {
    return undefined;
  }

  const leading = getSymbolicPolynomialCoefficient(parsed.polynomial, 2);
  const constant = getSymbolicPolynomialCoefficient(parsed.polynomial, 0);
  const family = centeredQuadraticFamily({ leading, constant });
  if (!family) {
    return undefined;
  }

  const inverse = inverseFunctionNode({
    family: family.family,
    variable,
    radius: family.radius,
  });
  const facts = [
    ...coefficientFacts(parsed.polynomial),
    algebraicGenus0BranchValidityFact(radicandLatex(family.radius), '>0'),
    algebraicGenus0BranchValidityFact(radicandLatex(shape.radicand), '\\ge0'),
  ];
  if (shape.kind === 'reciprocal-radical') {
    return finish({ node: inverse, exactSupplementFacts: facts, variable });
  }

  const variableRadical = multiplyMathJsonNodes(variable, sqrt(shape.radicand));
  const radiusInverse = multiplyMathJsonNodes(family.radius, inverse);
  const signedInverseTerm = family.family === 'outside'
    ? negateMathJsonNode(radiusInverse)
    : radiusInverse;
  return finish({
    node: divideMathJsonNodes(
      addMathJsonNodes(variableRadical, signedInverseTerm),
      2,
    ),
    exactSupplementFacts: facts,
    variable,
  });
}

function isClearlyExactRationalStandard(shape: RadicalShape, variable: string) {
  const parsed = parseSymbolicPolynomial(shape.radicand, variable, 2);
  if (parsed.kind !== 'success') {
    return false;
  }
  return parsed.polynomial.coefficients.every((coefficient) => {
    const scalar = readExactScalarNode(coefficient.node);
    return Boolean(scalar && scalar.denominator !== 0);
  });
}

export function tryAlgebraicGenus0SymbolicStandardRadicalRule(
  integrand: unknown,
  variable = 'x',
): AlgebraicGenus0SymbolicStandardRadicalRule | undefined {
  const shape = shapeOf(integrand);
  if (!shape || isClearlyExactRationalStandard(shape, variable)) {
    return undefined;
  }

  return tryAffineRadical(shape, variable)
    ?? tryCenteredQuadraticRadical(shape, variable);
}
