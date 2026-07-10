import type {
  AngleUnit,
  MatrixOperation,
  MatrixRequest,
  VectorRequest,
} from '../../types/calculator';
import {
  parseLinearAlgebraEditorLatex,
  type LinearAlgebraEditorExpression,
  type LinearAlgebraUnaryOperator,
} from './editor-parser';
import {
  buildLinearAlgebraEquationHandoff,
  type LinearAlgebraEquationHandoff,
} from './equation-handoff';
import { formatLinearAlgebraEditorExpression } from './editor-expression-format';
import {
  matrixNamedValueNames,
  vectorNamedValueNames,
  type LinearAlgebraMatrixNamedValue,
  type LinearAlgebraVectorNamedValue,
} from './named-values';
import {
  evaluateMatrixExpression,
  type EvaluatedMatrixOperand,
  type MatrixExpressionEvaluation,
} from './matrix-expression-evaluator';
import {
  canMultiplyMatrices,
  haveSameMatrixShape,
} from './matrix-core';
import {
  evaluateVectorExpression,
  type EvaluatedVectorOperand,
  type VectorExpressionEvaluation,
} from './vector-expression-evaluator';
import { containsVectorScalarArithmetic } from './editor-vector-scalars';
import { dispatchVectorFamilyExpression } from './vector-family-dispatch';

type MatrixOperand = EvaluatedMatrixOperand;
type VectorOperand = EvaluatedVectorOperand;

export type MatrixEditorDispatchInput = {
  latex: string;
  matrixA: number[][];
  matrixB: number[][];
  matrixValues?: readonly LinearAlgebraMatrixNamedValue[];
};

export type VectorEditorDispatchInput = {
  latex: string;
  vectorA: number[];
  vectorB: number[];
  vectorValues?: readonly LinearAlgebraVectorNamedValue[];
  angleUnit: AngleUnit;
};

type ExecutableMatrixRequest = MatrixRequest & { matrixB: number[][] };
type ExecutableVectorRequest = VectorRequest & { vectorB: number[] };

export type MatrixEditorDispatchResult =
  | { ok: true; request: ExecutableMatrixRequest }
  | { ok: false; message: string; handoff?: LinearAlgebraEquationHandoff };

export type VectorEditorDispatchResult =
  | { ok: true; request: ExecutableVectorRequest }
  | { ok: false; message: string; handoff?: LinearAlgebraEquationHandoff };

function matrixEvaluationError(
  result: Extract<MatrixExpressionEvaluation, { ok: false }>,
): MatrixEditorDispatchResult {
  return { ok: false, message: result.message };
}

function vectorEvaluationError(
  result: Extract<VectorExpressionEvaluation, { ok: false }>,
): VectorEditorDispatchResult {
  return { ok: false, message: result.message };
}

function cloneMatrix<T>(matrix: T[][]): T[][] {
  return matrix.map((row) => [...row]);
}

function cloneVector<T>(vector: T[]): T[] {
  return [...vector];
}

function matrixMetadata(
  input: MatrixEditorDispatchInput,
  operands: {
    operandA?: MatrixOperand;
    operandB?: MatrixOperand;
    systemRhs?: LinearAlgebraEditorExpression;
    coordinateVector?: LinearAlgebraEditorExpression;
    matrixPowerExponentLatex?: string;
  } = {},
) {
  return {
    editorExpressionLatex: input.latex,
    ...(operands.operandA ? { matrixOperandLatexA: operands.operandA.displayLatex } : {}),
    ...(operands.operandB ? { matrixOperandLatexB: operands.operandB.displayLatex } : {}),
    ...(operands.systemRhs && operands.systemRhs.kind === 'vectorLiteral'
      ? { systemRhsLatex: operands.systemRhs.displayLatex }
      : {}),
    ...(operands.coordinateVector && operands.coordinateVector.kind === 'vectorLiteral'
      ? { coordinateVectorLatex: operands.coordinateVector.displayLatex }
      : {}),
    ...(operands.matrixPowerExponentLatex ? { matrixPowerExponentLatex: operands.matrixPowerExponentLatex } : {}),
  };
}

function vectorMetadata(
  input: VectorEditorDispatchInput,
  operands: {
    operandA?: VectorOperand | string;
    operandB?: VectorOperand | string;
  } = {},
) {
  const operandLatex = (operand: VectorOperand | string | undefined) =>
    typeof operand === 'string' ? operand : operand?.displayLatex;
  const operandExactVector = (operand: VectorOperand | string | undefined) =>
    typeof operand === 'string' ? undefined : operand?.exactVector;
  const exactVectorA = operandExactVector(operands.operandA);
  const exactVectorB = operandExactVector(operands.operandB);

  return {
    editorExpressionLatex: input.latex,
    ...(exactVectorA ? { exactVectorA: cloneVector(exactVectorA) } : {}),
    ...(exactVectorB ? { exactVectorB: cloneVector(exactVectorB) } : {}),
    ...(operandLatex(operands.operandA) ? { vectorOperandLatexA: operandLatex(operands.operandA) } : {}),
    ...(operandLatex(operands.operandB) ? { vectorOperandLatexB: operandLatex(operands.operandB) } : {}),
  };
}

function matrixOperand(
  expression: LinearAlgebraEditorExpression,
  input: MatrixEditorDispatchInput,
): MatrixExpressionEvaluation {
  return evaluateMatrixExpression(expression, input);
}

function vectorOperand(
  expression: LinearAlgebraEditorExpression,
  input: VectorEditorDispatchInput,
): VectorExpressionEvaluation {
  return evaluateVectorExpression(expression, input);
}

function namedVectorOperand(name: string, input: VectorEditorDispatchInput): VectorExpressionEvaluation {
  return vectorOperand({ kind: 'named', name, displayLatex: name }, input);
}

function vectorLinearCombinationRequest(
  input: VectorEditorDispatchInput,
  expression: LinearAlgebraEditorExpression,
): VectorEditorDispatchResult {
  const result = vectorOperand(expression, input);
  if (!result.ok) return vectorEvaluationError(result);
  return {
    ok: true,
    request: {
      operation: 'linearCombination',
      vectorA: result.operand.vector,
      vectorB: cloneVector(input.vectorB),
      angleUnit: input.angleUnit,
      ...vectorMetadata(input, { operandA: result.operand }),
    },
  };
}

const MATRIX_UNARY_OPERATIONS: Partial<Record<LinearAlgebraUnaryOperator, readonly [MatrixOperation, MatrixOperation]>> = {
  determinant: ['detA', 'detB'],
  rank: ['rankA', 'rankB'],
  rref: ['rrefA', 'rrefB'],
  nullSpace: ['nullSpaceA', 'nullSpaceB'],
  columnSpace: ['columnSpaceA', 'columnSpaceB'],
  basis: ['basisA', 'basisB'],
  lu: ['luA', 'luB'],
  plu: ['pluA', 'pluB'],
  qr: ['qrA', 'qrB'],
  invertibility: ['invertibilityA', 'invertibilityB'],
  profile: ['profileA', 'profileB'],
  eigen: ['eigenA', 'eigenB'],
  diagonalization: ['diagonalizeA', 'diagonalizeB'],
  transpose: ['transposeA', 'transposeB'],
  inverse: ['inverseA', 'inverseB'],
};

function matrixPairRequest(
  input: MatrixEditorDispatchInput,
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'binary' }>,
): MatrixEditorDispatchResult {
  if (
    expression.operator !== 'add'
    && expression.operator !== 'subtract'
    && expression.operator !== 'multiply'
  ) {
    return {
      ok: false,
      message: 'This Matrix editor operator is not executable in Matrix mode.',
    };
  }

  const leftResult = matrixOperand(expression.left, input);
  if (!leftResult.ok) return matrixEvaluationError(leftResult);
  const rightResult = matrixOperand(expression.right, input);
  if (!rightResult.ok) return matrixEvaluationError(rightResult);
  const left = leftResult.operand;
  const right = rightResult.operand;
  if (
    (expression.operator === 'add' || expression.operator === 'subtract')
    && !haveSameMatrixShape(left.matrix, right.matrix)
  ) {
    return { ok: false, message: 'Addition and subtraction require matching matrix dimensions.' };
  }
  if (expression.operator === 'multiply' && !canMultiplyMatrices(left.matrix, right.matrix)) {
    return { ok: false, message: 'Matrix multiplication requires left columns to match right rows.' };
  }

  return {
    ok: true,
    request: {
      operation: expression.operator,
      matrixA: left.matrix,
      matrixB: right.matrix,
      ...(left.exactMatrix ? { exactMatrixA: left.exactMatrix } : {}),
      ...(right.exactMatrix ? { exactMatrixB: right.exactMatrix } : {}),
      ...matrixMetadata(input, { operandA: left, operandB: right }),
    },
  };
}

function matrixSystemRequest(
  input: MatrixEditorDispatchInput,
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'linearSystem' }>,
): MatrixEditorDispatchResult {
  const coefficientsResult = matrixOperand(expression.coefficients, input);
  if (!coefficientsResult.ok) return matrixEvaluationError(coefficientsResult);
  const coefficients = coefficientsResult.operand;
  if (expression.constants.kind !== 'vectorLiteral') {
    return {
      ok: false,
      message: 'Matrix systems need Matrix A/B or an inline matrix, plus an inline RHS vector.',
    };
  }

  return {
    ok: true,
    request: {
      operation: 'linearSystem',
      matrixA: coefficients.matrix,
      matrixB: cloneMatrix(input.matrixB),
      systemRhs: cloneVector(expression.constants.value),
      systemForm: expression.form,
      ...(coefficients.exactMatrix ? { exactMatrixA: coefficients.exactMatrix } : {}),
      exactSystemRhs: expression.constants.exactValue,
      ...matrixMetadata(input, { operandA: coefficients, systemRhs: expression.constants }),
    },
  };
}

function matrixMultiRhsSystemRequest(input: MatrixEditorDispatchInput, expression: Extract<LinearAlgebraEditorExpression, { kind: 'multiRhsSystem' }>): MatrixEditorDispatchResult {
  const coefficientsResult = matrixOperand(expression.coefficients, input);
  if (!coefficientsResult.ok) return matrixEvaluationError(coefficientsResult);
  const constantsResult = matrixOperand(expression.constants, input);
  if (!constantsResult.ok) return matrixEvaluationError(constantsResult);
  const coefficients = coefficientsResult.operand;
  const constants = constantsResult.operand;

  return {
    ok: true,
    request: {
      operation: 'multiRhsSolve', matrixA: coefficients.matrix, matrixB: constants.matrix,
      ...(coefficients.exactMatrix ? { exactMatrixA: coefficients.exactMatrix } : {}),
      ...(constants.exactMatrix ? { exactMatrixB: constants.exactMatrix } : {}),
      ...matrixMetadata(input, { operandA: coefficients, operandB: constants }),
    },
  };
}

function matrixCoordinatesRequest(
  input: MatrixEditorDispatchInput,
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'coordinates' }>,
): MatrixEditorDispatchResult {
  const basisResult = matrixOperand(expression.basis, input);
  if (!basisResult.ok) return matrixEvaluationError(basisResult);
  const basis = basisResult.operand;
  if (expression.vector.kind !== 'vectorLiteral') {
    return {
      ok: false,
      message: 'Coordinates need Matrix A/B or an inline basis matrix, plus an inline vector.',
    };
  }

  return {
    ok: true,
    request: basis.named === 'B'
      ? {
          operation: 'coordinatesB',
          matrixA: cloneMatrix(input.matrixA),
          matrixB: basis.matrix,
          coordinateVector: cloneVector(expression.vector.value),
          ...(basis.exactMatrix ? { exactMatrixB: basis.exactMatrix } : {}),
          exactCoordinateVector: cloneVector(expression.vector.exactValue),
          ...matrixMetadata(input, { operandB: basis, coordinateVector: expression.vector }),
        }
      : {
          operation: 'coordinatesA',
          matrixA: basis.matrix,
          matrixB: cloneMatrix(input.matrixB),
          coordinateVector: cloneVector(expression.vector.value),
          ...(basis.exactMatrix ? { exactMatrixA: basis.exactMatrix } : {}),
          exactCoordinateVector: cloneVector(expression.vector.exactValue),
          ...matrixMetadata(input, { operandA: basis, coordinateVector: expression.vector }),
        },
  };
}

function matrixColumnProjectionRequest(
  input: MatrixEditorDispatchInput,
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'columnProjection' }>,
): MatrixEditorDispatchResult {
  const matrixResult = matrixOperand(expression.matrix, input);
  if (!matrixResult.ok) return matrixEvaluationError(matrixResult);
  const matrix = matrixResult.operand;
  if (expression.vector.kind !== 'vectorLiteral') {
    return {
      ok: false,
      message: 'Column projection needs Matrix A/B or an inline matrix, plus an inline vector.',
    };
  }

  return {
    ok: true,
    request: matrix.named === 'B'
      ? {
          operation: 'columnProjectionB',
          matrixA: cloneMatrix(input.matrixA),
          matrixB: matrix.matrix,
          systemRhs: cloneVector(expression.vector.value),
          ...(matrix.exactMatrix ? { exactMatrixB: matrix.exactMatrix } : {}),
          exactSystemRhs: cloneVector(expression.vector.exactValue),
          ...matrixMetadata(input, { operandB: matrix, systemRhs: expression.vector }),
        }
      : {
          operation: 'columnProjectionA',
          matrixA: matrix.matrix,
          matrixB: cloneMatrix(input.matrixB),
          systemRhs: cloneVector(expression.vector.value),
          ...(matrix.exactMatrix ? { exactMatrixA: matrix.exactMatrix } : {}),
          exactSystemRhs: cloneVector(expression.vector.exactValue),
          ...matrixMetadata(input, { operandA: matrix, systemRhs: expression.vector }),
        },
  };
}

function matrixLeastSquaresRequest(
  input: MatrixEditorDispatchInput,
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'leastSquares' }>,
): MatrixEditorDispatchResult {
  const matrixResult = matrixOperand(expression.matrix, input);
  if (!matrixResult.ok) return matrixEvaluationError(matrixResult);
  const matrix = matrixResult.operand;
  if (expression.vector.kind !== 'vectorLiteral') {
    return {
      ok: false,
      message: 'Least squares needs Matrix A/B or an inline matrix, plus an inline vector.',
    };
  }

  return {
    ok: true,
    request: matrix.named === 'B'
      ? {
          operation: 'leastSquaresB',
          matrixA: cloneMatrix(input.matrixA),
          matrixB: matrix.matrix,
          systemRhs: cloneVector(expression.vector.value),
          ...(matrix.exactMatrix ? { exactMatrixB: matrix.exactMatrix } : {}),
          exactSystemRhs: cloneVector(expression.vector.exactValue),
          ...matrixMetadata(input, { operandB: matrix, systemRhs: expression.vector }),
        }
      : {
          operation: 'leastSquaresA',
          matrixA: matrix.matrix,
          matrixB: cloneMatrix(input.matrixB),
          systemRhs: cloneVector(expression.vector.value),
          ...(matrix.exactMatrix ? { exactMatrixA: matrix.exactMatrix } : {}),
          exactSystemRhs: cloneVector(expression.vector.exactValue),
          ...matrixMetadata(input, { operandA: matrix, systemRhs: expression.vector }),
        },
  };
}

function matrixFactorSolveRequest(
  input: MatrixEditorDispatchInput,
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'factorSolve' }>,
): MatrixEditorDispatchResult {
  const matrixResult = matrixOperand(expression.matrix, input);
  if (!matrixResult.ok) return matrixEvaluationError(matrixResult);
  const matrix = matrixResult.operand;
  if (expression.vector.kind !== 'vectorLiteral') {
    return {
      ok: false,
      message: 'Factor solve needs Matrix A/B or an inline matrix, plus an inline RHS vector.',
    };
  }

  const operation = expression.method === 'lu'
    ? (matrix.named === 'B' ? 'luSolveB' : 'luSolveA')
    : (matrix.named === 'B' ? 'pluSolveB' : 'pluSolveA');

  return {
    ok: true,
    request: matrix.named === 'B'
      ? {
          operation,
          matrixA: cloneMatrix(input.matrixA),
          matrixB: matrix.matrix,
          systemRhs: cloneVector(expression.vector.value),
          ...(matrix.exactMatrix ? { exactMatrixB: matrix.exactMatrix } : {}),
          exactSystemRhs: cloneVector(expression.vector.exactValue),
          ...matrixMetadata(input, { operandB: matrix, systemRhs: expression.vector }),
        }
      : {
          operation,
          matrixA: matrix.matrix,
          matrixB: cloneMatrix(input.matrixB),
          systemRhs: cloneVector(expression.vector.value),
          ...(matrix.exactMatrix ? { exactMatrixA: matrix.exactMatrix } : {}),
          exactSystemRhs: cloneVector(expression.vector.exactValue),
          ...matrixMetadata(input, { operandA: matrix, systemRhs: expression.vector }),
        },
  };
}

function matrixChangeOfBasisRequest(
  input: MatrixEditorDispatchInput,
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'changeOfBasis' }>,
): MatrixEditorDispatchResult {
  const sourceResult = matrixOperand(expression.source, input);
  if (!sourceResult.ok) return matrixEvaluationError(sourceResult);
  const targetResult = matrixOperand(expression.target, input);
  if (!targetResult.ok) return matrixEvaluationError(targetResult);
  const source = sourceResult.operand;
  const target = targetResult.operand;

  return {
    ok: true,
    request: {
      operation: 'changeBasis',
      matrixA: source.matrix,
      matrixB: target.matrix,
      ...(source.exactMatrix ? { exactMatrixA: source.exactMatrix } : {}),
      ...(target.exactMatrix ? { exactMatrixB: target.exactMatrix } : {}),
      ...matrixMetadata(input, { operandA: source, operandB: target }),
    },
  };
}

function matrixPowerRequest(
  input: MatrixEditorDispatchInput,
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'matrixPower' }>,
): MatrixEditorDispatchResult {
  const matrixResult = matrixOperand(expression.matrix, input);
  if (!matrixResult.ok) return matrixEvaluationError(matrixResult);
  const matrix = matrixResult.operand;

  return {
    ok: true,
    request: matrix.named === 'B'
      ? {
          operation: 'spectralPowerB',
          matrixA: cloneMatrix(input.matrixA),
          matrixB: matrix.matrix,
          matrixPowerExponent: expression.exponent,
          ...(matrix.exactMatrix ? { exactMatrixB: matrix.exactMatrix } : {}),
          ...matrixMetadata(input, { operandB: matrix, matrixPowerExponentLatex: expression.exponentLatex }),
        }
      : {
          operation: 'spectralPowerA',
          matrixA: matrix.matrix,
          matrixB: cloneMatrix(input.matrixB),
          matrixPowerExponent: expression.exponent,
          ...(matrix.exactMatrix ? { exactMatrixA: matrix.exactMatrix } : {}),
          ...matrixMetadata(input, { operandA: matrix, matrixPowerExponentLatex: expression.exponentLatex }),
        },
  };
}

function matrixUnaryRequest(
  input: MatrixEditorDispatchInput,
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'unary' }>,
): MatrixEditorDispatchResult {
  const valueResult = matrixOperand(expression.value, input);
  if (!valueResult.ok) return matrixEvaluationError(valueResult);
  const value = valueResult.operand;

  const operations = MATRIX_UNARY_OPERATIONS[expression.operator];
  if (operations) {
    const [operationA, operationB] = operations;
    return {
      ok: true,
      request: value.named === 'B'
        ? {
            operation: operationB,
            matrixA: cloneMatrix(input.matrixA),
            matrixB: value.matrix,
            ...(value.exactMatrix ? { exactMatrixB: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandB: value }),
          }
        : {
            operation: operationA,
            matrixA: value.matrix,
            matrixB: cloneMatrix(input.matrixB),
            ...(value.exactMatrix ? { exactMatrixA: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandA: value }),
          },
    };
  }

  return {
    ok: false,
    message: 'This Matrix editor expression is not executable in Matrix mode.',
  };
}

function vectorPairRequest(
  input: VectorEditorDispatchInput,
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'binary' }>,
): VectorEditorDispatchResult {
  if (
    expression.operator !== 'add'
    && expression.operator !== 'subtract'
    && expression.operator !== 'dot'
    && expression.operator !== 'cross'
  ) {
    return {
      ok: false,
      message: 'This Vector editor operator is not executable in Vector mode.',
    };
  }

  const leftResult = vectorOperand(expression.left, input);
  if (!leftResult.ok) return vectorEvaluationError(leftResult);
  const rightResult = vectorOperand(expression.right, input);
  if (!rightResult.ok) return vectorEvaluationError(rightResult);
  const left = leftResult.operand;
  const right = rightResult.operand;

  return {
    ok: true,
    request: {
      operation: expression.operator,
      vectorA: left.vector,
      vectorB: right.vector,
      angleUnit: input.angleUnit,
      ...vectorMetadata(input, { operandA: left, operandB: right }),
    },
  };
}

function vectorUnaryRequest(
  input: VectorEditorDispatchInput,
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'unary' }>,
): VectorEditorDispatchResult {
  if (
    expression.operator !== 'norm'
    && expression.operator !== 'unit'
    && expression.operator !== 'projectionOntoU'
    && expression.operator !== 'projectionOntoV'
    && expression.operator !== 'orthogonalComponentToU'
    && expression.operator !== 'orthogonalComponentToV'
  ) {
    return {
      ok: false,
      message: 'This Vector editor expression is not executable in Vector mode.',
    };
  }

  const valueResult = vectorOperand(expression.value, input);
  if (!valueResult.ok) return vectorEvaluationError(valueResult);
  const value = valueResult.operand;

  if (expression.operator === 'projectionOntoU') {
    const baseResult = namedVectorOperand('u', input);
    if (!baseResult.ok) return vectorEvaluationError(baseResult);
    const base = baseResult.operand;
    return {
      ok: true,
      request: {
        operation: 'projectionUofV',
        vectorA: base.vector,
        vectorB: value.vector,
        angleUnit: input.angleUnit,
        ...vectorMetadata(input, { operandA: base, operandB: value }),
      },
    };
  }

  if (expression.operator === 'projectionOntoV') {
    const baseResult = namedVectorOperand('v', input);
    if (!baseResult.ok) return vectorEvaluationError(baseResult);
    const base = baseResult.operand;
    return {
      ok: true,
      request: {
        operation: 'projectionUofV',
        vectorA: base.vector,
        vectorB: value.vector,
        angleUnit: input.angleUnit,
        ...vectorMetadata(input, { operandA: base, operandB: value }),
      },
    };
  }

  if (expression.operator === 'orthogonalComponentToU') {
    const baseResult = namedVectorOperand('u', input);
    if (!baseResult.ok) return vectorEvaluationError(baseResult);
    const base = baseResult.operand;
    return {
      ok: true,
      request: {
        operation: 'orthogonalToU',
        vectorA: base.vector,
        vectorB: value.vector,
        angleUnit: input.angleUnit,
        ...vectorMetadata(input, { operandA: base, operandB: value }),
      },
    };
  }

  if (expression.operator === 'orthogonalComponentToV') {
    const baseResult = namedVectorOperand('v', input);
    if (!baseResult.ok) return vectorEvaluationError(baseResult);
    const base = baseResult.operand;
    return {
      ok: true,
      request: {
        operation: 'orthogonalToU',
        vectorA: base.vector,
        vectorB: value.vector,
        angleUnit: input.angleUnit,
        ...vectorMetadata(input, { operandA: base, operandB: value }),
      },
    };
  }

  if (expression.operator === 'unit') {
    return {
      ok: true,
      request: value.named === 'v'
        ? {
            operation: 'unitB',
            vectorA: cloneVector(input.vectorA),
            vectorB: value.vector,
            angleUnit: input.angleUnit,
            ...vectorMetadata(input, { operandB: value }),
          }
        : {
            operation: 'unitA',
            vectorA: value.vector,
            vectorB: cloneVector(input.vectorB),
            angleUnit: input.angleUnit,
            ...vectorMetadata(input, { operandA: value }),
          },
    };
  }

  return {
    ok: true,
    request: value.named === 'v'
      ? {
          operation: 'normB',
          vectorA: cloneVector(input.vectorA),
          vectorB: value.vector,
          angleUnit: input.angleUnit,
          ...vectorMetadata(input, { operandB: value }),
        }
      : {
          operation: 'normA',
          vectorA: value.vector,
          vectorB: cloneVector(input.vectorB),
          angleUnit: input.angleUnit,
          ...vectorMetadata(input, { operandA: value }),
        },
  };
}

export function dispatchMatrixEditorLatex(input: MatrixEditorDispatchInput): MatrixEditorDispatchResult {
  const parsed = parseLinearAlgebraEditorLatex(input.latex, {
    mode: 'matrix',
    matrixNamedValues: matrixNamedValueNames(input.matrixValues),
  });
  if (!parsed.ok) {
    return {
      ok: false,
      message: parsed.message,
      ...(parsed.reason === 'unsupported-equation-shape'
        ? {
            handoff: buildLinearAlgebraEquationHandoff({
              sourceMode: 'matrix',
              latex: input.latex,
              reason: 'unsupported-equation-shape',
              suggestedTarget: 'x',
            }),
          }
        : {}),
    };
  }

  const expression = parsed.expression;
  const canonicalInput = {
    ...input,
    latex: formatLinearAlgebraEditorExpression(expression),
  };
  if (expression.kind === 'linearSystem') {
    return matrixSystemRequest(canonicalInput, expression);
  }
  if (expression.kind === 'multiRhsSystem') return matrixMultiRhsSystemRequest(canonicalInput, expression);
  if (expression.kind === 'coordinates') {
    return matrixCoordinatesRequest(canonicalInput, expression);
  }
  if (expression.kind === 'columnProjection') {
    return matrixColumnProjectionRequest(canonicalInput, expression);
  }
  if (expression.kind === 'leastSquares') {
    return matrixLeastSquaresRequest(canonicalInput, expression);
  }
  if (expression.kind === 'matrixPower') {
    return matrixPowerRequest(canonicalInput, expression);
  }
  if (expression.kind === 'factorSolve') {
    return matrixFactorSolveRequest(canonicalInput, expression);
  }
  if (expression.kind === 'changeOfBasis') {
    return matrixChangeOfBasisRequest(canonicalInput, expression);
  }
  if (expression.kind === 'binary') {
    return matrixPairRequest(canonicalInput, expression);
  }
  if (expression.kind === 'unary') {
    return matrixUnaryRequest(canonicalInput, expression);
  }

  return {
    ok: false,
    message: 'Enter a Matrix operation such as A+B, A×B, det(A), A^T, or A^{-1}.',
  };
}

export function dispatchVectorEditorLatex(input: VectorEditorDispatchInput): VectorEditorDispatchResult {
  const parsed = parseLinearAlgebraEditorLatex(input.latex, {
    mode: 'vector',
    vectorNamedValues: vectorNamedValueNames(input.vectorValues),
  });
  if (!parsed.ok) {
    return {
      ok: false,
      message: parsed.message,
      ...(parsed.reason === 'unsupported-equation-shape'
        ? {
            handoff: buildLinearAlgebraEquationHandoff({
              sourceMode: 'vector',
              latex: input.latex,
              reason: 'unsupported-equation-shape',
            }),
          }
        : {}),
    };
  }

  const expression = parsed.expression;
  const canonicalInput = {
    ...input,
    latex: formatLinearAlgebraEditorExpression(expression),
  };
  if (expression.kind === 'vectorFamily') {
    return dispatchVectorFamilyExpression(expression, canonicalInput);
  }
  if (containsVectorScalarArithmetic(expression)) {
    return vectorLinearCombinationRequest(canonicalInput, expression);
  }
  if (expression.kind === 'binary') {
    return vectorPairRequest(canonicalInput, expression);
  }
  if (expression.kind === 'unary') {
    return vectorUnaryRequest(canonicalInput, expression);
  }
  if (expression.kind === 'angle') {
    const leftResult = vectorOperand(expression.left, canonicalInput);
    if (!leftResult.ok) return vectorEvaluationError(leftResult);
    const rightResult = vectorOperand(expression.right, canonicalInput);
    if (!rightResult.ok) return vectorEvaluationError(rightResult);
    const left = leftResult.operand;
    const right = rightResult.operand;
    return {
      ok: true,
      request: {
        operation: 'angle',
        vectorA: left.vector,
        vectorB: right.vector,
        angleUnit: canonicalInput.angleUnit,
        ...vectorMetadata(canonicalInput, { operandA: left, operandB: right }),
      },
    };
  }
  if (expression.kind === 'projection') {
    const baseResult = vectorOperand(expression.base, canonicalInput);
    if (!baseResult.ok) return vectorEvaluationError(baseResult);
    const targetResult = vectorOperand(expression.target, canonicalInput);
    if (!targetResult.ok) return vectorEvaluationError(targetResult);
    const base = baseResult.operand;
    const target = targetResult.operand;
    return {
      ok: true,
      request: {
        operation: 'projectionUofV',
        vectorA: base.vector,
        vectorB: target.vector,
        angleUnit: canonicalInput.angleUnit,
        ...vectorMetadata(canonicalInput, { operandA: base, operandB: target }),
      },
    };
  }
  if (expression.kind === 'orthogonality') {
    const leftResult = vectorOperand(expression.left, canonicalInput);
    if (!leftResult.ok) return vectorEvaluationError(leftResult);
    const rightResult = vectorOperand(expression.right, canonicalInput);
    if (!rightResult.ok) return vectorEvaluationError(rightResult);
    const left = leftResult.operand;
    const right = rightResult.operand;
    return {
      ok: true,
      request: {
        operation: 'orthogonalCheck',
        vectorA: left.vector,
        vectorB: right.vector,
        angleUnit: canonicalInput.angleUnit,
        ...vectorMetadata(canonicalInput, { operandA: left, operandB: right }),
      },
    };
  }
  if (expression.kind === 'gramSchmidt') {
    const leftResult = vectorOperand(expression.left, canonicalInput);
    if (!leftResult.ok) return vectorEvaluationError(leftResult);
    const rightResult = vectorOperand(expression.right, canonicalInput);
    if (!rightResult.ok) return vectorEvaluationError(rightResult);
    const left = leftResult.operand;
    const right = rightResult.operand;
    return {
      ok: true,
      request: {
        operation: 'gramSchmidtUV',
        vectorA: left.vector,
        vectorB: right.vector,
        angleUnit: canonicalInput.angleUnit,
        ...vectorMetadata(canonicalInput, { operandA: left, operandB: right }),
      },
    };
  }
  if (expression.kind === 'scalarTripleProduct') {
    const firstResult = vectorOperand(expression.first, canonicalInput);
    if (!firstResult.ok) return vectorEvaluationError(firstResult);
    const crossResult = vectorOperand({
      kind: 'binary',
      operator: 'cross',
      left: expression.second,
      right: expression.third,
    }, canonicalInput);
    if (!crossResult.ok) return vectorEvaluationError(crossResult);
    const first = firstResult.operand;
    const cross = crossResult.operand;
    return {
      ok: true,
      request: {
        operation: 'dot',
        vectorA: first.vector,
        vectorB: cross.vector,
        angleUnit: canonicalInput.angleUnit,
        ...vectorMetadata(canonicalInput, { operandA: first, operandB: cross }),
      },
    };
  }

  return {
    ok: false,
    message: 'Enter a Vector operation such as u+v, u·v, proj(u,v), cross(u,v), gram(u,v), or angle(u,v).',
  };
}
