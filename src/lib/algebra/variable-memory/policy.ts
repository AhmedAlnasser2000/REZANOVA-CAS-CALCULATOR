import type {
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../../types/calculator';
import { entriesText } from './format';
import { storedVariableSnapshotsInLatex } from './substitution';
import type { StoredValueModePolicy, StoredValueModePolicyInput } from './types';

export function resolveStoredValueModePolicy({
  mode,
  action,
  protectedNames = [],
  protectedNameDescriptions,
}: StoredValueModePolicyInput): StoredValueModePolicy {
  if (
    (mode === 'calculate' && (action === 'standard-evaluate' || action === 'calculus-workbench'))
    || (mode === 'table' && action === 'table-evaluate')
    || (mode === 'calculus' && action === 'calculus-workspace-evaluate')
    || (mode === 'equation' && action === 'equation-numeric-solve')
  ) {
    return { kind: 'apply', protectedNames, protectedNameDescriptions };
  }

  if (mode === 'calculate' && action === 'symbolic-transform') {
    return {
      kind: 'ignore',
      explanation: 'Symbolic transforms keep variables symbolic.',
    };
  }

  if (mode === 'equation' && action === 'equation-symbolic-solve') {
    return {
      kind: 'ignore',
      explanation: 'Equation symbolic solve keeps solve targets and symbolic parameters symbolic.',
    };
  }

  if (mode === 'equation' && action === 'equation-transform') {
    return {
      kind: 'ignore',
      explanation: 'Equation algebra transforms keep variables symbolic.',
    };
  }

  return { kind: 'unsupported' };
}

export function ignoredStoredValuePolicyLines({
  latex,
  entries,
  policy,
}: {
  latex: string;
  entries: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[] | undefined;
  policy: StoredValueModePolicy;
}) {
  if (policy.kind !== 'ignore') {
    return [];
  }

  const matched = storedVariableSnapshotsInLatex(latex, entries);
  if (matched.length === 0) {
    return [];
  }

  return [`Ignored stored values: ${entriesText(matched)}. ${policy.explanation}`];
}
