import { ce, type CalculusCoreEvaluation } from './shared';
import {
  calculusAntiderivativeExpressionMathLeaves,
  calculusAntiderivativeExpressionToAst,
  calculusAntiderivativeSpecialExpression,
} from './antiderivative-expression';
import { findCustomMathJsonOperator } from '../../result-contract/proven-answer-mathjson';

type BoxedLike = { isValid?: boolean };

function containsComputeEngineErrorNode(node: unknown): boolean {
  if (Array.isArray(node)) {
    if (node[0] === 'Error') return true;
    return node.slice(1).some(containsComputeEngineErrorNode);
  }
  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>;
    return Object.values(record).some(containsComputeEngineErrorNode);
  }
  return false;
}

function proofSafeMathJsonLeaf(
  leaf: {
    canonicalLatex: string;
    mathJson: unknown;
    source: string;
  },
) {
  if (containsComputeEngineErrorNode(leaf.mathJson)) {
    return undefined;
  }
  if (findCustomMathJsonOperator(leaf.mathJson)) {
    return undefined;
  }
  try {
    const boxed = ce.box(leaf.mathJson as Parameters<typeof ce.box>[0]) as BoxedLike;
    const parsed = ce.parse(leaf.canonicalLatex) as BoxedLike;
    if (boxed.isValid === false || parsed.isValid === false) {
      return undefined;
    }
  } catch {
    return undefined;
  }
  return leaf;
}

export function withIndefiniteIntegralAuthority(
  evaluation: CalculusCoreEvaluation,
  body: unknown,
  variable: string,
  canonicalBodyLatex: string,
) {
  const request = {
    canonicalLatex: `\\int ${canonicalBodyLatex}\\,d${variable}`,
    mathJson: ['Integrate', structuredClone(body), variable],
    source: 'calculus.indefinite-integral:request',
  };
  const safeRequest = proofSafeMathJsonLeaf(request);
  if (evaluation.error || !evaluation.exactLatex) {
    return {
      ...evaluation,
      indefiniteIntegralAuthority: {
        selector: 'indefiniteIntegral:error',
        ...(safeRequest ? { request: safeRequest } : {}),
      },
      mathJsonLeaves: [
        ...(evaluation.mathJsonLeaves ?? []),
        ...(safeRequest ? [safeRequest] : []),
      ],
    } satisfies CalculusCoreEvaluation;
  }

  const expression = evaluation.antiderivativeExpression;
  if (!expression) return evaluation;
  const selector = expression.kind === 'special-function-expression'
    || (expression.kind === 'indefinite-family'
      && expression.antiderivative.kind === 'special-function-expression')
    ? 'indefiniteIntegral:special-function' as const
    : 'indefiniteIntegral:standard' as const;
  const specialExpression = selector === 'indefiniteIntegral:special-function'
    ? calculusAntiderivativeSpecialExpression(expression)
    : undefined;
  const answer = selector === 'indefiniteIntegral:standard'
    ? calculusAntiderivativeExpressionToAst(expression)
    : undefined;
  if (selector === 'indefiniteIntegral:special-function' && !specialExpression) {
    return evaluation;
  }
  if (selector === 'indefiniteIntegral:standard' && answer === undefined) {
    return evaluation;
  }
  const primary = selector === 'indefiniteIntegral:standard'
    ? {
        canonicalLatex: evaluation.exactLatex,
        mathJson: answer,
        source: expression.kind === 'indefinite-family'
          ? expression.antiderivative.source
          : expression.source,
      }
    : undefined;
  const nodeLeaves = [
    ...(evaluation.integrationFactNodes ?? []).map((fact) => ({
      canonicalLatex: fact.presentationLatex,
      mathJson: fact.mathJson,
      source: fact.source,
    })),
    ...(evaluation.integrationDetailNodes ?? []).flatMap((section) =>
      section.lines.flatMap((line) => line.flatMap((part) => part.kind === 'math'
        ? [{
            canonicalLatex: part.canonicalLatex,
            mathJson: part.mathJson,
            source: part.source,
          }]
        : []))),
  ];
  const expressionLeaves = selector === 'indefiniteIntegral:special-function'
    ? calculusAntiderivativeExpressionMathLeaves(expression)
    : [];
  return {
    ...evaluation,
    indefiniteIntegralAuthority: {
      selector,
      ...(safeRequest ? { request: safeRequest } : {}),
      ...(primary ? { primary } : {}),
      ...(specialExpression ? { specialExpression } : {}),
    },
    mathJsonLeaves: [
      ...(evaluation.mathJsonLeaves ?? []),
      ...(safeRequest ? [safeRequest] : []),
      ...(primary ? [primary] : []),
      ...expressionLeaves,
      ...nodeLeaves,
    ],
  } satisfies CalculusCoreEvaluation;
}
