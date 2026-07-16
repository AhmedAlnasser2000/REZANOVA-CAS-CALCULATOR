import {
  buildExactPolynomialFromCoefficients,
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialToLatex,
  exactPolynomialToNode,
  exactScalarToNumber,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  normalizeExactScalar,
  parseExactPolynomial,
  subtractExactScalars,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { boxLatex, wrapGroupedLatex } from '../patterns';

const EXACT_ONE = { numerator: 1, denominator: 1 };

export type CompletedSquareQuadraticDenominator = {
  baseLatex: string;
  baseScale: ExactScalar;
  constant: ExactScalar;
  constantRoot: ExactScalar | undefined;
  affine: {
    slope: ExactScalar;
    offset: ExactScalar;
    latex: string;
    node: unknown;
  };
};

function exactScalarLatex(value: ExactScalar) {
  return boxLatex(buildExactScalarNode(value));
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

export function completedSquareQuadraticDenominatorForm(
  base: unknown,
  variable: string,
): CompletedSquareQuadraticDenominator | undefined {
  const polynomial = parseExactPolynomial(base, variable, 2);
  if (!polynomial || exactPolynomialDegree(polynomial) !== 2) {
    return undefined;
  }

  const leading = getExactPolynomialCoefficient(polynomial, 2);
  if (exactScalarToNumber(leading) <= 0) {
    return undefined;
  }

  const linear = getExactPolynomialCoefficient(polynomial, 1);
  const constantTerm = getExactPolynomialCoefficient(polynomial, 0);
  const doubleLeading = multiplyExactScalars({ numerator: 2, denominator: 1 }, leading);
  const shift = divideExactScalars(linear, doubleLeading);
  const normalizedConstant = divideExactScalars(constantTerm, leading);
  if (!shift || !normalizedConstant) {
    return undefined;
  }

  const completedConstant = subtractExactScalars(
    normalizedConstant,
    multiplyExactScalars(shift, shift),
  );
  if (exactScalarToNumber(completedConstant) <= 0) {
    return undefined;
  }

  const affinePolynomial = buildExactPolynomialFromCoefficients(variable, [EXACT_ONE, shift]);
  const affine = {
    slope: EXACT_ONE,
    offset: shift,
    latex: exactPolynomialToLatex(affinePolynomial),
    node: exactPolynomialToNode(affinePolynomial),
  };

  return {
    baseLatex: `${wrapGroupedLatex(affine.latex)}^{2}+${exactScalarLatex(completedConstant)}`,
    baseScale: leading,
    constant: completedConstant,
    constantRoot: scalarSquareRoot(completedConstant),
    affine,
  };
}
