import type {
  CompositionCarrier,
  CompositionGeneratedBranches,
  CompositionMathJson,
} from './core';

type AlgebraicWrapperBranchContext = {
  compositionLatexForNode: (node: CompositionMathJson) => string;
  numericValueOfCompositionNode: (node: CompositionMathJson) => number | null;
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

export function generateAlgebraicWrapperBranchesForCarrier(
  carrier: CompositionCarrier,
  value: CompositionMathJson,
  context: AlgebraicWrapperBranchContext,
): CompositionGeneratedBranches | null {
  const innerLatex = context.compositionLatexForNode(carrier.inner);
  const valueLatex = context.compositionLatexForNode(value);

  if (carrier.kind === 'absolute-value') {
    const numericValue = context.numericValueOfCompositionNode(value);
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
      facts: nonnegativeFactsForNode(value, context),
    };
  }

  if (carrier.kind === 'square-root') {
    const numericValue = context.numericValueOfCompositionNode(value);
    if (numericValue !== null && numericValue < 0) {
      return {
        kind: 'unsupported',
        reason: 'domain-empty',
        message: 'No real selected-target solution remains because square-root outputs are nonnegative.',
      };
    }
    return {
      kind: 'ok',
      equations: [`${innerLatex}=${context.compositionLatexForNode(['Power', value, 2] as CompositionMathJson)}`],
      facts: nonnegativeFactsForNode(value, context),
    };
  }

  if (carrier.kind === 'nth-root' && carrier.exponent) {
    const degree = carrier.exponent;
    const numericValue = context.numericValueOfCompositionNode(value);
    if (degree % 2 === 0 && numericValue !== null && numericValue < 0) {
      return {
        kind: 'unsupported',
        reason: 'domain-empty',
        message: 'No real selected-target solution remains because even-index root outputs are nonnegative.',
      };
    }
    if (numericValue !== null && Math.abs(numericValue) <= context.epsilon) {
      return { kind: 'ok', equations: [`${innerLatex}=0`], facts: [] };
    }
    return {
      kind: 'ok',
      equations: [`${innerLatex}=${context.compositionLatexForNode(['Power', value, degree] as CompositionMathJson)}`],
      facts: degree % 2 === 0 ? nonnegativeFactsForNode(value, context) : [],
    };
  }

  if (carrier.kind === 'square-power' || carrier.kind === 'even-power') {
    const degree = carrier.exponent ?? 2;
    const numericValue = context.numericValueOfCompositionNode(value);
    if (numericValue !== null && numericValue < 0) {
      return {
        kind: 'unsupported',
        reason: 'domain-empty',
        message: `No real selected-target solution remains because ${degree === 2 ? 'square' : 'even'} powers are nonnegative.`,
      };
    }
    if (numericValue !== null && Math.abs(numericValue) <= context.epsilon) {
      return { kind: 'ok', equations: [`${innerLatex}=0`], facts: [] };
    }
    const rootNode = degree === 2
      ? ['Sqrt', value]
      : ['Root', value, degree];
    const rootValueLatex = context.compositionLatexForNode(rootNode as CompositionMathJson);
    return {
      kind: 'ok',
      equations: [
        `${innerLatex}=${rootValueLatex}`,
        `${innerLatex}=-${rootValueLatex}`,
      ],
      facts: nonnegativeFactsForNode(value, context),
    };
  }

  if (carrier.kind === 'odd-power' && carrier.exponent) {
    const numericValue = context.numericValueOfCompositionNode(value);
    if (numericValue !== null && Math.abs(numericValue) <= context.epsilon) {
      return { kind: 'ok', equations: [`${innerLatex}=0`], facts: [] };
    }
    const rootValueLatex = context.compositionLatexForNode(['Root', value, carrier.exponent] as CompositionMathJson);
    return {
      kind: 'ok',
      equations: [`${innerLatex}=${rootValueLatex}`],
      facts: [],
    };
  }

  return null;
}
