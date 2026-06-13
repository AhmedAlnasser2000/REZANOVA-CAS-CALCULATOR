import type { ExactScalar } from '../../algebra/polynomial-core';
import { isNodeArray } from '../patterns';

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a === 0 ? 1 : a;
}

export function normalizeScalar(numerator: number, denominator: number): ExactScalar | null {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) {
    return null;
  }

  if (numerator === 0) {
    return { numerator: 0, denominator: 1 };
  }

  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  return {
    numerator: (sign * numerator) / divisor,
    denominator: Math.abs(denominator) / divisor,
  };
}

export function addScalars(left: ExactScalar, right: ExactScalar): ExactScalar {
  return normalizeScalar(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  ) ?? { numerator: 0, denominator: 1 };
}

export function multiplyScalars(left: ExactScalar, right: ExactScalar): ExactScalar | null {
  return normalizeScalar(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
  );
}

export function divideScalars(left: ExactScalar, right: ExactScalar): ExactScalar | null {
  if (right.numerator === 0) {
    return null;
  }

  return normalizeScalar(
    left.numerator * right.denominator,
    left.denominator * right.numerator,
  );
}

export function powerScalar(scalar: ExactScalar, exponent: number): ExactScalar | null {
  if (!Number.isInteger(exponent) || exponent < 0) {
    return null;
  }

  return normalizeScalar(
    scalar.numerator ** exponent,
    scalar.denominator ** exponent,
  );
}

export function subtractScalars(left: ExactScalar, right: ExactScalar): ExactScalar | null {
  return normalizeScalar(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

export function isNonnegativeScalar(scalar: ExactScalar) {
  return scalar.numerator >= 0;
}

export function readPerfectSquareScalar(node: unknown): ExactScalar | null {
  const scalar = readExactScalar(node);
  if (!scalar || !isNonnegativeScalar(scalar)) {
    return null;
  }

  const sqrtNumerator = Math.round(Math.sqrt(scalar.numerator));
  const sqrtDenominator = Math.round(Math.sqrt(scalar.denominator));
  if (
    sqrtNumerator * sqrtNumerator !== scalar.numerator
    || sqrtDenominator * sqrtDenominator !== scalar.denominator
  ) {
    return null;
  }

  return normalizeScalar(sqrtNumerator, sqrtDenominator);
}

export function isExactIntegerNode(node: unknown): node is number {
  return typeof node === 'number' && Number.isFinite(node) && Number.isInteger(node);
}

export function readExactScalar(node: unknown): ExactScalar | null {
  if (isExactIntegerNode(node)) {
    return { numerator: node, denominator: 1 };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return null;
  }

  if (
    node[0] === 'Rational'
    && node.length === 3
    && isExactIntegerNode(node[1])
    && isExactIntegerNode(node[2])
  ) {
    return normalizeScalar(node[1], node[2]);
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = readExactScalar(node[1]);
    return child
      ? { numerator: -child.numerator, denominator: child.denominator }
      : null;
  }

  return null;
}
