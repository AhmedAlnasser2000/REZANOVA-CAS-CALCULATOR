import { matrixOperationLabel, type RunMatrixModeRequest } from '../modes/matrix';
import { vectorOperationLabel, type RunVectorModeRequest } from '../modes/vector';
import type {
  ComplexExactForm,
  LinearAlgebraScalarDomain,
  LinearAlgebraSubstitutionMode,
  MatrixOperation,
  ScalarMatrixRequestV1,
  ScalarVectorRequestV1,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
  VectorOperation,
} from '../../types/calculator';
import {
  DEFAULT_MATRIX_LEFT_ID,
  DEFAULT_VECTOR_LEFT_ID,
  matrixValueById,
  numericMatrixFromNamedValue,
  numericVectorFromNamedValue,
  vectorValueById,
  cloneMatrixNamedValues,
  cloneVectorNamedValues,
  type LinearAlgebraMatrixNamedValue,
  type LinearAlgebraVectorNamedValue,
} from './named-values';
import {
  resolveMatrixNamedValueOperand,
  resolveVectorNamedValueOperand,
} from './scalar-operands';

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
  isScalarMatrixNamedValue,
  isScalarVectorNamedValue,
  isValidMatrixValueName,
  isValidVectorValueName,
  isVectorNamedValueName,
  matrixNamedValueNames,
  matrixNamedValueCellLatex,
  matrixValueById,
  matrixValueByName,
  nextMatrixValueName,
  nextVectorValueName,
  numericMatrixFromNamedValue,
  numericVectorFromNamedValue,
  resizeMatrixNamedValue,
  resizeVectorNamedValue,
  normalizeMatrixValueName,
  normalizeVectorValueName,
  vectorNamedValueNames,
  vectorNamedValueCellLatex,
  vectorValueById,
  vectorValueByName,
  withMatrixNamedValueScalarCell,
  withVectorNamedValueScalarCell,
} from './named-values';
export type {
  LinearAlgebraMatrixNamedValue,
  LinearAlgebraNumericMatrixNamedValue,
  LinearAlgebraNumericVectorNamedValue,
  LinearAlgebraVectorNamedValue,
} from './named-values';
export {
  parseLinearAlgebraScalarWire,
  resolveLinearAlgebraScalarWire,
} from './scalar-wire';
export {
  resolveMatrixNamedValueOperand,
  resolveVectorNamedValueOperand,
} from './scalar-operands';
export type {
  LinearAlgebraScalarDomain,
  LinearAlgebraScalarWireV1,
  LinearAlgebraSubstitutionMode,
} from './scalar-wire';
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
    case 'adjointA':
      return `${leftName}†`;
    case 'adjointB':
      return `${rightName}†`;
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
    case 'svdA':
      return `svd(${leftName})`;
    case 'svdB':
      return `svd(${rightName})`;
    case 'pinvA':
      return `pinv(${leftName})`;
    case 'pinvB':
      return `pinv(${rightName})`;
    case 'condA':
      return `cond(${leftName})`;
    case 'condB':
      return `cond(${rightName})`;
    case 'nrankA':
      return `nrank(${leftName})`;
    case 'nrankB':
      return `nrank(${rightName})`;
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
  const matrixA = numericMatrixFromNamedValue(activeValues.left);
  const matrixB = numericMatrixFromNamedValue(activeValues.right);
  if (!matrixA || !matrixB) {
    throw new Error('This Matrix action requires the symbolic Matrix producer.');
  }
  return {
    inputLatex,
    request: {
      operation,
      matrixA,
      matrixB,
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
  const vectorA = numericVectorFromNamedValue(activeValues.left);
  const vectorB = numericVectorFromNamedValue(activeValues.right);
  if (!vectorA || !vectorB) {
    throw new Error('This Vector action requires the symbolic Vector producer.');
  }
  return {
    inputLatex,
    request: {
      operation,
      vectorA,
      vectorB,
      angleUnit,
      editorExpressionLatex: inputLatex,
      vectorOperandLatexA: activeValues.left.name,
      vectorOperandLatexB: activeValues.right.name,
    },
  };
}

type ScalarRequestContext = {
  domain: LinearAlgebraScalarDomain;
  substitutionMode: LinearAlgebraSubstitutionMode;
  storedVariables: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[];
  complexExactForm: ComplexExactForm;
};

function mergeSnapshots(...groups: readonly VariableSubstitutionSnapshot[][]) {
  const byName = new Map<string, VariableSubstitutionSnapshot>();
  for (const group of groups) for (const entry of group) byName.set(entry.name, { ...entry });
  return [...byName.values()];
}

export function buildActiveScalarMatrixRuntimeRequest(
  operation: MatrixOperation,
  values: readonly LinearAlgebraMatrixNamedValue[],
  leftId: string,
  rightId: string,
  context: ScalarRequestContext,
): {
  inputLatex: string;
  request: ScalarMatrixRequestV1 & {
    matrixB: NonNullable<ScalarMatrixRequestV1['matrixB']>;
  };
} | { error: string } {
  const activeValues = activeMatrixValuePair(values, leftId, rightId);
  const protectedNames = values.map((value) => value.name);
  const resolutionContext = {
    domain: context.domain,
    mode: context.substitutionMode,
    storedVariables: context.storedVariables,
    protectedNames,
  };
  const left = resolveMatrixNamedValueOperand(activeValues.left, resolutionContext);
  if ('error' in left) return left;
  const right = resolveMatrixNamedValueOperand(activeValues.right, resolutionContext);
  if ('error' in right) return right;
  const inputLatex = matrixActionLabel(operation, activeValues.left.name, activeValues.right.name);
  return {
    inputLatex,
    request: {
      operation,
      operandEncoding: 'scalar-v1',
      matrixA: left.operand,
      matrixB: right.operand,
      editorExpressionLatex: inputLatex,
      matrixOperandLatexA: activeValues.left.name,
      matrixOperandLatexB: activeValues.right.name,
      matrixValues: cloneMatrixNamedValues(values),
      activeMatrixLeftId: activeValues.left.id,
      activeMatrixRightId: activeValues.right.id,
      domain: context.domain,
      substitutionMode: context.substitutionMode,
      substitutionSnapshot: mergeSnapshots(left.substitutions, right.substitutions),
      protectedSubstitutionSnapshot: mergeSnapshots(
        left.protectedSubstitutions,
        right.protectedSubstitutions,
      ),
      complexExactForm: context.complexExactForm,
    },
  };
}

export function buildActiveScalarVectorRuntimeRequest(
  operation: VectorOperation,
  values: readonly LinearAlgebraVectorNamedValue[],
  leftId: string,
  rightId: string,
  angleUnit: RunVectorModeRequest['angleUnit'],
  context: ScalarRequestContext,
): {
  inputLatex: string;
  request: ScalarVectorRequestV1 & {
    vectorB: NonNullable<ScalarVectorRequestV1['vectorB']>;
  };
} | { error: string } {
  const activeValues = activeVectorValuePair(values, leftId, rightId);
  const protectedNames = values.map((value) => value.name);
  const resolutionContext = {
    domain: context.domain,
    mode: context.substitutionMode,
    storedVariables: context.storedVariables,
    protectedNames,
  };
  const left = resolveVectorNamedValueOperand(activeValues.left, resolutionContext);
  if ('error' in left) return left;
  const right = resolveVectorNamedValueOperand(activeValues.right, resolutionContext);
  if ('error' in right) return right;
  const inputLatex = vectorActionLabel(operation, activeValues.left.name, activeValues.right.name);
  return {
    inputLatex,
    request: {
      operation,
      operandEncoding: 'scalar-v1',
      vectorA: left.operand,
      vectorB: right.operand,
      angleUnit,
      editorExpressionLatex: inputLatex,
      vectorOperandLatexA: activeValues.left.name,
      vectorOperandLatexB: activeValues.right.name,
      vectorValues: cloneVectorNamedValues(values),
      activeVectorLeftId: activeValues.left.id,
      activeVectorRightId: activeValues.right.id,
      domain: context.domain,
      substitutionMode: context.substitutionMode,
      substitutionSnapshot: mergeSnapshots(left.substitutions, right.substitutions),
      protectedSubstitutionSnapshot: mergeSnapshots(
        left.protectedSubstitutions,
        right.protectedSubstitutions,
      ),
      complexExactForm: context.complexExactForm,
    },
  };
}
