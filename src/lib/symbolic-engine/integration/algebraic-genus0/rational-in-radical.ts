import type { AntiderivativeBackcheck } from '../../../calculus/engine/verification';
import {
  addExactScalars,
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  normalizeExactScalar,
  parseExactPolynomial,
  subtractExactScalars,
  type ExactScalar,
} from '../../../algebra/polynomial-core';
import {
  addMathJsonNodes,
  divideMathJsonNodes,
  multiplyMathJsonNodes,
  negateMathJsonNode,
  simplifyMathJsonNodeOrOriginal,
} from '../../primitives/simplification/simplification';
import { boxLatex, isNodeArray } from '../../patterns';
import { normalizeGeneratedIntegrationLatex } from '../readback-hygiene';
import {
  algebraicGenus0BranchValidityFact,
  algebraicGenus0FactsToExactSupplementLatex,
} from './facts';
import { parseAlgebraicGenus0StandardQuadratic } from './inverse-readback';
import { profileSymbolicIntegrationResult } from '../../../display/printer';

export type AlgebraicGenus0RationalInRadicalRule = {
  antiderivativeNode: unknown;
  exactLatex: string;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex: string[];
};

type QuotientOverRadical = {
  numerator: unknown;
  radicand: unknown;
};

const TWO: ExactScalar = { numerator: 2, denominator: 1 };

function exactNode(value: ExactScalar) {
  return buildExactScalarNode(normalizeExactScalar(value));
}

function proof(): AntiderivativeBackcheck {
  return {
    status: 'verified-exact',
    reason: 'verified by algebraic genus-0 rational-in-radical decomposition rule proof',
  };
}

function quotientOverRadical(node: unknown): QuotientOverRadical | undefined {
  if (
    isNodeArray(node)
    && node[0] === 'Divide'
    && node.length === 3
    && isNodeArray(node[2])
    && node[2][0] === 'Sqrt'
    && node[2].length === 2
  ) {
    return { numerator: node[1], radicand: node[2][1] };
  }

  return undefined;
}

function scaledNode(coefficient: ExactScalar, node: unknown): unknown | undefined {
  const normalized = normalizeExactScalar(coefficient);
  if (exactScalarIsZero(normalized)) {
    return undefined;
  }
  return multiplyMathJsonNodes(exactNode(normalized), node);
}

function addOptionalTerms(terms: Array<unknown | undefined>) {
  const present = terms.filter((term): term is unknown => term !== undefined);
  return present.length === 0
    ? undefined
    : simplifyMathJsonNodeOrOriginal(addMathJsonNodes(...present));
}

function divideOrStop(left: ExactScalar, right: ExactScalar) {
  return divideExactScalars(left, right);
}

function decomposeNumeratorInShiftedVariable(
  numerator: unknown,
  radicand: unknown,
  variable: string,
) {
  const numeratorPolynomial = parseExactPolynomial(numerator, variable, 2);
  const quadratic = parseAlgebraicGenus0StandardQuadratic(radicand, variable);
  if (!numeratorPolynomial || !quadratic || exactPolynomialDegree(numeratorPolynomial) > 2) {
    return undefined;
  }

  const p2 = getExactPolynomialCoefficient(numeratorPolynomial, 2);
  const p1 = getExactPolynomialCoefficient(numeratorPolynomial, 1);
  const p0 = getExactPolynomialCoefficient(numeratorPolynomial, 0);
  const k = quadratic.rootAbsLeading;
  const h = multiplyExactScalars(k, quadratic.shift);
  const kSquared = multiplyExactScalars(k, k);
  const hSquared = multiplyExactScalars(h, h);

  const y2 = divideOrStop(p2, kSquared);
  const p1OverK = divideOrStop(p1, k);
  const twoP2HOverK2 = divideOrStop(multiplyExactScalars(TWO, multiplyExactScalars(p2, h)), kSquared);
  const p2H2OverK2 = divideOrStop(multiplyExactScalars(p2, hSquared), kSquared);
  const p1HOverK = divideOrStop(multiplyExactScalars(p1, h), k);
  if (!y2 || !p1OverK || !twoP2HOverK2 || !p2H2OverK2 || !p1HOverK) {
    return undefined;
  }

  const y1 = subtractExactScalars(p1OverK, twoP2HOverK2);
  const y0 = addExactScalars(subtractExactScalars(p0, p1HOverK), p2H2OverK2);
  return { quadratic, y2, y1, y0 };
}

function inverseFunctionNode(input: {
  family: 'minus' | 'outside' | 'plus';
  shiftedVariable: unknown;
  radius: ExactScalar;
}) {
  const radiusNode = exactNode(input.radius);
  return [
    input.family === 'minus' ? 'Arcsin' : input.family === 'plus' ? 'Arsinh' : 'Arcosh',
    divideMathJsonNodes(input.shiftedVariable, ['Sqrt', radiusNode]),
  ];
}

function reciprocalPrimitive(input: {
  family: 'minus' | 'outside' | 'plus';
  shiftedVariable: unknown;
  radius: ExactScalar;
  slope: ExactScalar;
}) {
  return divideMathJsonNodes(inverseFunctionNode(input), exactNode(input.slope));
}

function squareNumeratorPrimitive(input: {
  family: 'minus' | 'outside' | 'plus';
  shiftedVariable: unknown;
  radicand: unknown;
  radius: ExactScalar;
  slope: ExactScalar;
}) {
  const inverse = inverseFunctionNode(input);
  const shiftedRadical = multiplyMathJsonNodes(input.shiftedVariable, ['Sqrt', input.radicand]);
  const radiusInverse = multiplyMathJsonNodes(exactNode(input.radius), inverse);
  const denominator = multiplyMathJsonNodes(2, exactNode(input.slope));
  if (input.family === 'plus') {
    return divideMathJsonNodes(
      addMathJsonNodes(shiftedRadical, negateMathJsonNode(radiusInverse)),
      denominator,
    );
  }
  if (input.family === 'minus') {
    return divideMathJsonNodes(
      addMathJsonNodes(radiusInverse, negateMathJsonNode(shiftedRadical)),
      denominator,
    );
  }
  return divideMathJsonNodes(addMathJsonNodes(shiftedRadical, radiusInverse), denominator);
}

function linearNumeratorPrimitive(input: {
  family: 'minus' | 'outside' | 'plus';
  radicand: unknown;
  slope: ExactScalar;
}) {
  const primitive = divideMathJsonNodes(['Sqrt', input.radicand], exactNode(input.slope));
  return input.family === 'minus' ? negateMathJsonNode(primitive) : primitive;
}

function radicandSupplements(radicand: unknown) {
  return algebraicGenus0FactsToExactSupplementLatex([
    algebraicGenus0BranchValidityFact(
      boxLatex(simplifyMathJsonNodeOrOriginal(radicand)),
      '\\ge0',
    ),
  ]);
}

function tryQuadraticNumeratorOverStandardRadical(
  integrand: unknown,
  variable: string,
): AlgebraicGenus0RationalInRadicalRule | undefined {
  const shape = quotientOverRadical(integrand);
  if (!shape) {
    return undefined;
  }

  const decomposition = decomposeNumeratorInShiftedVariable(
    shape.numerator,
    shape.radicand,
    variable,
  );
  if (!decomposition) {
    return undefined;
  }

  const primitiveInput = {
    family: decomposition.quadratic.family,
    shiftedVariable: decomposition.quadratic.shiftedVariable,
    radicand: shape.radicand,
    radius: decomposition.quadratic.radius,
    slope: decomposition.quadratic.rootAbsLeading,
  };
  const squarePrimitive = squareNumeratorPrimitive({
    ...primitiveInput,
  });
  const linearPrimitive = linearNumeratorPrimitive({
    family: primitiveInput.family,
    radicand: shape.radicand,
    slope: primitiveInput.slope,
  });
  const constantPrimitive = reciprocalPrimitive(primitiveInput);
  const antiderivativeNode = addOptionalTerms([
    scaledNode(decomposition.y2, squarePrimitive),
    scaledNode(decomposition.y1, linearPrimitive),
    scaledNode(decomposition.y0, constantPrimitive),
  ]);
  if (!antiderivativeNode) {
    return undefined;
  }

  return profileSymbolicIntegrationResult({
    antiderivativeNode,
    exactLatex: normalizeGeneratedIntegrationLatex(boxLatex(antiderivativeNode), variable),
    verification: proof(),
    exactSupplementLatex: radicandSupplements(shape.radicand),
  });
}

export function tryAlgebraicGenus0RationalInRadicalRule(
  integrand: unknown,
  variable = 'x',
): AlgebraicGenus0RationalInRadicalRule | undefined {
  return tryQuadraticNumeratorOverStandardRadical(integrand, variable);
}
