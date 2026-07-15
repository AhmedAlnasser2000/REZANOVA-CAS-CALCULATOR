import type { ExactScalarWire } from '../../types/calculator';
import {
  addMatrices,
  canMultiplyMatrices,
  getMatrixShapeFacts,
  haveSameMatrixShape,
  inverseMatrix,
  multiplyMatrices,
  subtractMatrices,
  transposeMatrix,
  type NumericMatrix,
} from './matrix-core';
import {
  exactAddMatrices,
  exactInverseMatrixForExpression,
  exactMatrixToNumeric,
  exactMatrixToWire,
  exactMultiplyMatrices,
  exactPowerMatrix,
  exactSubtractMatrices,
  exactTransposeMatrix,
  MAX_EXACT_EXPRESSION_POWER_ABS,
} from './matrix-exact-ops';
import {
  exactMatrixFromNumeric,
  exactMatrixFromWire,
} from './exact-matrix-format';
import type { ExactMatrix } from './exact-matrix-core';
import { matrixEditingDimensionError } from './dimension-contract';
import {
  formatLinearAlgebraEditorExpression,
} from './editor-expression-format';
import type { LinearAlgebraEditorExpression } from './editor-parser';
import {
  matrixValueByName,
  numericMatrixFromNamedValue,
  type LinearAlgebraMatrixNamedValue,
} from './named-values';

export type EvaluatedMatrixOperand = {
  matrix: NumericMatrix;
  exactMatrix?: ExactScalarWire[][];
  named?: string;
  displayLatex: string;
};

export type MatrixExpressionEvaluation =
  | { ok: true; operand: EvaluatedMatrixOperand }
  | { ok: false; message: string };

export type MatrixExpressionEvaluationInput = {
  matrixA: NumericMatrix;
  matrixB: NumericMatrix;
  matrixValues?: readonly LinearAlgebraMatrixNamedValue[];
};

function cloneMatrix<T>(matrix: T[][]): T[][] {
  return matrix.map((row) => [...row]);
}

function exactForOperand(operand: EvaluatedMatrixOperand): ExactMatrix | null {
  return exactMatrixFromWire(operand.exactMatrix) ?? exactMatrixFromNumeric(operand.matrix);
}

function operandFromExact(matrix: ExactMatrix, displayLatex: string): EvaluatedMatrixOperand {
  return {
    matrix: exactMatrixToNumeric(matrix),
    exactMatrix: exactMatrixToWire(matrix),
    displayLatex,
  };
}

function operandFromNumeric(
  matrix: NumericMatrix,
  displayLatex: string,
  exactMatrix?: ExactMatrix | null,
): EvaluatedMatrixOperand {
  return {
    matrix: cloneMatrix(matrix),
    ...(exactMatrix ? { exactMatrix: exactMatrixToWire(exactMatrix) } : {}),
    displayLatex,
  };
}

function operandFromNamedNumeric(
  matrix: NumericMatrix,
  name: string,
  displayLatex: string,
): EvaluatedMatrixOperand {
  const exactMatrix = exactMatrixFromNumeric(matrix);
  return {
    matrix: cloneMatrix(matrix),
    named: name,
    ...(exactMatrix ? { exactMatrix: exactMatrixToWire(exactMatrix) } : {}),
    displayLatex,
  };
}

function matrixDimensionStop(matrix: NumericMatrix): MatrixExpressionEvaluation | null {
  const message = matrixEditingDimensionError(matrix);
  return message ? { ok: false, message } : null;
}

function evaluateNamedMatrix(
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'named' }>,
  input: MatrixExpressionEvaluationInput,
): MatrixExpressionEvaluation {
  const namedValue = matrixValueByName(input.matrixValues, expression.name);
  if (namedValue) {
    const numericValue = numericMatrixFromNamedValue(namedValue);
    if (!numericValue) {
      return { ok: false, message: 'This Matrix expression requires a symbolic-capable operation.' };
    }
    const dimensionStop = matrixDimensionStop(numericValue);
    if (dimensionStop) return dimensionStop;
    return {
      ok: true,
      operand: operandFromNamedNumeric(numericValue, expression.name, expression.displayLatex),
    };
  }

  if (expression.name === 'A') {
    const dimensionStop = matrixDimensionStop(input.matrixA);
    if (dimensionStop) return dimensionStop;
    return {
      ok: true,
      operand: operandFromNamedNumeric(input.matrixA, 'A', expression.displayLatex),
    };
  }

  if (expression.name === 'B') {
    const dimensionStop = matrixDimensionStop(input.matrixB);
    if (dimensionStop) return dimensionStop;
    return {
      ok: true,
      operand: operandFromNamedNumeric(input.matrixB, 'B', expression.displayLatex),
    };
  }

  return { ok: false, message: `Matrix ${expression.name} is not defined in this workspace.` };
}

function evaluateBinaryMatrix(
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'binary' }>,
  input: MatrixExpressionEvaluationInput,
): MatrixExpressionEvaluation {
  if (expression.operator !== 'add' && expression.operator !== 'subtract' && expression.operator !== 'multiply') {
    return { ok: false, message: 'This Matrix editor operator is not executable in Matrix mode.' };
  }

  const left = evaluateMatrixExpression(expression.left, input);
  if (!left.ok) return left;
  const right = evaluateMatrixExpression(expression.right, input);
  if (!right.ok) return right;

  const displayLatex = formatLinearAlgebraEditorExpression(expression);
  const leftExact = exactForOperand(left.operand);
  const rightExact = exactForOperand(right.operand);
  const exactResult = leftExact && rightExact
    ? expression.operator === 'add'
      ? exactAddMatrices(leftExact, rightExact)
      : expression.operator === 'subtract'
        ? exactSubtractMatrices(leftExact, rightExact)
        : exactMultiplyMatrices(leftExact, rightExact)
    : null;
  if (exactResult) {
    return { ok: true, operand: operandFromExact(exactResult, displayLatex) };
  }

  if ((expression.operator === 'add' || expression.operator === 'subtract') && !haveSameMatrixShape(left.operand.matrix, right.operand.matrix)) {
    return { ok: false, message: 'Addition and subtraction require matching matrix dimensions.' };
  }
  if (expression.operator === 'multiply' && !canMultiplyMatrices(left.operand.matrix, right.operand.matrix)) {
    return { ok: false, message: 'Matrix multiplication requires left columns to match right rows.' };
  }

  const matrix = expression.operator === 'add'
    ? addMatrices(left.operand.matrix, right.operand.matrix)
    : expression.operator === 'subtract'
      ? subtractMatrices(left.operand.matrix, right.operand.matrix)
      : multiplyMatrices(left.operand.matrix, right.operand.matrix);
  return { ok: true, operand: operandFromNumeric(matrix, displayLatex) };
}

function evaluateUnaryMatrix(
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'unary' }>,
  input: MatrixExpressionEvaluationInput,
): MatrixExpressionEvaluation {
  if (
    expression.operator !== 'transpose'
    && expression.operator !== 'adjoint'
    && expression.operator !== 'inverse'
  ) {
    return { ok: false, message: 'This Matrix editor expression does not produce a matrix.' };
  }

  const value = evaluateMatrixExpression(expression.value, input);
  if (!value.ok) return value;
  const displayLatex = formatLinearAlgebraEditorExpression(expression);
  const exactValue = exactForOperand(value.operand);

  if (expression.operator === 'transpose' || expression.operator === 'adjoint') {
    const exactResult = exactValue ? exactTransposeMatrix(exactValue) : null;
    if (exactResult) {
      return { ok: true, operand: operandFromExact(exactResult, displayLatex) };
    }
    if (!getMatrixShapeFacts(value.operand.matrix).isRectangular) {
      return { ok: false, message: 'Transpose needs a complete rectangular matrix.' };
    }
    return { ok: true, operand: operandFromNumeric(transposeMatrix(value.operand.matrix), displayLatex) };
  }

  const exactResult = exactValue ? exactInverseMatrixForExpression(exactValue) : null;
  if (exactResult) {
    return { ok: true, operand: operandFromExact(exactResult, displayLatex) };
  }
  const inverse = inverseMatrix(value.operand.matrix);
  if (!inverse) {
    return { ok: false, message: 'Matrix inverse requires a square nonsingular matrix.' };
  }
  return { ok: true, operand: operandFromNumeric(inverse, displayLatex) };
}

function numericIdentity(size: number): NumericMatrix {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => (row === column ? 1 : 0)));
}

function numericPowerMatrix(matrix: NumericMatrix, exponent: number): NumericMatrix | null {
  if (Math.abs(exponent) > MAX_EXACT_EXPRESSION_POWER_ABS) {
    return null;
  }
  const shape = getMatrixShapeFacts(matrix);
  if (!shape.isSquare) {
    return null;
  }

  let base = cloneMatrix(matrix);
  if (exponent < 0) {
    const inverse = inverseMatrix(base);
    if (!inverse) return null;
    base = inverse;
  }

  let result = numericIdentity(shape.rows);
  for (let index = 0; index < Math.abs(exponent); index += 1) {
    result = multiplyMatrices(result, base);
  }
  return result;
}

function evaluateMatrixPower(
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'matrixPower' }>,
  input: MatrixExpressionEvaluationInput,
): MatrixExpressionEvaluation {
  if (Math.abs(expression.exponent) > MAX_EXACT_EXPRESSION_POWER_ABS) {
    return {
      ok: false,
      message: `Matrix editor powers are capped at |n| <= ${MAX_EXACT_EXPRESSION_POWER_ABS}.`,
    };
  }

  const value = evaluateMatrixExpression(expression.matrix, input);
  if (!value.ok) return value;
  const displayLatex = formatLinearAlgebraEditorExpression(expression);
  const exactValue = exactForOperand(value.operand);
  const exactResult = exactValue ? exactPowerMatrix(exactValue, expression.exponent) : null;
  if (exactResult) {
    return { ok: true, operand: operandFromExact(exactResult, displayLatex) };
  }

  const powered = numericPowerMatrix(value.operand.matrix, expression.exponent);
  if (!powered) {
    return { ok: false, message: 'Matrix powers require a square matrix, and negative powers require a nonsingular matrix.' };
  }
  return { ok: true, operand: operandFromNumeric(powered, displayLatex) };
}

export function evaluateMatrixExpression(
  expression: LinearAlgebraEditorExpression,
  input: MatrixExpressionEvaluationInput,
): MatrixExpressionEvaluation {
  switch (expression.kind) {
    case 'matrixLiteral':
      {
        const dimensionStop = matrixDimensionStop(expression.value);
        if (dimensionStop) return dimensionStop;
      }
      return {
        ok: true,
        operand: {
          matrix: cloneMatrix(expression.value),
          exactMatrix: cloneMatrix(expression.exactValue),
          displayLatex: expression.displayLatex,
        },
      };
    case 'named':
      return evaluateNamedMatrix(expression, input);
    case 'binary':
      return evaluateBinaryMatrix(expression, input);
    case 'unary':
      return evaluateUnaryMatrix(expression, input);
    case 'matrixPower':
      return evaluateMatrixPower(expression, input);
    default:
      return { ok: false, message: 'This Matrix editor expression does not produce a matrix.' };
  }
}
