import { readExactScalarNode } from '../../algebra/polynomial-core';
import {
  flattenMultiply,
  isNodeArray,
  wrapGroupedLatex,
} from '../patterns';
import { parseSymbolicAffine } from './symbolic-coefficients';
import { parseSymbolicQuadratic } from './symbolic-rational';

export type SymbolicQuadraticPowerReadinessFact = {
  expressionLatex: string;
  relation: '\\ne0' | '>0';
};

export type SymbolicQuadraticPowerReadiness =
  | {
    kind: 'ready';
    variable: string;
    family: 'symbolic-quadratic-repeated-power';
    numeratorDegree: 1;
    denominatorPower: 2 | 3;
    denominatorLatex: string;
    discriminantLatex: string;
    facts: SymbolicQuadraticPowerReadinessFact[];
    recurrencePlan: string[];
    adoption: 'live-route';
  }
  | {
    kind: 'stop';
    variable: string;
    reason:
      | 'branch-sensitive-carrier'
      | 'inexact-coefficient'
      | 'multiple-symbolic-quadratic-factors'
      | 'non-quadratic-denominator'
      | 'nonlinear-numerator'
      | 'not-rational'
      | 'power-one-live-route'
      | 'unsupported-power';
  };

function stop(
  variable: string,
  reason: Extract<SymbolicQuadraticPowerReadiness, { kind: 'stop' }>['reason'],
): SymbolicQuadraticPowerReadiness {
  return { kind: 'stop', variable, reason };
}

function exactInteger(node: unknown) {
  const scalar = readExactScalarNode(node);
  return scalar && scalar.denominator === 1 ? scalar.numerator : undefined;
}

function containsApproximateNumber(node: unknown): boolean {
  if (typeof node === 'number') {
    return Number.isFinite(node) && !Number.isInteger(node);
  }

  return isNodeArray(node) && node.slice(1).some(containsApproximateNumber);
}

function hasBranchSensitiveCarrier(node: unknown): boolean {
  if (!isNodeArray(node)) {
    return false;
  }

  if (node[0] === 'Abs' || node[0] === 'AbsoluteValue') {
    return true;
  }

  return node.slice(1).some(hasBranchSensitiveCarrier);
}

function symbolicQuadraticPower(node: unknown, variable: string) {
  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3) {
    const power = exactInteger(node[2]);
    const quadratic = parseSymbolicQuadratic(node[1], variable);
    return power && quadratic ? { power, quadratic } : undefined;
  }

  const quadratic = parseSymbolicQuadratic(node, variable);
  return quadratic ? { power: 1, quadratic } : undefined;
}

function hasMultipleQuadraticGroups(node: unknown, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return false;
  }

  return flattenMultiply(node)
    .filter((factor) => symbolicQuadraticPower(factor, variable))
    .length > 1;
}

export function profileSymbolicQuadraticPowerReadiness(
  node: unknown,
  variable: string,
): SymbolicQuadraticPowerReadiness {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return stop(variable, 'not-rational');
  }

  if (hasBranchSensitiveCarrier(node)) {
    return stop(variable, 'branch-sensitive-carrier');
  }

  if (containsApproximateNumber(node)) {
    return stop(variable, 'inexact-coefficient');
  }

  if (!parseSymbolicAffine(node[1], variable)) {
    return stop(variable, 'nonlinear-numerator');
  }

  if (hasMultipleQuadraticGroups(node[2], variable)) {
    return stop(variable, 'multiple-symbolic-quadratic-factors');
  }

  const denominator = symbolicQuadraticPower(node[2], variable);
  if (!denominator) {
    return stop(variable, 'non-quadratic-denominator');
  }

  if (denominator.power === 1) {
    return stop(variable, 'power-one-live-route');
  }

  if (denominator.power !== 2 && denominator.power !== 3) {
    return stop(variable, 'unsupported-power');
  }

  const { quadratic } = denominator;
  const discriminantLatex = `4${wrapGroupedLatex(quadratic.quadraticLatex)}${wrapGroupedLatex(quadratic.constantLatex)}-${wrapGroupedLatex(quadratic.linearLatex)}^{2}`;

  return {
    kind: 'ready',
    variable,
    family: 'symbolic-quadratic-repeated-power',
    numeratorDegree: 1,
    denominatorPower: denominator.power,
    denominatorLatex: quadratic.latex,
    discriminantLatex,
    facts: [
      { expressionLatex: quadratic.quadraticLatex, relation: '\\ne0' },
      { expressionLatex: discriminantLatex, relation: '>0' },
    ],
    recurrencePlan: [
      'split numerator into derivative and residual terms',
      'reduce residual reciprocal powers against the positive generic quadratic branch',
      'emit log/arctan terms with explicit multiplication readback and branch facts',
    ],
    adoption: 'live-route',
  };
}
