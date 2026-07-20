import type {
  ComplexExactForm,
  LinearAlgebraMatrixNamedValue,
  LinearAlgebraScalarDomain,
  LinearAlgebraSubstitutionMode,
  MatrixOperation,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';
import type { RunMatrixModeRequest } from '../../lib/modes/matrix';
import {
  buildActiveScalarMatrixRuntimeRequest,
  isScalarMatrixNamedValue,
} from '../../lib/linear-algebra/runtime-request';
import {
  activeMatrixValuePair,
  matrixActionLabel,
} from '../../lib/linear-algebra/active-values';
import { buildActiveMatrixRuntimeRequest } from '../../lib/linear-algebra/runtime-request';

export type MatrixActionRuntimeState = {
  matrixValues: readonly LinearAlgebraMatrixNamedValue[];
  activeMatrixLeftId: string;
  activeMatrixRightId: string;
  complexExactForm: ComplexExactForm;
  domain: LinearAlgebraScalarDomain;
  substitutionMode: LinearAlgebraSubstitutionMode;
  storedVariables: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[];
};

export type MatrixActionRuntimeRequest =
  | { inputLatex: string; request: RunMatrixModeRequest }
  | { error: string; inputLatex: string };

export function buildMatrixActionRuntimeRequest(
  operation: MatrixOperation,
  state: MatrixActionRuntimeState,
): MatrixActionRuntimeRequest {
  const activeValues = activeMatrixValuePair(
    state.matrixValues,
    state.activeMatrixLeftId,
    state.activeMatrixRightId,
  );
  const inputLatex = matrixActionLabel(operation, activeValues.left.name, activeValues.right.name);
  const usesScalarProducer = state.domain === 'complex'
    || state.substitutionMode === 'use-stored-values'
    || isScalarMatrixNamedValue(activeValues.left)
    || isScalarMatrixNamedValue(activeValues.right);
  if (!usesScalarProducer) {
    return buildActiveMatrixRuntimeRequest(
      operation,
      state.matrixValues,
      state.activeMatrixLeftId,
      state.activeMatrixRightId,
    );
  }
  const built = buildActiveScalarMatrixRuntimeRequest(
    operation,
    state.matrixValues,
    state.activeMatrixLeftId,
    state.activeMatrixRightId,
    {
      domain: state.domain,
      substitutionMode: state.substitutionMode,
      storedVariables: state.storedVariables,
      complexExactForm: state.complexExactForm,
    },
  );
  return 'error' in built ? { ...built, inputLatex } : built;
}
