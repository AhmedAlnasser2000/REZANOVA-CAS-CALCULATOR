import type { LimitDirection, LimitTargetKind } from '../../../types/calculator';
import { isNodeArray } from '../patterns';
import { formatLimitNumberLatex, limitMethodSection } from './detail-readback';
import { box, evaluateNodeAt } from './evaluation';
import type { FiniteLimitRuleSuccess } from './types';

function nodeLatex(node: unknown) {
  try {
    return box(node).latex;
  } catch {
    return undefined;
  }
}

function expLatex(exponent: number) {
  if (Math.abs(exponent) < 1e-10) {
    return '1';
  }
  if (Math.abs(exponent - 1) < 1e-10) {
    return 'e';
  }

  return `e^{${formatLimitNumberLatex(exponent)}}`;
}

function success(
  value: number,
  exactLatex: string,
  lines: string[],
): FiniteLimitRuleSuccess {
  return {
    kind: 'success',
    value,
    exactLatex,
    origin: 'rule-based-symbolic',
    detailSections: limitMethodSection(...lines),
  };
}

function variablePowerAtZero(node: unknown, variable: string): number | undefined {
  if (node === variable) {
    return 1;
  }

  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === variable
    && typeof node[2] === 'number'
    && Number.isInteger(node[2])
    && node[2] > 0
  ) {
    return node[2];
  }

  return undefined;
}

function isLogOfVariable(node: unknown, variable: string) {
  return (
    isNodeArray(node)
    && (node[0] === 'Ln' || node[0] === 'Log')
    && node.length === 2
    && node[1] === variable
  );
}

function coefficientTimesVariable(node: unknown, variable: string): number | undefined {
  if (node === variable) {
    return 1;
  }

  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return undefined;
  }

  let coefficient = 1;
  let variableCount = 0;
  for (const factor of node.slice(1)) {
    if (typeof factor === 'number' && Number.isFinite(factor)) {
      coefficient *= factor;
      continue;
    }
    if (factor === variable) {
      variableCount += 1;
      continue;
    }
    return undefined;
  }

  return variableCount === 1 ? coefficient : undefined;
}

function coefficientOverVariable(node: unknown, variable: string): number | undefined {
  if (
    isNodeArray(node)
    && node[0] === 'Divide'
    && node.length === 3
    && typeof node[1] === 'number'
    && Number.isFinite(node[1])
    && node[2] === variable
  ) {
    return node[1];
  }

  return undefined;
}

function onePlusReciprocalCoefficient(node: unknown, variable: string): number | undefined {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return undefined;
  }

  let constantOne = false;
  let reciprocalCoefficient: number | undefined;
  for (const term of node.slice(1)) {
    if (term === 1) {
      constantOne = true;
      continue;
    }

    const coefficient = coefficientOverVariable(term, variable);
    if (coefficient === undefined || reciprocalCoefficient !== undefined) {
      return undefined;
    }
    reciprocalCoefficient = coefficient;
  }

  return constantOne && reciprocalCoefficient !== undefined
    ? reciprocalCoefficient
    : undefined;
}

function resolveZeroTimesLogInfinity(
  node: unknown,
  target: number,
  variable: string,
  direction: LimitDirection,
): FiniteLimitRuleSuccess | undefined {
  if (
    target !== 0
    || direction !== 'right'
    || !isNodeArray(node)
    || node[0] !== 'Multiply'
  ) {
    return undefined;
  }

  let logTerm: unknown | undefined;
  let zeroOrder: number | undefined;
  const otherFactors: unknown[] = [];

  for (const factor of node.slice(1)) {
    if (isLogOfVariable(factor, variable)) {
      logTerm = factor;
      continue;
    }

    const order = variablePowerAtZero(factor, variable);
    if (order !== undefined && zeroOrder === undefined) {
      zeroOrder = order;
      continue;
    }

    otherFactors.push(factor);
  }

  if (!logTerm || zeroOrder === undefined) {
    return undefined;
  }

  if (otherFactors.some((factor) => evaluateNodeAt(factor, target, variable) === undefined)) {
    return undefined;
  }

  const powerLatex = zeroOrder === 1 ? variable : `${variable}^{${zeroOrder}}`;
  return success(0, '0', [
    'Detected the indeterminate product 0 times infinity.',
    `Original form: ${nodeLatex(node) ?? 'product'}.`,
    `Rewrite: ${powerLatex}\\ln(${variable}) = \\ln(${variable})/(1/${powerLatex}).`,
    `Sub-limit: 1/${powerLatex} grows faster than \\ln(${variable}) as ${variable}->0+.`,
    'Final limit: 0.',
  ]);
}

function resolveFinitePowerTransform(
  node: unknown,
  target: number,
  variable: string,
  direction: LimitDirection,
): FiniteLimitRuleSuccess | undefined {
  if (
    target !== 0
    || direction !== 'right'
    || !isNodeArray(node)
    || node[0] !== 'Power'
    || node.length !== 3
    || node[1] !== variable
  ) {
    return undefined;
  }

  const exponentCoefficient = coefficientTimesVariable(node[2], variable);
  if (exponentCoefficient === undefined) {
    return undefined;
  }

  return success(1, '1', [
    'Detected the indeterminate power form 0^0.',
    `Original form: ${nodeLatex(node) ?? 'power'}.`,
    `Log transform: \\ln(y)=${nodeLatex(node[2]) ?? variable}\\ln(${variable}).`,
    `Sub-limit: ${variable}\\ln(${variable}) tends to 0 as ${variable}->0+; multiplying by a finite coefficient keeps it 0.`,
    'Exponentiating the sub-limit gives e^0=1.',
  ]);
}

export function resolveFiniteIndeterminateTransformLimit(
  node: unknown,
  target: number,
  variable: string,
  direction: LimitDirection,
): FiniteLimitRuleSuccess | undefined {
  return resolveZeroTimesLogInfinity(node, target, variable, direction)
    ?? resolveFinitePowerTransform(node, target, variable, direction);
}

export function hasFiniteIndeterminateTransformCandidate(
  node: unknown,
  target: number,
  variable: string,
  direction: LimitDirection,
) {
  return resolveFiniteIndeterminateTransformLimit(node, target, variable, direction) !== undefined;
}

function resolveOneToInfinityPower(
  node: unknown,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
  variable: string,
): FiniteLimitRuleSuccess | undefined {
  if (
    !isNodeArray(node)
    || node[0] !== 'Power'
    || node.length !== 3
    || (targetKind !== 'posInfinity' && targetKind !== 'negInfinity')
  ) {
    return undefined;
  }

  const reciprocalCoefficient = onePlusReciprocalCoefficient(node[1], variable);
  const exponentCoefficient = coefficientTimesVariable(node[2], variable);
  if (reciprocalCoefficient === undefined || exponentCoefficient === undefined) {
    return undefined;
  }

  const subLimit = reciprocalCoefficient * exponentCoefficient;
  const value = Math.exp(subLimit);
  return success(value, expLatex(subLimit), [
    'Detected the indeterminate power form 1^infinity.',
    `Original form: ${nodeLatex(node) ?? 'power'}.`,
    'Log transform: ln(y) = exponent * ln(base).',
    `Sub-limit: ${nodeLatex(node[2]) ?? 'exponent'}\\ln(1+${formatLimitNumberLatex(reciprocalCoefficient)}/${variable}) -> ${formatLimitNumberLatex(subLimit)}.`,
    `Exponentiating the sub-limit gives ${expLatex(subLimit)}.`,
  ]);
}

function resolveInfinityToZeroPower(
  node: unknown,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
  variable: string,
): FiniteLimitRuleSuccess | undefined {
  if (
    !isNodeArray(node)
    || node[0] !== 'Power'
    || node.length !== 3
    || targetKind !== 'posInfinity'
    || node[1] !== variable
  ) {
    return undefined;
  }

  const reciprocalCoefficient = coefficientOverVariable(node[2], variable);
  if (reciprocalCoefficient === undefined) {
    return undefined;
  }

  return success(1, '1', [
    'Detected the indeterminate power form infinity^0.',
    `Original form: ${nodeLatex(node) ?? 'power'}.`,
    `Log transform: \\ln(y)=(${formatLimitNumberLatex(reciprocalCoefficient)}/${variable})\\ln(${variable}).`,
    `Sub-limit: \\ln(${variable})/${variable} tends to 0 as ${variable}->\\infty.`,
    'Exponentiating the sub-limit gives e^0=1.',
  ]);
}

export function resolveInfiniteIndeterminateTransformLimit(
  node: unknown,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
  variable: string,
): FiniteLimitRuleSuccess | undefined {
  return resolveOneToInfinityPower(node, targetKind, variable)
    ?? resolveInfinityToZeroPower(node, targetKind, variable);
}

export function hasInfiniteIndeterminateTransformCandidate(
  node: unknown,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
  variable: string,
) {
  return resolveInfiniteIndeterminateTransformLimit(node, targetKind, variable) !== undefined;
}
