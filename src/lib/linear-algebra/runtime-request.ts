import { matrixOperationLabel, type RunMatrixModeRequest } from '../modes/matrix';
import { vectorOperationLabel, type RunVectorModeRequest } from '../modes/vector';
import type { MatrixOperation, VectorOperation } from '../../types/calculator';
import {
  cloneLinearAlgebraMatrix,
  cloneLinearAlgebraVector,
  DEFAULT_MATRIX_LEFT_ID,
  DEFAULT_VECTOR_LEFT_ID,
  matrixValueById,
  vectorValueById,
  type LinearAlgebraMatrixNamedValue,
  type LinearAlgebraVectorNamedValue,
} from './named-values';

export {
  dispatchMatrixEditorLatex,
  dispatchVectorEditorLatex,
} from './editor-dispatch';
export type { LinearAlgebraEquationHandoff } from './equation-handoff';
export {
  cloneLinearAlgebraMatrix,
  cloneLinearAlgebraVector,
  cloneMatrixNamedValues,
  cloneVectorNamedValues,
  DEFAULT_MATRIX_LEFT_ID,
  DEFAULT_MATRIX_RIGHT_ID,
  DEFAULT_VECTOR_LEFT_ID,
  DEFAULT_VECTOR_RIGHT_ID,
  isMatrixNamedValueName,
  isValidMatrixValueName,
  isValidVectorValueName,
  isVectorNamedValueName,
  matrixNamedValueNames,
  matrixValueById,
  matrixValueByName,
  nextMatrixValueName,
  nextVectorValueName,
  normalizeMatrixValueName,
  normalizeVectorValueName,
  vectorNamedValueNames,
  vectorValueById,
  vectorValueByName,
} from './named-values';
export type {
  LinearAlgebraMatrixNamedValue,
  LinearAlgebraVectorNamedValue,
} from './named-values';
export type { RunMatrixModeRequest } from '../modes/matrix';
export type { RunVectorModeRequest } from '../modes/vector';
export {
  clampLinearAlgebraEditingDimension,
  LINEAR_ALGEBRA_MATRIX_MAX_COLUMNS,
  LINEAR_ALGEBRA_MATRIX_MAX_ROWS,
  LINEAR_ALGEBRA_MIN_EDITING_DIMENSION,
  LINEAR_ALGEBRA_VECTOR_MAX_LENGTH,
} from './dimension-contract';

const FALLBACK_MATRIX_VALUE: LinearAlgebraMatrixNamedValue = {
  id: DEFAULT_MATRIX_LEFT_ID,
  name: 'A',
  value: [[1]],
};

const FALLBACK_VECTOR_VALUE: LinearAlgebraVectorNamedValue = {
  id: DEFAULT_VECTOR_LEFT_ID,
  name: 'u',
  value: [1],
};

export function activeMatrixValuePair(
  values: readonly LinearAlgebraMatrixNamedValue[],
  leftId: string,
  rightId: string,
) {
  const fallbackLeft = values[0] ?? FALLBACK_MATRIX_VALUE;
  const fallbackRight = values[1] ?? fallbackLeft;
  return {
    left: matrixValueById(values, leftId) ?? fallbackLeft,
    right: matrixValueById(values, rightId) ?? fallbackRight,
  };
}

export function activeVectorValuePair(
  values: readonly LinearAlgebraVectorNamedValue[],
  leftId: string,
  rightId: string,
) {
  const fallbackLeft = values[0] ?? FALLBACK_VECTOR_VALUE;
  const fallbackRight = values[1] ?? fallbackLeft;
  return {
    left: vectorValueById(values, leftId) ?? fallbackLeft,
    right: vectorValueById(values, rightId) ?? fallbackRight,
  };
}

export function matrixActionLabel(operation: MatrixOperation, leftName: string, rightName: string) {
  switch (operation) {
    case 'add':
      return `${leftName}+${rightName}`;
    case 'subtract':
      return `${leftName}-${rightName}`;
    case 'multiply':
      return `${leftName}×${rightName}`;
    case 'transposeA':
      return `${leftName}ᵀ`;
    case 'transposeB':
      return `${rightName}ᵀ`;
    case 'detA':
      return `det(${leftName})`;
    case 'detB':
      return `det(${rightName})`;
    case 'inverseA':
      return `${leftName}⁻¹`;
    case 'inverseB':
      return `${rightName}⁻¹`;
    case 'definiteA':
      return `definite(${leftName})`;
    case 'definiteB':
      return `definite(${rightName})`;
    default:
      return matrixOperationLabel(operation);
  }
}

export function vectorActionLabel(operation: VectorOperation, leftName: string, rightName: string) {
  switch (operation) {
    case 'dot':
      return `${leftName}·${rightName}`;
    case 'cross':
      return `${leftName}×${rightName}`;
    case 'normA':
      return `‖${leftName}‖`;
    case 'normB':
      return `‖${rightName}‖`;
    case 'angle':
      return `∠(${leftName},${rightName})`;
    case 'add':
      return `${leftName}+${rightName}`;
    case 'subtract':
      return `${leftName}-${rightName}`;
    case 'parallel':
      return `parallel(${leftName},${rightName})`;
    case 'distance':
      return `distance(${leftName},${rightName})`;
    case 'parallelogramArea':
      return `parallelogramArea(${leftName},${rightName})`;
    case 'triangleArea':
      return `triangleArea(${leftName},${rightName})`;
    default:
      return vectorOperationLabel(operation);
  }
}

export function buildActiveMatrixRuntimeRequest(
  operation: MatrixOperation,
  values: readonly LinearAlgebraMatrixNamedValue[],
  leftId: string,
  rightId: string,
): { inputLatex: string; request: RunMatrixModeRequest } {
  const activeValues = activeMatrixValuePair(values, leftId, rightId);
  const inputLatex = matrixActionLabel(operation, activeValues.left.name, activeValues.right.name);
  return {
    inputLatex,
    request: {
      operation,
      matrixA: cloneLinearAlgebraMatrix(activeValues.left.value),
      matrixB: cloneLinearAlgebraMatrix(activeValues.right.value),
      editorExpressionLatex: inputLatex,
      matrixOperandLatexA: activeValues.left.name,
      matrixOperandLatexB: activeValues.right.name,
    },
  };
}

export function buildActiveVectorRuntimeRequest(
  operation: VectorOperation,
  values: readonly LinearAlgebraVectorNamedValue[],
  leftId: string,
  rightId: string,
  angleUnit: RunVectorModeRequest['angleUnit'],
): { inputLatex: string; request: RunVectorModeRequest } {
  const activeValues = activeVectorValuePair(values, leftId, rightId);
  const inputLatex = vectorActionLabel(operation, activeValues.left.name, activeValues.right.name);
  return {
    inputLatex,
    request: {
      operation,
      vectorA: cloneLinearAlgebraVector(activeValues.left.value),
      vectorB: cloneLinearAlgebraVector(activeValues.right.value),
      angleUnit,
      editorExpressionLatex: inputLatex,
      vectorOperandLatexA: activeValues.left.name,
      vectorOperandLatexB: activeValues.right.name,
    },
  };
}
