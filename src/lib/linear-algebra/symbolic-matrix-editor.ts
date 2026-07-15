import type {
  ComplexExactForm,
  LinearAlgebraScalarDomain,
  LinearAlgebraScalarMatrixOperandV1,
  LinearAlgebraScalarVectorOperandV1,
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
import {
  parseLinearAlgebraScalarWire,
  resolveLinearAlgebraScalarWire,
} from './scalar-wire';

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

type EvaluatedVector = {
  operand: LinearAlgebraScalarVectorOperandV1;
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
  extraProtectedNames: readonly string[] = [],
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
    protectedNames: [
      ...input.matrixValues.map((entry) => entry.name),
      ...extraProtectedNames,
    ],
  });
  if ('error' in resolved) return resolved;
  return { ...resolved, name: value.name };
}

function evaluateVector(
  expression: LinearAlgebraEditorExpression,
  input: SymbolicMatrixEditorInput,
  protectedNames: readonly string[] = [],
): EvaluatedVector | { error: string } {
  let source;
  if (expression.kind === 'symbolicVectorLiteral') {
    source = expression.value;
  } else if (expression.kind === 'vectorLiteral') {
    source = expression.exactValue.map((value) => {
      const latex = value.denominator === 1
        ? `${value.numerator}`
        : `\\frac{${value.numerator}}{${value.denominator}}`;
      const parsed = parseLinearAlgebraScalarWire(latex, input.domain);
      if (!parsed.ok) throw new Error(parsed.error);
      return parsed.value;
    });
  } else {
    return { error: 'This symbolic Matrix route needs an inline right-hand-side vector.' };
  }
  const substitutions: VariableSubstitutionSnapshot[] = [];
  const protectedSubstitutions: VariableSubstitutionSnapshot[] = [];
  const resolved = [] as typeof source;
  for (const wire of source) {
    const value = resolveLinearAlgebraScalarWire({
      wire,
      domain: input.domain,
      mode: input.substitutionMode,
      storedVariables: input.storedVariables,
      protectedNames: [
        ...input.matrixValues.map((entry) => entry.name),
        ...protectedNames,
      ],
    });
    if ('error' in value) return value;
    resolved.push(value.resolved);
    substitutions.push(...value.substitutions);
    protectedSubstitutions.push(...value.protectedSubstitutions);
  }
  return {
    operand: { encoding: 'scalar-v1', source, resolved },
    substitutions: uniqueSnapshots(substitutions),
    protectedSubstitutions: uniqueSnapshots(protectedSubstitutions),
  };
}

function mergeSnapshots(entries: readonly {
  substitutions: VariableSubstitutionSnapshot[];
  protectedSubstitutions: VariableSubstitutionSnapshot[];
}[]) {
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
  systemRhs?: EvaluatedVector;
  coordinateVector?: EvaluatedVector;
  systemUnknowns?: string[];
  systemUnknownVectorName?: string;
}) {
  const snapshots = mergeSnapshots([
    input.matrixA,
    input.matrixB,
    ...(input.systemRhs ? [input.systemRhs] : []),
    ...(input.coordinateVector ? [input.coordinateVector] : []),
  ]);
  return {
    operation: input.operation,
    operandEncoding: 'scalar-v1' as const,
    matrixA: input.matrixA.operand,
    matrixB: input.matrixB.operand,
    ...(input.systemRhs ? { systemRhs: input.systemRhs.operand } : {}),
    ...(input.coordinateVector ? { coordinateVector: input.coordinateVector.operand } : {}),
    ...(input.systemUnknowns ? { systemUnknowns: input.systemUnknowns } : {}),
    ...(input.systemUnknownVectorName
      ? { systemUnknownVectorName: input.systemUnknownVectorName }
      : {}),
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

  if (expression.kind === 'linearSystem') {
    const protectedUnknowns = [
      ...(expression.unknowns ?? []),
      ...(expression.unknownVectorName ? [expression.unknownVectorName] : []),
    ];
    const coefficients = evaluateMatrix(expression.coefficients, input, protectedUnknowns);
    if ('error' in coefficients) return { ok: false, message: coefficients.error };
    const rhs = evaluateVector(expression.constants, input, protectedUnknowns);
    if ('error' in rhs) return { ok: false, message: rhs.error };
    if (coefficients.operand.resolved.length !== rhs.operand.resolved.length) {
      return { ok: false, message: 'The right-hand side needs one entry per system equation.' };
    }
    if (
      expression.unknowns
      && expression.unknowns.length !== coefficients.operand.resolved[0]?.length
    ) {
      return { ok: false, message: 'The ordered unknown list must match the Matrix column count.' };
    }
    return {
      ok: true,
      request: request({
        editor: input,
        inputLatex,
        operation: 'linearSystem',
        matrixA: coefficients,
        matrixB: coefficients,
        systemRhs: rhs,
        systemUnknowns: expression.unknowns,
        systemUnknownVectorName: expression.unknownVectorName,
      }),
    };
  }

  if (expression.kind === 'multiRhsSystem' || expression.kind === 'changeOfBasis') {
    const leftExpression = expression.kind === 'multiRhsSystem'
      ? expression.coefficients
      : expression.source;
    const rightExpression = expression.kind === 'multiRhsSystem'
      ? expression.constants
      : expression.target;
    const left = evaluateMatrix(leftExpression, input);
    if ('error' in left) return { ok: false, message: left.error };
    const right = evaluateMatrix(rightExpression, input);
    if ('error' in right) return { ok: false, message: right.error };
    return {
      ok: true,
      request: request({
        editor: input,
        inputLatex,
        operation: expression.kind === 'multiRhsSystem' ? 'multiRhsSolve' : 'changeBasis',
        matrixA: left,
        matrixB: right,
        ...(expression.kind === 'multiRhsSystem'
          ? { systemUnknownVectorName: 'X' }
          : {}),
      }),
    };
  }

  if (expression.kind === 'coordinates' || expression.kind === 'factorSolve') {
    const matrixExpression = expression.kind === 'coordinates'
      ? expression.basis
      : expression.matrix;
    const vectorExpression = expression.kind === 'coordinates'
      ? expression.vector
      : expression.vector;
    const value = evaluateMatrix(matrixExpression, input);
    if ('error' in value) return { ok: false, message: value.error };
    const vector = evaluateVector(vectorExpression, input);
    if ('error' in vector) return { ok: false, message: vector.error };
    const fallback = fallbackOperand(input);
    if ('error' in fallback) return { ok: false, message: fallback.error };
    const useRight = isRightOperand(value, input);
    const operation = expression.kind === 'coordinates'
      ? (useRight ? 'coordinatesB' : 'coordinatesA')
      : expression.method === 'lu'
        ? (useRight ? 'luSolveB' : 'luSolveA')
        : (useRight ? 'pluSolveB' : 'pluSolveA');
    return {
      ok: true,
      request: request({
        editor: input,
        inputLatex,
        operation,
        matrixA: useRight ? fallback : value,
        matrixB: useRight ? value : fallback,
        ...(expression.kind === 'coordinates'
          ? { coordinateVector: vector }
          : { systemRhs: vector }),
      }),
    };
  }

  if (expression.kind === 'unary') {
    const operations = {
      determinant: ['detA', 'detB'],
      transpose: ['transposeA', 'transposeB'],
      adjoint: ['adjointA', 'adjointB'],
      inverse: ['inverseA', 'inverseB'],
      rank: ['rankA', 'rankB'],
      rref: ['rrefA', 'rrefB'],
      nullSpace: ['nullSpaceA', 'nullSpaceB'],
      columnSpace: ['columnSpaceA', 'columnSpaceB'],
      basis: ['basisA', 'basisB'],
      lu: ['luA', 'luB'],
      plu: ['pluA', 'pluB'],
      invertibility: ['invertibilityA', 'invertibilityB'],
      profile: ['profileA', 'profileB'],
      characteristicPolynomial: ['charpolyA', 'charpolyB'],
      eigen: ['eigenA', 'eigenB'],
      diagonalization: ['diagonalizeA', 'diagonalizeB'],
    } as const;
    const selected = operations[expression.operator as keyof typeof operations];
    if (!selected) {
      return { ok: false, message: 'This symbolic Matrix route is not available for formal or Complex entries.' };
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
    message: 'Enter a supported symbolic Matrix arithmetic, system, space, factorization, or spectral expression.',
  };
}
