import type {
  ExactScalarWire,
  AngleUnit,
  MatrixRequest,
  VectorRequest,
} from '../../types/calculator';
import {
  parseLinearAlgebraEditorLatex,
  type LinearAlgebraEditorExpression,
} from './editor-parser';
import {
  buildLinearAlgebraEquationHandoff,
  type LinearAlgebraEquationHandoff,
} from './equation-handoff';

type MatrixOperand = {
  matrix: number[][];
  exactMatrix?: ExactScalarWire[][];
  named?: 'A' | 'B';
  displayLatex: string;
};

type VectorOperand = {
  vector: number[];
  exactVector?: ExactScalarWire[];
  named?: 'u' | 'v';
  displayLatex: string;
};

export type MatrixEditorDispatchInput = {
  latex: string;
  matrixA: number[][];
  matrixB: number[][];
};

export type VectorEditorDispatchInput = {
  latex: string;
  vectorA: number[];
  vectorB: number[];
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
): MatrixOperand | null {
  if (expression.kind === 'matrixLiteral') {
    return {
      matrix: cloneMatrix(expression.value),
      exactMatrix: cloneMatrix(expression.exactValue),
      displayLatex: expression.displayLatex,
    };
  }

  if (expression.kind === 'named') {
    if (expression.name === 'A') {
      return { matrix: cloneMatrix(input.matrixA), named: 'A', displayLatex: expression.displayLatex };
    }
    if (expression.name === 'B') {
      return { matrix: cloneMatrix(input.matrixB), named: 'B', displayLatex: expression.displayLatex };
    }
  }

  return null;
}

function vectorOperand(
  expression: LinearAlgebraEditorExpression,
  input: VectorEditorDispatchInput,
): VectorOperand | null {
  if (expression.kind === 'vectorLiteral') {
    return {
      vector: cloneVector(expression.value),
      exactVector: cloneVector(expression.exactValue),
      displayLatex: expression.displayLatex,
    };
  }

  if (expression.kind === 'named') {
    if (expression.name === 'u') {
      return { vector: cloneVector(input.vectorA), named: 'u', displayLatex: expression.displayLatex };
    }
    if (expression.name === 'v') {
      return { vector: cloneVector(input.vectorB), named: 'v', displayLatex: expression.displayLatex };
    }
  }

  return null;
}

function matrixPairRequest(
  input: MatrixEditorDispatchInput,
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'binary' }>,
): MatrixEditorDispatchResult {
  const left = matrixOperand(expression.left, input);
  const right = matrixOperand(expression.right, input);
  if (!left || !right) {
    return {
      ok: false,
      message: 'Matrix editor operations need Matrix A/B values or inline matrix literals.',
    };
  }

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
  const coefficients = matrixOperand(expression.coefficients, input);
  if (!coefficients || expression.constants.kind !== 'vectorLiteral') {
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
  const coefficients = matrixOperand(expression.coefficients, input), constants = matrixOperand(expression.constants, input);
  if (!coefficients || !constants) {
    return { ok: false, message: 'Multi-RHS Matrix systems need Matrix A/B or inline matrices on both sides of AX=B.' };
  }

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
  const basis = matrixOperand(expression.basis, input);
  if (!basis || expression.vector.kind !== 'vectorLiteral') {
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

function matrixFactorSolveRequest(
  input: MatrixEditorDispatchInput,
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'factorSolve' }>,
): MatrixEditorDispatchResult {
  const matrix = matrixOperand(expression.matrix, input);
  if (!matrix || expression.vector.kind !== 'vectorLiteral') {
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
  const source = matrixOperand(expression.source, input);
  const target = matrixOperand(expression.target, input);
  if (!source || !target) {
    return {
      ok: false,
      message: 'Change of basis needs Matrix A/B values or inline matrix literals for both bases.',
    };
  }

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

function matrixUnaryRequest(
  input: MatrixEditorDispatchInput,
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'unary' }>,
): MatrixEditorDispatchResult {
  const value = matrixOperand(expression.value, input);
  if (!value) {
    return {
      ok: false,
      message: 'Matrix editor unary operations need Matrix A/B values or an inline matrix literal.',
    };
  }

  if (expression.operator === 'rank') {
    return {
      ok: true,
      request: value.named === 'B'
        ? {
            operation: 'rankB',
            matrixA: cloneMatrix(input.matrixA),
            matrixB: value.matrix,
            ...(value.exactMatrix ? { exactMatrixB: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandB: value }),
          }
        : {
            operation: 'rankA',
            matrixA: value.matrix,
            matrixB: cloneMatrix(input.matrixB),
            ...(value.exactMatrix ? { exactMatrixA: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandA: value }),
          },
    };
  }

  if (expression.operator === 'rref') {
    return {
      ok: true,
      request: value.named === 'B'
        ? {
            operation: 'rrefB',
            matrixA: cloneMatrix(input.matrixA),
            matrixB: value.matrix,
            ...(value.exactMatrix ? { exactMatrixB: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandB: value }),
          }
        : {
            operation: 'rrefA',
            matrixA: value.matrix,
            matrixB: cloneMatrix(input.matrixB),
            ...(value.exactMatrix ? { exactMatrixA: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandA: value }),
          },
    };
  }

  if (expression.operator === 'nullSpace') {
    return {
      ok: true,
      request: value.named === 'B'
        ? {
            operation: 'nullSpaceB',
            matrixA: cloneMatrix(input.matrixA),
            matrixB: value.matrix,
            ...(value.exactMatrix ? { exactMatrixB: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandB: value }),
          }
        : {
            operation: 'nullSpaceA',
            matrixA: value.matrix,
            matrixB: cloneMatrix(input.matrixB),
            ...(value.exactMatrix ? { exactMatrixA: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandA: value }),
          },
    };
  }

  if (expression.operator === 'columnSpace') {
    return {
      ok: true,
      request: value.named === 'B'
        ? {
            operation: 'columnSpaceB',
            matrixA: cloneMatrix(input.matrixA),
            matrixB: value.matrix,
            ...(value.exactMatrix ? { exactMatrixB: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandB: value }),
          }
        : {
            operation: 'columnSpaceA',
            matrixA: value.matrix,
            matrixB: cloneMatrix(input.matrixB),
            ...(value.exactMatrix ? { exactMatrixA: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandA: value }),
          },
    };
  }

  if (expression.operator === 'basis') {
    return {
      ok: true,
      request: value.named === 'B'
        ? {
            operation: 'basisB',
            matrixA: cloneMatrix(input.matrixA),
            matrixB: value.matrix,
            ...(value.exactMatrix ? { exactMatrixB: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandB: value }),
          }
        : {
            operation: 'basisA',
            matrixA: value.matrix,
            matrixB: cloneMatrix(input.matrixB),
            ...(value.exactMatrix ? { exactMatrixA: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandA: value }),
          },
    };
  }

  if (expression.operator === 'lu') {
    return {
      ok: true,
      request: value.named === 'B'
        ? {
            operation: 'luB',
            matrixA: cloneMatrix(input.matrixA),
            matrixB: value.matrix,
            ...(value.exactMatrix ? { exactMatrixB: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandB: value }),
          }
        : {
            operation: 'luA',
            matrixA: value.matrix,
            matrixB: cloneMatrix(input.matrixB),
            ...(value.exactMatrix ? { exactMatrixA: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandA: value }),
          },
    };
  }

  if (expression.operator === 'plu') {
    return {
      ok: true,
      request: value.named === 'B'
        ? {
            operation: 'pluB',
            matrixA: cloneMatrix(input.matrixA),
            matrixB: value.matrix,
            ...(value.exactMatrix ? { exactMatrixB: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandB: value }),
          }
        : {
            operation: 'pluA',
            matrixA: value.matrix,
            matrixB: cloneMatrix(input.matrixB),
            ...(value.exactMatrix ? { exactMatrixA: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandA: value }),
          },
    };
  }

  if (expression.operator === 'invertibility') {
    return {
      ok: true,
      request: value.named === 'B'
        ? {
            operation: 'invertibilityB',
            matrixA: cloneMatrix(input.matrixA),
            matrixB: value.matrix,
            ...(value.exactMatrix ? { exactMatrixB: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandB: value }),
          }
        : {
            operation: 'invertibilityA',
            matrixA: value.matrix,
            matrixB: cloneMatrix(input.matrixB),
            ...(value.exactMatrix ? { exactMatrixA: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandA: value }),
          },
    };
  }

  if (expression.operator === 'eigen') {
    return {
      ok: true,
      request: value.named === 'B'
        ? {
            operation: 'eigenB',
            matrixA: cloneMatrix(input.matrixA),
            matrixB: value.matrix,
            ...(value.exactMatrix ? { exactMatrixB: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandB: value }),
          }
        : {
            operation: 'eigenA',
            matrixA: value.matrix,
            matrixB: cloneMatrix(input.matrixB),
            ...(value.exactMatrix ? { exactMatrixA: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandA: value }),
          },
    };
  }

  if (expression.operator === 'determinant') {
    return {
      ok: true,
      request: value.named === 'B'
        ? {
            operation: 'detB',
            matrixA: cloneMatrix(input.matrixA),
            matrixB: value.matrix,
            ...(value.exactMatrix ? { exactMatrixB: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandB: value }),
          }
        : {
            operation: 'detA',
            matrixA: value.matrix,
            matrixB: cloneMatrix(input.matrixB),
            ...(value.exactMatrix ? { exactMatrixA: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandA: value }),
          },
    };
  }

  if (expression.operator === 'transpose') {
    return {
      ok: true,
      request: value.named === 'B'
        ? {
            operation: 'transposeB',
            matrixA: cloneMatrix(input.matrixA),
            matrixB: value.matrix,
            ...(value.exactMatrix ? { exactMatrixB: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandB: value }),
          }
        : {
            operation: 'transposeA',
            matrixA: value.matrix,
            matrixB: cloneMatrix(input.matrixB),
            ...(value.exactMatrix ? { exactMatrixA: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandA: value }),
          },
    };
  }

  if (expression.operator === 'inverse') {
    return {
      ok: true,
      request: value.named === 'B'
        ? {
            operation: 'inverseB',
            matrixA: cloneMatrix(input.matrixA),
            matrixB: value.matrix,
            ...(value.exactMatrix ? { exactMatrixB: value.exactMatrix } : {}),
            ...matrixMetadata(input, { operandB: value }),
          }
        : {
            operation: 'inverseA',
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
  const left = vectorOperand(expression.left, input);
  const right = vectorOperand(expression.right, input);
  if (!left || !right) {
    return {
      ok: false,
      message: 'Vector editor operations need Vector u/v values or inline vector literals.',
    };
  }

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

  const value = vectorOperand(expression.value, input);
  if (!value) {
    return {
      ok: false,
      message: 'Vector unary operations need Vector u/v values or inline vector literals.',
    };
  }

  if (expression.operator === 'projectionOntoU') {
    return {
      ok: true,
      request: {
        operation: 'projectionUofV',
        vectorA: cloneVector(input.vectorA),
        vectorB: value.vector,
        angleUnit: input.angleUnit,
        ...vectorMetadata(input, { operandA: 'u', operandB: value }),
      },
    };
  }

  if (expression.operator === 'projectionOntoV') {
    return {
      ok: true,
      request: {
        operation: 'projectionVofU',
        vectorA: value.vector,
        vectorB: cloneVector(input.vectorB),
        angleUnit: input.angleUnit,
        ...vectorMetadata(input, { operandA: value, operandB: 'v' }),
      },
    };
  }

  if (expression.operator === 'orthogonalComponentToU') {
    return {
      ok: true,
      request: {
        operation: 'orthogonalToU',
        vectorA: cloneVector(input.vectorA),
        vectorB: value.vector,
        angleUnit: input.angleUnit,
        ...vectorMetadata(input, { operandA: 'u', operandB: value }),
      },
    };
  }

  if (expression.operator === 'orthogonalComponentToV') {
    return {
      ok: true,
      request: {
        operation: 'orthogonalToV',
        vectorA: value.vector,
        vectorB: cloneVector(input.vectorB),
        angleUnit: input.angleUnit,
        ...vectorMetadata(input, { operandA: value, operandB: 'v' }),
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
  const parsed = parseLinearAlgebraEditorLatex(input.latex, { mode: 'matrix' });
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
  if (expression.kind === 'linearSystem') {
    return matrixSystemRequest(input, expression);
  }
  if (expression.kind === 'multiRhsSystem') return matrixMultiRhsSystemRequest(input, expression);
  if (expression.kind === 'coordinates') {
    return matrixCoordinatesRequest(input, expression);
  }
  if (expression.kind === 'factorSolve') {
    return matrixFactorSolveRequest(input, expression);
  }
  if (expression.kind === 'changeOfBasis') {
    return matrixChangeOfBasisRequest(input, expression);
  }
  if (expression.kind === 'binary') {
    return matrixPairRequest(input, expression);
  }
  if (expression.kind === 'unary') {
    return matrixUnaryRequest(input, expression);
  }

  return {
    ok: false,
    message: 'Enter a Matrix operation such as A+B, A×B, det(A), A^T, or A^{-1}.',
  };
}

export function dispatchVectorEditorLatex(input: VectorEditorDispatchInput): VectorEditorDispatchResult {
  const parsed = parseLinearAlgebraEditorLatex(input.latex, { mode: 'vector' });
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
  if (expression.kind === 'binary') {
    return vectorPairRequest(input, expression);
  }
  if (expression.kind === 'unary') {
    return vectorUnaryRequest(input, expression);
  }
  if (expression.kind === 'angle') {
    const left = vectorOperand(expression.left, input);
    const right = vectorOperand(expression.right, input);
    if (!left || !right) {
      return {
        ok: false,
        message: 'Vector angle needs Vector u/v values or inline vector literals.',
      };
    }
    return {
      ok: true,
      request: {
        operation: 'angle',
        vectorA: left.vector,
        vectorB: right.vector,
        angleUnit: input.angleUnit,
        ...vectorMetadata(input, { operandA: left, operandB: right }),
      },
    };
  }
  if (expression.kind === 'orthogonality') {
    const left = vectorOperand(expression.left, input);
    const right = vectorOperand(expression.right, input);
    if (!left || !right) {
      return {
        ok: false,
        message: 'Vector orthogonality checks need Vector u/v values or inline vector literals.',
      };
    }
    return {
      ok: true,
      request: {
        operation: 'orthogonalCheck',
        vectorA: left.vector,
        vectorB: right.vector,
        angleUnit: input.angleUnit,
        ...vectorMetadata(input, { operandA: left, operandB: right }),
      },
    };
  }
  if (expression.kind === 'gramSchmidt') {
    const left = vectorOperand(expression.left, input);
    const right = vectorOperand(expression.right, input);
    if (!left || !right) {
      return {
        ok: false,
        message: 'Vector Gram-Schmidt needs Vector u/v values or inline vector literals.',
      };
    }
    return {
      ok: true,
      request: {
        operation: 'gramSchmidtUV',
        vectorA: left.vector,
        vectorB: right.vector,
        angleUnit: input.angleUnit,
        ...vectorMetadata(input, { operandA: left, operandB: right }),
      },
    };
  }

  return {
    ok: false,
    message: 'Enter a Vector operation such as u+v, u·v, proj_u(v), gram(u,v), or angle(u,v).',
  };
}
