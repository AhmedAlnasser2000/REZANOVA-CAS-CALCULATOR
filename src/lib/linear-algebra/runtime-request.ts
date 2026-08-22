import type { RunMatrixModeRequest } from '../modes/matrix';
import type { RunVectorModeRequest } from '../modes/vector';
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
  cloneMatrixNamedValues,
  cloneVectorNamedValues,
  type LinearAlgebraMatrixNamedValue,
  type LinearAlgebraVectorNamedValue,
} from './named-values';
import {
  activeMatrixValuePair,
  activeVectorValuePair,
  matrixActionLabel,
  vectorActionLabel,
} from './active-values';
import {
  resolveMatrixNamedValueOperand,
  resolveVectorNamedValueOperand,
} from './scalar-operands';
import {
  projectMatrixNamedValueToNumeric,
  projectVectorNamedValueToNumeric,
} from './numeric-scalar-projection';

export {
  dispatchMatrixEditorLatex,
  dispatchVectorEditorLatex,
} from './editor-dispatch';
export type { LinearAlgebraEquationHandoff } from './equation-handoff';
export {
  activeMatrixValuePair,
  activeVectorValuePair,
  matrixActionLabel,
  vectorActionLabel,
} from './active-values';
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
  matrixActionOperandSides,
  projectMatrixNamedValueToNumeric,
  projectVectorNamedValueToNumeric,
  vectorActionOperandSides,
} from './numeric-scalar-projection';
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

export function buildActiveMatrixRuntimeRequest(
  operation: MatrixOperation,
  values: readonly LinearAlgebraMatrixNamedValue[],
  leftId: string,
  rightId: string,
  requiredSides: 'left' | 'right' | 'both' = 'both',
): { inputLatex: string; request: RunMatrixModeRequest } {
  const activeValues = activeMatrixValuePair(values, leftId, rightId);
  const inputLatex = matrixActionLabel(operation, activeValues.left.name, activeValues.right.name);
  const left = projectMatrixNamedValueToNumeric(activeValues.left);
  const right = projectMatrixNamedValueToNumeric(activeValues.right);
  if (
    (requiredSides !== 'right' && !left)
    || (requiredSides !== 'left' && !right)
    || (!left && !right)
  ) {
    throw new Error('This Matrix action requires the symbolic Matrix producer.');
  }
  const resolvedLeft = left ?? right!;
  const resolvedRight = right ?? left!;
  return {
    inputLatex,
    request: {
      operation,
      matrixA: resolvedLeft.value,
      matrixB: resolvedRight.value,
      ...(resolvedLeft.exactValue ? { exactMatrixA: resolvedLeft.exactValue } : {}),
      ...(resolvedRight.exactValue ? { exactMatrixB: resolvedRight.exactValue } : {}),
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
  requiredSides: 'left' | 'right' | 'both' = 'both',
): { inputLatex: string; request: RunVectorModeRequest } {
  const activeValues = activeVectorValuePair(values, leftId, rightId);
  const inputLatex = vectorActionLabel(operation, activeValues.left.name, activeValues.right.name);
  const left = projectVectorNamedValueToNumeric(activeValues.left);
  const right = projectVectorNamedValueToNumeric(activeValues.right);
  if (
    (requiredSides !== 'right' && !left)
    || (requiredSides !== 'left' && !right)
    || (!left && !right)
  ) {
    throw new Error('This Vector action requires the symbolic Vector producer.');
  }
  const resolvedLeft = left ?? right!;
  const resolvedRight = right ?? left!;
  return {
    inputLatex,
    request: {
      operation,
      vectorA: resolvedLeft.value,
      vectorB: resolvedRight.value,
      ...(resolvedLeft.exactValue ? { exactVectorA: resolvedLeft.exactValue } : {}),
      ...(resolvedRight.exactValue ? { exactVectorB: resolvedRight.exactValue } : {}),
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
