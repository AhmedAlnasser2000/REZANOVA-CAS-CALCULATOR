import type { DisplayDetailSection } from '../../../types/calculator';
import {
  buildExactPolynomialFromCoefficients,
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialToLatex,
  exactPolynomialToNode,
  exactScalarIsZero,
  exactScalarToNumber,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  normalizeExactScalar,
  subtractExactScalars,
  type ExactPolynomial,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import type { AntiderivativeBackcheck } from '../../calculus/engine/verification';
import { boxLatex } from '../patterns';
import {
  integrationDetailSection,
  integrationMathRow,
  integrationTextRow,
} from './detail-readback';
import {
  coefficientTimesLatex,
  scaleByExactScalar,
} from './rational-latex';

const EXACT_TWO = { numerator: 2, denominator: 1 };
const EXACT_FOUR = { numerator: 4, denominator: 1 };

type PositiveDiscriminantQuadraticRemainderPrimitive = {
  exactLatex: string;
  antiderivativeNode: unknown;
};

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

function positiveScalarSqrtLatex(value: ExactScalar) {
  const exactRoot = scalarSquareRoot(value);
  if (exactRoot) {
    return exactScalarLatex(exactRoot);
  }

  return `\\sqrt{${exactScalarLatex(value)}}`;
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

function scalarIsOne(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.numerator === normalized.denominator;
}

function scaleNode(node: unknown, coefficient: ExactScalar): unknown {
  const normalized = normalizeExactScalar(coefficient);
  if (scalarIsOne(normalized)) {
    return node;
  }
  if (normalized.numerator === -normalized.denominator) {
    return ['Negate', node];
  }
  return ['Multiply', buildExactScalarNode(normalized), node];
}

function positiveScalarSqrtNode(value: ExactScalar): unknown {
  const root = scalarSquareRoot(value);
  return root ? buildExactScalarNode(root) : ['Sqrt', buildExactScalarNode(value)];
}

export function buildPositiveDiscriminantQuadraticRemainder(input: {
  numerator: ExactPolynomial;
  denominator: ExactPolynomial;
  variable: string;
}): PositiveDiscriminantQuadraticRemainderPrimitive | undefined {
  if (
    exactPolynomialDegree(input.numerator) > 1
    || exactPolynomialDegree(input.denominator) !== 2
  ) {
    return undefined;
  }

  const a = getExactPolynomialCoefficient(input.denominator, 2);
  const b = getExactPolynomialCoefficient(input.denominator, 1);
  const c = getExactPolynomialCoefficient(input.denominator, 0);
  if (exactScalarIsZero(a)) {
    return undefined;
  }

  const discriminant = subtractExactScalars(
    multiplyExactScalars(b, b),
    multiplyExactScalars(EXACT_FOUR, multiplyExactScalars(a, c)),
  );
  if (exactScalarToNumber(discriminant) <= 0) {
    return undefined;
  }

  const slope = getExactPolynomialCoefficient(input.numerator, 1);
  const offset = getExactPolynomialCoefficient(input.numerator, 0);
  const twoA = multiplyExactScalars(EXACT_TWO, a);
  const logCoefficient = divideExactScalars(slope, twoA);
  if (!logCoefficient) {
    return undefined;
  }

  const residual = subtractExactScalars(offset, multiplyExactScalars(logCoefficient, b));
  const pieces: string[] = [];
  const nodes: unknown[] = [];
  if (!exactScalarIsZero(logCoefficient)) {
    pieces.push(scaleByExactScalar(
      `\\ln\\left|${exactPolynomialToLatex(input.denominator)}\\right|`,
      logCoefficient,
    ));
    nodes.push(scaleNode(
      ['Ln', ['Abs', exactPolynomialToNode(input.denominator)]],
      logCoefficient,
    ));
  }

  if (!exactScalarIsZero(residual)) {
    const center = buildExactPolynomialFromCoefficients(input.variable, [twoA, b]);
    const centerLatex = exactPolynomialToLatex(center);
    const centerNode = exactPolynomialToNode(center);
    const root = scalarSquareRoot(discriminant);
    const rootLatex = positiveScalarSqrtLatex(discriminant);
    const rootNode = root ? buildExactScalarNode(root) : positiveScalarSqrtNode(discriminant);
    const ratioLog = `\\ln\\left|\\frac{${centerLatex}-${rootLatex}}{${centerLatex}+${rootLatex}}\\right|`;
    const scaled = root
      ? scaleByExactScalar(ratioLog, divideExactScalars(residual, root) ?? residual)
      : scaleByIrrationalDenominator(ratioLog, residual, rootLatex);
    if (!scaled) {
      return undefined;
    }
    pieces.push(scaled);
    const ratioNode = [
      'Divide',
      ['Subtract', structuredClone(centerNode), structuredClone(rootNode)],
      ['Add', structuredClone(centerNode), structuredClone(rootNode)],
    ];
    const ratioLogNode = ['Ln', ['Abs', ratioNode]];
    const node = root
      ? scaleNode(ratioLogNode, divideExactScalars(residual, root) ?? residual)
      : ['Divide', scaleNode(ratioLogNode, residual), rootNode];
    nodes.push(node);
  }

  const exactLatex = joinAdditiveLatex(pieces);
  return exactLatex && nodes.length > 0
    ? {
        exactLatex,
        antiderivativeNode: nodes.length === 1 ? nodes[0] : ['Add', ...nodes],
      }
    : undefined;
}

export function polynomialDivisionDetail(input: {
  originalNode: unknown;
  quotient: ExactPolynomial;
  remainder: ExactPolynomial;
  denominator: ExactPolynomial;
}): DisplayDetailSection {
  return integrationDetailSection('Integration Polynomial Division', [
    integrationMathRow('Original rational integrand: ', boxLatex(input.originalNode)),
    integrationMathRow('Polynomial quotient: ', exactPolynomialToLatex(input.quotient)),
    integrationMathRow('Remainder: ', exactPolynomialToLatex(input.remainder)),
    integrationMathRow('Denominator: ', exactPolynomialToLatex(input.denominator)),
    integrationTextRow('Remainder integrated through a bounded positive-discriminant quadratic log split before derivative backcheck.'),
  ]);
}

export function exactTemplateProofAfterBackcheck(
  verification: AntiderivativeBackcheck,
  reason: string,
): AntiderivativeBackcheck | undefined {
  return verification.status === 'verified-exact'
    || verification.status === 'verified-numeric-confidence'
    ? { status: 'verified-exact', reason }
    : undefined;
}
