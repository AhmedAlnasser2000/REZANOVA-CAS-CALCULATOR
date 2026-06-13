import type {
  DisplayDetailSection,
  VariableSubstitutionSnapshot,
} from '../../../types/calculator';
import { entriesText, sameLatex, uniqueLines } from './format';
import type { StoredValueReadbackInput } from './types';

export function storedValueReadbackSections({
  substitutions,
  protectedSubstitutions = [],
  protectedNameDescriptions = {},
  originalLatex,
  effectiveLatex,
  effectiveLabel = 'Effective expression',
  replayedSnapshot = false,
  ignoredLines = [],
}: StoredValueReadbackInput): DisplayDetailSection[] {
  const sections: DisplayDetailSection[] = [];

  if (substitutions.length > 0) {
    const lines = [`Used stored values: ${entriesText(substitutions)}.`];
    if (replayedSnapshot) {
      lines.push('Replayed with the stored-value snapshot saved with this history entry.');
    }
    if (effectiveLatex && !sameLatex(originalLatex, effectiveLatex)) {
      lines.push(`${effectiveLabel}: ${effectiveLatex}.`);
    }
    sections.push({ title: 'Stored Values', lines });
  }

  const policyLines = [
    ...protectedSubstitutions.map((entry) => {
      const description = protectedNameDescriptions[entry.name] ?? 'a protected variable';
      return `Kept ${entry.name} symbolic as ${description}.`;
    }),
    ...ignoredLines,
  ];

  if (policyLines.length > 0) {
    sections.push({ title: 'Variable Policy', lines: uniqueLines(policyLines) });
  }

  return sections;
}

export function storedValuesDetailSection(
  substitutions: readonly VariableSubstitutionSnapshot[],
  label = 'expression',
): DisplayDetailSection | undefined {
  if (substitutions.length === 0) {
    return undefined;
  }

  return {
    title: 'Stored Values',
    lines: [
      `Substituted ${substitutions
        .map((entry) => `${entry.name}=${entry.valueLatex}`)
        .join(', ')} before evaluating this ${label}.`,
    ],
  };
}
