import type { ExactScalarWire } from '../../types/calculator';
import { exactScalarToNumber } from '../algebra/polynomial-core';
import {
  exactVectorFromNumeric,
  exactVectorFromWire,
  exactVectorToWire,
} from './exact-matrix-format';
import type { ExactVector } from './exact-matrix-core';
import {
  exactAddVectors,
  exactCrossVectors,
  exactSubtractVectors,
  exactUnitVector,
} from './exact-vector-core';
import { formatLinearAlgebraEditorExpression } from './editor-expression-format';
import type { LinearAlgebraEditorExpression } from './editor-parser';
import {
  addVectors,
  crossVectors,
  haveSameVectorDimension,
  subtractVectors,
  unitVector,
  type NumericVector,
} from './vector-core';
import {
  vectorValueByName,
  type LinearAlgebraVectorNamedValue,
} from './named-values';

export type EvaluatedVectorOperand = {
  vector: NumericVector;
  exactVector?: ExactScalarWire[];
  named?: string;
  displayLatex: string;
};

export type VectorExpressionEvaluation =
  | { ok: true; operand: EvaluatedVectorOperand }
  | { ok: false; message: string };

export type VectorExpressionEvaluationInput = {
  vectorA: NumericVector;
  vectorB: NumericVector;
  vectorValues?: readonly LinearAlgebraVectorNamedValue[];
};

function cloneVector<T>(vector: T[]): T[] {
  return [...vector];
}

function exactForOperand(operand: EvaluatedVectorOperand): ExactVector | null {
  return exactVectorFromWire(operand.exactVector) ?? exactVectorFromNumeric(operand.vector);
}

function operandFromExact(vector: ExactVector, displayLatex: string): EvaluatedVectorOperand {
  return {
    vector: vector.map(exactScalarToNumber),
    exactVector: exactVectorToWire(vector),
    displayLatex,
  };
}

function operandFromNumeric(
  vector: NumericVector,
  displayLatex: string,
  exactVector?: ExactVector | null,
): EvaluatedVectorOperand {
  return {
    vector: cloneVector(vector),
    ...(exactVector ? { exactVector: exactVectorToWire(exactVector) } : {}),
    displayLatex,
  };
}

function operandFromNamedNumeric(
  vector: NumericVector,
  name: string,
  displayLatex: string,
): EvaluatedVectorOperand {
  const exactVector = exactVectorFromNumeric(vector);
  return {
    vector: cloneVector(vector),
    named: name,
    ...(exactVector ? { exactVector: exactVectorToWire(exactVector) } : {}),
    displayLatex,
  };
}

function evaluateNamedVector(
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'named' }>,
  input: VectorExpressionEvaluationInput,
): VectorExpressionEvaluation {
  const namedValue = vectorValueByName(input.vectorValues, expression.name);
  if (namedValue) {
    return {
      ok: true,
      operand: operandFromNamedNumeric(namedValue.value, expression.name, expression.displayLatex),
    };
  }

  if (expression.name === 'u') {
    return {
      ok: true,
      operand: operandFromNamedNumeric(input.vectorA, 'u', expression.displayLatex),
    };
  }

  if (expression.name === 'v') {
    return {
      ok: true,
      operand: operandFromNamedNumeric(input.vectorB, 'v', expression.displayLatex),
    };
  }

  return { ok: false, message: `Vector ${expression.name} is not defined in this workspace.` };
}

function evaluateBinaryVector(
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'binary' }>,
  input: VectorExpressionEvaluationInput,
): VectorExpressionEvaluation {
  if (expression.operator !== 'add' && expression.operator !== 'subtract' && expression.operator !== 'cross') {
    return { ok: false, message: 'This Vector editor expression does not produce a vector.' };
  }

  const left = evaluateVectorExpression(expression.left, input);
  if (!left.ok) return left;
  const right = evaluateVectorExpression(expression.right, input);
  if (!right.ok) return right;

  if (!haveSameVectorDimension(left.operand.vector, right.operand.vector)) {
    return { ok: false, message: 'Vector dimensions must match.' };
  }
  if (expression.operator === 'cross' && left.operand.vector.length !== 3) {
    return { ok: false, message: 'Cross product requires 3D vectors.' };
  }

  const displayLatex = formatLinearAlgebraEditorExpression(expression);
  const leftExact = exactForOperand(left.operand);
  const rightExact = exactForOperand(right.operand);
  const exactResult = leftExact && rightExact
    ? expression.operator === 'add'
      ? exactAddVectors(leftExact, rightExact)
      : expression.operator === 'subtract'
        ? exactSubtractVectors(leftExact, rightExact)
        : exactCrossVectors(leftExact, rightExact)
    : null;
  if (exactResult) {
    return { ok: true, operand: operandFromExact(exactResult, displayLatex) };
  }

  const vector = expression.operator === 'add'
    ? addVectors(left.operand.vector, right.operand.vector)
    : expression.operator === 'subtract'
      ? subtractVectors(left.operand.vector, right.operand.vector)
      : crossVectors(left.operand.vector, right.operand.vector);
  if (!vector) {
    return { ok: false, message: 'Cross product requires 3D vectors.' };
  }
  return { ok: true, operand: operandFromNumeric(vector, displayLatex) };
}

function evaluateUnaryVector(
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'unary' }>,
  input: VectorExpressionEvaluationInput,
): VectorExpressionEvaluation {
  if (expression.operator !== 'unit') {
    return { ok: false, message: 'This Vector editor expression does not produce a vector.' };
  }

  const value = evaluateVectorExpression(expression.value, input);
  if (!value.ok) return value;
  const displayLatex = formatLinearAlgebraEditorExpression(expression);
  const exactValue = exactForOperand(value.operand);
  const exactResult = exactValue ? exactUnitVector(exactValue) : null;
  if (exactResult) {
    return { ok: true, operand: operandFromExact(exactResult, displayLatex) };
  }

  const vector = unitVector(value.operand.vector);
  if (!vector) {
    return { ok: false, message: 'Unit vector is undefined for the zero vector.' };
  }
  return { ok: true, operand: operandFromNumeric(vector, displayLatex) };
}

export function evaluateVectorExpression(
  expression: LinearAlgebraEditorExpression,
  input: VectorExpressionEvaluationInput,
): VectorExpressionEvaluation {
  switch (expression.kind) {
    case 'vectorLiteral':
      return {
        ok: true,
        operand: {
          vector: cloneVector(expression.value),
          exactVector: cloneVector(expression.exactValue),
          displayLatex: expression.displayLatex,
        },
      };
    case 'named':
      return evaluateNamedVector(expression, input);
    case 'binary':
      return evaluateBinaryVector(expression, input);
    case 'unary':
      return evaluateUnaryVector(expression, input);
    default:
      return { ok: false, message: 'This Vector editor expression does not produce a vector.' };
  }
}
