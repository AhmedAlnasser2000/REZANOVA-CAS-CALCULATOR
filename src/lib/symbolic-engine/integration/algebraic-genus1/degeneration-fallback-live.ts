import type { AntiderivativeBackcheck } from '../../../calculus/engine/verification';
import { resolveAntiderivativeRule } from '../../../calculus/engine/antiderivative-rules';
import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import {
  buildExactPolynomialFromCoefficients,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialToLatex,
  exactPolynomialToNode,
  exactScalarEquals,
  getExactPolynomialCoefficient,
  multiplyExactPolynomials,
  negateExactScalar,
  normalizeExactScalar,
  parseExactPolynomial,
  quadraticDiscriminant,
  readExactScalarNode,
  type ExactPolynomial,
  type ExactScalar,
} from '../../../algebra/polynomial-core';
import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import { isNodeArray } from '../../patterns';
import { tryRationalPartialFractionRule } from '../rational';
import type { IntegralStrategy } from '../types';
import { buildAlgebraicGenus1DegenerationFacts } from './degeneration-facts';

export type AlgebraicGenus1DegenerationFallbackRule = {
  exactLatex: string;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex: string[];
  detailSections: DisplayDetailSection[];
  strategy: IntegralStrategy;
  source: 'perfect-square-polynomial' | 'perfect-square-reciprocal-rational';
};

type DegenerationShape =
  | {
      kind: 'radical';
      radicand: unknown;
    }
  | {
      kind: 'reciprocal-radical';
      radicand: unknown;
    };

const ZERO: ExactScalar = { numerator: 0, denominator: 1 };
const TWO: ExactScalar = { numerator: 2, denominator: 1 };

function reciprocalRadicandFromSqrtBody(body: unknown) {
  if (isNodeArray(body) && body[0] === 'Divide' && body.length === 3 && body[1] === 1) {
    return body[2];
  }

  if (isNodeArray(body) && body[0] === 'Power' && body.length === 3) {
    const exponent = readExactScalarNode(body[2]);
    if (exponent && exponent.denominator === 1 && exponent.numerator < 0) {
      return ['Power', body[1], -exponent.numerator];
    }
  }

  return undefined;
}

function shapeOf(node: unknown): DegenerationShape | undefined {
  if (isNodeArray(node) && node[0] === 'Sqrt' && node.length === 2) {
    const reciprocalRadicand = reciprocalRadicandFromSqrtBody(node[1]);
    if (reciprocalRadicand) {
      return { kind: 'reciprocal-radical', radicand: reciprocalRadicand };
    }
    return { kind: 'radical', radicand: node[1] };
  }

  if (
    isNodeArray(node)
    && node[0] === 'Divide'
    && node.length === 3
    && node[1] === 1
    && isNodeArray(node[2])
    && node[2][0] === 'Sqrt'
    && node[2].length === 2
  ) {
    return { kind: 'reciprocal-radical', radicand: node[2][1] };
  }

  return undefined;
}

function exactScalarSquareRoot(value: ExactScalar): ExactScalar | undefined {
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

function exactScalarSign(value: ExactScalar) {
  return Math.sign(normalizeExactScalar(value).numerator);
}

function exactScalarsEqual(left: ExactScalar, right: ExactScalar) {
  return exactScalarEquals(normalizeExactScalar(left), normalizeExactScalar(right));
}

function exactPolynomialsEqual(left: ExactPolynomial, right: ExactPolynomial) {
  const degree = Math.max(exactPolynomialDegree(left), exactPolynomialDegree(right));
  for (let index = 0; index <= degree; index += 1) {
    if (!exactScalarsEqual(
      getExactPolynomialCoefficient(left, index),
      getExactPolynomialCoefficient(right, index),
    )) {
      return false;
    }
  }
  return true;
}

function constantRootCandidates(value: ExactScalar) {
  const root = exactScalarSquareRoot(value);
  if (!root) {
    return [];
  }
  if (exactScalarsEqual(root, ZERO)) {
    return [ZERO];
  }
  return [root, negateExactScalar(root)];
}

function exactQuarticSquareRoot(
  polynomial: ExactPolynomial,
): ExactPolynomial | undefined {
  if (exactPolynomialDegree(polynomial) !== 4) {
    return undefined;
  }

  const a = exactScalarSquareRoot(getExactPolynomialCoefficient(polynomial, 4));
  if (!a || exactScalarSign(a) <= 0) {
    return undefined;
  }

  const b = divideExactScalars(
    getExactPolynomialCoefficient(polynomial, 3),
    { numerator: TWO.numerator * a.numerator, denominator: a.denominator },
  );
  if (!b) {
    return undefined;
  }

  for (const c of constantRootCandidates(getExactPolynomialCoefficient(polynomial, 0))) {
    const candidate = buildExactPolynomialFromCoefficients(polynomial.variable, [a, b, c]);
    const squared = multiplyExactPolynomials(candidate, candidate, 4);
    if (squared && exactPolynomialsEqual(squared, polynomial)) {
      return candidate;
    }
  }

  return undefined;
}

function isGloballyNonnegativeQuadratic(polynomial: ExactPolynomial) {
  const degree = exactPolynomialDegree(polynomial);
  if (degree === 0) {
    return exactScalarSign(getExactPolynomialCoefficient(polynomial, 0)) >= 0;
  }

  if (degree !== 2) {
    return false;
  }

  const leading = getExactPolynomialCoefficient(polynomial, 2);
  const discriminant = quadraticDiscriminant(polynomial);
  return discriminant !== null
    && exactScalarSign(leading) > 0
    && exactScalarSign(discriminant) <= 0;
}

function proof(source: AlgebraicGenus1DegenerationFallbackRule['source']): AntiderivativeBackcheck {
  return {
    status: 'verified-exact',
    reason: source === 'perfect-square-polynomial'
      ? 'verified by exact genus-0 degeneration collapse of a nonnegative square radical'
      : 'verified by exact genus-0 degeneration collapse to a rational reciprocal',
  };
}

function supplementLatex(input: {
  squareFactorLatex: string;
  radicandLatex: string;
  reciprocal: boolean;
}) {
  return mergeExactSupplementLatex({
    entries: [
      {
        kind: 'condition',
        expressionLatex: input.squareFactorLatex,
        relation: '\\ge0',
        source: 'candidate-validation',
      },
      {
        kind: 'condition',
        expressionLatex: input.radicandLatex,
        relation: '\\ge0',
        source: 'radical-domain',
      },
      ...(input.reciprocal
        ? [{
            kind: 'exclusion' as const,
            expressionLatex: input.squareFactorLatex,
            relation: '\\ne0' as const,
            source: 'denominator' as const,
          }]
        : []),
    ],
    source: 'candidate-validation',
  });
}

function detailSection(input: {
  source: AlgebraicGenus1DegenerationFallbackRule['source'];
  radicandLatex: string;
  squareFactorLatex: string;
  exactLatex: string;
}) {
  return mixedDetailSection(
    'Genus-1 Degeneration Fallback',
    [
      [textPart('radicand: '), mathPart(input.radicandLatex)],
      [textPart('square factor: '), mathPart(input.squareFactorLatex)],
      [textPart('adopted answer: '), mathPart(input.exactLatex)],
      [
        textPart(input.source === 'perfect-square-polynomial'
          ? 'The repeated-root quartic collapses to a nonnegative genus-0 polynomial integrand.'
          : 'The repeated-root quartic collapses to a nonnegative genus-0 rational reciprocal integrand.'),
      ],
    ],
  );
}

export function tryAlgebraicGenus1DegenerationFallbackRule(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1DegenerationFallbackRule | undefined {
  const shape = shapeOf(node);
  if (!shape) {
    return undefined;
  }

  const degenerationNode = shape.kind === 'reciprocal-radical'
    ? ['Divide', 1, ['Sqrt', shape.radicand]]
    : node;
  const degeneration = buildAlgebraicGenus1DegenerationFacts(degenerationNode, variable);
  if (
    degeneration.kind !== 'success'
    || degeneration.classification !== 'repeated-root-genus0-degeneration'
  ) {
    return undefined;
  }

  const radicand = parseExactPolynomial(shape.radicand, variable, 4);
  if (!radicand) {
    return undefined;
  }

  const squareFactor = exactQuarticSquareRoot(radicand);
  if (!squareFactor || !isGloballyNonnegativeQuadratic(squareFactor)) {
    return undefined;
  }

  const radicandLatex = exactPolynomialToLatex(radicand);
  const squareFactorLatex = exactPolynomialToLatex(squareFactor);
  if (shape.kind === 'radical') {
    const exactLatex = resolveAntiderivativeRule(exactPolynomialToNode(squareFactor), variable);
    if (!exactLatex) {
      return undefined;
    }
    return {
      exactLatex,
      verification: proof('perfect-square-polynomial'),
      exactSupplementLatex: supplementLatex({
        squareFactorLatex,
        radicandLatex,
        reciprocal: false,
      }),
      detailSections: [detailSection({
        source: 'perfect-square-polynomial',
        radicandLatex,
        squareFactorLatex,
        exactLatex,
      })],
      strategy: 'u-substitution',
      source: 'perfect-square-polynomial',
    };
  }

  const reciprocalNode = ['Divide', 1, exactPolynomialToNode(squareFactor)];
  const rational = tryRationalPartialFractionRule(reciprocalNode, variable);
  if (!rational) {
    return undefined;
  }

  return {
    exactLatex: rational.exactLatex,
    verification: proof('perfect-square-reciprocal-rational'),
    exactSupplementLatex: supplementLatex({
      squareFactorLatex,
      radicandLatex,
      reciprocal: true,
    }),
    detailSections: [detailSection({
      source: 'perfect-square-reciprocal-rational',
      radicandLatex,
      squareFactorLatex,
      exactLatex: rational.exactLatex,
    })],
    strategy: 'partial-fractions',
    source: 'perfect-square-reciprocal-rational',
  };
}
