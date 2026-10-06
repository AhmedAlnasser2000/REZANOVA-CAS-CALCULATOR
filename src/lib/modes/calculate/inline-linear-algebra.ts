import { attachCurrentResultToDraft, buildCanonicalResultDocument } from '../../result-contract/current/producer-draft';
import type { CurrentResultProducerDraft } from '../../../types/calculator/canonical-result-runtime';
import {
  requireProvenCanonicalMathValueV2,
} from '../../result-contract';
import { evaluateTypedLinearAlgebraExpression } from '../../linear-algebra/typed-expression';
import { createCalculateErrorResultOutcome } from './result-document';
import type { RunCalculateModeRequest } from './types';

const INLINE_LINEAR_ALGEBRA_LITERAL = /\\begin\{(?:[bBpvV]?matrix|array)\}|\[[^[\]]*(?:,|\\)/u;

export function runCalculateInlineLinearAlgebra(
  input: RunCalculateModeRequest,
): CurrentResultProducerDraft | null {
  if (input.action !== 'evaluate' || !INLINE_LINEAR_ALGEBRA_LITERAL.test(input.latex)) return null;
  const storedVariables = input.variableSubstitutionSnapshot ?? input.storedVariables;
  const result = evaluateTypedLinearAlgebraExpression({
    mode: 'calculate',
    latex: input.latex,
    domain: 'real',
    substitutionMode: 'use-stored-values',
    storedVariables,
  });
  if (!result.ok) {
    return createCalculateErrorResultOutcome({
      kind: 'error',
      title: 'Calculate',
      error: result.message,
      warnings: [],
      sourceMode: 'calculate',
    });
  }
  const canonicalResult = buildCanonicalResultDocument({
    outcomeKind: 'success',
    title: 'Calculate',
    primary: {
      kind: 'math',
      value: requireProvenCanonicalMathValueV2({
        canonicalLatex: result.latex,
        mathJson: result.mathJson,
        owner: 'calculate',
        routeId: 'calculate.arithmetic',
        source: 'calculate.inline-linear-algebra.typed-expression',
      }),
    },
    warnings: [],
  });
  return attachCurrentResultToDraft(canonicalResult, {
    kind: 'success',
    title: 'Calculate',
    exactLatex: result.latex,
    warnings: [],
    sourceMode: 'calculate',
  });
}
