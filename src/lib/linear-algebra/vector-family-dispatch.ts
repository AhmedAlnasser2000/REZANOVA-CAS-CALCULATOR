import type { ExactScalarWire, VectorRequest } from '../../types/calculator';
import { exactVectorFamilyDimensionLimitMessage } from './dimension-contract';
import type { LinearAlgebraEditorExpression } from './editor-parser';
import {
  evaluateVectorExpression,
  type VectorExpressionEvaluationInput,
} from './vector-expression-evaluator';

type VectorFamilyExpression = Extract<LinearAlgebraEditorExpression, { kind: 'vectorFamily' }>;

export type VectorFamilyDispatchInput = VectorExpressionEvaluationInput & {
  latex: string;
  angleUnit: VectorRequest['angleUnit'];
};

export type VectorFamilyDispatchResult =
  | { ok: true; request: VectorRequest & { vectorB: number[] } }
  | { ok: false; message: string };

function cloneVector<T>(vector: readonly T[]): T[] {
  return [...vector];
}

function cloneExactVector(vector: readonly ExactScalarWire[]): ExactScalarWire[] {
  return vector.map((value) => ({ ...value }));
}

export function dispatchVectorFamilyExpression(
  expression: VectorFamilyExpression,
  input: VectorFamilyDispatchInput,
): VectorFamilyDispatchResult {
  if (expression.operands.length > 6) {
    return { ok: false, message: exactVectorFamilyDimensionLimitMessage() };
  }

  const operands = [];
  for (const operandExpression of expression.operands) {
    const evaluated = evaluateVectorExpression(operandExpression, input);
    if (!evaluated.ok) return evaluated;
    operands.push(evaluated.operand);
  }

  const length = operands[0]?.vector.length ?? 0;
  if (length > 6) {
    return { ok: false, message: exactVectorFamilyDimensionLimitMessage() };
  }
  if (operands.some((operand) => operand.vector.length !== length)) {
    return { ok: false, message: 'All vectors in span and independence must have the same length.' };
  }
  if (operands.some((operand) => !operand.exactVector)) {
    return { ok: false, message: 'Span and independence need exact vector entries in this move.' };
  }

  const first = operands[0];
  const second = operands[1] ?? first;
  const exactVectors = operands.map((operand) => cloneExactVector(operand.exactVector!));
  return {
    ok: true,
    request: {
      operation: expression.operator,
      vectorA: cloneVector(first.vector),
      vectorB: cloneVector(second.vector),
      angleUnit: input.angleUnit,
      exactVectorA: cloneExactVector(first.exactVector!),
      exactVectorB: cloneExactVector(second.exactVector!),
      vectorOperands: operands.map((operand) => cloneVector(operand.vector)),
      exactVectorOperands: exactVectors,
      vectorOperandLatexList: operands.map((operand) => operand.displayLatex),
      vectorOperandLatexA: first.displayLatex,
      vectorOperandLatexB: second.displayLatex,
      editorExpressionLatex: input.latex,
    },
  };
}
