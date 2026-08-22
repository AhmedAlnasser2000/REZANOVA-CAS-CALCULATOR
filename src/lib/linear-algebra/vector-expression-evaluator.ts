import type { ExactScalarWire } from '../../types/calculator';
import {
  divideExactScalars,
  exactScalarIsZero,
  exactScalarToNumber,
  type ExactScalar,
} from '../algebra/polynomial-core';
import {
  exactVectorFromNumeric,
  exactVectorFromWire,
  exactVectorToWire,
} from './exact-matrix-format';
import {
  scalar,
  validateExactMatrix,
  type ExactVector,
} from './exact-matrix-core';
import {
  LINEAR_ALGEBRA_EXACT_EXPRESSION_MAX_DIMENSION,
  LINEAR_ALGEBRA_EXACT_SCALAR_ABS_LIMIT,
  vectorEditingDimensionError,
} from './dimension-contract';
import {
  exactAddVectors,
  exactCrossVectors,
  exactScaleVector,
  exactSubtractVectors,
  exactUnitVector,
} from './exact-vector-core';
import { formatLinearAlgebraEditorExpression } from './editor-expression-format';
import type {
  LinearAlgebraEditorExpression,
  LinearAlgebraVectorScalarExpression,
} from './editor-parser';
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
import { projectVectorNamedValueToNumeric } from './numeric-scalar-projection';

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
  exactVector = exactVectorFromNumeric(vector),
): EvaluatedVectorOperand {
  return {
    vector: cloneVector(vector),
    named: name,
    ...(exactVector ? { exactVector: exactVectorToWire(exactVector) } : {}),
    displayLatex,
  };
}

function vectorDimensionStop(vector: NumericVector): VectorExpressionEvaluation | null {
  const message = vectorEditingDimensionError(vector);
  return message ? { ok: false, message } : null;
}

function exactScalarForExpression(
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'scalar' }>,
): ExactScalar | null {
  return exactVectorFromWire([expression.exactValue])?.[0] ?? null;
}

function validatedExactVector(vector: ExactVector): VectorExpressionEvaluation {
  const validated = validateExactMatrix([vector], {
    maxDimension: LINEAR_ALGEBRA_EXACT_EXPRESSION_MAX_DIMENSION,
    maxScalarAbs: LINEAR_ALGEBRA_EXACT_SCALAR_ABS_LIMIT,
  });
  if (validated.kind === 'stop') {
    return {
      ok: false,
      message: validated.reason === 'scalar-growth-limit'
        ? 'This exact vector combination exceeds the scalar-growth limit.'
        : 'This exact vector combination could not be validated.',
    };
  }
  return {
    ok: true,
    operand: operandFromExact(validated.matrix[0], ''),
  };
}

function scaleEvaluatedVector(
  vector: EvaluatedVectorOperand,
  factor: ExactScalar,
  displayLatex: string,
): VectorExpressionEvaluation {
  const exactVector = exactForOperand(vector);
  if (exactVector) {
    const validated = validatedExactVector(exactScaleVector(exactVector, factor));
    if (!validated.ok) return validated;
    return {
      ok: true,
      operand: {
        ...validated.operand,
        displayLatex,
      },
    };
  }

  const numericFactor = exactScalarToNumber(factor);
  return {
    ok: true,
    operand: operandFromNumeric(
      vector.vector.map((value) => value * numericFactor),
      displayLatex,
    ),
  };
}

function evaluateScaledVector(
  vectorExpression: LinearAlgebraEditorExpression,
  scalarExpression: LinearAlgebraVectorScalarExpression,
  input: VectorExpressionEvaluationInput,
  reciprocal: boolean,
  displayLatex: string,
): VectorExpressionEvaluation {
  if (scalarExpression.kind === 'symbolicScalar') {
    return { ok: false, message: 'This Vector expression requires the symbolic Vector producer.' };
  }
  const factor = exactScalarForExpression(scalarExpression);
  if (!factor) {
    return { ok: false, message: 'Vector scaling needs an exact numeric scalar.' };
  }
  const resolvedFactor = reciprocal ? divideExactScalars(scalar(1), factor) : factor;
  if (!resolvedFactor || (reciprocal && exactScalarIsZero(factor))) {
    return { ok: false, message: 'A vector cannot be divided by zero.' };
  }
  const vector = evaluateVectorExpression(vectorExpression, input);
  return vector.ok ? scaleEvaluatedVector(vector.operand, resolvedFactor, displayLatex) : vector;
}

function evaluateNamedVector(
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'named' }>,
  input: VectorExpressionEvaluationInput,
): VectorExpressionEvaluation {
  const namedValue = vectorValueByName(input.vectorValues, expression.name);
  if (namedValue) {
    const projection = projectVectorNamedValueToNumeric(namedValue);
    if (!projection) {
      return { ok: false, message: 'This Vector expression requires a symbolic-capable operation.' };
    }
    const dimensionStop = vectorDimensionStop(projection.value);
    if (dimensionStop) return dimensionStop;
    return {
      ok: true,
      operand: operandFromNamedNumeric(
        projection.value,
        expression.name,
        expression.displayLatex,
        projection.exactValue ? exactVectorFromWire(projection.exactValue) : null,
      ),
    };
  }

  if (expression.name === 'u') {
    const dimensionStop = vectorDimensionStop(input.vectorA);
    if (dimensionStop) return dimensionStop;
    return {
      ok: true,
      operand: operandFromNamedNumeric(input.vectorA, 'u', expression.displayLatex),
    };
  }

  if (expression.name === 'v') {
    const dimensionStop = vectorDimensionStop(input.vectorB);
    if (dimensionStop) return dimensionStop;
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
  if (expression.operator === 'dot' || expression.operator === 'cross') {
    const leftScalar = expression.left.kind === 'scalar' || expression.left.kind === 'symbolicScalar'
      ? expression.left
      : null;
    const rightScalar = expression.right.kind === 'scalar' || expression.right.kind === 'symbolicScalar'
      ? expression.right
      : null;
    if (leftScalar && rightScalar) {
      return { ok: false, message: 'Scalar-only expressions are not Vector results.' };
    }
    if (leftScalar || rightScalar) {
      return evaluateScaledVector(
        leftScalar ? expression.right : expression.left,
        leftScalar ?? rightScalar!,
        input,
        false,
        formatLinearAlgebraEditorExpression(expression),
      );
    }
  }

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
    const validated = validatedExactVector(exactResult);
    if (!validated.ok) return validated;
    return {
      ok: true,
      operand: {
        ...validated.operand,
        displayLatex,
      },
    };
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
      {
        const dimensionStop = vectorDimensionStop(expression.value);
        if (dimensionStop) return dimensionStop;
      }
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
    case 'negate':
      return evaluateScaledVector(
        expression.value,
        { kind: 'scalar', exactValue: { numerator: -1, denominator: 1 }, displayLatex: '-1' },
        input,
        false,
        formatLinearAlgebraEditorExpression(expression),
      );
    case 'scale':
      return evaluateScaledVector(
        expression.vector,
        expression.scalar,
        input,
        false,
        formatLinearAlgebraEditorExpression(expression),
      );
    case 'vectorDivide':
      return evaluateScaledVector(
        expression.vector,
        expression.scalar,
        input,
        true,
        formatLinearAlgebraEditorExpression(expression),
      );
    case 'binary':
      return evaluateBinaryVector(expression, input);
    case 'unary':
      return evaluateUnaryVector(expression, input);
    default:
      return { ok: false, message: 'This Vector editor expression does not produce a vector.' };
  }
}
