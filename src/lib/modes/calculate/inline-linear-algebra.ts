import type { ResultProducerDraft } from '../../../types/calculator';
import { attachCanonicalResultToProducerDraft } from '../../result-contract';
import { evaluateTypedLinearAlgebraExpression } from '../../linear-algebra/typed-expression';
import { calculateMathValuesFromOwnedLeaves } from './math-values';
import { buildCalculateResultDocument, createCalculateErrorResultOutcome } from './result-document';
import type { RunCalculateModeRequest } from './types';

const INLINE_LINEAR_ALGEBRA_LITERAL = /\\begin\{(?:[bBpvV]?matrix|array)\}|\[[^[\]]*(?:,|\\)/u;

export function runCalculateInlineLinearAlgebra(
  input: RunCalculateModeRequest,
): ResultProducerDraft | null {
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
  const mathValues = calculateMathValuesFromOwnedLeaves({
    routeId: 'calculate.arithmetic',
    exactLatex: result.latex,
    leaves: [{
      canonicalLatex: result.latex,
      mathJson: result.mathJson,
      source: 'calculate.inline-linear-algebra.typed-expression',
    }],
  });
  const canonicalResult = buildCalculateResultDocument({
    outcomeKind: 'success',
    title: 'Calculate',
    exactLatex: result.latex,
    warnings: [],
  }, { mathValues });
  return attachCanonicalResultToProducerDraft(canonicalResult, {
    kind: 'success',
    title: 'Calculate',
    exactLatex: result.latex,
    warnings: [],
    sourceMode: 'calculate',
  });
}
