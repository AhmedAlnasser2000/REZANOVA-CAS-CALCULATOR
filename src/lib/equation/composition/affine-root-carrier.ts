import type {
  CompositionCarrier,
  CompositionCarrierMatch,
  CompositionCoreStopReason,
  CompositionMathJson,
} from './core';

type RootCarrierAffine = {
  coefficient: CompositionMathJson;
  constant: CompositionMathJson;
  carrier: CompositionCarrier | null;
};

type RootCarrierAffineCollect =
  | { kind: 'ok'; affine: RootCarrierAffine }
  | { kind: 'blocked'; reason: CompositionCoreStopReason; message: string };

type AffineRootCarrierContext = {
  node: unknown;
  target: string;
  nestedMessage: string;
  hasCompositionTarget: (node: unknown, target: string) => boolean;
  isCompositionArrayNode: (node: unknown) => node is unknown[];
  containsNestedCompositionCarrier: (node: unknown, target: string) => boolean;
  compositionLatexForNode: (node: CompositionMathJson) => string;
  simplifyCompositionNode: (node: CompositionMathJson) => CompositionMathJson;
  numericValueOfCompositionNode: (node: CompositionMathJson) => number | null;
  selectedTargetRootCarrierKind: (index: unknown) => (
    | { kind: 'square-root' }
    | { kind: 'nth-root'; exponent: number }
    | null
  );
};

type RootCarrierContext = AffineRootCarrierContext & {
  allowNestedInner?: boolean;
};

function blockedRootAffine(
  reason: CompositionCoreStopReason,
  message: string,
): RootCarrierAffineCollect {
  return { kind: 'blocked', reason, message };
}

function isZeroCompositionNode(
  node: CompositionMathJson,
  context: AffineRootCarrierContext,
) {
  return context.numericValueOfCompositionNode(node) === 0;
}

function addCompositionNodes(
  context: AffineRootCarrierContext,
  ...nodes: CompositionMathJson[]
): CompositionMathJson {
  if (nodes.length === 0) {
    return 0;
  }
  if (nodes.length === 1) {
    return context.simplifyCompositionNode(nodes[0]);
  }
  return context.simplifyCompositionNode(['Add', ...nodes] as CompositionMathJson);
}

function multiplyCompositionNodes(
  context: AffineRootCarrierContext,
  ...nodes: CompositionMathJson[]
): CompositionMathJson {
  if (nodes.length === 0) {
    return 1;
  }
  if (nodes.length === 1) {
    return context.simplifyCompositionNode(nodes[0]);
  }
  return context.simplifyCompositionNode(['Multiply', ...nodes] as CompositionMathJson);
}

function negateCompositionNode(
  node: CompositionMathJson,
  context: AffineRootCarrierContext,
): CompositionMathJson {
  return context.simplifyCompositionNode(['Negate', node] as CompositionMathJson);
}

function mergeRootCarriers(
  left: CompositionCarrier | null,
  right: CompositionCarrier | null,
  context: AffineRootCarrierContext,
): CompositionCarrier | null | 'multiple' {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  return left.kind === right.kind
    && left.exponent === right.exponent
    && context.compositionLatexForNode(left.node) === context.compositionLatexForNode(right.node)
    ? left
    : 'multiple';
}

function addRootCarrierAffine(
  left: RootCarrierAffine,
  right: RootCarrierAffine,
  context: AffineRootCarrierContext,
): RootCarrierAffineCollect {
  const carrier = mergeRootCarriers(left.carrier, right.carrier, context);
  if (carrier === 'multiple') {
    return blockedRootAffine(
      'mixed-carriers',
      'Affine root formula handoff supports one selected-target root carrier at a time.',
    );
  }
  return {
    kind: 'ok',
    affine: {
      coefficient: addCompositionNodes(context, left.coefficient, right.coefficient),
      constant: addCompositionNodes(context, left.constant, right.constant),
      carrier,
    },
  };
}

function negateRootCarrierAffine(
  affine: RootCarrierAffine,
  context: AffineRootCarrierContext,
): RootCarrierAffine {
  return {
    coefficient: negateCompositionNode(affine.coefficient, context),
    constant: negateCompositionNode(affine.constant, context),
    carrier: affine.carrier,
  };
}

function collectAffineRootCarrier(
  node: unknown,
  context: AffineRootCarrierContext,
): RootCarrierAffineCollect {
  const root = matchRootCompositionCarrier({
    ...context,
    node,
    allowNestedInner: false,
  });
  if (root.kind === 'blocked') {
    return root;
  }
  if (root.kind === 'matched') {
    return {
      kind: 'ok',
      affine: {
        coefficient: 1,
        constant: 0,
        carrier: root.carrier,
      },
    };
  }

  if (!context.hasCompositionTarget(node, context.target)) {
    return {
      kind: 'ok',
      affine: {
        coefficient: 0,
        constant: node as CompositionMathJson,
        carrier: null,
      },
    };
  }

  if (!context.isCompositionArrayNode(node)) {
    return blockedRootAffine(
      'target-outside-carrier',
      'Affine root formula handoff requires the selected target to appear only inside one root carrier.',
    );
  }

  const [operator, ...operands] = node;
  if (operator === 'Add') {
    let current: RootCarrierAffine = { coefficient: 0, constant: 0, carrier: null };
    for (const operand of operands) {
      const collected = collectAffineRootCarrier(operand, context);
      if (collected.kind === 'blocked') {
        return collected;
      }
      const next = addRootCarrierAffine(current, collected.affine, context);
      if (next.kind === 'blocked') {
        return next;
      }
      current = next.affine;
    }
    return { kind: 'ok', affine: current };
  }

  if (operator === 'Subtract' && operands.length > 0) {
    const [first, ...rest] = operands;
    const firstCollected = collectAffineRootCarrier(first, context);
    if (firstCollected.kind === 'blocked') {
      return firstCollected;
    }
    let current = firstCollected.affine;
    for (const operand of rest) {
      const collected = collectAffineRootCarrier(operand, context);
      if (collected.kind === 'blocked') {
        return collected;
      }
      const next = addRootCarrierAffine(
        current,
        negateRootCarrierAffine(collected.affine, context),
        context,
      );
      if (next.kind === 'blocked') {
        return next;
      }
      current = next.affine;
    }
    return { kind: 'ok', affine: current };
  }

  if (operator === 'Negate' && operands.length === 1) {
    const collected = collectAffineRootCarrier(operands[0], context);
    return collected.kind === 'blocked'
      ? collected
      : { kind: 'ok', affine: negateRootCarrierAffine(collected.affine, context) };
  }

  if (operator === 'Multiply' && operands.length > 0) {
    const collected = operands.map((operand) => collectAffineRootCarrier(operand, context));
    const blocked = collected.find((entry): entry is Extract<RootCarrierAffineCollect, { kind: 'blocked' }> =>
      entry.kind === 'blocked');
    if (blocked) {
      return blocked;
    }
    const affines = collected
      .filter((entry): entry is Extract<RootCarrierAffineCollect, { kind: 'ok' }> => entry.kind === 'ok')
      .map((entry) => entry.affine);
    const carrierAffines = affines.filter((entry) => entry.carrier);
    if (carrierAffines.length === 0) {
      return {
        kind: 'ok',
        affine: {
          coefficient: 0,
          constant: multiplyCompositionNodes(context, ...affines.map((entry) => entry.constant)),
          carrier: null,
        },
      };
    }
    if (carrierAffines.length > 1 || !isZeroCompositionNode(carrierAffines[0].constant, context)) {
      return blockedRootAffine(
        'unsupported-carrier',
        'Affine root formula handoff supports only target-free factors times one root carrier.',
      );
    }

    const targetFreeFactors = affines
      .filter((entry) => entry !== carrierAffines[0])
      .map((entry) => entry.constant);
    return {
      kind: 'ok',
      affine: {
        coefficient: multiplyCompositionNodes(context, ...targetFreeFactors, carrierAffines[0].coefficient),
        constant: 0,
        carrier: carrierAffines[0].carrier,
      },
    };
  }

  return blockedRootAffine(
    'target-outside-carrier',
    'Affine root formula handoff requires the selected target to appear only inside one root carrier.',
  );
}

export function matchRootCompositionCarrier(
  context: RootCarrierContext,
): CompositionCarrierMatch {
  if (!context.isCompositionArrayNode(context.node)) {
    return { kind: 'none' };
  }

  const [operator, ...operands] = context.node;
  if (operator === 'Sqrt' && operands.length === 1 && context.hasCompositionTarget(operands[0], context.target)) {
    const inner = operands[0] as CompositionMathJson;
    if (!context.allowNestedInner && context.containsNestedCompositionCarrier(inner, context.target)) {
      return {
        kind: 'blocked',
        reason: 'nested-composition',
        message: context.nestedMessage,
      };
    }
    return {
      kind: 'matched',
      carrier: {
        kind: 'square-root',
        node: context.node as CompositionMathJson,
        inner,
        labelLatex: context.compositionLatexForNode(context.node as CompositionMathJson),
      },
    };
  }

  if (
    operator === 'Root'
    && operands.length === 2
    && context.hasCompositionTarget(operands[0], context.target)
    && !context.hasCompositionTarget(operands[1], context.target)
  ) {
    const rootKind = context.selectedTargetRootCarrierKind(operands[1]);
    if (!rootKind) {
      return {
        kind: 'blocked',
        reason: 'unsupported-carrier',
        message: 'Nth-root composition formulas currently support exact integer root indices from 3 through 12.',
      };
    }
    const inner = operands[0] as CompositionMathJson;
    if (!context.allowNestedInner && context.containsNestedCompositionCarrier(inner, context.target)) {
      return {
        kind: 'blocked',
        reason: 'nested-composition',
        message: context.nestedMessage,
      };
    }
    return {
      kind: 'matched',
      carrier: {
        kind: rootKind.kind,
        node: context.node as CompositionMathJson,
        inner,
        ...('exponent' in rootKind ? { exponent: rootKind.exponent } : {}),
        labelLatex: context.compositionLatexForNode(context.node as CompositionMathJson),
      },
    };
  }

  return { kind: 'none' };
}

export function matchAffineRootCompositionCarrier(
  context: AffineRootCarrierContext,
): CompositionCarrierMatch {
  const collected = collectAffineRootCarrier(context.node, context);
  if (collected.kind === 'blocked') {
    return collected;
  }

  const { carrier, coefficient, constant } = collected.affine;
  if (!carrier) {
    return { kind: 'none' };
  }
  if (isZeroCompositionNode(coefficient, context)) {
    return {
      kind: 'blocked',
      reason: 'unsupported-carrier',
      message: 'Affine root formula handoff requires a nonzero root coefficient.',
    };
  }

  return {
    kind: 'matched',
    carrier: {
      ...carrier,
      node: context.node as CompositionMathJson,
      labelLatex: context.compositionLatexForNode(context.node as CompositionMathJson),
      affineShell: {
        coefficient,
        constant,
        labelLatex: context.compositionLatexForNode(context.node as CompositionMathJson),
      },
    },
  };
}
