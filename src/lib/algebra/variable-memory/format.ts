import type { VariableSubstitutionSnapshot } from '../../../types/calculator';

export function entriesText(entries: readonly VariableSubstitutionSnapshot[]) {
  return entries.map((entry) => `${entry.name}=${entry.valueLatex}`).join(', ');
}

export function sameLatex(left: string | undefined, right: string | undefined) {
  return (left ?? '').trim() === (right ?? '').trim();
}

export function uniqueLines(lines: readonly string[]) {
  return [...new Set(lines.map((line) => line.trim()).filter(Boolean))];
}
