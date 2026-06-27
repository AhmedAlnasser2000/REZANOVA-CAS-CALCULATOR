import type {
  CompositionCarrier,
  CompositionGeneratedBranches,
  CompositionMathJson,
} from './core';

type AlgebraicWrapperBranchContext = {
  compositionLatexForNode: (node: CompositionMathJson) => string;
  numericValueOfCompositionNode: (node: CompositionMathJson) => number | null;
  nonzeroFactForNode: (node: CompositionMathJson) => string | null;
  nonnegativeFactForNode: (node: CompositionMathJson) => string | null;
  negateLatex: (latex: string) => string;
  epsilon: number;
};

function nonnegativeFactsForNode(
  node: CompositionMathJson,
  context: AlgebraicWrapperBranchContext,
) {
  return [context.nonnegativeFactForNode(node)].filter((entry): entry is string => Boolean(entry));
}

function isolatedRootValueForCarrier(
  carrier: CompositionCarrier,
  value: CompositionMathJson,
  context: AlgebraicWrapperBranchContext,
) {
  if (!carrier.affineShell) {
    return { value, facts: [] as string[] };
  }

  const isolatedValue = [
    'Divide',
    ['Subtract', value, carrier.affineShell.constant],
    carrier.affineShell.coefficient,
  ] as CompositionMathJson;
  return {
    value: isolatedValue,
    facts: [context.nonzeroFactForNode(carrier.affineShell.coefficient)]
      .filter((entry): entry is string => Boolean(entry)),
  };
}

export function generateAlgebraicWrapperBranchesForCarrier(
  carrier: CompositionCarrier,
  value: CompositionMathJson,
  context: AlgebraicWrapperBranchContext,
): CompositionGeneratedBranches | null {
  const innerLatex = context.compositionLatexForNode(carrier.inner);
  const isolated = isolatedRootValueForCarrier(carrier, value, context);
  const effectiveValue = isolated.value;
  const valueLatex = context.compositionLatexForNode(effectiveValue);

  if (carrier.kind === 'absolute-value') {
    const numericValue = context.numericValueOfCompositionNode(effectiveValue);
    if (numericValue !== null && numericValue < 0) {
      return {
        kind: 'unsupported',
        reason: 'domain-empty',
        message: 'No real selected-target solution remains because absolute-value outputs are nonnegative.',
      };
    }
    if (numericValue !== null && Math.abs(numericValue) <= context.epsilon) {
      return { kind: 'ok', equations: [`${innerLatex}=0`], facts: [] };
    }
    return {
      kind: 'ok',
      equations: [
        `${innerLatex}=${valueLatex}`,
        `${innerLatex}=${context.negateLatex(valueLatex)}`,
      ],
      facts: [
        ...isolated.facts,
        ...nonnegativeFactsForNode(effectiveValue, context),
      ],
    };
  }

  if (carrier.kind === 'square-root') {
    const numericValue = context.numericValueOfCompositionNode(effectiveValue);
    if (numericValue !== null && numericValue < 0) {
      return {
        kind: 'unsupported',
        reason: 'domain-empty',
        message: 'No real selected-target solution remains because square-root outputs are nonnegative.',
      };
    }
    return {
      kind: 'ok',
      equations: [`${innerLatex}=${context.compositionLatexForNode(['Power', effectiveValue, 2] as CompositionMathJson)}`],
      facts: [
        ...isolated.facts,
        ...nonnegativeFactsForNode(effectiveValue, context),
      ],
    };
  }

  if (carrier.kind === 'nth-root' && carrier.exponent) {
    const degree = carrier.exponent;
    const numericValue = context.numericValueOfCompositionNode(effectiveValue);
    if (degree % 2 === 0 && numericValue !== null && numericValue < 0) {
      return {
        kind: 'unsupported',
        reason: 'domain-empty',
        message: 'No real selected-target solution remains because even-index root outputs are nonnegative.',
      };
    }
    if (numericValue !== null && Math.abs(numericValue) <= context.epsilon) {
      return { kind: 'ok', equations: [`${innerLatex}=0`], facts: isolated.facts };
    }
    return {
      kind: 'ok',
      equations: [`${innerLatex}=${context.compositionLatexForNode(['Power', effectiveValue, degree] as CompositionMathJson)}`],
      facts: [
        ...isolated.facts,
        ...(degree % 2 === 0 ? nonnegativeFactsForNode(effectiveValue, context) : []),
      ],
    };
  }

  if (carrier.kind === 'square-power' || carrier.kind === 'even-power') {
    const degree = carrier.exponent ?? 2;
    const numericValue = context.numericValueOfCompositionNode(effectiveValue);
    if (numericValue !== null && numericValue < 0) {
      return {
        kind: 'unsupported',
        reason: 'domain-empty',
        message: `No real selected-target solution remains because ${degree === 2 ? 'square' : 'even'} powers are nonnegative.`,
      };
    }
    if (numericValue !== null && Math.abs(numericValue) <= context.epsilon) {
      return { kind: 'ok', equations: [`${innerLatex}=0`], facts: isolated.facts };
    }
    const rootNode = degree === 2
      ? ['Sqrt', effectiveValue]
      : ['Root', effectiveValue, degree];
    const rootValueLatex = context.compositionLatexForNode(rootNode as CompositionMathJson);
    return {
      kind: 'ok',
      equations: [
        `${innerLatex}=${rootValueLatex}`,
        `${innerLatex}=-${rootValueLatex}`,
      ],
      facts: [
        ...isolated.facts,
        ...nonnegativeFactsForNode(effectiveValue, context),
      ],
    };
  }

  if (carrier.kind === 'odd-power' && carrier.exponent) {
    const numericValue = context.numericValueOfCompositionNode(effectiveValue);
    if (numericValue !== null && Math.abs(numericValue) <= context.epsilon) {
      return { kind: 'ok', equations: [`${innerLatex}=0`], facts: isolated.facts };
    }
    const rootValueLatex = context.compositionLatexForNode(['Root', effectiveValue, carrier.exponent] as CompositionMathJson);
    return {
      kind: 'ok',
      equations: [`${innerLatex}=${rootValueLatex}`],
      facts: isolated.facts,
    };
  }

  return null;
}
