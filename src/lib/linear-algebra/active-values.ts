import type { MatrixOperation, VectorOperation } from '../../types/calculator';
import {
  DEFAULT_MATRIX_LEFT_ID,
  DEFAULT_VECTOR_LEFT_ID,
  matrixValueById,
  vectorValueById,
  type LinearAlgebraMatrixNamedValue,
  type LinearAlgebraVectorNamedValue,
} from './named-values';
import { matrixOperationLabel, vectorOperationLabel } from './operation-labels';

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
    case 'add': return `${leftName}+${rightName}`;
    case 'subtract': return `${leftName}-${rightName}`;
    case 'multiply': return `${leftName}×${rightName}`;
    case 'transposeA': return `${leftName}ᵀ`;
    case 'transposeB': return `${rightName}ᵀ`;
    case 'adjointA': return `${leftName}†`;
    case 'adjointB': return `${rightName}†`;
    case 'detA': return `det(${leftName})`;
    case 'detB': return `det(${rightName})`;
    case 'inverseA': return `${leftName}⁻¹`;
    case 'inverseB': return `${rightName}⁻¹`;
    case 'definiteA': return `definite(${leftName})`;
    case 'definiteB': return `definite(${rightName})`;
    case 'svdA': return `svd(${leftName})`;
    case 'svdB': return `svd(${rightName})`;
    case 'pinvA': return `pinv(${leftName})`;
    case 'pinvB': return `pinv(${rightName})`;
    case 'condA': return `cond(${leftName})`;
    case 'condB': return `cond(${rightName})`;
    case 'nrankA': return `nrank(${leftName})`;
    case 'nrankB': return `nrank(${rightName})`;
    default: return matrixOperationLabel(operation);
  }
}

export function vectorActionLabel(operation: VectorOperation, leftName: string, rightName: string) {
  switch (operation) {
    case 'dot': return `${leftName}·${rightName}`;
    case 'cross': return `${leftName}×${rightName}`;
    case 'normA': return `‖${leftName}‖`;
    case 'normB': return `‖${rightName}‖`;
    case 'angle': return `∠(${leftName},${rightName})`;
    case 'add': return `${leftName}+${rightName}`;
    case 'subtract': return `${leftName}-${rightName}`;
    case 'parallel': return `parallel(${leftName},${rightName})`;
    case 'distance': return `distance(${leftName},${rightName})`;
    case 'parallelogramArea': return `parallelogramArea(${leftName},${rightName})`;
    case 'triangleArea': return `triangleArea(${leftName},${rightName})`;
    default: return vectorOperationLabel(operation);
  }
}
