import { ComputeEngine } from '@cortex-js/compute-engine';
import type { ExactScalar } from '../../algebra/polynomial-core';
import type { Monomial } from '../../algebra/radical-core';
import { isNodeArray } from '../patterns';
import { normalizeAst } from '../normalize';
import { normalizeScalar, readExactScalar } from './scalars';

const ce = new ComputeEngine();

export function buildScalarNode(scalar: ExactScalar): unknown {
  if (scalar.denominator === 1) {
    return scalar.numerator;
  }

  return ['Rational', scalar.numerator, scalar.denominator];
}

export function simplifyNode(node: unknown) {
  return normalizeAst(ce.box(node as Parameters<typeof ce.box>[0]).simplify().json);
}

export function buildPowerNode(base: unknown, exponent: number) {
  if (exponent === 1) {
    return base;
  }

  return ['Power', base, exponent];
}

export function buildProductNode(parts: unknown[]) {
  const flattened = parts.flatMap((part) =>
    isNodeArray(part) && part[0] === 'Multiply'
      ? part.slice(1)
      : [part]);

  if (flattened.length === 0) {
    return 1;
  }

  if (flattened.length === 1) {
    return flattened[0];
  }

  return ['Multiply', ...flattened];
}

export function buildRootNode(index: number, radicand: unknown) {
  if (radicand === 1) {
    return 1;
  }

  return index === 2 ? ['Sqrt', radicand] : ['Root', radicand, index];
}

export function containsRadical(node: unknown): boolean {
  if (!isNodeArray(node) || node.length === 0) {
    return false;
  }

  if (node[0] === 'Sqrt' || node[0] === 'Root') {
    return true;
  }

  return node.slice(1).some((child) => containsRadical(child));
}

export function buildMonomialNode(monomial: Monomial): unknown {
  const numeratorParts: unknown[] = [];
  const denominatorParts: unknown[] = [];

  if (monomial.scalar.numerator === 0) {
    return 0;
  }

  const sign = monomial.scalar.numerator < 0 ? -1 : 1;
  const numerator = Math.abs(monomial.scalar.numerator);
  if (numerator !== 1 || (!monomial.variable || monomial.exponent === 0)) {
    numeratorParts.push(sign === -1 ? -numerator : numerator);
  } else if (sign === -1) {
    numeratorParts.push(-1);
  }

  if (monomial.scalar.denominator !== 1) {
    denominatorParts.push(monomial.scalar.denominator);
  }

  if (monomial.variable && monomial.exponent !== 0) {
    const powerNode = buildPowerNode(monomial.variable, Math.abs(monomial.exponent));
    if (monomial.exponent > 0) {
      numeratorParts.push(powerNode);
    } else {
      denominatorParts.push(powerNode);
    }
  }

  const numeratorNode = buildProductNode(numeratorParts);
  const denominatorNode = buildProductNode(denominatorParts);

  if (denominatorNode === 1) {
    return numeratorNode;
  }

  return ['Divide', numeratorNode, denominatorNode];
}

function factorInteger(value: number) {
  const factors = new Map<number, number>();
  let remaining = value;
  let divisor = 2;

  while (divisor * divisor <= remaining) {
    while (remaining % divisor === 0) {
      factors.set(divisor, (factors.get(divisor) ?? 0) + 1);
      remaining /= divisor;
    }
    divisor += divisor === 2 ? 1 : 2;
  }

  if (remaining > 1) {
    factors.set(remaining, (factors.get(remaining) ?? 0) + 1);
  }

  return factors;
}

export function extractIntegerPerfectPower(value: number, index: number) {
  if (!Number.isInteger(value) || index < 2) {
    return null;
  }

  if (value === 0) {
    return { outside: 0, residual: 1 };
  }

  const isNegative = value < 0;
  if (isNegative && index % 2 === 0) {
    return null;
  }

  const factors = factorInteger(Math.abs(value));
  let outside = 1;
  let residual = 1;
  for (const [prime, exponent] of factors.entries()) {
    outside *= prime ** Math.floor(exponent / index);
    residual *= prime ** (exponent % index);
  }

  return {
    outside: isNegative ? -outside : outside,
    residual,
  };
}

export function buildAbsPowerNode(variable: string, exponent: number) {
  const absNode: unknown = ['Abs', variable];
  return exponent === 1 ? absNode : ['Power', absNode, exponent];
}

export function buildSimpleRootFromMonomial(monomial: Monomial, index: number): unknown {
  const parts: unknown[] = [];
  if (Math.abs(monomial.scalar.numerator) !== 1 || monomial.exponent === 0 || !monomial.variable) {
    parts.push(buildScalarNode(monomial.scalar));
  } else if (monomial.scalar.numerator === -1) {
    parts.push(-1);
  }

  if (monomial.variable && monomial.exponent !== 0) {
    parts.push(buildPowerNode(monomial.variable, Math.abs(monomial.exponent)));
  }

  const radicand = buildProductNode(parts);
  return buildRootNode(index, radicand);
}

export function composeQuotient(
  numeratorNode: unknown,
  denominatorNode: unknown,
): unknown {
  const denominatorScalar = readExactScalar(denominatorNode);
  if (denominatorScalar && denominatorScalar.numerator === 1 && denominatorScalar.denominator === 1) {
    return numeratorNode;
  }

  if (denominatorScalar && denominatorScalar.denominator === 1 && denominatorScalar.numerator < 0) {
    return composeQuotient(
      simplifyNode(['Negate', numeratorNode]),
      buildScalarNode({ numerator: -denominatorScalar.numerator, denominator: 1 }),
    );
  }

  if (denominatorScalar) {
    const reciprocal = normalizeScalar(denominatorScalar.denominator, denominatorScalar.numerator);
    if (reciprocal) {
      return buildProductNode([buildScalarNode(reciprocal), numeratorNode]);
    }
  }

  return ['Divide', numeratorNode, denominatorNode];
}

export function normalizeDivisionSign(node: unknown) {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return node;
  }

  const denominatorScalar = readExactScalar(node[2]);
  if (!denominatorScalar || denominatorScalar.denominator !== 1 || denominatorScalar.numerator >= 0) {
    return node;
  }

  return composeQuotient(
    normalizeAst(['Negate', node[1]]),
    buildScalarNode({ numerator: -denominatorScalar.numerator, denominator: 1 }),
  );
}
