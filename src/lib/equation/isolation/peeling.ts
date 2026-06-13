import {
  addNodes,
  divideNodes,
  factNonzero,
  flattenMultiply,
  hasTarget,
  isArrayNode,
  latexForNode,
  multiplyNodes,
  negateNode,
  subtractNodes,
  type MathJson,
} from './math-json';

export type PeelStep = {
  expression: MathJson;
  otherSide: MathJson;
  facts: string[];
  line: string;
};

export type PeelResult<Reason extends string> =
  | { kind: 'ok'; step: PeelStep }
  | { kind: 'unsupported'; reason: Reason; message: string };

export type PeelPolicy<Reason extends string> = {
  multipleTargetIslandsReason: Reason;
  targetInShellFactorReason: Reason;
  targetInDenominatorReason: Reason;
  unsupportedShellReason: Reason;
  noIsolationReason: Reason;
  multipleAdditiveTargetMessage: string;
  noAdditiveTargetMessage: string;
  multipleFactorTargetMessage: string;
  noFactorTargetMessage: string;
  invalidQuotientMessage: string;
  denominatorTargetMessage: string;
  denominatorAndNumeratorTargetMessage?: string;
  noNumeratorTargetMessage: string;
  noIsolationMessage: string;
};

function peelAdd<Reason extends string>(
  node: MathJson[],
  otherSide: MathJson,
  target: string,
  policy: PeelPolicy<Reason>,
): PeelResult<Reason> {
  const terms = node.slice(1) as MathJson[];
  const targetTerms = terms.filter((term) => hasTarget(term, target));
  if (targetTerms.length > 1) {
    return {
      kind: 'unsupported',
      reason: policy.multipleTargetIslandsReason,
      message: policy.multipleAdditiveTargetMessage,
    };
  }
  if (targetTerms.length === 0) {
    return {
      kind: 'unsupported',
      reason: policy.unsupportedShellReason,
      message: policy.noAdditiveTargetMessage,
    };
  }

  const targetTerm = targetTerms[0];
  const targetFreeSum = addNodes(...terms.filter((term) => !hasTarget(term, target)));
  return {
    kind: 'ok',
    step: {
      expression: targetTerm,
      otherSide: subtractNodes(otherSide, targetFreeSum),
      facts: [],
      line: `Moved target-free additive terms away from ${latexForNode(targetTerm)}.`,
    },
  };
}

function peelMultiply<Reason extends string>(
  node: MathJson[],
  otherSide: MathJson,
  target: string,
  policy: PeelPolicy<Reason>,
): PeelResult<Reason> {
  const factors = flattenMultiply(node.slice(1) as MathJson[]);
  const targetFactors = factors.filter((factor) => hasTarget(factor, target));
  if (targetFactors.length > 1) {
    return {
      kind: 'unsupported',
      reason: policy.targetInShellFactorReason,
      message: policy.multipleFactorTargetMessage,
    };
  }
  if (targetFactors.length === 0) {
    return {
      kind: 'unsupported',
      reason: policy.unsupportedShellReason,
      message: policy.noFactorTargetMessage,
    };
  }

  const targetFreeProduct = multiplyNodes(...factors.filter((factor) => !hasTarget(factor, target)));
  const nonzeroFact = factNonzero(targetFreeProduct);
  return {
    kind: 'ok',
    step: {
      expression: targetFactors[0],
      otherSide: divideNodes(otherSide, targetFreeProduct),
      facts: nonzeroFact ? [nonzeroFact] : [],
      line: `Divided by the target-free factor ${latexForNode(targetFreeProduct)}.`,
    },
  };
}

function peelDivide<Reason extends string>(
  node: MathJson[],
  otherSide: MathJson,
  target: string,
  policy: PeelPolicy<Reason>,
): PeelResult<Reason> {
  if (node.length !== 3) {
    return {
      kind: 'unsupported',
      reason: policy.unsupportedShellReason,
      message: policy.invalidQuotientMessage,
    };
  }

  const numerator = node[1] as MathJson;
  const denominator = node[2] as MathJson;
  const numeratorHasTarget = hasTarget(numerator, target);
  const denominatorHasTarget = hasTarget(denominator, target);

  if (numeratorHasTarget && denominatorHasTarget && policy.denominatorAndNumeratorTargetMessage) {
    return {
      kind: 'unsupported',
      reason: policy.targetInDenominatorReason,
      message: policy.denominatorAndNumeratorTargetMessage,
    };
  }

  if (denominatorHasTarget) {
    return {
      kind: 'unsupported',
      reason: policy.targetInDenominatorReason,
      message: policy.denominatorTargetMessage,
    };
  }

  if (!numeratorHasTarget) {
    return {
      kind: 'unsupported',
      reason: policy.unsupportedShellReason,
      message: policy.noNumeratorTargetMessage,
    };
  }

  const nonzeroFact = factNonzero(denominator);
  return {
    kind: 'ok',
    step: {
      expression: numerator,
      otherSide: multiplyNodes(otherSide, denominator),
      facts: nonzeroFact ? [nonzeroFact] : [],
      line: `Multiplied by the target-free denominator ${latexForNode(denominator)}.`,
    },
  };
}

export function peelOnce<Reason extends string>(
  expression: MathJson,
  otherSide: MathJson,
  target: string,
  policy: PeelPolicy<Reason>,
): PeelResult<Reason> {
  if (!isArrayNode(expression)) {
    return {
      kind: 'unsupported',
      reason: policy.noIsolationReason,
      message: policy.noIsolationMessage,
    };
  }

  if (expression[0] === 'Add') {
    return peelAdd(expression as MathJson[], otherSide, target, policy);
  }

  if (expression[0] === 'Multiply' || expression[0] === 'InvisibleOperator') {
    return peelMultiply(expression as MathJson[], otherSide, target, policy);
  }

  if (expression[0] === 'Divide') {
    return peelDivide(expression as MathJson[], otherSide, target, policy);
  }

  if (expression[0] === 'Negate' && expression.length === 2) {
    return {
      kind: 'ok',
      step: {
        expression: expression[1] as MathJson,
        otherSide: negateNode(otherSide),
        facts: [],
        line: 'Removed a leading negative sign from the selected-target expression.',
      },
    };
  }

  return {
    kind: 'unsupported',
    reason: policy.noIsolationReason,
    message: policy.noIsolationMessage,
  };
}
