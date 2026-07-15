import type {
  LinearAlgebraMatrixNamedValue,
  LinearAlgebraScalarDomain,
  LinearAlgebraScalarMatrixOperandV1,
  LinearAlgebraScalarVectorOperandV1,
  LinearAlgebraSubstitutionMode,
  LinearAlgebraVectorNamedValue,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';
import {
  cloneLinearAlgebraScalarMatrix,
  cloneLinearAlgebraScalarVector,
  isScalarMatrixNamedValue,
  isScalarVectorNamedValue,
  scalarMatrixFromNumeric,
  scalarVectorFromNumeric,
} from './named-values';
import { resolveLinearAlgebraScalarWire } from './scalar-wire';

type ScalarResolutionContext = {
  domain: LinearAlgebraScalarDomain;
  mode: LinearAlgebraSubstitutionMode;
  protectedNames: readonly string[];
  storedVariables: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[];
};

export type ResolvedLinearAlgebraOperand<T> = {
  operand: T;
  substitutions: VariableSubstitutionSnapshot[];
  protectedSubstitutions: VariableSubstitutionSnapshot[];
};

function uniqueSnapshots(entries: readonly VariableSubstitutionSnapshot[]) {
  const values = new Map<string, VariableSubstitutionSnapshot>();
  for (const entry of entries) values.set(entry.name, { ...entry });
  return [...values.values()];
}

function resolveScalarMatrix(
  source: ReturnType<typeof scalarMatrixFromNumeric>,
  context: ScalarResolutionContext,
): ResolvedLinearAlgebraOperand<LinearAlgebraScalarMatrixOperandV1> | { error: string } {
  const substitutions: VariableSubstitutionSnapshot[] = [];
  const protectedSubstitutions: VariableSubstitutionSnapshot[] = [];
  const resolved = [] as typeof source;
  for (const row of source) {
    const resolvedRow = [] as typeof row;
    for (const wire of row) {
      const cell = resolveLinearAlgebraScalarWire({ wire, ...context });
      if ('error' in cell) return cell;
      resolvedRow.push(cell.resolved);
      substitutions.push(...cell.substitutions);
      protectedSubstitutions.push(...cell.protectedSubstitutions);
    }
    resolved.push(resolvedRow);
  }
  return {
    operand: {
      encoding: 'scalar-v1',
      source: cloneLinearAlgebraScalarMatrix(source),
      resolved,
    },
    substitutions: uniqueSnapshots(substitutions),
    protectedSubstitutions: uniqueSnapshots(protectedSubstitutions),
  };
}

function resolveScalarVector(
  source: ReturnType<typeof scalarVectorFromNumeric>,
  context: ScalarResolutionContext,
): ResolvedLinearAlgebraOperand<LinearAlgebraScalarVectorOperandV1> | { error: string } {
  const substitutions: VariableSubstitutionSnapshot[] = [];
  const protectedSubstitutions: VariableSubstitutionSnapshot[] = [];
  const resolved = [] as typeof source;
  for (const wire of source) {
    const cell = resolveLinearAlgebraScalarWire({ wire, ...context });
    if ('error' in cell) return cell;
    resolved.push(cell.resolved);
    substitutions.push(...cell.substitutions);
    protectedSubstitutions.push(...cell.protectedSubstitutions);
  }
  return {
    operand: {
      encoding: 'scalar-v1',
      source: cloneLinearAlgebraScalarVector(source),
      resolved,
    },
    substitutions: uniqueSnapshots(substitutions),
    protectedSubstitutions: uniqueSnapshots(protectedSubstitutions),
  };
}

export function resolveMatrixNamedValueOperand(
  value: LinearAlgebraMatrixNamedValue,
  context: ScalarResolutionContext,
) {
  return resolveScalarMatrix(
    isScalarMatrixNamedValue(value) ? value.value : scalarMatrixFromNumeric(value.value),
    context,
  );
}

export function resolveVectorNamedValueOperand(
  value: LinearAlgebraVectorNamedValue,
  context: ScalarResolutionContext,
) {
  return resolveScalarVector(
    isScalarVectorNamedValue(value) ? value.value : scalarVectorFromNumeric(value.value),
    context,
  );
}
