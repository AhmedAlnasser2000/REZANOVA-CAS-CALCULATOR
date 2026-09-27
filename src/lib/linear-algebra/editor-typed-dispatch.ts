import { parseLinearAlgebraEditorLatex, type LinearAlgebraEditorExpression } from './editor-parser';
import { formatLinearAlgebraEditorExpression } from './editor-expression-format';
import { matrixNamedValueNames, vectorNamedValueNames } from './named-values';
import type {
  MatrixEditorDispatchInput,
  MatrixEditorDispatchResult,
  VectorEditorDispatchInput,
  VectorEditorDispatchResult,
} from './editor-dispatch';

function containsTypedCombination(expression: LinearAlgebraEditorExpression, mode: 'matrix' | 'vector'): boolean {
  if (expression.kind === 'symbolicMatrixLiteral') return true;
  if (expression.kind === 'scale' || expression.kind === 'vectorDivide') {
    return mode === 'matrix' || containsTypedCombination(expression.vector, mode);
  }
  if (expression.kind === 'binary') {
    const scalarChild = (value: LinearAlgebraEditorExpression) =>
      value.kind === 'scalar' || value.kind === 'symbolicScalar'
      || (value.kind === 'unary' && (value.operator === 'determinant' || value.operator === 'norm'))
      || (value.kind === 'binary' && value.operator === 'dot');
    const vectorChild = (value: LinearAlgebraEditorExpression) =>
      value.kind === 'vectorLiteral' || value.kind === 'symbolicVectorLiteral'
      || (value.kind === 'named' && /^[a-z]/u.test(value.name));
    return scalarChild(expression.left) || scalarChild(expression.right)
      || (mode === 'matrix' && (vectorChild(expression.left) || vectorChild(expression.right)))
      || containsTypedCombination(expression.left, mode)
      || containsTypedCombination(expression.right, mode);
  }
  if (expression.kind === 'unary') {
    if (mode === 'vector' && expression.operator === 'unit'
      && (expression.value.kind === 'binary' || expression.value.kind === 'scale'
      || expression.value.kind === 'vectorDivide' || expression.value.kind === 'negate')) return true;
    return containsTypedCombination(expression.value, mode);
  }
  if (expression.kind === 'negate') return containsTypedCombination(expression.value, mode);
  return false;
}

export function dispatchTypedMatrixExpression(input: MatrixEditorDispatchInput): MatrixEditorDispatchResult | null {
  const typed = parseLinearAlgebraEditorLatex(input.latex, {
    mode: 'matrix',
    matrixNamedValues: matrixNamedValueNames(input.matrixValues),
    vectorNamedValues: ['u', 'v'],
    scalarDomain: input.domain ?? 'real',
  });
  if (!typed.ok || !(
    typed.expression.kind === 'matrixLiteral'
    || typed.expression.kind === 'symbolicMatrixLiteral'
    || typed.expression.kind === 'named'
    || containsTypedCombination(typed.expression, 'matrix')
  )) return null;
  return { ok: true, request: {
    operation: 'editorExpression',
    matrixA: input.matrixA.map((row) => [...row]),
    matrixB: input.matrixB.map((row) => [...row]),
    matrixValues: [...(input.matrixValues ?? [])],
    domain: input.domain,
    substitutionMode: input.substitutionMode,
    expressionStoredVariables: input.storedVariables?.map(({ name, valueLatex, numericValue }) => ({ name, valueLatex, numericValue })),
    editorExpressionLatex: formatLinearAlgebraEditorExpression(typed.expression),
  } };
}

export function dispatchTypedVectorExpression(input: VectorEditorDispatchInput): VectorEditorDispatchResult | null {
  const typed = parseLinearAlgebraEditorLatex(input.latex, {
    mode: 'vector',
    vectorNamedValues: vectorNamedValueNames(input.vectorValues),
    scalarDomain: input.domain ?? 'real',
  });
  if (!typed.ok || !(
    typed.expression.kind === 'vectorLiteral'
    || typed.expression.kind === 'symbolicVectorLiteral'
    || typed.expression.kind === 'named'
    || containsTypedCombination(typed.expression, 'vector')
  )) return null;
  return { ok: true, request: {
    operation: 'editorExpression',
    vectorA: [...input.vectorA],
    vectorB: [...input.vectorB],
    vectorValues: [...(input.vectorValues ?? [])],
    angleUnit: input.angleUnit,
    domain: input.domain,
    substitutionMode: input.substitutionMode,
    expressionStoredVariables: input.storedVariables?.map(({ name, valueLatex, numericValue }) => ({ name, valueLatex, numericValue })),
    editorExpressionLatex: formatLinearAlgebraEditorExpression(typed.expression),
  } };
}
