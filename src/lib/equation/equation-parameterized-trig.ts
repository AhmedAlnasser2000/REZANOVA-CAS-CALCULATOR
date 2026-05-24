import { ComputeEngine } from '@cortex-js/compute-engine';
import type { AngleUnit, DisplayDetailSection } from '../../types/calculator';
import { analyzeVariablesFromLatex } from '../algebra/variable-core';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './equation-parameterized-readback';

const ce = new ComputeEngine();

type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

export type ParameterizedTrigStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'no-trig'
  | 'multiple-carriers'
  | 'nested-trig'
  | 'unsupported-shell'
  | 'target-in-rhs'
  | 'target-in-unsupported-operation'
  | 'non-affine-argument'
  | 'zero-argument-coefficient'
  | 'no-real-solution';

export type ParameterizedTrigSolveSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
  carrierValueLatex: string;
};

export type ParameterizedTrigSolveStop = {
  kind: 'unsupported';
  reason: ParameterizedTrigStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type ParameterizedTrigSolveResult =
  | ParameterizedTrigSolveSuccess
  | ParameterizedTrigSolveStop;

type TrigCarrierKind = 'sin' | 'cos' | 'tan';

type TrigCarrierProfile = {
  kind: TrigCarrierKind;
  node: MathJson;
  argument: MathJson;
  labelLatex: string;
};

type TrigAffine = {
  coefficient: MathJson;
  constant: MathJson;
  carrier: TrigCarrierProfile | null;
};

type TargetAffine = {
  coefficient: MathJson;
  constant: MathJson;
};

type MixedTrigAffine = {
  sinCoefficient: MathJson;
  cosCoefficient: MathJson;
  constant: MathJson;
  argument: MathJson | null;
};

type CarrierMatch =
  | { kind: 'matched'; carrier: TrigCarrierProfile }
  | { kind: 'none' };

type CollectResult =
  | { kind: 'ok'; affine: TrigAffine }
  | { kind: 'unsupported'; reason: ParameterizedTrigStopReason; message: string };

type TargetAffineResult =
  | { kind: 'ok'; affine: TargetAffine }
  | { kind: 'unsupported'; reason: ParameterizedTrigStopReason; message: string };

type MixedCollectResult =
  | { kind: 'ok'; affine: MixedTrigAffine }
  | { kind: 'unsupported'; reason: ParameterizedTrigStopReason; message: string };

const ZERO: MathJson = 0;
const ONE: MathJson = 1;

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isZeroNode(node: unknown) {
  return typeof node === 'number' && Object.is(node, 0);
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

function subtractTrigAffine(left: TrigAffine, right: TrigAffine): CollectResult {
  return addTrigAffine(left, {
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

function numericValueOfNode(node: MathJson): number | null {
  return numericFromNode(simplifyNode(node));
}

function unsupported(
  reason: ParameterizedTrigStopReason,
  message: string,
): CollectResult {
  return { kind: 'unsupported', reason, message };
}

function operatorToCarrierKind(operator: unknown): TrigCarrierKind | null {
  if (operator === 'Sin') {
    return 'sin';
  }
  if (operator === 'Cos') {
    return 'cos';
  }
  if (operator === 'Tan') {
    return 'tan';
  }
  return null;
}

function containsSelectedTrig(node: unknown, target: string): boolean {
  if (!isArrayNode(node)) {
    return false;
  }

  const [operator, ...operands] = node;
  if (operatorToCarrierKind(operator) && operands.some((operand) => hasTarget(operand, target))) {
    return true;
  }

  return operands.some((operand) => containsSelectedTrig(operand, target));
}

function matchCarrier(node: unknown, target: string): CarrierMatch {
  if (!isArrayNode(node)) {
    return { kind: 'none' };
  }

  const [operator, ...operands] = node;
  const carrierKind = operatorToCarrierKind(operator);
  if (carrierKind && operands.length === 1 && hasTarget(operands[0], target)) {
    return {
      kind: 'matched',
      carrier: {
        kind: carrierKind,
        node: node as MathJson,
        argument: operands[0] as MathJson,
        labelLatex: latexForNode(node as MathJson),
      },
    };
  }

  return { kind: 'none' };
}

function carrierKey(carrier: TrigCarrierProfile) {
  return `${carrier.kind}:${latexForNode(carrier.node)}`;
}

function mergeCarriers(
  left: TrigCarrierProfile | null,
  right: TrigCarrierProfile | null,
): TrigCarrierProfile | null | 'multiple' {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  return carrierKey(left) === carrierKey(right) ? left : 'multiple';
}

function addTrigAffine(left: TrigAffine, right: TrigAffine): CollectResult {
  const carrier = mergeCarriers(left.carrier, right.carrier);
  if (carrier === 'multiple') {
    return unsupported(
      'multiple-carriers',
      'EQUATION-PARAM6 supports one selected-target trigonometric carrier at a time.',
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

function collectTrigAffine(node: unknown, target: string): CollectResult {
  const carrier = matchCarrier(node, target);
  if (carrier.kind === 'matched') {
    if (containsSelectedTrig(carrier.carrier.argument, target)) {
      return unsupported(
        'nested-trig',
        'Nested selected-target trigonometric carriers are outside EQUATION-PARAM6.',
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
        'target-in-rhs',
        'The selected target appears outside a supported trigonometric carrier.',
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
        'The selected target appears in an unsupported trigonometric expression shape.',
      );
    }
    return { kind: 'ok', affine: { coefficient: ZERO, constant: node as MathJson, carrier: null } };
  }

  const [operator, ...operands] = node;

  if (operator === 'Add') {
    let current: TrigAffine = { coefficient: ZERO, constant: ZERO, carrier: null };
    for (const operand of operands) {
      const collected = collectTrigAffine(operand, target);
      if (collected.kind === 'unsupported') {
        return collected;
      }
      const next = addTrigAffine(current, collected.affine);
      if (next.kind === 'unsupported') {
        return next;
      }
      current = next.affine;
    }
    return { kind: 'ok', affine: current };
  }

  if (operator === 'Subtract') {
    const [left, right] = operands;
    const leftCollected = collectTrigAffine(left, target);
    if (leftCollected.kind === 'unsupported') {
      return leftCollected;
    }
    const rightCollected = collectTrigAffine(right, target);
    if (rightCollected.kind === 'unsupported') {
      return rightCollected;
    }
    return subtractTrigAffine(leftCollected.affine, rightCollected.affine);
  }

  if (operator === 'Negate') {
    const collected = collectTrigAffine(operands[0], target);
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
    const collected = operands.map((operand) => collectTrigAffine(operand, target));
    const unsupportedEntry = collected.find((entry) => entry.kind === 'unsupported');
    if (unsupportedEntry?.kind === 'unsupported') {
      return unsupportedEntry;
    }
    const affines = collected
      .filter((entry): entry is { kind: 'ok'; affine: TrigAffine } => entry.kind === 'ok')
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
        'EQUATION-PARAM6 only supports affine shells around one selected-target trigonometric carrier.',
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

  if (operator === 'Divide') {
    const [numerator, denominator] = operands;
    if (hasTarget(denominator, target)) {
      return unsupported(
        'target-in-unsupported-operation',
        'The selected target cannot appear in a denominator for EQUATION-PARAM6.',
      );
    }
    const collected = collectTrigAffine(numerator, target);
    if (collected.kind === 'unsupported') {
      return collected;
    }
    return {
      kind: 'ok',
      affine: {
        coefficient: divideNodes(collected.affine.coefficient, denominator as MathJson),
        constant: divideNodes(collected.affine.constant, denominator as MathJson),
        carrier: collected.affine.carrier,
      },
    };
  }

  if (hasTarget(node, target)) {
    return unsupported(
      containsSelectedTrig(node, target) ? 'nested-trig' : 'target-in-unsupported-operation',
      containsSelectedTrig(node, target)
        ? 'Nested selected-target trigonometric carriers are outside EQUATION-PARAM6.'
        : 'This selected-target expression is outside EQUATION-PARAM6 trigonometric isolation.',
    );
  }

  return { kind: 'ok', affine: { coefficient: ZERO, constant: node as MathJson, carrier: null } };
}

function sameArgument(left: MathJson, right: MathJson) {
  return latexForNode(left) === latexForNode(right);
}

function mergeMixedArgument(
  left: MathJson | null,
  right: MathJson | null,
): MathJson | null | 'multiple' {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  return sameArgument(left, right) ? left : 'multiple';
}

function addMixedTrigAffine(left: MixedTrigAffine, right: MixedTrigAffine): MixedCollectResult {
  const argument = mergeMixedArgument(left.argument, right.argument);
  if (argument === 'multiple') {
    return {
      kind: 'unsupported',
      reason: 'multiple-carriers',
      message: 'Mixed sine/cosine solving requires the same selected-target argument in both carriers.',
    };
  }
  return {
    kind: 'ok',
    affine: {
      sinCoefficient: addNodes(left.sinCoefficient, right.sinCoefficient),
      cosCoefficient: addNodes(left.cosCoefficient, right.cosCoefficient),
      constant: addNodes(left.constant, right.constant),
      argument,
    },
  };
}

function negateMixedTrigAffine(input: MixedTrigAffine): MixedTrigAffine {
  return {
    sinCoefficient: negateNode(input.sinCoefficient),
    cosCoefficient: negateNode(input.cosCoefficient),
    constant: negateNode(input.constant),
    argument: input.argument,
  };
}

function subtractMixedTrigAffine(left: MixedTrigAffine, right: MixedTrigAffine): MixedCollectResult {
  return addMixedTrigAffine(left, negateMixedTrigAffine(right));
}

function collectMixedTrigAffine(node: unknown, target: string): MixedCollectResult {
  const carrier = matchCarrier(node, target);
  if (carrier.kind === 'matched') {
    if (containsSelectedTrig(carrier.carrier.argument, target)) {
      return {
        kind: 'unsupported',
        reason: 'nested-trig',
        message: 'Nested selected-target trigonometric carriers are outside bounded mixed trig solving.',
      };
    }
    if (carrier.carrier.kind === 'tan') {
      return {
        kind: 'unsupported',
        reason: 'multiple-carriers',
        message: 'Tangent cannot be mixed with sine/cosine in this bounded selected-target pass.',
      };
    }
    return {
      kind: 'ok',
      affine: {
        sinCoefficient: carrier.carrier.kind === 'sin' ? ONE : ZERO,
        cosCoefficient: carrier.carrier.kind === 'cos' ? ONE : ZERO,
        constant: ZERO,
        argument: carrier.carrier.argument,
      },
    };
  }

  if (typeof node === 'string') {
    if (node === target) {
      return {
        kind: 'unsupported',
        reason: 'target-in-rhs',
        message: 'The selected target appears outside a supported mixed trigonometric structure.',
      };
    }
    return {
      kind: 'ok',
      affine: { sinCoefficient: ZERO, cosCoefficient: ZERO, constant: node as MathJson, argument: null },
    };
  }

  if (typeof node === 'number') {
    return {
      kind: 'ok',
      affine: { sinCoefficient: ZERO, cosCoefficient: ZERO, constant: node as MathJson, argument: null },
    };
  }

  if (!isArrayNode(node)) {
    if (hasTarget(node, target)) {
      return {
        kind: 'unsupported',
        reason: 'target-in-unsupported-operation',
        message: 'The selected target appears in an unsupported mixed trigonometric expression shape.',
      };
    }
    return {
      kind: 'ok',
      affine: { sinCoefficient: ZERO, cosCoefficient: ZERO, constant: node as MathJson, argument: null },
    };
  }

  const [operator, ...operands] = node;

  if (operator === 'Add') {
    let current: MixedTrigAffine = {
      sinCoefficient: ZERO,
      cosCoefficient: ZERO,
      constant: ZERO,
      argument: null,
    };
    for (const operand of operands) {
      const collected = collectMixedTrigAffine(operand, target);
      if (collected.kind === 'unsupported') {
        return collected;
      }
      const next = addMixedTrigAffine(current, collected.affine);
      if (next.kind === 'unsupported') {
        return next;
      }
      current = next.affine;
    }
    return { kind: 'ok', affine: current };
  }

  if (operator === 'Subtract') {
    const [left, right] = operands;
    const leftCollected = collectMixedTrigAffine(left, target);
    if (leftCollected.kind === 'unsupported') {
      return leftCollected;
    }
    const rightCollected = collectMixedTrigAffine(right, target);
    if (rightCollected.kind === 'unsupported') {
      return rightCollected;
    }
    return subtractMixedTrigAffine(leftCollected.affine, rightCollected.affine);
  }

  if (operator === 'Negate') {
    const collected = collectMixedTrigAffine(operands[0], target);
    if (collected.kind === 'unsupported') {
      return collected;
    }
    return { kind: 'ok', affine: negateMixedTrigAffine(collected.affine) };
  }

  if (operator === 'Multiply') {
    const collected = operands.map((operand) => collectMixedTrigAffine(operand, target));
    const unsupportedEntry = collected.find((entry) => entry.kind === 'unsupported');
    if (unsupportedEntry?.kind === 'unsupported') {
      return unsupportedEntry;
    }
    const affines = collected
      .filter((entry): entry is { kind: 'ok'; affine: MixedTrigAffine } => entry.kind === 'ok')
      .map((entry) => entry.affine);
    const carrierFactors = affines.filter((entry) => entry.argument);
    if (carrierFactors.length === 0) {
      return {
        kind: 'ok',
        affine: {
          sinCoefficient: ZERO,
          cosCoefficient: ZERO,
          constant: multiplyNodes(...affines.map((entry) => entry.constant)),
          argument: null,
        },
      };
    }
    if (
      carrierFactors.length > 1
      || !isZeroNode(carrierFactors[0].constant)
    ) {
      return {
        kind: 'unsupported',
        reason: 'unsupported-shell',
        message: 'Products of trigonometric carriers are outside bounded mixed trig solving.',
      };
    }
    const targetFreeFactors = affines
      .filter((entry) => entry !== carrierFactors[0])
      .map((entry) => entry.constant);
    const scale = multiplyNodes(...targetFreeFactors);
    return {
      kind: 'ok',
      affine: {
        sinCoefficient: multiplyNodes(scale, carrierFactors[0].sinCoefficient),
        cosCoefficient: multiplyNodes(scale, carrierFactors[0].cosCoefficient),
        constant: ZERO,
        argument: carrierFactors[0].argument,
      },
    };
  }

  if (operator === 'Divide') {
    const [numerator, denominator] = operands;
    if (hasTarget(denominator, target)) {
      return {
        kind: 'unsupported',
        reason: 'target-in-unsupported-operation',
        message: 'The selected target cannot appear in a denominator for bounded mixed trig solving.',
      };
    }
    const collected = collectMixedTrigAffine(numerator, target);
    if (collected.kind === 'unsupported') {
      return collected;
    }
    return {
      kind: 'ok',
      affine: {
        sinCoefficient: divideNodes(collected.affine.sinCoefficient, denominator as MathJson),
        cosCoefficient: divideNodes(collected.affine.cosCoefficient, denominator as MathJson),
        constant: divideNodes(collected.affine.constant, denominator as MathJson),
        argument: collected.affine.argument,
      },
    };
  }

  if (hasTarget(node, target)) {
    return {
      kind: 'unsupported',
      reason: containsSelectedTrig(node, target) ? 'nested-trig' : 'target-in-unsupported-operation',
      message: containsSelectedTrig(node, target)
        ? 'Nested selected-target trigonometric carriers are outside bounded mixed trig solving.'
        : 'This selected-target expression is outside bounded mixed trig solving.',
    };
  }

  return {
    kind: 'ok',
    affine: { sinCoefficient: ZERO, cosCoefficient: ZERO, constant: node as MathJson, argument: null },
  };
}

function addTargetAffine(left: TargetAffine, right: TargetAffine): TargetAffine {
  return {
    coefficient: addNodes(left.coefficient, right.coefficient),
    constant: addNodes(left.constant, right.constant),
  };
}

function negateTargetAffine(input: TargetAffine): TargetAffine {
  return {
    coefficient: negateNode(input.coefficient),
    constant: negateNode(input.constant),
  };
}

function collectTargetAffine(node: unknown, target: string): TargetAffineResult {
  if (typeof node === 'string') {
    return {
      kind: 'ok',
      affine: node === target
        ? { coefficient: ONE, constant: ZERO }
        : { coefficient: ZERO, constant: node as MathJson },
    };
  }

  if (typeof node === 'number') {
    return { kind: 'ok', affine: { coefficient: ZERO, constant: node as MathJson } };
  }

  if (!isArrayNode(node)) {
    if (hasTarget(node, target)) {
      return {
        kind: 'unsupported',
        reason: 'non-affine-argument',
        message: 'The selected-target trigonometric argument is not affine in the selected target.',
      };
    }
    return { kind: 'ok', affine: { coefficient: ZERO, constant: node as MathJson } };
  }

  const [operator, ...operands] = node;

  if (operator === 'Add') {
    let current: TargetAffine = { coefficient: ZERO, constant: ZERO };
    for (const operand of operands) {
      const collected = collectTargetAffine(operand, target);
      if (collected.kind === 'unsupported') {
        return collected;
      }
      current = addTargetAffine(current, collected.affine);
    }
    return { kind: 'ok', affine: current };
  }

  if (operator === 'Subtract') {
    const left = collectTargetAffine(operands[0], target);
    if (left.kind === 'unsupported') {
      return left;
    }
    const right = collectTargetAffine(operands[1], target);
    if (right.kind === 'unsupported') {
      return right;
    }
    return { kind: 'ok', affine: addTargetAffine(left.affine, negateTargetAffine(right.affine)) };
  }

  if (operator === 'Negate') {
    const collected = collectTargetAffine(operands[0], target);
    if (collected.kind === 'unsupported') {
      return collected;
    }
    return { kind: 'ok', affine: negateTargetAffine(collected.affine) };
  }

  if (operator === 'Multiply') {
    const collected = operands.map((operand) => collectTargetAffine(operand, target));
    const unsupportedEntry = collected.find((entry) => entry.kind === 'unsupported');
    if (unsupportedEntry?.kind === 'unsupported') {
      return unsupportedEntry;
    }
    const affines = collected
      .filter((entry): entry is { kind: 'ok'; affine: TargetAffine } => entry.kind === 'ok')
      .map((entry) => entry.affine);
    const targetFactors = affines.filter((entry) => !isZeroNode(entry.coefficient));
    if (targetFactors.length === 0) {
      return {
        kind: 'ok',
        affine: {
          coefficient: ZERO,
          constant: multiplyNodes(...affines.map((entry) => entry.constant)),
        },
      };
    }
    if (targetFactors.length > 1) {
      return {
        kind: 'unsupported',
        reason: 'non-affine-argument',
        message: 'The selected-target trigonometric argument has a nonlinear target product.',
      };
    }
    const targetFactor = targetFactors[0];
    const targetFreeFactors = affines
      .filter((entry) => entry !== targetFactor)
      .map((entry) => entry.constant);
    const scale = multiplyNodes(...targetFreeFactors);
    return {
      kind: 'ok',
      affine: {
        coefficient: multiplyNodes(scale, targetFactor.coefficient),
        constant: multiplyNodes(scale, targetFactor.constant),
      },
    };
  }

  if (operator === 'Divide') {
    const [numerator, denominator] = operands;
    if (hasTarget(denominator, target)) {
      return {
        kind: 'unsupported',
        reason: 'non-affine-argument',
        message: 'The selected target cannot appear in an argument denominator for EQUATION-PARAM6.',
      };
    }
    const collected = collectTargetAffine(numerator, target);
    if (collected.kind === 'unsupported') {
      return collected;
    }
    return {
      kind: 'ok',
      affine: {
        coefficient: divideNodes(collected.affine.coefficient, denominator as MathJson),
        constant: divideNodes(collected.affine.constant, denominator as MathJson),
      },
    };
  }

  if (hasTarget(node, target)) {
    return {
      kind: 'unsupported',
      reason: operatorToCarrierKind(operator) ? 'nested-trig' : 'non-affine-argument',
      message: operatorToCarrierKind(operator)
        ? 'Nested selected-target trigonometric carriers are outside EQUATION-PARAM6.'
        : 'The selected-target trigonometric argument is not affine in the selected target.',
    };
  }

  return { kind: 'ok', affine: { coefficient: ZERO, constant: node as MathJson } };
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
      && symbol.name !== 'n'
      && symbol.identifierKind === 'single-symbol-variable'
      && /^[A-Za-z]$/.test(symbol.name))
    .map((symbol) => symbol.name);
}

function nodeHasSymbol(node: MathJson) {
  return analyzeVariablesFromLatex(latexForNode(node), {
    allowSymbolicParameters: true,
  }).symbols.length > 0;
}

function nonzeroFactForNode(node: MathJson): string | null {
  if (!nodeHasSymbol(node) || isOneNode(node) || isNegativeOneNode(node)) {
    return null;
  }
  return `${latexForNode(node)}\\ne0`;
}

function stop(
  reason: ParameterizedTrigStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): ParameterizedTrigSolveStop {
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

function paren(latex: string) {
  return /^[A-Za-z0-9]+$/.test(latex) || /^\\[A-Za-z]+\(.*\)$/.test(latex)
    ? latex
    : `\\left(${latex}\\right)`;
}

function subtractLatex(left: string, right: string) {
  if (right === '0') {
    return left;
  }
  if (left === '0') {
    return `-${paren(right)}`;
  }
  if (right.startsWith('-')) {
    return `${left}+${right.slice(1)}`;
  }
  return `${left}-${paren(right)}`;
}

function divideLatex(numerator: string, denominator: string) {
  if (denominator === '1') {
    return numerator;
  }
  if (denominator === '-1') {
    return `-${paren(numerator)}`;
  }
  return `\\frac{${numerator}}{${denominator}}`;
}

function solveArgumentForTarget(argument: TargetAffine, argumentValueLatex: string) {
  const coefficientLatex = latexForNode(argument.coefficient);
  const constantLatex = latexForNode(argument.constant);
  return divideLatex(subtractLatex(argumentValueLatex, constantLatex), coefficientLatex);
}

function inverseLatex(kind: TrigCarrierKind, valueLatex: string) {
  if (kind === 'sin') {
    return `\\arcsin(${valueLatex})`;
  }
  if (kind === 'cos') {
    return `\\arccos(${valueLatex})`;
  }
  return `\\arctan(${valueLatex})`;
}

function scaledInverseLatex(kind: TrigCarrierKind, valueLatex: string, angleUnit: AngleUnit) {
  const inverse = inverseLatex(kind, valueLatex);
  if (angleUnit === 'rad') {
    return inverse;
  }
  const numerator = angleUnit === 'deg' ? '180' : '200';
  return `\\frac{${numerator}}{\\pi}${inverse}`;
}

function periodicBranchValues(kind: TrigCarrierKind, valueLatex: string, angleUnit: AngleUnit) {
  const inverse = scaledInverseLatex(kind, valueLatex, angleUnit);

  if (kind === 'tan') {
    const period = angleUnit === 'rad' ? '\\pi n' : angleUnit === 'deg' ? '180n' : '200n';
    return [`${inverse}+${period}`];
  }

  const fullPeriod = angleUnit === 'rad' ? '2\\pi n' : angleUnit === 'deg' ? '360n' : '400n';
  if (kind === 'sin') {
    const halfTurn = angleUnit === 'rad' ? '\\pi' : angleUnit === 'deg' ? '180' : '200';
    return [
      `${inverse}+${fullPeriod}`,
      `${halfTurn}-${inverse}+${fullPeriod}`,
    ];
  }

  return [
    `${inverse}+${fullPeriod}`,
    `-${inverse}+${fullPeriod}`,
  ];
}

function exactLatexForSolutions(target: string, solutionExpressions: string[]) {
  const unique = dedupe(solutionExpressions);
  if (unique.length === 1) {
    return `${target}=${unique[0]}`;
  }
  return `${target}\\in\\left\\{${unique.join(',\\ ')}\\right\\}`;
}

function rangeFactForCarrierValue(kind: TrigCarrierKind, value: MathJson, valueLatex: string) {
  if (kind === 'tan') {
    return null;
  }
  const numericValue = numericValueOfNode(value);
  if (numericValue !== null) {
    return numericValue < -1 || numericValue > 1
      ? { kind: 'impossible' as const }
      : null;
  }
  return { kind: 'fact' as const, latex: `-1\\le ${valueLatex}\\le1` };
}

function squareNode(node: MathJson): MathJson {
  return simplifyNode(['Power', node, 2] as MathJson);
}

function positiveFactForNode(node: MathJson): string | null {
  if (!nodeHasSymbol(node)) {
    return null;
  }
  return `${latexForNode(node)}>0`;
}

function phaseLatexForMixedCoefficients(
  sinCoefficient: MathJson,
  cosCoefficient: MathJson,
  angleUnit: AngleUnit,
) {
  const sinLatex = latexForNode(sinCoefficient);
  const cosLatex = latexForNode(cosCoefficient);
  const phase = `\\operatorname{atan2}\\left(${cosLatex},${sinLatex}\\right)`;
  if (angleUnit === 'rad') {
    return phase;
  }
  const numerator = angleUnit === 'deg' ? '180' : '200';
  return `\\frac{${numerator}}{\\pi}${phase}`;
}

function mixedPeriodLatex(angleUnit: AngleUnit) {
  if (angleUnit === 'rad') {
    return '2\\pi n';
  }
  return angleUnit === 'deg' ? '360n' : '400n';
}

function mixedHalfTurnLatex(angleUnit: AngleUnit) {
  if (angleUnit === 'rad') {
    return '\\pi';
  }
  return angleUnit === 'deg' ? '180' : '200';
}

function mixedRangeFact(
  rhs: MathJson,
  amplitude: MathJson,
  amplitudeSquare: MathJson,
  sinCoefficient: MathJson,
  cosCoefficient: MathJson,
) {
  const sinNumeric = numericValueOfNode(sinCoefficient);
  const cosNumeric = numericValueOfNode(cosCoefficient);
  const rhsNumeric = numericValueOfNode(rhs);
  if (sinNumeric !== null && cosNumeric !== null && rhsNumeric !== null) {
    const amplitudeNumeric = Math.hypot(sinNumeric, cosNumeric);
    return Math.abs(rhsNumeric) > amplitudeNumeric
      ? { kind: 'impossible' as const }
      : null;
  }

  if (!nodeHasSymbol(rhs) && !nodeHasSymbol(amplitudeSquare)) {
    return null;
  }

  const rhsLatex = latexForNode(rhs);
  const amplitudeLatex = latexForNode(amplitude);
  return { kind: 'fact' as const, latex: `-${amplitudeLatex}\\le ${rhsLatex}\\le ${amplitudeLatex}` };
}

function solveDirectParameterizedTrigFromJson(
  json: MathJson[],
  target: string,
  angleUnit: AngleUnit,
  parameterNames: string[],
): ParameterizedTrigSolveResult {
  const left = collectTrigAffine(json[1], target);
  if (left.kind === 'unsupported') {
    return stop(left.reason, left.message, target, parameterNames);
  }

  const right = collectTrigAffine(json[2], target);
  if (right.kind === 'unsupported') {
    return stop(right.reason, right.message, target, parameterNames);
  }

  const normalized = subtractTrigAffine(left.affine, right.affine);
  if (normalized.kind === 'unsupported') {
    return stop(normalized.reason, normalized.message, target, parameterNames);
  }

  const carrier = normalized.affine.carrier;
  if (!carrier) {
    return stop(
      'no-trig',
      'No supported trigonometric selected-target carrier was found.',
      target,
      parameterNames,
    );
  }

  if (isZeroNode(normalized.affine.coefficient)) {
    return stop(
      'unsupported-shell',
      'The selected-target trigonometric carrier cancels before isolation.',
      target,
      parameterNames,
    );
  }

  const argument = collectTargetAffine(carrier.argument, target);
  if (argument.kind === 'unsupported') {
    return stop(argument.reason, argument.message, target, parameterNames);
  }

  if (isZeroNode(argument.affine.coefficient)) {
    return stop(
      'zero-argument-coefficient',
      'The selected-target trigonometric argument does not contain a nonzero target coefficient.',
      target,
      parameterNames,
    );
  }

  const carrierValue = divideNodes(negateNode(normalized.affine.constant), normalized.affine.coefficient);
  const carrierValueLatex = latexForNode(carrierValue);
  const rangeFact = rangeFactForCarrierValue(carrier.kind, carrierValue, carrierValueLatex);
  if (rangeFact?.kind === 'impossible') {
    return stop(
      'no-real-solution',
      'No real selected-target solution remains because the trigonometric range check fails.',
      target,
      parameterNames,
    );
  }

  const branchValues = periodicBranchValues(carrier.kind, carrierValueLatex, angleUnit);
  const solutionExpressions = branchValues.map((branchValue) =>
    solveArgumentForTarget(argument.affine, branchValue),
  );
  const exactSupplementLatex = normalizeParameterizedSupplementLatex(dedupe([
    nonzeroFactForNode(normalized.affine.coefficient),
    nonzeroFactForNode(argument.affine.coefficient),
    rangeFact?.kind === 'fact' ? rangeFact.latex : null,
    'n\\in\\mathbb{Z}',
  ].filter((entry): entry is string => Boolean(entry))));

  const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Parameterized Trig Solve',
    familyLines: [
      `Isolated ${carrier.labelLatex}=${carrierValueLatex} with a direct affine trig-carrier rule.`,
      `Angle unit: ${angleUnit.toUpperCase()}. The integer family parameter is n.`,
    ],
  });

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex: exactLatexForSolutions(target, solutionExpressions),
    exactSupplementLatex,
    detailSections,
    carrierValueLatex,
  };
}

function solveMixedParameterizedTrigFromJson(
  json: MathJson[],
  target: string,
  angleUnit: AngleUnit,
  parameterNames: string[],
): ParameterizedTrigSolveResult {
  const left = collectMixedTrigAffine(json[1], target);
  if (left.kind === 'unsupported') {
    return stop(left.reason, left.message, target, parameterNames);
  }

  const right = collectMixedTrigAffine(json[2], target);
  if (right.kind === 'unsupported') {
    return stop(right.reason, right.message, target, parameterNames);
  }

  const normalized = subtractMixedTrigAffine(left.affine, right.affine);
  if (normalized.kind === 'unsupported') {
    return stop(normalized.reason, normalized.message, target, parameterNames);
  }

  if (
    !normalized.affine.argument
    || isZeroNode(normalized.affine.sinCoefficient)
    || isZeroNode(normalized.affine.cosCoefficient)
  ) {
    return stop(
      'no-trig',
      'No supported same-argument sine/cosine mixed carrier was found.',
      target,
      parameterNames,
    );
  }

  const argument = collectTargetAffine(normalized.affine.argument, target);
  if (argument.kind === 'unsupported') {
    return stop(argument.reason, argument.message, target, parameterNames);
  }

  if (isZeroNode(argument.affine.coefficient)) {
    return stop(
      'zero-argument-coefficient',
      'The selected-target mixed trigonometric argument does not contain a nonzero target coefficient.',
      target,
      parameterNames,
    );
  }

  const rhs = negateNode(normalized.affine.constant);
  const amplitudeSquare = addNodes(
    squareNode(normalized.affine.sinCoefficient),
    squareNode(normalized.affine.cosCoefficient),
  );
  if (isZeroNode(amplitudeSquare)) {
    return stop(
      'unsupported-shell',
      'The mixed sine/cosine coefficients collapse before isolation.',
      target,
      parameterNames,
    );
  }
  const amplitude = simplifyNode(['Sqrt', amplitudeSquare] as MathJson);
  const normalizedValue = divideNodes(rhs, amplitude);
  const normalizedValueLatex = latexForNode(normalizedValue);
  const phaseLatex = phaseLatexForMixedCoefficients(
    normalized.affine.sinCoefficient,
    normalized.affine.cosCoefficient,
    angleUnit,
  );
  const rangeFact = mixedRangeFact(
    rhs,
    amplitude,
    amplitudeSquare,
    normalized.affine.sinCoefficient,
    normalized.affine.cosCoefficient,
  );
  if (rangeFact?.kind === 'impossible') {
    return stop(
      'no-real-solution',
      'No real selected-target solution remains because the mixed sine/cosine range check fails.',
      target,
      parameterNames,
    );
  }

  const inverse = scaledInverseLatex('sin', normalizedValueLatex, angleUnit);
  const period = mixedPeriodLatex(angleUnit);
  const halfTurn = mixedHalfTurnLatex(angleUnit);
  const branchValues = [
    `${subtractLatex(inverse, phaseLatex)}+${period}`,
    `${subtractLatex(subtractLatex(halfTurn, inverse), phaseLatex)}+${period}`,
  ];
  const solutionExpressions = branchValues.map((branchValue) =>
    solveArgumentForTarget(argument.affine, branchValue),
  );
  const exactSupplementLatex = normalizeParameterizedSupplementLatex(dedupe([
    positiveFactForNode(amplitudeSquare),
    nonzeroFactForNode(argument.affine.coefficient),
    rangeFact?.kind === 'fact' ? rangeFact.latex : null,
    'n\\in\\mathbb{Z}',
  ].filter((entry): entry is string => Boolean(entry))));
  const rhsLatex = latexForNode(rhs);
  const argumentLatex = latexForNode(normalized.affine.argument);

  const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Parameterized Mixed Trig Solve',
    familyLines: [
      `Reduced same-argument sine/cosine terms to Rsin(u+phi)=${rhsLatex} with u=${argumentLatex}.`,
      `Angle unit: ${angleUnit.toUpperCase()}. The integer family parameter is n.`,
    ],
  });

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex: exactLatexForSolutions(target, solutionExpressions),
    exactSupplementLatex,
    detailSections,
    carrierValueLatex: normalizedValueLatex,
  };
}

export function solveParameterizedTrigEquation(
  equationLatex: string,
  target: string,
  angleUnit: AngleUnit,
): ParameterizedTrigSolveResult {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);

  if (hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before parameterized trig solving.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for parameterized trig solving.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before parameterized trig solving.', target, parameterNames);
  }
  const equationJson = json as MathJson[];

  if (!hasTarget(equationJson, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  if (!containsSelectedTrig(equationJson, target)) {
    return stop(
      'no-trig',
      'No supported trigonometric selected-target carrier was found.',
      target,
      parameterNames,
    );
  }

  const direct = solveDirectParameterizedTrigFromJson(equationJson, target, angleUnit, parameterNames);
  if (direct.kind === 'success') {
    return direct;
  }

  const mixed = solveMixedParameterizedTrigFromJson(equationJson, target, angleUnit, parameterNames);
  if (mixed.kind === 'success') {
    return mixed;
  }

  return mixed.reason !== 'no-trig' ? mixed : direct;
}
