import { ComputeEngine } from '@cortex-js/compute-engine';

import { normalizeExplicitNamedVariablesInLatex } from '../../algebra/named-variable';
import {
  analyzeVariablesFromLatex,
  expandImplicitCharacterProductsInLatex,
} from '../../algebra/variable-core';

export type EquationTargetShapeStatus =
  | 'ok'
  | 'parse-error'
  | 'non-equation'
  | 'ambiguous-adjacent-product'
  | 'target-not-found';

export type EquationTargetSide = 'left' | 'right' | 'both' | 'neither';

export type EquationTargetShapeRouteHint =
  | 'linear'
  | 'polynomial'
  | 'rational'
  | 'algebraic-isolation'
  | 'exp-log'
  | 'trig'
  | 'selected-target-isolation'
  | 'mixed-or-unknown';

export type EquationTargetShapeFlags = {
  targetInExponent: boolean;
  targetInDenominator: boolean;
  targetUnderAbs: boolean;
  targetUnderRadical: boolean;
  targetAsPowerBase: boolean;
  targetInSquarePowerBase: boolean;
  targetInEvenPowerBase: boolean;
  targetInOddPowerBase: boolean;
  targetInTrigArgument: boolean;
  targetInLogArgument: boolean;
  targetInExpArgument: boolean;
  linearLike: boolean;
  polynomialLike: boolean;
};

type ProfileBase = {
  status: EquationTargetShapeStatus;
  sourceLatex: string;
  normalizedLatex: string;
  target: string;
  parameterNames: string[];
};

export type EquationTargetShapeOkProfile = ProfileBase & {
  status: 'ok';
  targetSide: EquationTargetSide;
  targetOccurrenceCount: number;
  topLevelTargetIslandCount: number;
  polynomialDegree: number | null;
  flags: EquationTargetShapeFlags;
  routeHints: EquationTargetShapeRouteHint[];
};

export type EquationTargetShapeStopProfile = ProfileBase & {
  status: Exclude<EquationTargetShapeStatus, 'ok'>;
  message: string;
};

export type EquationTargetShapeProfile =
  | EquationTargetShapeOkProfile
  | EquationTargetShapeStopProfile;

export type EquationTargetShapeProfileOptions = {
  allowGeneratedImplicitProducts?: boolean;
};

type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

type ShapeFlagsInternal = Omit<EquationTargetShapeFlags, 'linearLike' | 'polynomialLike'>;

const ce = new ComputeEngine();

const TRIG_OPERATORS = new Set([
  'Sin',
  'Cos',
  'Tan',
  'Cot',
  'Sec',
  'Csc',
  'Arcsin',
  'Arccos',
  'Arctan',
]);

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function normalizeProfileLatex(
  equationLatex: string,
  options: EquationTargetShapeProfileOptions,
) {
  const named = normalizeExplicitNamedVariablesInLatex(equationLatex);
  const analysis = analyzeVariablesFromLatex(named.latex, { allowSymbolicParameters: true });
  const hasAmbiguousAdjacentProduct = analysis.implicitCharacterProducts.some((product) =>
    new Set(product.characters).size > 1);

  if (hasAmbiguousAdjacentProduct && !options.allowGeneratedImplicitProducts) {
    return {
      kind: 'ambiguous' as const,
      normalizedLatex: named.latex,
      parameterNames: parameterNamesFromLatex(named.latex, ''),
    };
  }

  const normalizedLatex = options.allowGeneratedImplicitProducts
    ? expandImplicitCharacterProductsInLatex(named.latex)
    : named.latex;

  return {
    kind: 'ok' as const,
    normalizedLatex,
  };
}

function parameterNamesFromLatex(latex: string, target: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.symbols
    .filter((symbol) => symbol.name !== target)
    .filter((symbol) =>
      symbol.identifierKind === 'single-symbol-variable'
      || symbol.identifierKind === 'named-variable'
      || symbol.identifierKind === 'indexed-symbol-variable')
    .map((symbol) => symbol.name);
}

function stopProfile(
  status: EquationTargetShapeStopProfile['status'],
  sourceLatex: string,
  normalizedLatex: string,
  target: string,
  parameterNames: string[],
  message: string,
): EquationTargetShapeStopProfile {
  return {
    status,
    sourceLatex,
    normalizedLatex,
    target,
    parameterNames,
    message,
  };
}

function containsErrorNode(node: unknown): boolean {
  if (isArrayNode(node)) {
    return node[0] === 'Error' || node.some(containsErrorNode);
  }

  if (node && typeof node === 'object') {
    return Object.values(node).some(containsErrorNode);
  }

  return false;
}

function countTargetOccurrences(node: unknown, target: string, memo = new WeakMap<object, number>()): number {
  if (typeof node === 'string') {
    return node === target ? 1 : 0;
  }

  if (!node || typeof node !== 'object') {
    return 0;
  }

  const cached = memo.get(node);
  if (cached !== undefined) {
    return cached;
  }

  let count = 0;
  const entries = isArrayNode(node) ? node : Object.values(node);
  for (const entry of entries) {
    count += countTargetOccurrences(entry, target, memo);
  }
  memo.set(node, count);
  return count;
}

function hasTarget(node: unknown, target: string, memo?: WeakMap<object, number>) {
  return countTargetOccurrences(node, target, memo) > 0;
}

function targetSide(left: MathJson, right: MathJson, target: string): EquationTargetSide {
  const memo = new WeakMap<object, number>();
  const leftHasTarget = hasTarget(left, target, memo);
  const rightHasTarget = hasTarget(right, target, memo);
  if (leftHasTarget && rightHasTarget) {
    return 'both';
  }
  if (leftHasTarget) {
    return 'left';
  }
  if (rightHasTarget) {
    return 'right';
  }
  return 'neither';
}

function flattenAdditiveTerms(node: MathJson): MathJson[] {
  return isArrayNode(node) && node[0] === 'Add'
    ? node.slice(1) as MathJson[]
    : [node];
}

function topLevelTargetIslandCount(left: MathJson, right: MathJson, target: string) {
  const memo = new WeakMap<object, number>();
  return [...flattenAdditiveTerms(left), ...flattenAdditiveTerms(right)]
    .filter((term) => hasTarget(term, target, memo))
    .length;
}

function positiveIntegerExponent(node: unknown): number | null {
  return typeof node === 'number' && Number.isInteger(node) && node >= 0 ? node : null;
}

function isOddFormulaPowerExponent(node: unknown) {
  return typeof node === 'number'
    && Number.isInteger(node)
    && node >= 3
    && node <= 11
    && node % 2 === 1;
}

function isHigherEvenFormulaPowerExponent(node: unknown) {
  return typeof node === 'number'
    && Number.isInteger(node)
    && node >= 4
    && node <= 12
    && node % 2 === 0;
}

function isDirectSelectedTargetBase(node: unknown, target: string) {
  return node === target;
}

function polynomialDegree(node: MathJson, target: string): number | null {
  if (!hasTarget(node, target)) {
    return 0;
  }
  if (typeof node === 'string') {
    return node === target ? 1 : 0;
  }
  if (!isArrayNode(node)) {
    return null;
  }

  const [operator, ...operands] = node;
  if (operator === 'Add') {
    let degree = 0;
    for (const operand of operands) {
      const operandDegree = polynomialDegree(operand as MathJson, target);
      if (operandDegree === null) {
        return null;
      }
      degree = Math.max(degree, operandDegree);
    }
    return degree;
  }

  if (operator === 'Multiply' || operator === 'InvisibleOperator') {
    let degree = 0;
    for (const operand of operands) {
      const operandDegree = polynomialDegree(operand as MathJson, target);
      if (operandDegree === null) {
        return null;
      }
      degree += operandDegree;
    }
    return degree;
  }

  if (operator === 'Negate') {
    return polynomialDegree(operands[0] as MathJson, target);
  }

  if (operator === 'Divide') {
    if (hasTarget(operands[1], target)) {
      return null;
    }
    return polynomialDegree(operands[0] as MathJson, target);
  }

  if (operator === 'Power') {
    if (hasTarget(operands[1], target)) {
      return null;
    }
    const exponent = positiveIntegerExponent(operands[1]);
    if (exponent === null) {
      return null;
    }
    const baseDegree = polynomialDegree(operands[0] as MathJson, target);
    return baseDegree === null ? null : baseDegree * exponent;
  }

  return null;
}

function collectShapeFlags(node: MathJson, target: string, flags: ShapeFlagsInternal) {
  if (!isArrayNode(node)) {
    return;
  }

  const [operator, ...operands] = node;
  if (operator === 'Power') {
    if (hasTarget(operands[1], target)) {
      flags.targetInExponent = true;
      if (operands[0] === 'ExponentialE') {
        flags.targetInExpArgument = true;
      }
    }
    if (hasTarget(operands[0], target)) {
      flags.targetAsPowerBase = true;
      const baseIsDirectTarget = isDirectSelectedTargetBase(operands[0], target);
      if (!baseIsDirectTarget && operands[1] === 2) {
        flags.targetInSquarePowerBase = true;
      }
      if (!baseIsDirectTarget && isHigherEvenFormulaPowerExponent(operands[1])) {
        flags.targetInEvenPowerBase = true;
      }
      if (!baseIsDirectTarget && isOddFormulaPowerExponent(operands[1])) {
        flags.targetInOddPowerBase = true;
      }
    }
  }

  if (operator === 'Divide' && hasTarget(operands[1], target)) {
    flags.targetInDenominator = true;
  }

  if (operator === 'Abs' && operands.some((operand) => hasTarget(operand, target))) {
    flags.targetUnderAbs = true;
  }

  if ((operator === 'Sqrt' || operator === 'Root') && operands.some((operand) => hasTarget(operand, target))) {
    flags.targetUnderRadical = true;
  }

  if (TRIG_OPERATORS.has(String(operator)) && operands.some((operand) => hasTarget(operand, target))) {
    flags.targetInTrigArgument = true;
  }

  if ((operator === 'Ln' || operator === 'Log') && hasTarget(operands[0], target)) {
    flags.targetInLogArgument = true;
  }

  if (operator === 'Exp' && operands.some((operand) => hasTarget(operand, target))) {
    flags.targetInExpArgument = true;
  }

  for (const operand of operands) {
    collectShapeFlags(operand as MathJson, target, flags);
  }
}

function routeHints(
  flags: EquationTargetShapeFlags,
  targetSideValue: EquationTargetSide,
  targetIslandCount: number,
): EquationTargetShapeRouteHint[] {
  const hints: EquationTargetShapeRouteHint[] = [];

  if (flags.linearLike) {
    hints.push('linear');
  } else if (flags.polynomialLike) {
    hints.push('polynomial');
  }
  if (flags.targetInDenominator) {
    hints.push('rational');
  }
  if (flags.targetUnderRadical || (flags.targetAsPowerBase && !flags.linearLike)) {
    hints.push('algebraic-isolation');
  }
  if (flags.targetInExponent || flags.targetInLogArgument || flags.targetInExpArgument) {
    hints.push('exp-log');
  }
  if (flags.targetInTrigArgument) {
    hints.push('trig');
  }
  if ((targetSideValue === 'left' || targetSideValue === 'right') && targetIslandCount === 1 && !flags.linearLike) {
    hints.push('selected-target-isolation');
  }
  if (targetSideValue === 'both' || targetIslandCount > 1 || hints.length === 0) {
    hints.push('mixed-or-unknown');
  }

  return [...new Set(hints)];
}

export function profileEquationTargetShape(
  equationLatex: string,
  target: string,
  options: EquationTargetShapeProfileOptions = {},
): EquationTargetShapeProfile {
  const normalized = normalizeProfileLatex(equationLatex, options);
  if (normalized.kind === 'ambiguous') {
    return stopProfile(
      'ambiguous-adjacent-product',
      equationLatex,
      normalized.normalizedLatex,
      target,
      parameterNamesFromLatex(normalized.normalizedLatex, target),
      'Adjacent letters must use explicit multiplication before target-shape profiling.',
    );
  }

  const parameterNames = parameterNamesFromLatex(normalized.normalizedLatex, target);
  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(normalized.normalizedLatex);
  } catch {
    return stopProfile(
      'parse-error',
      equationLatex,
      normalized.normalizedLatex,
      target,
      parameterNames,
      'The equation could not be parsed for target-shape profiling.',
    );
  }

  const json = parsed.json as MathJson;
  if (containsErrorNode(json)) {
    return stopProfile(
      'parse-error',
      equationLatex,
      normalized.normalizedLatex,
      target,
      parameterNames,
      'The equation could not be parsed for target-shape profiling.',
    );
  }
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stopProfile(
      'non-equation',
      equationLatex,
      normalized.normalizedLatex,
      target,
      parameterNames,
      'Enter an = equation before target-shape profiling.',
    );
  }

  const left = json[1] as MathJson;
  const right = json[2] as MathJson;
  const targetOccurrenceCount = countTargetOccurrences(json, target);
  if (targetOccurrenceCount === 0) {
    return stopProfile(
      'target-not-found',
      equationLatex,
      normalized.normalizedLatex,
      target,
      parameterNames,
      `Selected target ${target} was not found in this equation.`,
    );
  }

  const side = targetSide(left, right, target);
  const targetIslandCount = topLevelTargetIslandCount(left, right, target);
  const degree = polynomialDegree(['Add', left, ['Negate', right]], target);
  const internalFlags: ShapeFlagsInternal = {
    targetInExponent: false,
    targetInDenominator: false,
    targetUnderAbs: false,
    targetUnderRadical: false,
    targetAsPowerBase: false,
    targetInSquarePowerBase: false,
    targetInEvenPowerBase: false,
    targetInOddPowerBase: false,
    targetInTrigArgument: false,
    targetInLogArgument: false,
    targetInExpArgument: false,
  };
  collectShapeFlags(json, target, internalFlags);

  const flags: EquationTargetShapeFlags = {
    ...internalFlags,
    linearLike: degree === 1,
    polynomialLike: degree !== null,
  };

  return {
    status: 'ok',
    sourceLatex: equationLatex,
    normalizedLatex: normalized.normalizedLatex,
    target,
    parameterNames,
    targetSide: side,
    targetOccurrenceCount,
    topLevelTargetIslandCount: targetIslandCount,
    polynomialDegree: degree,
    flags,
    routeHints: routeHints(flags, side, targetIslandCount),
  };
}
