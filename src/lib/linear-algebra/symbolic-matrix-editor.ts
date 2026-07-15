import type {
  ComplexExactForm,
  LinearAlgebraScalarDomain,
  LinearAlgebraScalarMatrixOperandV1,
  LinearAlgebraSubstitutionMode,
  ScalarMatrixRequestV1,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';
import { formatLinearAlgebraEditorExpression } from './editor-expression-format';
import {
  parseLinearAlgebraEditorLatex,
  type LinearAlgebraEditorExpression,
} from './editor-parser';
import {
  cloneMatrixNamedValues,
  type LinearAlgebraMatrixNamedValue,
} from './named-values';
import { resolveMatrixNamedValueOperand } from './scalar-operands';
import { parseLinearAlgebraScalarWire } from './scalar-wire';

type SymbolicMatrixEditorInput = {
  latex: string;
  matrixValues: readonly LinearAlgebraMatrixNamedValue[];
  activeMatrixLeftId?: string;
  activeMatrixRightId?: string;
  domain: LinearAlgebraScalarDomain;
  substitutionMode: LinearAlgebraSubstitutionMode;
  storedVariables: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[];
  complexExactForm: ComplexExactForm;
};

type EvaluatedMatrix = {
  operand: LinearAlgebraScalarMatrixOperandV1;
  name?: string;
  substitutions: VariableSubstitutionSnapshot[];
  protectedSubstitutions: VariableSubstitutionSnapshot[];
};

export type SymbolicMatrixEditorDispatchResult =
  | {
      ok: true;
      request: ScalarMatrixRequestV1 & {
        matrixB: NonNullable<ScalarMatrixRequestV1['matrixB']>;
      };
    }
  | { ok: false; message: string };

function uniqueSnapshots(entries: readonly VariableSubstitutionSnapshot[]) {
  return [...new Map(entries.map((entry) => [entry.name, { ...entry }])).values()];
}

function inlineMatrix(
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'matrixLiteral' }>,
  input: SymbolicMatrixEditorInput,
): EvaluatedMatrix | { error: string } {
  const matrix = expression.exactValue.map((row) => row.map((value) => {
    const latex = value.denominator === 1
      ? `${value.numerator}`
      : `\\frac{${value.numerator}}{${value.denominator}}`;
    const parsed = parseLinearAlgebraScalarWire(latex, input.domain);
    if (!parsed.ok) throw new Error(parsed.error);
    return parsed.value;
  }));
  return {
    operand: { encoding: 'scalar-v1', source: matrix, resolved: matrix },
    substitutions: [],
    protectedSubstitutions: [],
  };
}

function evaluateMatrix(
  expression: LinearAlgebraEditorExpression,
  input: SymbolicMatrixEditorInput,
): EvaluatedMatrix | { error: string } {
  if (expression.kind === 'matrixLiteral') return inlineMatrix(expression, input);
  if (expression.kind !== 'named') {
    return { error: 'Use a named Matrix or an inline numeric Matrix for this symbolic operation.' };
  }
  const value = input.matrixValues.find((entry) => entry.name === expression.name);
  if (!value) return { error: `Matrix ${expression.name} is not defined in this workspace.` };
  const resolved = resolveMatrixNamedValueOperand(value, {
    domain: input.domain,
    mode: input.substitutionMode,
    storedVariables: input.storedVariables,
    protectedNames: input.matrixValues.map((entry) => entry.name),
  });
  if ('error' in resolved) return resolved;
  return { ...resolved, name: value.name };
}

function mergeSnapshots(entries: readonly EvaluatedMatrix[]) {
  return {
    substitutions: uniqueSnapshots(entries.flatMap((entry) => entry.substitutions)),
    protectedSubstitutions: uniqueSnapshots(
      entries.flatMap((entry) => entry.protectedSubstitutions),
    ),
  };
}

function fallbackOperand(input: SymbolicMatrixEditorInput) {
  const fallback = input.matrixValues[0];
  if (!fallback) return { error: 'Create a Matrix before running this operation.' } as const;
  return evaluateMatrix({ kind: 'named', name: fallback.name, displayLatex: fallback.name }, input);
}

function isRightOperand(value: EvaluatedMatrix, input: SymbolicMatrixEditorInput) {
  const right = input.matrixValues.find((entry) => entry.id === input.activeMatrixRightId)
    ?? input.matrixValues[1];
  return Boolean(value.name && right?.name === value.name);
}

function request(input: {
  editor: SymbolicMatrixEditorInput;
  inputLatex: string;
  operation: ScalarMatrixRequestV1['operation'];
  matrixA: EvaluatedMatrix;
  matrixB: EvaluatedMatrix;
  matrixPowerExponent?: number;
  matrixPowerExponentLatex?: string;
}) {
  const snapshots = mergeSnapshots([input.matrixA, input.matrixB]);
  return {
    operation: input.operation,
    operandEncoding: 'scalar-v1' as const,
    matrixA: input.matrixA.operand,
    matrixB: input.matrixB.operand,
    ...(input.matrixPowerExponent !== undefined
      ? { matrixPowerExponent: input.matrixPowerExponent }
      : {}),
    ...(input.matrixPowerExponentLatex
      ? { matrixPowerExponentLatex: input.matrixPowerExponentLatex }
      : {}),
    editorExpressionLatex: input.inputLatex,
    matrixOperandLatexA: input.matrixA.name ?? input.inputLatex,
    matrixOperandLatexB: input.matrixB.name ?? input.inputLatex,
    matrixValues: cloneMatrixNamedValues(input.editor.matrixValues),
    activeMatrixLeftId: input.editor.activeMatrixLeftId,
    activeMatrixRightId: input.editor.activeMatrixRightId,
    domain: input.editor.domain,
    substitutionMode: input.editor.substitutionMode,
    substitutionSnapshot: snapshots.substitutions,
    protectedSubstitutionSnapshot: snapshots.protectedSubstitutions,
    complexExactForm: input.editor.complexExactForm,
  };
}

export function dispatchSymbolicMatrixEditorLatex(
  input: SymbolicMatrixEditorInput,
): SymbolicMatrixEditorDispatchResult {
  const parsed = parseLinearAlgebraEditorLatex(input.latex, {
    mode: 'matrix',
    matrixNamedValues: input.matrixValues.map((value) => value.name),
    scalarDomain: input.domain,
  });
  if (!parsed.ok) return { ok: false, message: parsed.message };
  const expression = parsed.expression;
  const inputLatex = formatLinearAlgebraEditorExpression(expression);

  if (
    expression.kind === 'binary'
    && (expression.operator === 'add'
      || expression.operator === 'subtract'
      || expression.operator === 'multiply')
  ) {
    const left = evaluateMatrix(expression.left, input);
    if ('error' in left) return { ok: false, message: left.error };
    const right = evaluateMatrix(expression.right, input);
    if ('error' in right) return { ok: false, message: right.error };
    return {
      ok: true,
      request: request({
        editor: input,
        inputLatex,
        operation: expression.operator,
        matrixA: left,
        matrixB: right,
      }),
    };
  }

  if (expression.kind === 'matrixPower') {
    const value = evaluateMatrix(expression.matrix, input);
    if ('error' in value) return { ok: false, message: value.error };
    const fallback = fallbackOperand(input);
    if ('error' in fallback) return { ok: false, message: fallback.error };
    const useRight = isRightOperand(value, input);
    return {
      ok: true,
      request: request({
        editor: input,
        inputLatex,
        operation: useRight ? 'spectralPowerB' : 'spectralPowerA',
        matrixA: useRight ? fallback : value,
        matrixB: useRight ? value : fallback,
        matrixPowerExponent: expression.exponent,
        matrixPowerExponentLatex: expression.exponentLatex,
      }),
    };
  }

  if (expression.kind === 'unary') {
    const operations = {
      determinant: ['detA', 'detB'],
      transpose: ['transposeA', 'transposeB'],
      adjoint: ['adjointA', 'adjointB'],
      inverse: ['inverseA', 'inverseB'],
    } as const;
    const selected = operations[expression.operator as keyof typeof operations];
    if (!selected) {
      return { ok: false, message: 'This symbolic Matrix route belongs to the bounded systems or spectral milestone.' };
    }
    const value = evaluateMatrix(expression.value, input);
    if ('error' in value) return { ok: false, message: value.error };
    const fallback = fallbackOperand(input);
    if ('error' in fallback) return { ok: false, message: fallback.error };
    const useRight = isRightOperand(value, input);
    return {
      ok: true,
      request: request({
        editor: input,
        inputLatex,
        operation: selected[useRight ? 1 : 0],
        matrixA: useRight ? fallback : value,
        matrixB: useRight ? value : fallback,
      }),
    };
  }

  return {
    ok: false,
    message: 'Enter A+B, A-B, A×B, det(A), A^T, adjoint(A), A^†, A^*, A^{-1}, or A^n.',
  };
}
