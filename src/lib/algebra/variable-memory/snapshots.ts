import type {
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../../types/calculator';

export function uniqueSnapshots(entries: readonly VariableSubstitutionSnapshot[]) {
  const unique: VariableSubstitutionSnapshot[] = [];
  for (const entry of entries) {
    if (!unique.some((current) => current.name === entry.name)) {
      unique.push({
        name: entry.name,
        valueLatex: entry.valueLatex,
        numericValue: entry.numericValue,
      });
    }
  }
  return unique;
}

export function snapshotsForNames(
  entries: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[],
  names: ReadonlySet<string>,
) {
  return uniqueSnapshots(entries
    .filter((entry) => names.has(entry.name))
    .map((entry) => ({
      name: entry.name,
      valueLatex: entry.valueLatex,
      numericValue: entry.numericValue,
    })));
}

export function intersectNames(left: ReadonlySet<string>, right: ReadonlySet<string>) {
  return new Set([...left].filter((name) => right.has(name)));
}

export function snapshotStoredVariables(
  entries: readonly StoredVariableValue[],
): VariableSubstitutionSnapshot[] {
  return entries.map((entry) => ({
    name: entry.name,
    valueLatex: entry.valueLatex,
    numericValue: entry.numericValue,
  }));
}
