import type { ExactScalar } from './types';

export function greatestCommonDivisor(left: number, right: number) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

export function normalizeExactScalar(value: ExactScalar): ExactScalar {
  if (value.denominator === 0) {
    return value;
  }

  if (value.numerator === 0) {
    return { numerator: 0, denominator: 1 };
  }

  const sign = value.denominator < 0 ? -1 : 1;
  const numerator = value.numerator * sign;
  const denominator = Math.abs(value.denominator);
  const divisor = greatestCommonDivisor(numerator, denominator);
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  };
}

export function negateExactScalar(value: ExactScalar): ExactScalar {
  return {
    numerator: -value.numerator,
    denominator: value.denominator,
  };
}

export function exactScalarEquals(left: ExactScalar, right: ExactScalar) {
  const normalizedLeft = normalizeExactScalar(left);
  const normalizedRight = normalizeExactScalar(right);
  return normalizedLeft.numerator === normalizedRight.numerator
    && normalizedLeft.denominator === normalizedRight.denominator;
}

export function exactScalarIsZero(value: ExactScalar) {
  return normalizeExactScalar(value).numerator === 0;
}

export function addExactScalars(left: ExactScalar, right: ExactScalar): ExactScalar {
  return normalizeExactScalar({
    numerator: left.numerator * right.denominator + right.numerator * left.denominator,
    denominator: left.denominator * right.denominator,
  });
}

export function subtractExactScalars(left: ExactScalar, right: ExactScalar): ExactScalar {
  return addExactScalars(left, negateExactScalar(right));
}

export function multiplyExactScalars(left: ExactScalar, right: ExactScalar): ExactScalar {
  return normalizeExactScalar({
    numerator: left.numerator * right.numerator,
    denominator: left.denominator * right.denominator,
  });
}

export function divideExactScalars(left: ExactScalar, right: ExactScalar): ExactScalar | null {
  if (right.numerator === 0) {
    return null;
  }

  return normalizeExactScalar({
    numerator: left.numerator * right.denominator,
    denominator: left.denominator * right.numerator,
  });
}

export function exactScalarToNumber(value: ExactScalar) {
  return value.numerator / value.denominator;
}

export function lcm(left: number, right: number) {
  if (left === 0 || right === 0) {
    return 0;
  }
  return Math.abs(left * right) / greatestCommonDivisor(left, right);
}

