import {
  type MathJson,
  ONE,
  ZERO,
  createArithmeticHelpers,
  hasTarget,
  isArrayNode,
  isZeroNode,
  latexForNode,
  numericFromNode,
  simplifyNode,
} from './math-json';
import type {
  CarrierMatch,
  CollectResult,
  MixedCollectResult,
  MixedTrigAffine,
  ParameterizedTrigStopReason,
  TargetAffine,
  TargetAffineResult,
  TrigAffine,
  TrigCarrierKind,
  TrigCarrierProfile,
} from './trig-types';

const {
  addNodes,
  divideNodes,
  multiplyNodes,
  negateNode,
  squareNode,
} = createArithmeticHelpers();

export {
  addNodes,
  divideNodes,
  hasTarget,
  isArrayNode,
  isZeroNode,
  latexForNode,
  multiplyNodes,
  negateNode,
  squareNode,
};

export function numericValueOfNode(node: MathJson): number | null {
  return numericFromNode(simplifyNode(node));
}

function unsupported(
  reason: ParameterizedTrigStopReason,
  message: string,
): CollectResult {
  return { kind: 'unsupported', reason, message };
}

export function operatorToCarrierKind(operator: unknown): TrigCarrierKind | null {
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

export function containsSelectedTrig(node: unknown, target: string): boolean {
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

export function subtractTrigAffine(left: TrigAffine, right: TrigAffine): CollectResult {
  return addTrigAffine(left, {
    coefficient: negateNode(right.coefficient),
    constant: negateNode(right.constant),
    carrier: right.carrier,
  });
}

export function collectTrigAffine(node: unknown, target: string): CollectResult {
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

export function subtractMixedTrigAffine(left: MixedTrigAffine, right: MixedTrigAffine): MixedCollectResult {
  return addMixedTrigAffine(left, negateMixedTrigAffine(right));
}

export function collectMixedTrigAffine(node: unknown, target: string): MixedCollectResult {
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

export function collectTargetAffine(node: unknown, target: string): TargetAffineResult {
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
