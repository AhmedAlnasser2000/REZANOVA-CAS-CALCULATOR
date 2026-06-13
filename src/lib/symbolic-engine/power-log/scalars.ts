import { isFiniteNumber, isNodeArray } from '../patterns';
import type { RationalValue } from './types';

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

export function reduceRational(numerator: number, denominator: number): RationalValue {
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  return {
    numerator: (sign * numerator) / divisor,
    denominator: Math.abs(denominator) / divisor,
  };
}

function collectVariables(node: unknown, variables: Set<string>) {
  if (typeof node === 'string') {
    if (node !== 'Pi' && node !== 'ExponentialE') {
      variables.add(node);
    }
    return;
  }

  if (!isNodeArray(node) || node.length === 0) {
    return;
  }

  for (let index = 1; index < node.length; index += 1) {
    collectVariables(node[index], variables);
  }
}

export function expressionHasVariable(node: unknown) {
  const variables = new Set<string>();
  collectVariables(node, variables);
  return variables.size > 0;
}

export function isExponentialE(node: unknown) {
  return node === 'ExponentialE';
}

export function asPositiveInteger(node: unknown): number | undefined {
  return isFiniteNumber(node) && Number.isInteger(node) && node > 1 ? node : undefined;
}

export function asRational(node: unknown): RationalValue | undefined {
  if (isFiniteNumber(node) && Number.isInteger(node)) {
    return { numerator: node, denominator: 1 };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return undefined;
  }

  const [head, left, right] = node;
  if (
    (head === 'Rational' || head === 'Divide')
    && isFiniteNumber(left)
    && Number.isInteger(left)
    && isFiniteNumber(right)
    && Number.isInteger(right)
    && right !== 0
  ) {
    return reduceRational(left, right);
  }

  return undefined;
}

export function readNumericConstant(node: unknown): number | undefined {
  if (isFiniteNumber(node)) {
    return node;
  }

  const rational = asRational(node);
  if (!rational) {
    return undefined;
  }

  return rational.numerator / rational.denominator;
}

export function exactPositiveBase(node: unknown) {
  const value = readNumericConstant(node);
  return value !== undefined && value > 0 && Math.abs(value - 1) > 1e-9;
}
