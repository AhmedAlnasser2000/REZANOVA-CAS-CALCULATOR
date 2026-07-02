import type { AntiderivativeBackcheck } from '../../../calculus/engine/verification';
import type { ExactSupplementEntry } from '../../../../types/calculator/exact-supplement-types';
import {
  buildExactScalarNode,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  normalizeExactScalar,
  parseExactPolynomial,
  readExactScalarNode,
  type ExactScalar,
} from '../../../algebra/polynomial-core';
import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import {
  addMathJsonNodes,
  divideMathJsonNodes,
  multiplyMathJsonNodes,
  negateMathJsonNode,
  simplifyMathJsonNodeOrOriginal,
} from '../../primitives/simplification/simplification';
import {
  boxLatex,
  dependsOnVariable,
  flattenMultiply,
  isNodeArray,
} from '../../patterns';
import { normalizeGeneratedIntegrationLatex } from '../readback-hygiene';
import { buildAlgebraicGenus1EllipticProofBackcheck } from './proof-backcheck';

export type AlgebraicGenus1RationalInRadicalHermiteRule = {
  exactLatex: string;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex: string[];
  basisKinds: Array<'first-kind' | 'second-kind' | 'third-kind'>;
};

type SignedNode = {
  node: unknown;
  sign: 1 | -1;
};

type EvenQuadratic = {
  constant: ExactScalar;
  square: ExactScalar;
};

function exactNode(value: ExactScalar) {
  return buildExactScalarNode(normalizeExactScalar(value));
}

function proof(): AntiderivativeBackcheck {
  return {
    status: 'verified-exact',
    reason: 'verified by bounded algebraic genus-1 Hermite reduction to Legendre elliptic basis',
  };
}

function isExactOne(node: unknown) {
  const scalar = readExactScalarNode(node);
  return Boolean(scalar && scalar.numerator === scalar.denominator);
}

function isExactZero(node: unknown) {
  const scalar = readExactScalarNode(node);
  return Boolean(scalar && exactScalarIsZero(scalar));
}

function signedAddTerms(node: unknown, sign: 1 | -1 = 1): SignedNode[] {
  if (isNodeArray(node) && node[0] === 'Add') {
    return node.slice(1).flatMap((term) => signedAddTerms(term, sign));
  }

  if (isNodeArray(node) && node[0] === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    return [
      ...(first === undefined ? [] : signedAddTerms(first, sign)),
      ...rest.flatMap((term) => signedAddTerms(term, sign === 1 ? -1 : 1)),
    ];
  }

  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return signedAddTerms(node[1], sign === 1 ? -1 : 1);
  }

  return [{ node, sign }];
}

function isVariableSquared(node: unknown, variable: string) {
  return isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === variable
    && node[2] === 2;
}

function scaledVariableSquareCoefficient(node: unknown, variable: string) {
  if (isVariableSquared(node, variable)) {
    return 1;
  }

  const factors = isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];
  const coefficientFactors: unknown[] = [];
  let squareCount = 0;

  for (const factor of factors) {
    if (isVariableSquared(factor, variable)) {
      squareCount += 1;
      continue;
    }
    if (dependsOnVariable(factor, variable)) {
      return undefined;
    }
    coefficientFactors.push(factor);
  }

  if (squareCount !== 1) {
    return undefined;
  }
  return coefficientFactors.length === 0
    ? 1
    : multiplyMathJsonNodes(...coefficientFactors);
}

function unitMinusScaledSquareParameter(node: unknown, variable: string) {
  const terms = signedAddTerms(node);
  if (terms.length !== 2) {
    return undefined;
  }

  const constant = terms.find((term) => term.sign === 1 && isExactOne(term.node));
  const squareTerm = terms.find((term) => term !== constant);
  if (!constant || !squareTerm || squareTerm.sign !== -1) {
    return undefined;
  }

  return scaledVariableSquareCoefficient(squareTerm.node, variable);
}

function divideParts(node: unknown) {
  return isNodeArray(node) && node[0] === 'Divide' && node.length === 3
    ? { numerator: node[1], denominator: node[2] }
    : undefined;
}

function sqrtBody(node: unknown) {
  return isNodeArray(node) && node[0] === 'Sqrt' && node.length === 2
    ? node[1]
    : undefined;
}

function productFactors(node: unknown) {
  return isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];
}

function unitMinusPairFromProduct(node: unknown, variable: string) {
  const factors = productFactors(node);
  if (factors.length !== 2) {
    return undefined;
  }

  const parameters = factors.map((factor) => unitMinusScaledSquareParameter(factor, variable));
  if (parameters.some((parameter) => parameter === undefined)) {
    return undefined;
  }
  const [left, right] = parameters as [unknown, unknown];
  if (isExactOne(left)) {
    return { product: node, parameter: right };
  }
  if (isExactOne(right)) {
    return { product: node, parameter: left };
  }
  return undefined;
}

function parseEvenQuadraticNumerator(node: unknown, variable: string): EvenQuadratic | undefined {
  const polynomial = parseExactPolynomial(node, variable, 2);
  if (!polynomial) {
    return undefined;
  }

  const linear = getExactPolynomialCoefficient(polynomial, 1);
  if (!exactScalarIsZero(linear)) {
    return undefined;
  }

  return {
    constant: getExactPolynomialCoefficient(polynomial, 0),
    square: getExactPolynomialCoefficient(polynomial, 2),
  };
}

function scalarCoefficientNode(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return exactScalarIsZero(normalized) ? undefined : exactNode(normalized);
}

function nonzeroParameterFact(parameter: unknown): ExactSupplementEntry | undefined {
  const scalar = readExactScalarNode(parameter);
  if (scalar && exactScalarIsZero(scalar)) {
    return undefined;
  }
  if (scalar) {
    return undefined;
  }
  return {
    kind: 'exclusion',
    expressionLatex: boxLatex(parameter),
    relation: '\\ne0',
    source: 'denominator',
  };
}

function scalarOverParameter(value: ExactScalar, parameter: unknown) {
  const normalized = normalizeExactScalar(value);
  if (exactScalarIsZero(normalized)) {
    return undefined;
  }
  if (isExactZero(parameter)) {
    return undefined;
  }
  return simplifyMathJsonNodeOrOriginal(divideMathJsonNodes(exactNode(normalized), parameter));
}

function addOptionalTerms(terms: Array<unknown | undefined>) {
  const present = terms.filter((term): term is unknown => term !== undefined);
  if (present.length === 0) {
    return undefined;
  }
  return simplifyMathJsonNodeOrOriginal(addMathJsonNodes(...present));
}

function multiplyCoefficient(coefficient: unknown | undefined, term: unknown) {
  if (coefficient === undefined) {
    return undefined;
  }
  if (isExactOne(coefficient)) {
    return term;
  }
  return simplifyMathJsonNodeOrOriginal(multiplyMathJsonNodes(coefficient, term));
}

function ellipticFNode(variable: string, parameter: unknown) {
  return ['EllipticF', ['Arcsin', variable], parameter];
}

function ellipticENode(variable: string, parameter: unknown) {
  return ['EllipticE', ['Arcsin', variable], parameter];
}

function ellipticPiNode(variable: string, characteristic: unknown, parameter: unknown) {
  return ['EllipticPi', characteristic, ['Arcsin', variable], parameter];
}

function firstKindFacts(product: unknown, variable: string) {
  const proofBackcheck = buildAlgebraicGenus1EllipticProofBackcheck(
    ['Divide', 1, ['Sqrt', product]],
    variable,
  );
  return proofBackcheck.kind === 'success' ? proofBackcheck.exactSupplementEntries : [];
}

function thirdKindFacts(product: unknown, characteristicFactor: unknown, variable: string) {
  const proofBackcheck = buildAlgebraicGenus1EllipticProofBackcheck(
    ['Divide', 1, ['Multiply', characteristicFactor, ['Sqrt', product]]],
    variable,
  );
  return proofBackcheck.kind === 'success' ? proofBackcheck.exactSupplementEntries : [];
}

function buildRule(input: {
  antiderivativeNode: unknown;
  facts: ExactSupplementEntry[];
  basisKinds: AlgebraicGenus1RationalInRadicalHermiteRule['basisKinds'];
  variable: string;
}): AlgebraicGenus1RationalInRadicalHermiteRule | undefined {
  const exactLatex = normalizeGeneratedIntegrationLatex(
    boxLatex(simplifyMathJsonNodeOrOriginal(input.antiderivativeNode)),
    input.variable,
  );
  if (!exactLatex) {
    return undefined;
  }
  return {
    exactLatex,
    verification: proof(),
    exactSupplementLatex: mergeExactSupplementLatex({
      entries: input.facts,
      source: 'candidate-validation',
    }),
    basisKinds: input.basisKinds,
  };
}

function tryFirstKindEvenNumerator(
  node: unknown,
  variable: string,
): AlgebraicGenus1RationalInRadicalHermiteRule | undefined {
  const fraction = divideParts(node);
  const product = fraction ? sqrtBody(fraction.denominator) : undefined;
  if (!fraction || !product) {
    return undefined;
  }

  const pair = unitMinusPairFromProduct(product, variable);
  const numerator = parseEvenQuadraticNumerator(fraction.numerator, variable);
  if (!pair || !numerator || exactScalarIsZero(numerator.square)) {
    return undefined;
  }

  const squareOverParameter = scalarOverParameter(numerator.square, pair.parameter);
  if (!squareOverParameter) {
    return undefined;
  }

  const fCoefficient = addOptionalTerms([
    scalarCoefficientNode(numerator.constant),
    squareOverParameter,
  ]);
  const eCoefficient = negateMathJsonNode(squareOverParameter);
  const antiderivativeNode = addOptionalTerms([
    multiplyCoefficient(fCoefficient, ellipticFNode(variable, pair.parameter)),
    multiplyCoefficient(eCoefficient, ellipticENode(variable, pair.parameter)),
  ]);
  if (!antiderivativeNode) {
    return undefined;
  }

  const parameterFact = nonzeroParameterFact(pair.parameter);
  return buildRule({
    antiderivativeNode,
    facts: [
      ...firstKindFacts(product, variable),
      ...(parameterFact ? [parameterFact] : []),
    ],
    basisKinds: ['first-kind', 'second-kind'],
    variable,
  });
}

function thirdKindDenominatorParts(node: unknown, variable: string) {
  const fraction = divideParts(node);
  if (!fraction) {
    return undefined;
  }

  const denominatorFactors = productFactors(fraction.denominator);
  if (denominatorFactors.length !== 2) {
    return undefined;
  }

  const sqrtFactorIndex = denominatorFactors.findIndex((factor) => sqrtBody(factor) !== undefined);
  if (sqrtFactorIndex < 0) {
    return undefined;
  }

  const product = sqrtBody(denominatorFactors[sqrtFactorIndex]);
  const characteristicFactor = denominatorFactors[1 - sqrtFactorIndex];
  if (!product) {
    return undefined;
  }

  const pair = unitMinusPairFromProduct(product, variable);
  const characteristic = unitMinusScaledSquareParameter(characteristicFactor, variable);
  if (!pair || characteristic === undefined) {
    return undefined;
  }

  return {
    numerator: fraction.numerator,
    product,
    parameter: pair.parameter,
    characteristic,
    characteristicFactor,
  };
}

function tryThirdKindEvenNumerator(
  node: unknown,
  variable: string,
): AlgebraicGenus1RationalInRadicalHermiteRule | undefined {
  const parts = thirdKindDenominatorParts(node, variable);
  if (!parts) {
    return undefined;
  }

  const numerator = parseEvenQuadraticNumerator(parts.numerator, variable);
  if (!numerator || exactScalarIsZero(numerator.square)) {
    return undefined;
  }

  const squareOverCharacteristic = scalarOverParameter(numerator.square, parts.characteristic);
  if (!squareOverCharacteristic) {
    return undefined;
  }

  const piCoefficient = addOptionalTerms([
    scalarCoefficientNode(numerator.constant),
    squareOverCharacteristic,
  ]);
  const fCoefficient = negateMathJsonNode(squareOverCharacteristic);
  const antiderivativeNode = addOptionalTerms([
    multiplyCoefficient(
      piCoefficient,
      ellipticPiNode(variable, parts.characteristic, parts.parameter),
    ),
    multiplyCoefficient(fCoefficient, ellipticFNode(variable, parts.parameter)),
  ]);
  if (!antiderivativeNode) {
    return undefined;
  }

  const characteristicFact = nonzeroParameterFact(parts.characteristic);
  return buildRule({
    antiderivativeNode,
    facts: [
      ...thirdKindFacts(parts.product, parts.characteristicFactor, variable),
      ...(characteristicFact ? [characteristicFact] : []),
    ],
    basisKinds: ['third-kind', 'first-kind'],
    variable,
  });
}

export function tryAlgebraicGenus1RationalInRadicalHermiteRule(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1RationalInRadicalHermiteRule | undefined {
  return (
    tryFirstKindEvenNumerator(node, variable)
    ?? tryThirdKindEvenNumerator(node, variable)
  );
}
