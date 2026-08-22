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
  buildActiveScalarVectorRuntimeRequest,
  projectVectorNamedValueToNumeric,
  vectorActionOperandSides,
} from '../../lib/linear-algebra/runtime-request';
import {
  activeVectorValuePair,
  vectorActionLabel,
} from '../../lib/linear-algebra/active-values';
import { buildActiveVectorRuntimeRequest } from '../../lib/linear-algebra/runtime-request';

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
  const requiredSides = vectorActionOperandSides(operation);
  const leftIsNumeric = projectVectorNamedValueToNumeric(activeValues.left) !== null;
  const rightIsNumeric = projectVectorNamedValueToNumeric(activeValues.right) !== null;
  const usesScalarProducer = state.domain === 'complex'
    || state.substitutionMode === 'use-stored-values'
    || (requiredSides !== 'right' && !leftIsNumeric)
    || (requiredSides !== 'left' && !rightIsNumeric);
  if (!usesScalarProducer) {
    return buildActiveVectorRuntimeRequest(
      operation,
      state.vectorValues,
      state.activeVectorLeftId,
      state.activeVectorRightId,
      state.angleUnit,
      requiredSides,
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
