import type {
  AngleUnit,
  ComplexExactForm,
  LinearAlgebraScalarDomain,
  LinearAlgebraSubstitutionMode,
  LinearAlgebraVectorNamedValue,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
  VectorOperation,
} from '../../types/calculator';
import type { RunVectorModeRequest } from '../../lib/modes/vector';
import {
  activeVectorValuePair,
  buildActiveScalarVectorRuntimeRequest,
  isScalarVectorNamedValue,
  vectorActionLabel,
} from '../../lib/linear-algebra/runtime-request';
import { buildActiveVectorRequest } from './linearAlgebraActiveOperands';

export type VectorActionRuntimeState = {
  vectorValues: readonly LinearAlgebraVectorNamedValue[];
  activeVectorLeftId: string;
  activeVectorRightId: string;
  angleUnit: AngleUnit;
  complexExactForm: ComplexExactForm;
  domain: LinearAlgebraScalarDomain;
  substitutionMode: LinearAlgebraSubstitutionMode;
  storedVariables: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[];
};

export type VectorActionRuntimeRequest =
  | { inputLatex: string; request: RunVectorModeRequest }
  | { error: string; inputLatex: string };

export function buildVectorActionRuntimeRequest(
  operation: VectorOperation,
  state: VectorActionRuntimeState,
): VectorActionRuntimeRequest {
  const activeValues = activeVectorValuePair(
    state.vectorValues,
    state.activeVectorLeftId,
    state.activeVectorRightId,
  );
  const inputLatex = vectorActionLabel(operation, activeValues.left.name, activeValues.right.name);
  const usesScalarProducer = state.domain === 'complex'
    || state.substitutionMode === 'use-stored-values'
    || isScalarVectorNamedValue(activeValues.left)
    || isScalarVectorNamedValue(activeValues.right);
  if (!usesScalarProducer) {
    return buildActiveVectorRequest(
      operation,
      state.vectorValues,
      state.activeVectorLeftId,
      state.activeVectorRightId,
      state.angleUnit,
    );
  }
  const built = buildActiveScalarVectorRuntimeRequest(
    operation,
    state.vectorValues,
    state.activeVectorLeftId,
    state.activeVectorRightId,
    state.angleUnit,
    {
      domain: state.domain,
      substitutionMode: state.substitutionMode,
      storedVariables: state.storedVariables,
      complexExactForm: state.complexExactForm,
    },
  );
  return 'error' in built ? { ...built, inputLatex } : built;
}
