import {
  buildExactScalarNode,
  divideExactScalars,
  readExactScalarNode,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { parseExactAffineArgument } from '../../symbolic-engine/integration/exact-parts';
import { sameNode } from '../../symbolic-engine/integration/node-helpers';
import { scaleStandardMathJson } from './antiderivative-standard-math';

const EXACT_ONE: ExactScalar = { numerator: 1, denominator: 1 };

function dependsOnVariable(node: unknown, variable: string): boolean {
  if (node === variable) return true;
  return Array.isArray(node) && node.some((child, index) =>
    index > 0 && dependsOnVariable(child, variable));
}

function targetFree(node: unknown, variable: string) {
  return !dependsOnVariable(node, variable);
}

function divideNode(numerator: unknown, denominator: unknown): unknown {
  return denominator === 1 ? numerator : ['Divide', numerator, denominator];
}

export function flattenProductFactors(node: unknown): unknown[] {
  return Array.isArray(node) && node[0] === 'Multiply'
    ? node.slice(1).flatMap(flattenProductFactors)
    : [node];
}

function symbolicProduct(factors: unknown[]): unknown {
  const meaningful = factors.filter((factor) => {
    const scalar = readExactScalarNode(factor);
    return !scalar || scalar.numerator !== scalar.denominator;
  });
  return meaningful.length === 0
    ? 1
    : meaningful.length === 1
      ? meaningful[0]
      : ['Multiply', ...meaningful];
}

function symbolicLinearSlope(node: unknown, variable: string): unknown | undefined {
  if (node === variable) return 1;
  if (Array.isArray(node) && node[0] === 'Negate' && node.length === 2) {
    const slope = symbolicLinearSlope(node[1], variable);
    return slope === undefined ? undefined : ['Negate', slope];
  }
  if (Array.isArray(node) && node[0] === 'Divide' && node.length === 3 && targetFree(node[2], variable)) {
    const numeratorSlope = symbolicLinearSlope(node[1], variable);
    return numeratorSlope === undefined ? undefined : divideNode(numeratorSlope, node[2]);
  }
  if (!Array.isArray(node) || node[0] !== 'Multiply') return undefined;
  const factors = flattenProductFactors(node);
  const variableFactors = factors.filter((factor) => factor === variable);
  const coefficientFactors = factors.filter((factor) => factor !== variable);
  return variableFactors.length === 1
    && coefficientFactors.length > 0
    && coefficientFactors.every((factor) => targetFree(factor, variable))
    ? symbolicProduct(coefficientFactors)
    : undefined;
}

export function scaledByLinearSlope(
  primitive: unknown,
  argument: unknown,
  variable: string,
): unknown | undefined {
  const exactAffine = parseExactAffineArgument(argument, variable);
  if (exactAffine) {
    const reciprocal = divideExactScalars(EXACT_ONE, exactAffine.slope);
    return reciprocal
      ? scaleStandardMathJson(buildExactScalarNode(reciprocal), primitive)
      : undefined;
  }
  const slope = symbolicLinearSlope(argument, variable);
  return slope === undefined
    ? undefined
    : scaleStandardMathJson(['Divide', 1, slope], primitive);
}

export function repeatedSinCosProductAsPower(node: unknown): unknown | undefined {
  if (!Array.isArray(node) || node[0] !== 'Multiply' || node.length < 3) return undefined;
  const factors = node.slice(1).flatMap(flattenProductFactors);
  const first = factors[0];
  if (
    !Array.isArray(first)
    || first.length !== 2
    || (first[0] !== 'Sin' && first[0] !== 'Cos')
  ) {
    return undefined;
  }
  return factors.length > 1 && factors.every((factor) => sameNode(factor, first))
    ? ['Power', structuredClone(first), factors.length]
    : undefined;
}
