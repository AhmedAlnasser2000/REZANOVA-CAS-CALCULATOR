import type { ExactScalar } from '../algebra/polynomial-core';
import {
  addExactScalars,
  divideExactScalars,
  exactScalarIsZero,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  subtractExactScalars,
} from '../algebra/polynomial-core';

export type EquationExactQuadraticBoundaryRoot = {
  value: ExactScalar;
  multiplicity: 1 | 2;
  latex: string;
};

export type EquationExactQuadraticBoundaryRequest = {
  variable: string;
  coefficients: {
    quadratic: ExactScalar;
    linear: ExactScalar;
    constant: ExactScalar;
  };
  source: 'matrix-eigen-2x2';
};

export type EquationExactQuadraticBoundaryResult =
  | {
      kind: 'success';
      roots: EquationExactQuadraticBoundaryRoot[];
      discriminant: ExactScalar;
      equationLatex: string;
    }
  | {
      kind: 'unsupported';
      reason: 'not-quadratic' | 'irrational-real-roots' | 'complex-roots' | 'unsafe-discriminant';
      message: string;
      discriminant?: ExactScalar;
      equationLatex: string;
    };

function scalarLatex(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  if (normalized.denominator === 1) {
    return `${normalized.numerator}`;
  }

  const sign = normalized.numerator < 0 ? '-' : '';
  return `${sign}\\frac{${Math.abs(normalized.numerator)}}{${normalized.denominator}}`;
}

function absScalar(value: ExactScalar): ExactScalar {
  const normalized = normalizeExactScalar(value);
  return {
    numerator: Math.abs(normalized.numerator),
    denominator: normalized.denominator,
  };
}

function isOne(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.numerator === 1 && normalized.denominator === 1;
}

function isNegative(value: ExactScalar) {
  return normalizeExactScalar(value).numerator < 0;
}

function signedTerm(value: ExactScalar, body: string, isFirst: boolean) {
  const normalized = normalizeExactScalar(value);
  if (exactScalarIsZero(normalized)) {
    return null;
  }

  const sign = isNegative(normalized) ? '-' : '+';
  const coefficient = absScalar(normalized);
  const term = body
    ? `${isOne(coefficient) ? '' : scalarLatex(coefficient)}${body}`
    : scalarLatex(coefficient);

  return isFirst
    ? sign === '-' ? `-${term}` : term
    : `${sign}${term}`;
}

function equationLatex(
  variable: string,
  coefficients: EquationExactQuadraticBoundaryRequest['coefficients'],
) {
  const terms = [
    signedTerm(coefficients.quadratic, `${variable}^{2}`, true),
    signedTerm(coefficients.linear, variable, false),
    signedTerm(coefficients.constant, '', false),
  ].filter((term): term is string => Boolean(term));

  return `${terms.length > 0 ? terms.join('') : '0'}=0`;
}

function squareRootExactRational(value: ExactScalar): ExactScalar | null {
  const normalized = normalizeExactScalar(value);
  if (normalized.numerator < 0) {
    return null;
  }

  const numeratorRoot = Math.sqrt(normalized.numerator);
  const denominatorRoot = Math.sqrt(normalized.denominator);
  if (!Number.isSafeInteger(numeratorRoot) || !Number.isSafeInteger(denominatorRoot)) {
    return null;
  }

  return normalizeExactScalar({
    numerator: numeratorRoot,
    denominator: denominatorRoot,
  });
}

function quadraticDiscriminant(input: EquationExactQuadraticBoundaryRequest['coefficients']) {
  return subtractExactScalars(
    multiplyExactScalars(input.linear, input.linear),
    multiplyExactScalars(
      { numerator: 4, denominator: 1 },
      multiplyExactScalars(input.quadratic, input.constant),
    ),
  );
}

function rootValue(
  numerator: ExactScalar,
  denominator: ExactScalar,
): ExactScalar | null {
  return divideExactScalars(numerator, denominator);
}

export function solveEquationExactQuadraticBoundary(
  request: EquationExactQuadraticBoundaryRequest,
): EquationExactQuadraticBoundaryResult {
  const coefficients = {
    quadratic: normalizeExactScalar(request.coefficients.quadratic),
    linear: normalizeExactScalar(request.coefficients.linear),
    constant: normalizeExactScalar(request.coefficients.constant),
  };
  const formattedEquation = equationLatex(request.variable, coefficients);

  if (exactScalarIsZero(coefficients.quadratic)) {
    return {
      kind: 'unsupported',
      reason: 'not-quadratic',
      message: 'The typed Equation polynomial boundary expected a quadratic polynomial.',
      equationLatex: formattedEquation,
    };
  }

  const discriminant = quadraticDiscriminant(coefficients);
  if (normalizeExactScalar(discriminant).numerator < 0) {
    return {
      kind: 'unsupported',
      reason: 'complex-roots',
      message: 'This exact quadratic has complex roots.',
      discriminant,
      equationLatex: formattedEquation,
    };
  }

  const squareRoot = squareRootExactRational(discriminant);
  if (!squareRoot) {
    return {
      kind: 'unsupported',
      reason: 'irrational-real-roots',
      message: 'This exact quadratic has real roots that are not rational.',
      discriminant,
      equationLatex: formattedEquation,
    };
  }

  const denominator = multiplyExactScalars({ numerator: 2, denominator: 1 }, coefficients.quadratic);
  const negativeB = negateExactScalar(coefficients.linear);
  const left = rootValue(subtractExactScalars(negativeB, squareRoot), denominator);
  const right = rootValue(addExactScalars(negativeB, squareRoot), denominator);
  if (!left || !right) {
    return {
      kind: 'unsupported',
      reason: 'unsafe-discriminant',
      message: 'This exact quadratic could not be divided safely.',
      discriminant,
      equationLatex: formattedEquation,
    };
  }

  const normalizedLeft = normalizeExactScalar(left);
  const normalizedRight = normalizeExactScalar(right);
  if (
    normalizedLeft.numerator === normalizedRight.numerator
    && normalizedLeft.denominator === normalizedRight.denominator
  ) {
    return {
      kind: 'success',
      roots: [{
        value: normalizedLeft,
        multiplicity: 2,
        latex: scalarLatex(normalizedLeft),
      }],
      discriminant,
      equationLatex: formattedEquation,
    };
  }

  return {
    kind: 'success',
    roots: [normalizedLeft, normalizedRight].map((value) => ({
      value,
      multiplicity: 1,
      latex: scalarLatex(value),
    })),
    discriminant,
    equationLatex: formattedEquation,
  };
}
