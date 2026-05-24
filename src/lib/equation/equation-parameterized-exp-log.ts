import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayDetailSection } from '../../types/calculator';
import { analyzeVariablesFromLatex } from '../algebra/variable-core';
import { solveParameterizedLinearEquation } from './equation-parameterized-linear';
import { solveParameterizedPolynomialEquation } from './equation-parameterized-polynomial';
import { solveParameterizedRationalEquation } from './equation-parameterized-rational';
import { solveParameterizedCarrierEquation } from './equation-parameterized-carrier';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './equation-parameterized-readback';

const ce = new ComputeEngine();

type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

export type ParameterizedExpLogStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'no-exp-log'
  | 'multiple-carriers'
  | 'nested-exp-log'
  | 'symbolic-base'
  | 'invalid-base'
  | 'unsupported-shell'
  | 'target-in-unsupported-operation'
  | 'domain-empty'
  | 'handoff-unsupported';

export type ParameterizedExpLogSolveSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
  generatedEquationLatex: string;
};

export type ParameterizedExpLogSolveStop = {
  kind: 'unsupported';
  reason: ParameterizedExpLogStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type ParameterizedExpLogSolveResult =
  | ParameterizedExpLogSolveSuccess
  | ParameterizedExpLogSolveStop;

type BaseProfile = {
  kind: 'natural' | 'common' | 'numeric';
  value: number;
  latex: string;
} | {
  kind: 'symbolic';
  node: MathJson;
  latex: string;
};

type ExpLogCarrierKind = 'exponential' | 'logarithm';

type ExpLogCarrierProfile = {
  kind: ExpLogCarrierKind;
  node: MathJson;
  inner: MathJson;
  labelLatex: string;
  base: BaseProfile;
};

type ExpLogAffine = {
  coefficient: MathJson;
  constant: MathJson;
  carrier: ExpLogCarrierProfile | null;
};

type CarrierMatch =
  | { kind: 'matched'; carrier: ExpLogCarrierProfile }
  | { kind: 'blocked'; reason: ParameterizedExpLogStopReason; message: string }
  | { kind: 'none' };

type CollectResult =
  | { kind: 'ok'; affine: ExpLogAffine }
  | { kind: 'unsupported'; reason: ParameterizedExpLogStopReason; message: string };

type HandoffSolveResult =
  | { kind: 'success'; exactLatex: string; exactSupplementLatex?: string[] }
  | { kind: 'unsupported'; message: string };

type TargetBaseCarrierProfile = {
  kind: 'power-base' | 'log-base';
  node: MathJson;
  base: MathJson;
  exponentOrValue: MathJson;
  argument?: MathJson;
  labelLatex: string;
};

type TargetBaseCarrierMatch =
  | { kind: 'matched'; carrier: TargetBaseCarrierProfile }
  | { kind: 'blocked'; reason: ParameterizedExpLogStopReason; message: string }
  | { kind: 'none' };

const ZERO: MathJson = 0;
const ONE: MathJson = 1;
const EPSILON = 1e-12;

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isZeroNode(node: unknown) {
  return typeof node === 'number' && node === 0;
}

function isOneNode(node: unknown) {
  return typeof node === 'number' && Object.is(node, 1);
}

function isNegativeOneNode(node: unknown) {
  return typeof node === 'number' && Object.is(node, -1);
}

function hasTarget(node: unknown, target: string): boolean {
  if (typeof node === 'string') {
    return node === target;
  }

  if (isArrayNode(node)) {
    return node.some((entry) => hasTarget(entry, target));
  }

  if (node && typeof node === 'object') {
    return Object.values(node).some((entry) => hasTarget(entry, target));
  }

  return false;
}

function flattenOperator(operator: string, nodes: MathJson[]) {
  return nodes.flatMap((node) =>
    isArrayNode(node) && node[0] === operator
      ? node.slice(1) as MathJson[]
      : [node],
  );
}

function simplifyNode(node: MathJson): MathJson {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).simplify().json as MathJson;
  } catch {
    return node;
  }
}

function addNodes(...nodes: MathJson[]): MathJson {
  const terms = flattenOperator('Add', nodes).filter((node) => !isZeroNode(node));
  if (terms.length === 0) {
    return ZERO;
  }
  if (terms.length === 1) {
    return terms[0];
  }
  return simplifyNode(['Add', ...terms] as MathJson);
}

function multiplyNodes(...nodes: MathJson[]): MathJson {
  const factors = flattenOperator('Multiply', nodes).filter((node) => !isOneNode(node));
  if (factors.some((node) => isZeroNode(node))) {
    return ZERO;
  }
  if (factors.length === 0) {
    return ONE;
  }
  if (factors.length === 1) {
    return factors[0];
  }
  return simplifyNode(['Multiply', ...factors] as MathJson);
}

function negateNode(node: MathJson): MathJson {
  if (typeof node === 'number') {
    return -node as MathJson;
  }
  if (isArrayNode(node) && node[0] === 'Negate') {
    return node[1] as MathJson;
  }
  if (isArrayNode(node) && node[0] === 'Add') {
    return addNodes(...node.slice(1).map((term) => negateNode(term as MathJson)));
  }
  return simplifyNode(['Negate', node] as MathJson);
}

function divideNodes(numerator: MathJson, denominator: MathJson): MathJson {
  if (isOneNode(denominator)) {
    return numerator;
  }
  if (isNegativeOneNode(denominator)) {
    return negateNode(numerator);
  }
  return simplifyNode(['Divide', numerator, denominator] as MathJson);
}

function subtractAffine(left: ExpLogAffine, right: ExpLogAffine): CollectResult {
  return addAffine(left, {
    coefficient: negateNode(right.coefficient),
    constant: negateNode(right.constant),
    carrier: right.carrier,
  });
}

function latexForNode(node: MathJson) {
  return ce.box(simplifyNode(node) as Parameters<typeof ce.box>[0]).latex;
}

function numericFromNode(node: unknown): number | null {
  if (typeof node === 'number') {
    return node;
  }
  if (
    isArrayNode(node)
    && node[0] === 'Rational'
    && typeof node[1] === 'number'
    && typeof node[2] === 'number'
    && node[2] !== 0
  ) {
    return node[1] / node[2];
  }
  return null;
}

function isValidBase(value: number) {
  return Number.isFinite(value) && value > 0 && Math.abs(value - 1) > EPSILON;
}

function baseLatexForNode(node: MathJson, value: number) {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) <= EPSILON) {
    return `${rounded}`;
  }
  return latexForNode(node);
}

type ExplicitBaseProfile =
  | { kind: 'base'; base: BaseProfile }
  | { kind: 'blocked'; reason: ParameterizedExpLogStopReason; message: string };

function explicitBaseProfile(node: MathJson, target: string): ExplicitBaseProfile {
  if (node === 'ExponentialE') {
    return { kind: 'base', base: { kind: 'natural', value: Math.E, latex: 'e' } };
  }
  if (hasTarget(node, target)) {
    return {
      kind: 'blocked',
      reason: 'target-in-unsupported-operation',
      message: 'The selected target can appear in an exp/log base only in the direct symbolic-base families.',
    };
  }

  const value = numericFromNode(node);
  if (value === null) {
    return {
      kind: 'base',
      base: {
        kind: 'symbolic',
        node,
        latex: latexForNode(node),
      },
    };
  }
  if (!isValidBase(value)) {
    return {
      kind: 'blocked',
      reason: 'invalid-base',
      message: 'Exponential/logarithmic bases must be positive numeric values not equal to 1.',
    };
  }
  if (Math.abs(value - 10) <= EPSILON) {
    return { kind: 'base', base: { kind: 'common', value, latex: '10' } };
  }
  return { kind: 'base', base: { kind: 'numeric', value, latex: baseLatexForNode(node, value) } };
}

function baseKey(base: BaseProfile) {
  return base.kind === 'symbolic'
    ? `symbolic:${base.latex}`
    : `numeric:${base.value}`;
}

function carrierKey(carrier: ExpLogCarrierProfile) {
  return `${carrier.kind}:${baseKey(carrier.base)}:${latexForNode(carrier.node)}`;
}

function sameBase(left: BaseProfile, right: BaseProfile) {
  if (left.kind !== 'symbolic' && right.kind !== 'symbolic') {
    return Math.abs(left.value - right.value) <= EPSILON;
  }
  return baseKey(left) === baseKey(right);
}

function unsupported(
  reason: ParameterizedExpLogStopReason,
  message: string,
): CollectResult {
  return { kind: 'unsupported', reason, message };
}

function containsSelectedExpLog(node: unknown, target: string): boolean {
  if (!isArrayNode(node)) {
    return false;
  }

  const [operator, ...operands] = node;
  if (operator === 'Ln' && operands.some((operand) => hasTarget(operand, target))) {
    return true;
  }
  if (
    operator === 'Log'
    && operands[0]
    && (hasTarget(operands[0], target) || Boolean(operands[1] && hasTarget(operands[1], target)))
  ) {
    return true;
  }
  if (
    operator === 'Power'
    && operands.length === 2
    && (
      (
        hasTarget(operands[0], target)
        && (
          hasTarget(operands[1], target)
          || numericFromNode(operands[1]) === null
        )
      )
      || (
        hasTarget(operands[1], target)
        && (
          operands[0] === 'ExponentialE'
          || numericFromNode(operands[0]) !== null
          || !hasTarget(operands[0], target)
        )
      )
    )
  ) {
    return true;
  }

  return operands.some((operand) => containsSelectedExpLog(operand, target));
}

function matchCarrier(node: unknown, target: string, requireTarget = true): CarrierMatch {
  if (!isArrayNode(node)) {
    return { kind: 'none' };
  }

  const [operator, ...operands] = node;
  if (
    operator === 'Ln'
    && operands.length === 1
    && (!requireTarget || hasTarget(operands[0], target))
  ) {
    return {
      kind: 'matched',
      carrier: {
        kind: 'logarithm',
        node: node as MathJson,
        inner: operands[0] as MathJson,
        labelLatex: latexForNode(node as MathJson),
        base: { kind: 'natural', value: Math.E, latex: 'e' },
      },
    };
  }

  if (
    operator === 'Log'
    && (operands.length === 1 || operands.length === 2)
    && (!requireTarget || hasTarget(operands[0], target))
  ) {
    if (operands.length === 1) {
      return {
        kind: 'matched',
        carrier: {
          kind: 'logarithm',
          node: node as MathJson,
          inner: operands[0] as MathJson,
          labelLatex: latexForNode(node as MathJson),
          base: { kind: 'common', value: 10, latex: '10' },
        },
      };
    }

    const base = explicitBaseProfile(operands[1] as MathJson, target);
    if (base.kind === 'blocked') {
      return base;
    }
    return {
      kind: 'matched',
      carrier: {
        kind: 'logarithm',
        node: node as MathJson,
        inner: operands[0] as MathJson,
        labelLatex: logCarrierLatex(operands[0] as MathJson, base.base),
        base: base.base,
      },
    };
  }

  if (operator === 'Power' && operands.length === 2) {
    const [baseNode, exponentNode] = operands;
    if (hasTarget(baseNode, target)) {
      return {
        kind: 'blocked',
        reason: 'target-in-unsupported-operation',
        message: 'The selected target cannot appear in an exponential base for EQUATION-PARAM5.',
      };
    }
    if (requireTarget && !hasTarget(exponentNode, target)) {
      return { kind: 'none' };
    }

    if (baseNode === 'ExponentialE') {
      return {
        kind: 'matched',
        carrier: {
          kind: 'exponential',
          node: node as MathJson,
          inner: exponentNode as MathJson,
          labelLatex: latexForNode(node as MathJson),
          base: { kind: 'natural', value: Math.E, latex: 'e' },
        },
      };
    }

    const base = explicitBaseProfile(baseNode as MathJson, target);
    if (base.kind === 'blocked') {
      return base;
    }
    return {
      kind: 'matched',
      carrier: {
        kind: 'exponential',
        node: node as MathJson,
        inner: exponentNode as MathJson,
        labelLatex: powerCarrierLatex(baseNode as MathJson, exponentNode as MathJson),
        base: base.base,
      },
    };
  }

  return { kind: 'none' };
}

function mergeCarriers(
  left: ExpLogCarrierProfile | null,
  right: ExpLogCarrierProfile | null,
): ExpLogCarrierProfile | null | 'multiple' {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  return carrierKey(left) === carrierKey(right) ? left : 'multiple';
}

function addAffine(left: ExpLogAffine, right: ExpLogAffine): CollectResult {
  const carrier = mergeCarriers(left.carrier, right.carrier);
  if (carrier === 'multiple') {
    return unsupported(
      'multiple-carriers',
      'EQUATION-PARAM5 supports one selected-target exp/log carrier at a time.',
    );
  }
  return {
    kind: 'ok',
    affine: {
      coefficient: addNodes(left.coefficient, right.coefficient),
      constant: addNodes(left.constant, right.constant),
      carrier,
    },
  };
}

function collectExpLogAffine(node: unknown, target: string): CollectResult {
  const carrier = matchCarrier(node, target);
  if (carrier.kind === 'blocked') {
    return unsupported(carrier.reason, carrier.message);
  }
  if (carrier.kind === 'matched') {
    if (containsSelectedExpLog(carrier.carrier.inner, target)) {
      return unsupported(
        'nested-exp-log',
        'Nested selected-target exp/log carriers are outside EQUATION-PARAM5.',
      );
    }
    return {
      kind: 'ok',
      affine: {
        coefficient: ONE,
        constant: ZERO,
        carrier: carrier.carrier,
      },
    };
  }

  if (typeof node === 'string') {
    if (node === target) {
      return unsupported(
        'target-in-unsupported-operation',
        'The selected target appears outside a supported exp/log carrier.',
      );
    }
    return { kind: 'ok', affine: { coefficient: ZERO, constant: node as MathJson, carrier: null } };
  }

  if (typeof node === 'number') {
    return { kind: 'ok', affine: { coefficient: ZERO, constant: node as MathJson, carrier: null } };
  }

  if (!isArrayNode(node)) {
    if (hasTarget(node, target)) {
      return unsupported(
        'target-in-unsupported-operation',
        'The selected target appears in an unsupported exp/log expression shape.',
      );
    }
    return { kind: 'ok', affine: { coefficient: ZERO, constant: node as MathJson, carrier: null } };
  }

  const [operator, ...operands] = node;

  if (operator === 'Add') {
    let current: ExpLogAffine = { coefficient: ZERO, constant: ZERO, carrier: null };
    for (const operand of operands) {
      const collected = collectExpLogAffine(operand, target);
      if (collected.kind === 'unsupported') {
        return collected;
      }
      const next = addAffine(current, collected.affine);
      if (next.kind === 'unsupported') {
        return next;
      }
      current = next.affine;
    }
    return { kind: 'ok', affine: current };
  }

  if (operator === 'Subtract') {
    const [left, right] = operands;
    const leftCollected = collectExpLogAffine(left, target);
    if (leftCollected.kind === 'unsupported') {
      return leftCollected;
    }
    const rightCollected = collectExpLogAffine(right, target);
    if (rightCollected.kind === 'unsupported') {
      return rightCollected;
    }
    return subtractAffine(leftCollected.affine, rightCollected.affine);
  }

  if (operator === 'Negate') {
    const collected = collectExpLogAffine(operands[0], target);
    if (collected.kind === 'unsupported') {
      return collected;
    }
    return {
      kind: 'ok',
      affine: {
        coefficient: negateNode(collected.affine.coefficient),
        constant: negateNode(collected.affine.constant),
        carrier: collected.affine.carrier,
      },
    };
  }

  if (operator === 'Multiply') {
    const collected = operands.map((operand) => collectExpLogAffine(operand, target));
    const unsupportedEntry = collected.find((entry) => entry.kind === 'unsupported');
    if (unsupportedEntry?.kind === 'unsupported') {
      return unsupportedEntry;
    }
    const affines = collected
      .filter((entry): entry is { kind: 'ok'; affine: ExpLogAffine } => entry.kind === 'ok')
      .map((entry) => entry.affine);
    const carrierFactors = affines.filter((entry) => entry.carrier);
    if (carrierFactors.length === 0) {
      return {
        kind: 'ok',
        affine: {
          coefficient: ZERO,
          constant: multiplyNodes(...affines.map((entry) => entry.constant)),
          carrier: null,
        },
      };
    }
    if (
      carrierFactors.length > 1
      || !isZeroNode(carrierFactors[0].constant)
    ) {
      return unsupported(
        'unsupported-shell',
        'EQUATION-PARAM5 only supports affine shells around one selected-target exp/log carrier.',
      );
    }
    const targetFreeFactors = affines
      .filter((entry) => entry !== carrierFactors[0])
      .map((entry) => entry.constant);
    return {
      kind: 'ok',
      affine: {
        coefficient: multiplyNodes(...targetFreeFactors, carrierFactors[0].coefficient),
        constant: ZERO,
        carrier: carrierFactors[0].carrier,
      },
    };
  }

  if (hasTarget(node, target)) {
    return unsupported(
      containsSelectedExpLog(node, target) ? 'nested-exp-log' : 'target-in-unsupported-operation',
      containsSelectedExpLog(node, target)
        ? 'Nested selected-target exp/log carriers are outside EQUATION-PARAM5.'
        : 'This selected-target expression is outside EQUATION-PARAM5 exp/log isolation.',
    );
  }

  return { kind: 'ok', affine: { coefficient: ZERO, constant: node as MathJson, carrier: null } };
}

function hasAmbiguousAdjacentProduct(latex: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.implicitCharacterProducts.some((product) => new Set(product.characters).size > 1);
}

function parameterNamesFromLatex(latex: string, target: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.symbols
    .filter((symbol) =>
      symbol.name !== target
      && symbol.identifierKind === 'single-symbol-variable'
      && /^[A-Za-z]$/.test(symbol.name))
    .map((symbol) => symbol.name);
}

function nodeHasSymbol(node: MathJson) {
  return analyzeVariablesFromLatex(latexForNode(node), {
    allowSymbolicParameters: true,
  }).symbols.length > 0;
}

function positiveFactForNode(node: MathJson): string | null {
  if (!nodeHasSymbol(node)) {
    return null;
  }
  return `${latexForNode(node)}>0`;
}

function nonzeroFactForNode(node: MathJson): string | null {
  if (!nodeHasSymbol(node)) {
    return null;
  }
  return `${latexForNode(node)}\\ne0`;
}

function notOneFactForNode(node: MathJson): string | null {
  if (!nodeHasSymbol(node)) {
    return null;
  }
  return `${latexForNode(node)}\\ne1`;
}

function positiveBaseFacts(base: BaseProfile): string[] {
  if (base.kind !== 'symbolic') {
    return [];
  }
  return [`${base.latex}>0`, `${base.latex}\\ne1`];
}

function numericValueOfNode(node: MathJson): number | null {
  return numericFromNode(simplifyNode(node));
}

function stop(
  reason: ParameterizedExpLogStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): ParameterizedExpLogSolveStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function dedupe(entries: string[]) {
  return [...new Set(entries.filter(Boolean))];
}

function cleanLatex(latex: string) {
  return latex.replace(/\\exponentialE/g, 'e');
}

function wrapLatexForPowerBase(node: MathJson) {
  const latex = latexForNode(node);
  return isArrayNode(node) && (node[0] === 'Add' || node[0] === 'Subtract' || node[0] === 'Power')
    ? `\\left(${latex}\\right)`
    : latex;
}

function powerCarrierLatex(base: MathJson, exponent: MathJson) {
  return `${wrapLatexForPowerBase(base)}^{${latexForNode(exponent)}}`;
}

function isBaseProfile(input: BaseProfile | MathJson): input is BaseProfile {
  return Boolean(
    input
    && typeof input === 'object'
    && !Array.isArray(input)
    && 'kind' in input
    && 'latex' in input,
  );
}

function logCarrierLatex(argument: MathJson, base: BaseProfile | MathJson) {
  const baseLatex = isBaseProfile(base) ? base.latex : latexForNode(base as MathJson);
  return `\\log_{${baseLatex}}\\left(${latexForNode(argument)}\\right)`;
}

function logLatexForBase(base: BaseProfile, value: MathJson) {
  const valueLatex = latexForNode(value);
  if (base.kind === 'natural') {
    return `\\ln\\left(${valueLatex}\\right)`;
  }
  if (base.kind === 'common') {
    return `\\log\\left(${valueLatex}\\right)`;
  }
  return `\\log_{${base.latex}}\\left(${valueLatex}\\right)`;
}

function powerLatexForBase(base: BaseProfile, exponent: MathJson) {
  const exponentLatex = latexForNode(exponent);
  if (base.kind === 'natural') {
    return `e^{${exponentLatex}}`;
  }
  return `${base.latex}^{${exponentLatex}}`;
}

function generatedEquationForCarrier(
  carrier: ExpLogCarrierProfile,
  value: MathJson,
): { kind: 'ok'; equationLatex: string; facts: string[] } | { kind: 'unsupported'; reason: ParameterizedExpLogStopReason; message: string } {
  if (carrier.kind === 'exponential') {
    const numericValue = numericValueOfNode(value);
    if (numericValue !== null && numericValue <= 0) {
      return {
        kind: 'unsupported',
        reason: 'domain-empty',
        message: 'No real selected-target solution remains because exponential outputs must be positive.',
      };
    }
    return {
      kind: 'ok',
      equationLatex: `${latexForNode(carrier.inner)}=${logLatexForBase(carrier.base, value)}`,
      facts: [
        ...positiveBaseFacts(carrier.base),
        positiveFactForNode(value),
      ].filter((entry): entry is string => Boolean(entry)),
    };
  }

  return {
    kind: 'ok',
    equationLatex: `${latexForNode(carrier.inner)}=${powerLatexForBase(carrier.base, value)}`,
    facts: [
      ...positiveBaseFacts(carrier.base),
      positiveFactForNode(carrier.inner),
    ].filter((entry): entry is string => Boolean(entry)),
  };
}

function solveGeneratedEquation(equationLatex: string, target: string): HandoffSolveResult {
  const options = { allowGeneratedImplicitProducts: true };
  const linear = solveParameterizedLinearEquation(equationLatex, target, options);
  if (linear.kind === 'success') {
    return linear;
  }

  const polynomial = solveParameterizedPolynomialEquation(equationLatex, target, options);
  if (polynomial.kind === 'success') {
    return polynomial;
  }

  const rational = solveParameterizedRationalEquation(equationLatex, target, options);
  if (rational.kind === 'success') {
    return rational;
  }

  const carrier = solveParameterizedCarrierEquation(equationLatex, target);
  if (carrier.kind === 'success') {
    return carrier;
  }

  return {
    kind: 'unsupported',
    message: rational.reason !== 'not-rational'
      ? rational.message
      : (carrier.reason === 'no-carrier' ? polynomial.message : carrier.message),
  };
}

function solutionExpressionsFromExactLatex(exactLatex: string, target: string) {
  const equalityPrefix = `${target}=`;
  if (exactLatex.startsWith(equalityPrefix)) {
    return [exactLatex.slice(equalityPrefix.length)];
  }

  const setPrefix = `${target}\\in\\left\\{`;
  if (exactLatex.startsWith(setPrefix) && exactLatex.endsWith('\\right\\}')) {
    return exactLatex
      .slice(setPrefix.length, -'\\right\\}'.length)
      .split(/,\\\s*/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [exactLatex];
}

function exactLatexForSolutions(target: string, solutionExpressions: string[]) {
  const unique = dedupe(solutionExpressions.map(cleanLatex));
  if (unique.length === 1) {
    return `${target}=${unique[0]}`;
  }
  return `${target}\\in\\left\\{${unique.join(',\\ ')}\\right\\}`;
}

function finalizeGeneratedExpLogSolve({
  target,
  parameterNames,
  generatedEquationLatex,
  domainFacts,
  carrierLabel,
}: {
  target: string;
  parameterNames: string[];
  generatedEquationLatex: string;
  domainFacts: string[];
  carrierLabel: string;
}): ParameterizedExpLogSolveResult {
  const solved = solveGeneratedEquation(generatedEquationLatex, target);
  if (solved.kind === 'unsupported') {
    return stop(
      'handoff-unsupported',
      `The isolated exp/log equation ${generatedEquationLatex} is outside current selected-target parameter solvers. ${solved.message}`,
      target,
      parameterNames,
    );
  }

  const solutionExpressions = solutionExpressionsFromExactLatex(solved.exactLatex, target);
  const exactSupplementLatex = normalizeParameterizedSupplementLatex(dedupe([
    ...domainFacts,
    ...(solved.exactSupplementLatex ?? []),
  ].map(cleanLatex)));
  const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Parameterized Exp/Log Solve',
    familyLines: [
      `Isolated ${carrierLabel} using a bounded exp/log inverse-pair rule.`,
      `Delegated ${generatedEquationLatex} to existing selected-target parameter solvers.`,
    ],
  });

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex: exactLatexForSolutions(target, solutionExpressions),
    exactSupplementLatex,
    detailSections,
    generatedEquationLatex,
  };
}

function matchTargetBaseCarrier(node: unknown, target: string): TargetBaseCarrierMatch {
  if (!isArrayNode(node)) {
    return { kind: 'none' };
  }

  const [operator, ...operands] = node;

  if (operator === 'Power' && operands.length === 2) {
    const [baseNode, exponentNode] = operands as MathJson[];
    if (!hasTarget(baseNode, target)) {
      return { kind: 'none' };
    }
    if (hasTarget(exponentNode, target)) {
      return {
        kind: 'blocked',
        reason: 'target-in-unsupported-operation',
        message: 'PARAM10 does not solve equations where the selected target appears in both base and exponent.',
      };
    }
    if (containsSelectedExpLog(baseNode, target)) {
      return {
        kind: 'blocked',
        reason: 'nested-exp-log',
        message: 'Nested selected-target exp/log bases are outside PARAM10.',
      };
    }
    return {
      kind: 'matched',
      carrier: {
        kind: 'power-base',
        node: node as MathJson,
        base: baseNode,
        exponentOrValue: exponentNode,
        labelLatex: powerCarrierLatex(baseNode, exponentNode),
      },
    };
  }

  if (operator === 'Log' && operands.length === 2) {
    const [argumentNode, baseNode] = operands as MathJson[];
    if (!hasTarget(baseNode, target)) {
      return { kind: 'none' };
    }
    if (hasTarget(argumentNode, target)) {
      return {
        kind: 'blocked',
        reason: 'target-in-unsupported-operation',
        message: 'PARAM10 does not solve logarithms where the selected target appears in both base and argument.',
      };
    }
    if (containsSelectedExpLog(baseNode, target)) {
      return {
        kind: 'blocked',
        reason: 'nested-exp-log',
        message: 'Nested selected-target exp/log bases are outside PARAM10.',
      };
    }
    return {
      kind: 'matched',
      carrier: {
        kind: 'log-base',
        node: node as MathJson,
        base: baseNode,
        exponentOrValue: operands[1] as MathJson,
        argument: argumentNode,
        labelLatex: logCarrierLatex(argumentNode, baseNode),
      },
    };
  }

  return { kind: 'none' };
}

function reciprocalExponentLatex(exponent: MathJson) {
  if (isOneNode(exponent)) {
    return '1';
  }
  if (isNegativeOneNode(exponent)) {
    return '-1';
  }
  return `\\frac{1}{${latexForNode(exponent)}}`;
}

function principalPowerLatex(value: MathJson, exponent: MathJson) {
  return `${wrapLatexForPowerBase(value)}^{${reciprocalExponentLatex(exponent)}}`;
}

function factsForTargetBasePower(base: MathJson, exponent: MathJson, value: MathJson) {
  return [
    positiveFactForNode(value),
    nonzeroFactForNode(exponent),
    positiveFactForNode(base),
  ].filter((entry): entry is string => Boolean(entry));
}

function factsForTargetLogBase(base: MathJson, exponent: MathJson, argument: MathJson) {
  return [
    positiveFactForNode(argument),
    nonzeroFactForNode(exponent),
    positiveFactForNode(base),
    notOneFactForNode(base),
  ].filter((entry): entry is string => Boolean(entry));
}

function generatedEquationForTargetBaseCarrier(
  carrier: TargetBaseCarrierProfile,
  value: MathJson,
): { kind: 'ok'; equationLatex: string; facts: string[] } | { kind: 'unsupported'; reason: ParameterizedExpLogStopReason; message: string } {
  if (carrier.kind === 'power-base') {
    const exponentValue = numericValueOfNode(carrier.exponentOrValue);
    if (exponentValue !== null && Math.abs(exponentValue) <= EPSILON) {
      return {
        kind: 'unsupported',
        reason: 'unsupported-shell',
        message: 'Zero-exponent target-in-base equations reduce to conditional families outside PARAM10.',
      };
    }

    const numericValue = numericValueOfNode(value);
    if (numericValue !== null && numericValue <= 0) {
      return {
        kind: 'unsupported',
        reason: 'domain-empty',
        message: 'No principal real selected-target solution remains because the target-base right side must be positive.',
      };
    }

    return {
      kind: 'ok',
      equationLatex: `${latexForNode(carrier.base)}=${principalPowerLatex(value, carrier.exponentOrValue)}`,
      facts: factsForTargetBasePower(carrier.base, carrier.exponentOrValue, value),
    };
  }

  const logValue = numericValueOfNode(value);
  if (logValue !== null && Math.abs(logValue) <= EPSILON) {
    return {
      kind: 'unsupported',
      reason: 'unsupported-shell',
      message: 'Zero-result log-base equations reduce to conditional base families outside PARAM10.',
    };
  }

  const argument = carrier.argument ?? ZERO;
  const argumentValue = numericValueOfNode(argument);
  if (argumentValue !== null && argumentValue <= 0) {
    return {
      kind: 'unsupported',
      reason: 'domain-empty',
      message: 'No real selected-target solution remains because logarithm arguments must be positive.',
    };
  }

  return {
    kind: 'ok',
    equationLatex: `${latexForNode(carrier.base)}=${principalPowerLatex(argument, value)}`,
    facts: factsForTargetLogBase(carrier.base, value, argument),
  };
}

function solveTargetBaseDirectEquation(
  left: MathJson,
  right: MathJson,
  target: string,
  parameterNames: string[],
): ParameterizedExpLogSolveResult | { kind: 'none' } {
  const candidates = [
    { carrierSide: left, valueSide: right },
    { carrierSide: right, valueSide: left },
  ];

  for (const candidate of candidates) {
    const match = matchTargetBaseCarrier(candidate.carrierSide, target);
    if (match.kind === 'blocked') {
      return stop(match.reason, match.message, target, parameterNames);
    }
    if (match.kind === 'none') {
      continue;
    }
    if (hasTarget(candidate.valueSide, target)) {
      return stop(
        'target-in-unsupported-operation',
        'PARAM10 target-in-base solving requires the opposite side to be target-free.',
        target,
        parameterNames,
      );
    }

    const generated = generatedEquationForTargetBaseCarrier(match.carrier, candidate.valueSide);
    if (generated.kind === 'unsupported') {
      return stop(generated.reason, generated.message, target, parameterNames);
    }

    return finalizeGeneratedExpLogSolve({
      target,
      parameterNames,
      generatedEquationLatex: generated.equationLatex,
      domainFacts: generated.facts,
      carrierLabel: `${match.carrier.labelLatex}=${latexForNode(candidate.valueSide)}`,
    });
  }

  return { kind: 'none' };
}

function directCarrierForSide(node: MathJson, target: string): ExpLogCarrierProfile | null {
  const match = matchCarrier(node, target, false);
  return match.kind === 'matched' ? match.carrier : null;
}

function sameBaseDirectEquation(
  left: MathJson,
  right: MathJson,
  target: string,
): { equationLatex: string; facts: string[] } | null {
  const leftCarrier = directCarrierForSide(left, target);
  const rightCarrier = directCarrierForSide(right, target);
  if (
    !leftCarrier
    || !rightCarrier
    || leftCarrier.kind !== rightCarrier.kind
    || !sameBase(leftCarrier.base, rightCarrier.base)
  ) {
    return null;
  }

  if (
    containsSelectedExpLog(leftCarrier.inner, target)
    || containsSelectedExpLog(rightCarrier.inner, target)
  ) {
    return null;
  }

  const facts = [
    ...positiveBaseFacts(leftCarrier.base),
    ...(leftCarrier.kind === 'logarithm'
      ? [
          positiveFactForNode(leftCarrier.inner),
          positiveFactForNode(rightCarrier.inner),
        ].filter((entry): entry is string => Boolean(entry))
      : []),
  ];

  return {
    equationLatex: `${latexForNode(leftCarrier.inner)}=${latexForNode(rightCarrier.inner)}`,
    facts,
  };
}

export function solveParameterizedExpLogEquation(
  equationLatex: string,
  target: string,
): ParameterizedExpLogSolveResult {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);

  if (hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before parameterized exp/log solving.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for parameterized exp/log solving.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before parameterized exp/log solving.', target, parameterNames);
  }

  if (!hasTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const targetBase = solveTargetBaseDirectEquation(json[1] as MathJson, json[2] as MathJson, target, parameterNames);
  if (targetBase.kind !== 'none') {
    return targetBase;
  }

  if (!containsSelectedExpLog(json, target)) {
    return stop(
      'no-exp-log',
      'No supported exponential or logarithmic selected-target carrier was found for EQUATION-PARAM5.',
      target,
      parameterNames,
    );
  }

  const sameBase = sameBaseDirectEquation(json[1] as MathJson, json[2] as MathJson, target);
  let generatedEquationLatex: string;
  let domainFacts: string[];
  let carrierLabel = 'same-base exp/log carriers';

  if (sameBase) {
    generatedEquationLatex = sameBase.equationLatex;
    domainFacts = sameBase.facts;
  } else {
    const left = collectExpLogAffine(json[1], target);
    if (left.kind === 'unsupported') {
      return stop(left.reason, left.message, target, parameterNames);
    }

    const right = collectExpLogAffine(json[2], target);
    if (right.kind === 'unsupported') {
      return stop(right.reason, right.message, target, parameterNames);
    }

    const normalized = subtractAffine(left.affine, right.affine);
    if (normalized.kind === 'unsupported') {
      return stop(normalized.reason, normalized.message, target, parameterNames);
    }

    const carrier = normalized.affine.carrier;
    if (!carrier) {
      return stop(
        'no-exp-log',
        'No supported exponential or logarithmic selected-target carrier was found for EQUATION-PARAM5.',
        target,
        parameterNames,
      );
    }

    if (isZeroNode(normalized.affine.coefficient)) {
      return stop(
        'unsupported-shell',
        'The selected-target exp/log carrier cancels before isolation.',
        target,
        parameterNames,
      );
    }

    const carrierValue = divideNodes(negateNode(normalized.affine.constant), normalized.affine.coefficient);
    const generated = generatedEquationForCarrier(carrier, carrierValue);
    if (generated.kind === 'unsupported') {
      return stop(generated.reason, generated.message, target, parameterNames);
    }
    carrierLabel = `${carrier.labelLatex}=${latexForNode(carrierValue)}`;
    generatedEquationLatex = generated.equationLatex;
    domainFacts = generated.facts;
  }

  return finalizeGeneratedExpLogSolve({
    target,
    parameterNames,
    generatedEquationLatex,
    domainFacts,
    carrierLabel,
  });
}
