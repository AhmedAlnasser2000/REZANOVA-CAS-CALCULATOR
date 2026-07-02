import type {
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
  named?: 'A' | 'B';
};

type VectorOperand = {
  vector: number[];
  named?: 'u' | 'v';
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

function cloneMatrix(matrix: number[][]) {
  return matrix.map((row) => [...row]);
}

function cloneVector(vector: number[]) {
  return [...vector];
}

function matrixOperand(
  expression: LinearAlgebraEditorExpression,
  input: MatrixEditorDispatchInput,
): MatrixOperand | null {
  if (expression.kind === 'matrixLiteral') {
    return { matrix: cloneMatrix(expression.value) };
  }

  if (expression.kind === 'named') {
    if (expression.name === 'A') {
      return { matrix: cloneMatrix(input.matrixA), named: 'A' };
    }
    if (expression.name === 'B') {
      return { matrix: cloneMatrix(input.matrixB), named: 'B' };
    }
  }

  return null;
}

function vectorOperand(
  expression: LinearAlgebraEditorExpression,
  input: VectorEditorDispatchInput,
): VectorOperand | null {
  if (expression.kind === 'vectorLiteral') {
    return { vector: cloneVector(expression.value) };
  }

  if (expression.kind === 'named') {
    if (expression.name === 'u') {
      return { vector: cloneVector(input.vectorA), named: 'u' };
    }
    if (expression.name === 'v') {
      return { vector: cloneVector(input.vectorB), named: 'v' };
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
    },
  };
}

function matrixUnaryRequest(
  input: MatrixEditorDispatchInput,
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'unary' }>,
): MatrixEditorDispatchResult {
  if (expression.operator === 'rank' || expression.operator === 'rref') {
    return {
      ok: false,
      message: 'Rank and RREF are parsed, but Matrix editor execution for them is not enabled in this move.',
    };
  }

  const value = matrixOperand(expression.value, input);
  if (!value) {
    return {
      ok: false,
      message: 'Matrix editor unary operations need Matrix A/B values or an inline matrix literal.',
    };
  }

  if (expression.operator === 'determinant') {
    return {
      ok: true,
      request: value.named === 'B'
        ? { operation: 'detB', matrixA: cloneMatrix(input.matrixA), matrixB: value.matrix }
        : { operation: 'detA', matrixA: value.matrix, matrixB: cloneMatrix(input.matrixB) },
    };
  }

  if (expression.operator === 'transpose') {
    return {
      ok: true,
      request: value.named === 'B'
        ? { operation: 'transposeB', matrixA: cloneMatrix(input.matrixA), matrixB: value.matrix }
        : { operation: 'transposeA', matrixA: value.matrix, matrixB: cloneMatrix(input.matrixB) },
    };
  }

  if (expression.operator === 'inverse') {
    return {
      ok: true,
      request: value.named === 'B'
        ? { operation: 'inverseB', matrixA: cloneMatrix(input.matrixA), matrixB: value.matrix }
        : { operation: 'inverseA', matrixA: value.matrix, matrixB: cloneMatrix(input.matrixB) },
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
    },
  };
}

function vectorNormRequest(
  input: VectorEditorDispatchInput,
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'unary' }>,
): VectorEditorDispatchResult {
  if (expression.operator !== 'norm') {
    return {
      ok: false,
      message: 'This Vector editor expression is not executable in Vector mode.',
    };
  }

  const value = vectorOperand(expression.value, input);
  if (!value) {
    return {
      ok: false,
      message: 'Vector norm needs Vector u/v values or an inline vector literal.',
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
        }
      : {
          operation: 'normA',
          vectorA: value.vector,
          vectorB: cloneVector(input.vectorB),
          angleUnit: input.angleUnit,
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
    return vectorNormRequest(input, expression);
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
      },
    };
  }

  return {
    ok: false,
    message: 'Enter a Vector operation such as u+v, u·v, u×v, norm(u), or angle(u,v).',
  };
}
