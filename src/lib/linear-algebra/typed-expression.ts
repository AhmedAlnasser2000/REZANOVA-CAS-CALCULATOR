import type {
  ExactScalarWire,
  LinearAlgebraMatrixNamedValue,
  LinearAlgebraScalarDomain,
  LinearAlgebraScalarWireV1,
  LinearAlgebraSubstitutionMode,
  LinearAlgebraVectorNamedValue,
  MatrixResponse,
  VectorResponse,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';
import { determinantExactMatrix, scalar, validateExactMatrix } from './exact-matrix-core';
import { exactWireToLatex } from './editor-matrix-literals';
import { parseLinearAlgebraEditorLatex, type LinearAlgebraEditorExpression } from './editor-parser';
import { matrixEditingDimensionError, vectorEditingDimensionError } from './dimension-contract';
import { canonicalLeafEvidence, attachLinearAlgebraCanonicalEvidence } from './canonical-evidence';
import { isScalarMatrixNamedValue, isScalarVectorNamedValue } from './named-values';
import { parseLinearAlgebraScalarWire, resolveLinearAlgebraScalarWire } from './scalar-wire';
import {
  symbolicScalarAdd,
  symbolicScalarConjugate,
  symbolicScalarDivide,
  symbolicScalarFromMathJson,
  symbolicScalarMultiply,
  symbolicScalarNegate,
  symbolicScalarSqrt,
  symbolicScalarSubtract,
  symbolicScalarZeroStatus,
} from './symbolic-scalar-core';
import {
  addSymbolicMatrices,
  adjointSymbolicMatrix,
  determinantSymbolicMatrix,
  multiplySymbolicMatrices,
  subtractSymbolicMatrices,
  symbolicMatrixLatex,
  symbolicMatrixMathJson,
  transposeSymbolicMatrix,
} from './symbolic-matrix';

type Scalar = LinearAlgebraScalarWireV1;
type Value =
  | { kind: 'scalar'; value: Scalar }
  | { kind: 'matrix'; value: Scalar[][] }
  | { kind: 'vector'; value: Scalar[] };

export type TypedLinearAlgebraInput = {
  latex: string;
  mode: 'matrix' | 'vector' | 'calculate';
  domain?: LinearAlgebraScalarDomain;
  substitutionMode?: LinearAlgebraSubstitutionMode;
  storedVariables?: readonly VariableSubstitutionSnapshot[];
  matrixValues?: readonly LinearAlgebraMatrixNamedValue[];
  vectorValues?: readonly LinearAlgebraVectorNamedValue[];
  matrixA?: number[][];
  matrixB?: number[][];
  vectorA?: number[];
  vectorB?: number[];
};

export type TypedLinearAlgebraResult =
  | { ok: true; kind: Value['kind']; latex: string; mathJson: unknown }
  | { ok: false; message: string };

class TypedExpressionStop extends Error {}

function stop(message: string): never { throw new TypedExpressionStop(message); }

function fromMathJson(node: unknown, domain: LinearAlgebraScalarDomain): Scalar {
  const result = symbolicScalarFromMathJson(node, domain);
  if (!result.ok) return stop(result.error);
  return result.value;
}

function fromLatex(latex: string, domain: LinearAlgebraScalarDomain): Scalar {
  const result = parseLinearAlgebraScalarWire(latex, domain);
  if (!result.ok) return stop(result.error);
  return result.value;
}

function fromExact(value: ExactScalarWire, domain: LinearAlgebraScalarDomain): Scalar {
  return fromLatex(exactWireToLatex(value), domain);
}

function fromNumber(value: number, domain: LinearAlgebraScalarDomain): Scalar {
  if (!Number.isFinite(value)) return stop('Matrix and Vector entries must be finite.');
  return fromLatex(String(value), domain);
}

function resolvedScalar(value: Scalar, input: TypedLinearAlgebraInput, domain: LinearAlgebraScalarDomain): Scalar {
  if (input.substitutionMode !== 'use-stored-values' || !input.storedVariables?.length) return value;
  const resolved = resolveLinearAlgebraScalarWire({
    wire: value,
    domain,
    mode: 'use-stored-values',
    storedVariables: input.storedVariables,
    protectedNames: [
      ...(input.matrixValues?.map((entry) => entry.name) ?? []),
      ...(input.vectorValues?.map((entry) => entry.name) ?? []),
    ],
  });
  if ('error' in resolved) return stop(resolved.error);
  return resolved.resolved;
}

function matrixValue(value: Scalar[][]): Value {
  const message = matrixEditingDimensionError(value);
  if (message) return stop(message);
  if (!value.length || !value[0]?.length || value.some((row) => row.length !== value[0].length)) {
    return stop('Matrix rows must have a consistent nonzero length.');
  }
  const exact = value.map((row) => row.map((cell) => cell.exactRational));
  if (exact.every((row) => row.every(Boolean))) {
    const checked = validateExactMatrix(exact.map((row) => row.map((cell) => scalar(cell!.numerator, cell!.denominator))), {
      maxDimension: 8,
    });
    if (checked.kind === 'stop') return stop('This exact Matrix expression exceeds the scalar-growth or dimension limit.');
  }
  return { kind: 'matrix', value };
}

function vectorValue(value: Scalar[]): Value {
  const message = vectorEditingDimensionError(value);
  if (message) return stop(message);
  if (!value.length) return stop('A Vector needs at least one entry.');
  const exact = value.map((cell) => cell.exactRational);
  if (exact.every(Boolean)) {
    const checked = validateExactMatrix([exact.map((cell) => scalar(cell!.numerator, cell!.denominator))], {
      maxDimension: 8,
    });
    if (checked.kind === 'stop') return stop('This exact Vector expression exceeds the scalar-growth or dimension limit.');
  }
  return { kind: 'vector', value };
}

function named(name: string, input: TypedLinearAlgebraInput, domain: LinearAlgebraScalarDomain): Value {
  const matrix = input.matrixValues?.find((entry) => entry.name === name);
  if (matrix) return matrixValue(isScalarMatrixNamedValue(matrix)
    ? matrix.value.map((row) => row.map((cell) => resolvedScalar(cell, input, domain)))
    : matrix.value.map((row) => row.map((cell) => fromNumber(cell, domain))));
  const vector = input.vectorValues?.find((entry) => entry.name === name);
  if (vector) return vectorValue(isScalarVectorNamedValue(vector)
    ? vector.value.map((cell) => resolvedScalar(cell, input, domain))
    : vector.value.map((cell) => fromNumber(cell, domain)));
  if (name === 'A' && input.matrixA) return matrixValue(input.matrixA.map((row) => row.map((cell) => fromNumber(cell, domain))));
  if (name === 'B' && input.matrixB) return matrixValue(input.matrixB.map((row) => row.map((cell) => fromNumber(cell, domain))));
  if (name === 'u' && input.vectorA) return vectorValue(input.vectorA.map((cell) => fromNumber(cell, domain)));
  if (name === 'v' && input.vectorB) return vectorValue(input.vectorB.map((cell) => fromNumber(cell, domain)));
  return stop(`${name} is not defined in this workspace.`);
}

function requireNonzero(value: Scalar): void {
  const status = symbolicScalarZeroStatus(value);
  if (status !== 'nonzero') {
    stop(status === 'zero' ? 'Division by zero is undefined.' : 'Division requires a provably nonzero scalar.');
  }
}

function dot(left: Scalar[], right: Scalar[], domain: LinearAlgebraScalarDomain): Scalar {
  if (left.length !== right.length) return stop('Vector dimensions must match.');
  return left.reduce((sum, cell, index) => symbolicScalarAdd(
    sum,
    symbolicScalarMultiply(symbolicScalarConjugate(cell, domain), right[index], domain),
    domain,
  ), fromMathJson(0, domain));
}

function binary(
  operator: 'add' | 'subtract' | 'multiply' | 'divide' | 'dot' | 'cross',
  left: Value,
  right: Value,
  domain: LinearAlgebraScalarDomain,
): Value {
  if (operator === 'divide') {
    if (right.kind !== 'scalar') return stop('Matrix/Vector division needs a scalar denominator.');
    requireNonzero(right.value);
    return left.kind === 'scalar'
      ? { kind: 'scalar', value: symbolicScalarDivide(left.value, right.value, domain) }
      : left.kind === 'matrix'
        ? matrixValue(left.value.map((row) => row.map((cell) => symbolicScalarDivide(cell, right.value, domain))))
        : vectorValue(left.value.map((cell) => symbolicScalarDivide(cell, right.value, domain)));
  }
  if (left.kind === 'scalar' && right.kind === 'scalar') {
    if (operator === 'add') return { kind: 'scalar', value: symbolicScalarAdd(left.value, right.value, domain) };
    if (operator === 'subtract') return { kind: 'scalar', value: symbolicScalarSubtract(left.value, right.value, domain) };
    if (operator === 'multiply' || operator === 'dot' || operator === 'cross') {
      return { kind: 'scalar', value: symbolicScalarMultiply(left.value, right.value, domain) };
    }
  }
  if (left.kind === 'scalar' && (right.kind === 'matrix' || right.kind === 'vector')) {
    if (operator !== 'multiply' && operator !== 'dot' && operator !== 'cross') return stop('A scalar cannot be added to a Matrix or Vector.');
    return right.kind === 'matrix'
      ? matrixValue(right.value.map((row) => row.map((cell) => symbolicScalarMultiply(left.value, cell, domain))))
      : vectorValue(right.value.map((cell) => symbolicScalarMultiply(left.value, cell, domain)));
  }
  if (right.kind === 'scalar' && (left.kind === 'matrix' || left.kind === 'vector')) {
    if (operator !== 'multiply' && operator !== 'dot' && operator !== 'cross') return stop('A scalar cannot be added to a Matrix or Vector.');
    return left.kind === 'matrix'
      ? matrixValue(left.value.map((row) => row.map((cell) => symbolicScalarMultiply(cell, right.value, domain))))
      : vectorValue(left.value.map((cell) => symbolicScalarMultiply(cell, right.value, domain)));
  }
  if (left.kind === 'matrix' && right.kind === 'matrix') {
    const result = operator === 'add'
      ? addSymbolicMatrices(left.value, right.value, domain)
      : operator === 'subtract'
        ? subtractSymbolicMatrices(left.value, right.value, domain)
        : operator === 'multiply' || operator === 'dot'
          ? multiplySymbolicMatrices(left.value, right.value, domain)
          : null;
    if (!result) return stop(operator === 'add' || operator === 'subtract'
      ? 'Addition and subtraction require matching Matrix dimensions.'
      : 'Matrix multiplication requires left columns to match right rows.');
    return matrixValue(result);
  }
  if (left.kind === 'matrix' && right.kind === 'vector' && (operator === 'multiply' || operator === 'dot')) {
    if (left.value[0].length !== right.value.length) return stop('Matrix columns must match Vector length.');
    return vectorValue(left.value.map((row) => row.reduce((sum, cell, index) => symbolicScalarAdd(
      sum, symbolicScalarMultiply(cell, right.value[index], domain), domain,
    ), fromMathJson(0, domain))));
  }
  if (left.kind === 'vector' && right.kind === 'vector') {
    if (left.value.length !== right.value.length) return stop('Vector dimensions must match.');
    if (operator === 'add' || operator === 'subtract') return vectorValue(left.value.map((cell, index) =>
      operator === 'add'
        ? symbolicScalarAdd(cell, right.value[index], domain)
        : symbolicScalarSubtract(cell, right.value[index], domain)));
    if (operator === 'dot') return { kind: 'scalar', value: dot(left.value, right.value, domain) };
    if (operator === 'cross') {
      if (left.value.length !== 3) return stop('Cross product requires 3D vectors.');
      const [a, b, c] = left.value;
      const [d, e, f] = right.value;
      return vectorValue([
        symbolicScalarSubtract(symbolicScalarMultiply(b, f, domain), symbolicScalarMultiply(c, e, domain), domain),
        symbolicScalarSubtract(symbolicScalarMultiply(c, d, domain), symbolicScalarMultiply(a, f, domain), domain),
        symbolicScalarSubtract(symbolicScalarMultiply(a, e, domain), symbolicScalarMultiply(b, d, domain), domain),
      ]);
    }
  }
  return stop(`${left.kind} ${operator} ${right.kind} is not a supported Matrix/Vector operation.`);
}

function evaluate(
  expression: LinearAlgebraEditorExpression,
  input: TypedLinearAlgebraInput,
  domain: LinearAlgebraScalarDomain,
  depth = 0,
): Value {
  if (depth > 48) return stop('This Matrix/Vector expression is too deeply nested.');
  const child = (value: LinearAlgebraEditorExpression) => evaluate(value, input, domain, depth + 1);
  switch (expression.kind) {
    case 'scalar': return { kind: 'scalar', value: fromExact(expression.exactValue, domain) };
    case 'symbolicScalar': return { kind: 'scalar', value: resolvedScalar(expression.scalarWire, input, domain) };
    case 'matrixLiteral': return matrixValue(expression.exactValue.map((row) => row.map((cell) => fromExact(cell, domain))));
    case 'symbolicMatrixLiteral': return matrixValue(expression.value.map((row) => row.map((cell) => resolvedScalar(cell, input, domain))));
    case 'vectorLiteral': return vectorValue(expression.exactValue.map((cell) => fromExact(cell, domain)));
    case 'symbolicVectorLiteral': return vectorValue(expression.value.map((cell) => resolvedScalar(cell, input, domain)));
    case 'named': return named(expression.name, input, domain);
    case 'binary': return binary(expression.operator, child(expression.left), child(expression.right), domain);
    case 'negate': {
      const value = child(expression.value);
      return value.kind === 'scalar'
        ? { kind: 'scalar', value: symbolicScalarNegate(value.value, domain) }
        : value.kind === 'matrix'
          ? matrixValue(value.value.map((row) => row.map((cell) => symbolicScalarNegate(cell, domain))))
          : vectorValue(value.value.map((cell) => symbolicScalarNegate(cell, domain)));
    }
    case 'scale': return binary('multiply', child(expression.scalar), child(expression.vector), domain);
    case 'vectorDivide': {
      const value = child(expression.vector);
      const divisor = child(expression.scalar);
      if (divisor.kind !== 'scalar' || value.kind === 'scalar') return stop('Matrix/Vector division needs a scalar denominator.');
      requireNonzero(divisor.value);
      return value.kind === 'matrix'
        ? matrixValue(value.value.map((row) => row.map((cell) => symbolicScalarDivide(cell, divisor.value, domain))))
        : vectorValue(value.value.map((cell) => symbolicScalarDivide(cell, divisor.value, domain)));
    }
    case 'unary': {
      const value = child(expression.value);
      if (expression.operator === 'determinant') {
        if (value.kind !== 'matrix') return stop('Determinant requires a square Matrix.');
        if (value.value.length !== value.value[0].length) return stop('Determinant requires a square Matrix.');
        const exact = value.value.map((row) => row.map((cell) => cell.exactRational));
        if (exact.every((row) => row.every(Boolean))) {
          const result = determinantExactMatrix(exact.map((row) => row.map((cell) => scalar(cell!.numerator, cell!.denominator))));
          if (result.kind === 'stop') return stop(result.reason === 'dimension-limit'
            ? 'Exact determinants support up to 6 by 6 matrices.'
            : `Exact determinant stopped: ${result.reason}.`);
          return { kind: 'scalar', value: fromExact(result.determinant, domain) };
        }
        if (value.value.length > 4) return stop('Symbolic determinants support up to 4 by 4 matrices.');
        return { kind: 'scalar', value: determinantSymbolicMatrix(value.value, domain) };
      }
      if (expression.operator === 'transpose' || expression.operator === 'adjoint') {
        if (value.kind !== 'matrix') return stop('Transpose and adjoint require a Matrix.');
        return matrixValue(expression.operator === 'transpose'
          ? transposeSymbolicMatrix(value.value)
          : adjointSymbolicMatrix(value.value, domain));
      }
      if (expression.operator === 'norm' || expression.operator === 'unit') {
        if (value.kind !== 'vector') return stop('Norm and unit require a Vector.');
        const squared = dot(value.value, value.value, domain);
        if (expression.operator === 'norm') return { kind: 'scalar', value: symbolicScalarSqrt(squared, domain) };
        requireNonzero(squared);
        const length = symbolicScalarSqrt(squared, domain);
        return vectorValue(value.value.map((cell) => symbolicScalarDivide(cell, length, domain)));
      }
      return stop(`${expression.operator} is available as a standalone operation, not inside a combined expression.`);
    }
    default: return stop('This operation is available standalone but cannot be combined in an expression.');
  }
}

export function evaluateTypedLinearAlgebraExpression(input: TypedLinearAlgebraInput): TypedLinearAlgebraResult {
  const domain = input.domain ?? 'real';
  const parsed = parseLinearAlgebraEditorLatex(input.latex, {
    mode: input.mode === 'vector' ? 'vector' : 'matrix',
    scalarDomain: domain,
    allowDefaultNames: input.mode !== 'calculate',
    matrixNamedValues: input.mode === 'calculate' ? [] : input.matrixValues?.map((entry) => entry.name),
    vectorNamedValues: input.mode === 'calculate' ? [] : input.vectorValues?.map((entry) => entry.name),
  });
  if (!parsed.ok) return { ok: false, message: parsed.message };
  try {
    const value = evaluate(parsed.expression, input, domain);
    return value.kind === 'scalar'
      ? { ok: true, kind: 'scalar', latex: value.value.canonicalLatex, mathJson: value.value.mathJson }
      : value.kind === 'matrix'
        ? { ok: true, kind: 'matrix', latex: symbolicMatrixLatex(value.value), mathJson: symbolicMatrixMathJson(value.value) }
        : { ok: true, kind: 'vector', latex: symbolicMatrixLatex(value.value.map((cell) => [cell])), mathJson: symbolicMatrixMathJson(value.value.map((cell) => [cell])) };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Matrix/Vector expression could not be evaluated.' };
  }
}

export function typedLinearAlgebraResponse(
  input: TypedLinearAlgebraInput,
): MatrixResponse | VectorResponse {
  const result = evaluateTypedLinearAlgebraExpression(input);
  if (!result.ok) return { warnings: [], error: result.message };
  const response = { resultLatex: result.latex, warnings: [] };
  return attachLinearAlgebraCanonicalEvidence(response, {
    primary: canonicalLeafEvidence(result.latex, result.mathJson, `${input.mode}.typed-expression`),
  });
}
