import type {
  ExactScalarWire,
  LinearAlgebraMatrixNamedValue,
  LinearAlgebraVectorNamedValue,
  MatrixOperation,
  VectorOperation,
} from '../../types/calculator';
import type { LinearAlgebraEditorExpression } from './editor-parser';
import {
  isScalarMatrixNamedValue,
  isScalarVectorNamedValue,
  matrixValueByName,
  numericMatrixFromNamedValue,
  numericVectorFromNamedValue,
  vectorValueByName,
} from './named-values';

export type NumericMatrixNamedValueProjection = {
  value: number[][];
  exactValue?: ExactScalarWire[][];
};

export type NumericVectorNamedValueProjection = {
  value: number[];
  exactValue?: ExactScalarWire[];
};

function cloneExact(value: ExactScalarWire): ExactScalarWire {
  return { numerator: value.numerator, denominator: value.denominator };
}

function exactNumber(value: number): ExactScalarWire | null {
  return Number.isSafeInteger(value) ? { numerator: value, denominator: 1 } : null;
}

export function projectMatrixNamedValueToNumeric(
  namedValue: LinearAlgebraMatrixNamedValue,
): NumericMatrixNamedValueProjection | null {
  const value = numericMatrixFromNamedValue(namedValue);
  if (!value) return null;

  const exactValue = isScalarMatrixNamedValue(namedValue)
    ? namedValue.value.map((row) => row.map((cell) =>
        cell.exactRational ? cloneExact(cell.exactRational) : null))
    : namedValue.value.map((row) => row.map(exactNumber));
  return {
    value,
    ...(exactValue.every((row) => row.every((cell) => cell !== null))
      ? { exactValue: exactValue as ExactScalarWire[][] }
      : {}),
  };
}

export function projectVectorNamedValueToNumeric(
  namedValue: LinearAlgebraVectorNamedValue,
): NumericVectorNamedValueProjection | null {
  const value = numericVectorFromNamedValue(namedValue);
  if (!value) return null;

  const exactValue = isScalarVectorNamedValue(namedValue)
    ? namedValue.value.map((cell) => cell.exactRational ? cloneExact(cell.exactRational) : null)
    : namedValue.value.map(exactNumber);
  return {
    value,
    ...(exactValue.every((cell) => cell !== null)
      ? { exactValue: exactValue as ExactScalarWire[] }
      : {}),
  };
}

function expressionChildren(expression: LinearAlgebraEditorExpression): LinearAlgebraEditorExpression[] {
  switch (expression.kind) {
    case 'unary':
    case 'negate':
      return [expression.value];
    case 'binary':
    case 'angle':
    case 'orthogonality':
      return [expression.left, expression.right];
    case 'scale':
      return [expression.scalar, expression.vector];
    case 'vectorDivide':
      return [expression.vector, expression.scalar];
    case 'gramSchmidt':
    case 'geometricMeasure':
    case 'vectorFamily':
      return expression.operands;
    case 'projection':
      return [expression.base, expression.target];
    case 'scalarTripleProduct':
      return [expression.first, expression.second, expression.third];
    case 'coordinates':
      return [expression.basis, expression.vector];
    case 'columnProjection':
    case 'leastSquares':
    case 'factorSolve':
      return [expression.matrix, expression.vector];
    case 'matrixPower':
      return [expression.matrix];
    case 'changeOfBasis':
      return [expression.source, expression.target];
    case 'multiRhsSystem':
    case 'linearSystem':
      return [expression.coefficients, expression.constants];
    case 'named':
    case 'matrixLiteral':
    case 'vectorLiteral':
    case 'symbolicVectorLiteral':
    case 'scalar':
    case 'symbolicScalar':
      return [];
  }
}

function expressionUsesOnlyNumericNamedValues(
  expression: LinearAlgebraEditorExpression,
  namedValueIsNumeric: (name: string) => boolean,
): boolean {
  if (expression.kind === 'named') return namedValueIsNumeric(expression.name);
  if (expression.kind === 'symbolicScalar' || expression.kind === 'symbolicVectorLiteral') {
    return false;
  }
  return expressionChildren(expression)
    .every((child) => expressionUsesOnlyNumericNamedValues(child, namedValueIsNumeric));
}

export function matrixExpressionUsesOnlyNumericOperands(
  expression: LinearAlgebraEditorExpression,
  values: readonly LinearAlgebraMatrixNamedValue[],
) {
  return expressionUsesOnlyNumericNamedValues(expression, (name) => {
    const value = matrixValueByName(values, name);
    return value ? projectMatrixNamedValueToNumeric(value) !== null : name === 'A' || name === 'B';
  });
}

export function vectorExpressionUsesOnlyNumericOperands(
  expression: LinearAlgebraEditorExpression,
  values: readonly LinearAlgebraVectorNamedValue[],
) {
  return expressionUsesOnlyNumericNamedValues(expression, (name) => {
    const value = vectorValueByName(values, name);
    return value ? projectVectorNamedValueToNumeric(value) !== null : name === 'u' || name === 'v';
  });
}

export function matrixActionOperandSides(operation: MatrixOperation): 'left' | 'right' | 'both' {
  if (operation === 'add' || operation === 'subtract' || operation === 'multiply' || operation === 'changeBasis') {
    return 'both';
  }
  if (operation.endsWith('A')) return 'left';
  if (operation.endsWith('B')) return 'right';
  return 'both';
}

export function vectorActionOperandSides(operation: VectorOperation): 'left' | 'right' | 'both' {
  if (operation === 'normA' || operation === 'unitA') return 'left';
  if (operation === 'normB' || operation === 'unitB') return 'right';
  return 'both';
}
