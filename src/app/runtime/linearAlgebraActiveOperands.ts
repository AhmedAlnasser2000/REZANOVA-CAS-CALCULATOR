import { matrixOperationLabel, type RunMatrixModeRequest } from '../../lib/modes/matrix';
import { vectorOperationLabel, type RunVectorModeRequest } from '../../lib/modes/vector';
import type { SoftAction } from '../../lib/navigation/menu';
import {
  cloneLinearAlgebraMatrix,
  cloneLinearAlgebraVector,
  DEFAULT_MATRIX_LEFT_ID,
  DEFAULT_VECTOR_LEFT_ID,
  matrixValueById,
  vectorValueById,
  type LinearAlgebraMatrixNamedValue,
  type LinearAlgebraVectorNamedValue,
} from '../../lib/linear-algebra/named-values';
import type { MatrixOperation, VectorOperation } from '../../types/calculator';

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
    default:
      return vectorOperationLabel(operation);
  }
}

export function buildMatrixSoftActions(leftName: string, rightName: string): SoftAction[] {
  return [
    { id: 'add', label: matrixActionLabel('add', leftName, rightName), hotkey: 'F1' },
    { id: 'subtract', label: matrixActionLabel('subtract', leftName, rightName), hotkey: 'F2' },
    { id: 'multiply', label: matrixActionLabel('multiply', leftName, rightName), hotkey: 'F3' },
    { id: 'detA', label: matrixActionLabel('detA', leftName, rightName), hotkey: 'F4' },
    { id: 'inverseA', label: matrixActionLabel('inverseA', leftName, rightName), hotkey: 'F5' },
    { id: 'transposeA', label: matrixActionLabel('transposeA', leftName, rightName), hotkey: 'F6' },
  ];
}

export function buildVectorSoftActions(leftName: string, rightName: string): SoftAction[] {
  return [
    { id: 'dot', label: vectorActionLabel('dot', leftName, rightName), hotkey: 'F1' },
    { id: 'cross', label: vectorActionLabel('cross', leftName, rightName), hotkey: 'F2' },
    { id: 'normA', label: vectorActionLabel('normA', leftName, rightName), hotkey: 'F3' },
    { id: 'angle', label: vectorActionLabel('angle', leftName, rightName), hotkey: 'F4' },
    { id: 'add', label: vectorActionLabel('add', leftName, rightName), hotkey: 'F5' },
    { id: 'subtract', label: vectorActionLabel('subtract', leftName, rightName), hotkey: 'F6' },
  ];
}

export function buildActiveMatrixRequest(
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

export function buildActiveVectorRequest(
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
