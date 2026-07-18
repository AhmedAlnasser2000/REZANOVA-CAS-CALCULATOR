import {
  cleanExpLogLatex,
  logCarrierLatex,
  powerCarrierLatex,
} from './exp-log-latex';
import { dedupe, nodeHasSymbol as sharedNodeHasSymbol } from './facts';
import {
  type MathJson,
  ONE,
  ZERO,
  createArithmeticHelpers,
  hasTarget,
  isArrayNode,
  isNegativeOneNode,
  isOneNode,
  isZeroNode,
  latexForNode,
  numericFromNode,
  simplifyNode,
} from './math-json';
import {
  type BaseProfile,
  type CarrierMatch,
  type CollectResult,
  type ExpLogAffine,
  type ExpLogCarrierProfile,
  type ParameterizedExpLogSolveStop,
  type ParameterizedExpLogStopReason,
} from './exp-log-types';

const {
  addNodes,
  divideNodes,
  multiplyNodes,
  negateNode,
} = createArithmeticHelpers();
export const EPSILON = 1e-12;

export {
  ZERO,
  addNodes,
  divideNodes,
  hasTarget,
  isArrayNode,
  isNegativeOneNode,
  isOneNode,
  isZeroNode,
  latexForNode,
  negateNode,
};

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

export function containsSelectedExpLog(node: unknown, target: string): boolean {
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
      if (!hasTarget(exponentNode, target) && numericFromNode(exponentNode) !== null) {
        return { kind: 'none' };
      }
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
      facts: dedupe([...left.facts, ...right.facts]),
    },
  };
}

export function subtractAffine(left: ExpLogAffine, right: ExpLogAffine): CollectResult {
  return addAffine(left, {
    coefficient: negateNode(right.coefficient),
    constant: negateNode(right.constant),
    carrier: right.carrier,
    facts: right.facts,
  });
}

function constantAffine(constant: MathJson, facts: string[] = []): ExpLogAffine {
  return {
    coefficient: ZERO,
    constant,
    carrier: null,
    facts,
  };
}

function targetFreeExpLogFacts(node: unknown, target: string): string[] {
  if (!isArrayNode(node) || hasTarget(node, target)) {
    return [];
  }

  const [operator, ...operands] = node;
  const childFacts = operands.flatMap((operand) => targetFreeExpLogFacts(operand, target));
  if (operator === 'Ln' && operands.length === 1) {
    return dedupe([
      positiveFactForNode(operands[0] as MathJson),
      ...childFacts,
    ].filter((entry): entry is string => Boolean(entry)));
  }
  if (operator === 'Log' && (operands.length === 1 || operands.length === 2)) {
    const base = operands.length === 2
      ? explicitBaseProfile(operands[1] as MathJson, target)
      : { kind: 'base' as const, base: { kind: 'common' as const, value: 10, latex: '10' } };
    return dedupe([
      positiveFactForNode(operands[0] as MathJson),
      ...(base.kind === 'base' ? positiveBaseFacts(base.base) : []),
      ...childFacts,
    ].filter((entry): entry is string => Boolean(entry)));
  }
  if (operator === 'Power' && operands.length === 2) {
    const base = explicitBaseProfile(operands[0] as MathJson, target);
    return dedupe([
      ...(base.kind === 'base' ? positiveBaseFacts(base.base) : []),
      ...childFacts,
    ]);
  }

  return dedupe(childFacts);
}

export function collectExpLogAffine(node: unknown, target: string): CollectResult {
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
        facts: [],
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
    return { kind: 'ok', affine: constantAffine(node as MathJson) };
  }

  if (typeof node === 'number') {
    return { kind: 'ok', affine: constantAffine(node as MathJson) };
  }

  if (!isArrayNode(node)) {
    if (hasTarget(node, target)) {
      return unsupported(
        'target-in-unsupported-operation',
        'The selected target appears in an unsupported exp/log expression shape.',
      );
    }
    return { kind: 'ok', affine: constantAffine(node as MathJson) };
  }

  const [operator, ...operands] = node;

  if (operator === 'Add') {
    let current: ExpLogAffine = constantAffine(ZERO);
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
        facts: collected.affine.facts,
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
          facts: dedupe(affines.flatMap((entry) => entry.facts)),
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
        facts: dedupe(affines.flatMap((entry) => entry.facts)),
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

  return {
    kind: 'ok',
    affine: constantAffine(node as MathJson, targetFreeExpLogFacts(node, target)),
  };
}

function nodeHasSymbol(node: MathJson) {
  return sharedNodeHasSymbol(node, latexForNode);
}

export function positiveFactForNode(node: MathJson): string | null {
  if (!nodeHasSymbol(node)) {
    return null;
  }
  return `${latexForNode(node)}>0`;
}

export function nonzeroFactForNode(node: MathJson): string | null {
  if (!nodeHasSymbol(node)) {
    return null;
  }
  return `${latexForNode(node)}\\ne0`;
}

export function notOneFactForNode(node: MathJson): string | null {
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

export function numericValueOfNode(node: MathJson): number | null {
  return numericFromNode(simplifyNode(node));
}

export function stop(
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

export function cleanLatex(latex: string) {
  return cleanExpLogLatex(latex);
}

function directCarrierForSide(node: MathJson, target: string): ExpLogCarrierProfile | null {
  const match = matchCarrier(node, target, false);
  return match.kind === 'matched' ? match.carrier : null;
}

export function sameBaseDirectEquation(
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
