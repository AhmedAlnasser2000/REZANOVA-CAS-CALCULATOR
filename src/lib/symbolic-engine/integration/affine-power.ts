import {
  divideExactScalars,
  buildExactScalarNode,
  exactPolynomialDegree,
  exactPolynomialToLatex,
  exactPolynomialToNode,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  parseExactPolynomial,
  readExactScalarNode,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { wrapGroupedLatex } from '../patterns';
import { scaleByExactScalar } from './rational';

const MAX_AFFINE_POWER_ABS_EXPONENT = 12;

function exactInteger(node: unknown) {
  const scalar = readExactScalarNode(node);
  if (!scalar || scalar.denominator !== 1) {
    return undefined;
  }

  return scalar.numerator;
}

function reciprocalCoefficient(value: ExactScalar) {
  return divideExactScalars({ numerator: 1, denominator: 1 }, value);
}

function affinePowerAntiderivative(
  base: unknown,
  exponent: number,
  variable: string,
) {
  if (
    !Number.isInteger(exponent)
    || Math.abs(exponent) > MAX_AFFINE_POWER_ABS_EXPONENT
  ) {
    return undefined;
  }

  const affine = parseExactPolynomial(base, variable, 1);
  if (!affine || exactPolynomialDegree(affine) !== 1) {
    return undefined;
  }

  const slope = getExactPolynomialCoefficient(affine, 1);
  if (exactScalarIsZero(slope)) {
    return undefined;
  }

  const affineLatex = exactPolynomialToLatex(affine);
  const affineNode = exactPolynomialToNode(affine);
  if (exponent === -1) {
    const coefficient = reciprocalCoefficient(slope);
    return coefficient
      ? {
          exactLatex: scaleByExactScalar(`\\ln\\left|${wrapGroupedLatex(affineLatex)}\\right|`, coefficient),
          antiderivativeNode: [
            'Multiply',
            buildExactScalarNode(coefficient),
            ['Ln', ['Abs', affineNode]],
          ],
        }
      : undefined;
  }

  const nextExponent = exponent + 1;
  if (nextExponent === 0) {
    return undefined;
  }

  const denominator = multiplyExactScalars(slope, {
    numerator: nextExponent,
    denominator: 1,
  });
  const coefficient = reciprocalCoefficient(denominator);
  if (!coefficient) {
    return undefined;
  }

  const powered = nextExponent === 1
    ? wrapGroupedLatex(affineLatex)
    : `${wrapGroupedLatex(affineLatex)}^{${nextExponent}}`;
  return {
    exactLatex: scaleByExactScalar(powered, coefficient),
    antiderivativeNode: [
      'Multiply',
      buildExactScalarNode(coefficient),
      nextExponent === 1 ? affineNode : ['Power', affineNode, nextExponent],
    ],
  };
}

export function tryAffinePowerRule(node: unknown, variable: string) {
  if (Array.isArray(node) && node[0] === 'Power' && node.length === 3) {
    const exponent = exactInteger(node[2]);
    return exponent === undefined
      ? undefined
      : affinePowerAntiderivative(node[1], exponent, variable);
  }

  if (Array.isArray(node) && node[0] === 'Divide' && node.length === 3 && node[1] === 1) {
    return affinePowerAntiderivative(node[2], -1, variable);
  }

  return affinePowerAntiderivative(node, 1, variable);
}
