import type {
  AngleUnit,
  ComplexExactForm,
  LinearAlgebraScalarDomain,
  LinearAlgebraScalarVectorOperandV1,
  LinearAlgebraSubstitutionMode,
  ScalarVectorRequestV1,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
  VectorOperation,
} from '../../types/calculator';
import {
  formatLinearAlgebraEditorExpression,
} from './editor-expression-format';
import {
  parseLinearAlgebraEditorLatex,
  type LinearAlgebraEditorExpression,
  type LinearAlgebraVectorScalarExpression,
} from './editor-parser';
import {
  cloneVectorNamedValues,
  type LinearAlgebraVectorNamedValue,
} from './named-values';
import {
  resolveLinearAlgebraScalarWire,
  parseLinearAlgebraScalarWire,
} from './scalar-wire';
import { resolveVectorNamedValueOperand } from './scalar-operands';
import {
  addSymbolicVectors,
  crossSymbolicVectors,
  scaleSymbolicVector,
  subtractSymbolicVectors,
} from './symbolic-vector';
import { symbolicScalarDivide } from './symbolic-scalar-core';

type SymbolicEditorInput = {
  latex: string;
  vectorValues: readonly LinearAlgebraVectorNamedValue[];
  angleUnit: AngleUnit;
  domain: LinearAlgebraScalarDomain;
  substitutionMode: LinearAlgebraSubstitutionMode;
  storedVariables: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[];
  complexExactForm: ComplexExactForm;
};

type EvaluatedVector = {
  operand: LinearAlgebraScalarVectorOperandV1;
  substitutions: VariableSubstitutionSnapshot[];
  protectedSubstitutions: VariableSubstitutionSnapshot[];
};

export type SymbolicVectorEditorDispatchResult =
  | {
      ok: true;
      inputLatex: string;
      request: ScalarVectorRequestV1 & {
        vectorB: NonNullable<ScalarVectorRequestV1['vectorB']>;
      };
    }
  | { ok: false; message: string };

function uniqueSnapshots(entries: readonly VariableSubstitutionSnapshot[]) {
  return [...new Map(entries.map((entry) => [entry.name, { ...entry }])).values()];
}

function mergeEvaluations(entries: readonly EvaluatedVector[]) {
  return {
    substitutions: uniqueSnapshots(entries.flatMap((entry) => entry.substitutions)),
    protectedSubstitutions: uniqueSnapshots(
      entries.flatMap((entry) => entry.protectedSubstitutions),
    ),
  };
}

function scalarWireForExpression(
  expression: LinearAlgebraVectorScalarExpression,
  input: SymbolicEditorInput,
) {
  let sourceWire;
  if (expression.kind === 'symbolicScalar') {
    sourceWire = expression.scalarWire;
  } else {
    const parsed = parseLinearAlgebraScalarWire(expression.displayLatex, input.domain);
    if (!parsed.ok) return { error: parsed.error } as const;
    sourceWire = parsed.value;
  }
  const resolved = resolveLinearAlgebraScalarWire({
    wire: sourceWire,
    domain: input.domain,
    mode: input.substitutionMode,
    storedVariables: input.storedVariables,
    protectedNames: input.vectorValues.map((value) => value.name),
  });
  if ('error' in resolved) return resolved;
  return resolved;
}

function inlineVectorOperand(
  expression: Extract<LinearAlgebraEditorExpression, { kind: 'vectorLiteral' }>,
  input: SymbolicEditorInput,
): EvaluatedVector | { error: string } {
  const entries = expression.exactValue.map((value) => {
    const latex = value.denominator === 1
      ? `${value.numerator}`
      : `\\frac{${value.numerator}}{${value.denominator}}`;
    const parsed = parseLinearAlgebraScalarWire(latex, input.domain);
    if (!parsed.ok) throw new Error(parsed.error);
    return parsed.value;
  });
  return {
    operand: { encoding: 'scalar-v1', source: entries, resolved: entries },
    substitutions: [],
    protectedSubstitutions: [],
  };
}

function namedVectorOperand(
  name: string,
  input: SymbolicEditorInput,
): EvaluatedVector | { error: string } {
  const value = input.vectorValues.find((entry) => entry.name === name);
  if (!value) return { error: `Vector ${name} is not defined in this workspace.` };
  return resolveVectorNamedValueOperand(value, {
    domain: input.domain,
    mode: input.substitutionMode,
    storedVariables: input.storedVariables,
    protectedNames: input.vectorValues.map((entry) => entry.name),
  });
}

function combineOperands(
  left: EvaluatedVector,
  right: EvaluatedVector,
  operation: 'add' | 'subtract' | 'cross',
  input: SymbolicEditorInput,
): EvaluatedVector | { error: string } {
  if (left.operand.source.length !== right.operand.source.length) {
    return { error: 'Vector dimensions must match.' };
  }
  const combine = operation === 'add'
    ? addSymbolicVectors
    : operation === 'subtract'
      ? subtractSymbolicVectors
      : crossSymbolicVectors;
  const source = combine(left.operand.source, right.operand.source, input.domain);
  const resolved = combine(left.operand.resolved, right.operand.resolved, input.domain);
  if (!source || !resolved) return { error: 'Cross product requires 3D vectors.' };
  return {
    operand: { encoding: 'scalar-v1', source, resolved },
    ...mergeEvaluations([left, right]),
  };
}

function evaluateVectorExpression(
  expression: LinearAlgebraEditorExpression,
  input: SymbolicEditorInput,
): EvaluatedVector | { error: string } {
  if (expression.kind === 'named') return namedVectorOperand(expression.name, input);
  if (expression.kind === 'vectorLiteral') return inlineVectorOperand(expression, input);
  if (expression.kind === 'negate') {
    const value = evaluateVectorExpression(expression.value, input);
    if ('error' in value) return value;
    const negative = parseLinearAlgebraScalarWire('-1', input.domain);
    if (!negative.ok) return { error: negative.error };
    return {
      ...value,
      operand: {
        encoding: 'scalar-v1',
        source: scaleSymbolicVector(negative.value, value.operand.source, input.domain),
        resolved: scaleSymbolicVector(negative.value, value.operand.resolved, input.domain),
      },
    };
  }
  if (expression.kind === 'scale' || expression.kind === 'vectorDivide') {
    const value = evaluateVectorExpression(expression.vector, input);
    if ('error' in value) return value;
    const scalar = scalarWireForExpression(expression.scalar, input);
    if ('error' in scalar) return scalar;
    const one = parseLinearAlgebraScalarWire('1', input.domain);
    if (!one.ok) return { error: one.error };
    const sourceFactor = expression.kind === 'vectorDivide'
      ? symbolicScalarDivide(one.value, scalar.source, input.domain)
      : scalar.source;
    const resolvedFactor = expression.kind === 'vectorDivide'
      ? symbolicScalarDivide(one.value, scalar.resolved, input.domain)
      : scalar.resolved;
    return {
      operand: {
        encoding: 'scalar-v1',
        source: scaleSymbolicVector(sourceFactor, value.operand.source, input.domain),
        resolved: scaleSymbolicVector(resolvedFactor, value.operand.resolved, input.domain),
      },
      substitutions: uniqueSnapshots([...value.substitutions, ...scalar.substitutions]),
      protectedSubstitutions: uniqueSnapshots([
        ...value.protectedSubstitutions,
        ...scalar.protectedSubstitutions,
      ]),
    };
  }
  if (
    expression.kind === 'binary'
    && (expression.operator === 'dot' || expression.operator === 'cross')
  ) {
    const leftScalar = expression.left.kind === 'scalar' || expression.left.kind === 'symbolicScalar'
      ? expression.left
      : null;
    const rightScalar = expression.right.kind === 'scalar' || expression.right.kind === 'symbolicScalar'
      ? expression.right
      : null;
    if (leftScalar || rightScalar) {
      if (leftScalar && rightScalar) return { error: 'A scalar-only expression is not a Vector result.' };
      return evaluateVectorExpression({
        kind: 'scale',
        scalar: (leftScalar ?? rightScalar)!,
        vector: leftScalar ? expression.right : expression.left,
      }, input);
    }
  }
  if (
    expression.kind === 'binary'
    && (expression.operator === 'add'
      || expression.operator === 'subtract'
      || expression.operator === 'cross')
  ) {
    const left = evaluateVectorExpression(expression.left, input);
    if ('error' in left) return left;
    const right = evaluateVectorExpression(expression.right, input);
    if ('error' in right) return right;
    return combineOperands(left, right, expression.operator, input);
  }
  return { error: 'This symbolic editor expression does not produce a vector operand.' };
}

function zeroOperand(length: number, input: SymbolicEditorInput) {
  const zero = parseLinearAlgebraScalarWire('0', input.domain);
  if (!zero.ok) throw new Error(zero.error);
  const entries = Array.from({ length }, () => zero.value);
  return { encoding: 'scalar-v1' as const, source: entries, resolved: entries };
}

function operationRequest(
  operation: VectorOperation,
  operands: readonly EvaluatedVector[],
  input: SymbolicEditorInput,
  inputLatex: string,
) {
  const merged = mergeEvaluations(operands);
  const first = operands[0];
  const second = operands[1]?.operand ?? zeroOperand(first.operand.resolved.length, input);
  return {
    operation,
    operandEncoding: 'scalar-v1' as const,
    vectorA: first.operand,
    vectorB: second,
    ...(operands.length > 2 ? { vectorOperands: operands.map((entry) => entry.operand) } : {}),
    angleUnit: input.angleUnit,
    editorExpressionLatex: inputLatex,
    vectorOperandLatexA: inputLatex,
    vectorValues: cloneVectorNamedValues(input.vectorValues),
    domain: input.domain,
    substitutionMode: input.substitutionMode,
    substitutionSnapshot: merged.substitutions,
    protectedSubstitutionSnapshot: merged.protectedSubstitutions,
    complexExactForm: input.complexExactForm,
  };
}

function evaluatedOperands(
  expressions: readonly LinearAlgebraEditorExpression[],
  input: SymbolicEditorInput,
) {
  const operands: EvaluatedVector[] = [];
  for (const expression of expressions) {
    const value = evaluateVectorExpression(expression, input);
    if ('error' in value) return value;
    operands.push(value);
  }
  return { operands };
}

export function dispatchSymbolicVectorEditorLatex(
  input: SymbolicEditorInput,
): SymbolicVectorEditorDispatchResult {
  const parsed = parseLinearAlgebraEditorLatex(input.latex, {
    mode: 'vector',
    vectorNamedValues: input.vectorValues.map((value) => value.name),
    scalarDomain: input.domain,
  });
  if (!parsed.ok) return { ok: false, message: parsed.message };
  const expression = parsed.expression;
  const inputLatex = formatLinearAlgebraEditorExpression(expression);

  let operation: VectorOperation;
  let expressions: LinearAlgebraEditorExpression[];
  if (
    expression.kind === 'binary'
    && expression.operator !== 'multiply'
  ) {
    if (
      (expression.left.kind === 'scalar' || expression.left.kind === 'symbolicScalar')
      || (expression.right.kind === 'scalar' || expression.right.kind === 'symbolicScalar')
    ) {
      const value = evaluateVectorExpression(expression, input);
      if ('error' in value) return { ok: false, message: value.error };
      return {
        ok: true,
        inputLatex,
        request: operationRequest('linearCombination', [value], input, inputLatex),
      };
    }
    operation = expression.operator;
    expressions = [expression.left, expression.right];
  } else if (expression.kind === 'angle') {
    operation = 'angle';
    expressions = [expression.left, expression.right];
  } else if (expression.kind === 'projection') {
    operation = 'projectionUofV';
    expressions = [expression.base, expression.target];
  } else if (expression.kind === 'orthogonality') {
    operation = 'orthogonalCheck';
    expressions = [expression.left, expression.right];
  } else if (expression.kind === 'gramSchmidt') {
    operation = 'gramSchmidtUV';
    expressions = expression.operands;
  } else if (expression.kind === 'geometricMeasure') {
    operation = expression.operator;
    expressions = expression.operands;
  } else if (expression.kind === 'vectorFamily') {
    operation = expression.operator;
    expressions = expression.operands;
  } else if (expression.kind === 'unary' && expression.operator === 'norm') {
    operation = 'normA';
    expressions = [expression.value];
  } else if (expression.kind === 'unary' && expression.operator === 'unit') {
    operation = 'unitA';
    expressions = [expression.value];
  } else {
    const value = evaluateVectorExpression(expression, input);
    if ('error' in value) return { ok: false, message: value.error };
    operation = 'linearCombination';
    expressions = [];
    const request = operationRequest(operation, [value], input, inputLatex);
    return { ok: true, inputLatex, request };
  }

  const evaluated = evaluatedOperands(expressions, input);
  if ('error' in evaluated) return { ok: false, message: evaluated.error };
  if (evaluated.operands.length === 0) {
    return { ok: false, message: 'Enter at least one Vector operand.' };
  }
  return {
    ok: true,
    inputLatex,
    request: operationRequest(operation, evaluated.operands, input, inputLatex),
  };
}
