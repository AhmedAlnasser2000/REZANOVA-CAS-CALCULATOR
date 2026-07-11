import type {
  DisplayDetailLinePart,
  DisplayDetailSection,
  VariableSubstitutionSnapshot,
} from '../../../types/calculator';
import {
  detailLineFromParts,
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../display/result-detail-lines';
import { sameLatex } from './format';
import type { StoredValueReadbackInput } from './types';

function substitutionParts(entries: readonly VariableSubstitutionSnapshot[]) {
  return entries.flatMap<DisplayDetailLinePart>((entry, index) => [
    ...(index > 0 ? [textPart(', ')] : []),
    mathPart(`${entry.name}=${entry.valueLatex}`),
  ]);
}

function uniquePartRows(rows: readonly (readonly DisplayDetailLinePart[])[]) {
  const unique = new Map<string, DisplayDetailLinePart[]>();
  for (const parts of rows) {
    const cloned = parts.map((part) => ({ ...part }));
    unique.set(detailLineFromParts(cloned).line, cloned);
  }
  return [...unique.values()];
}

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
    const rows: DisplayDetailLinePart[][] = [[
      textPart('Used stored values: '),
      ...substitutionParts(substitutions),
      textPart('.'),
    ]];
    if (replayedSnapshot) {
      rows.push([textPart('Replayed with the stored-value snapshot saved with this history entry.')]);
    }
    if (effectiveLatex && !sameLatex(originalLatex, effectiveLatex)) {
      rows.push([
        textPart(`${effectiveLabel}: `),
        mathPart(effectiveLatex),
        textPart('.'),
      ]);
    }
    sections.push(mixedDetailSection('Stored Values', rows));
  }

  const policyRows = [
    ...protectedSubstitutions.map((entry) => {
      const description = protectedNameDescriptions[entry.name] ?? 'a protected variable';
      return [
        textPart('Kept '),
        mathPart(entry.name),
        textPart(` symbolic as ${description}.`),
      ];
    }),
    ...ignoredLines.map((line) => [textPart(line)]),
  ];

  if (policyRows.length > 0) {
    sections.push(mixedDetailSection('Variable Policy', uniquePartRows(policyRows)));
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

  return mixedDetailSection('Stored Values', [[
    textPart('Substituted '),
    ...substitutionParts(substitutions),
    textPart(` before evaluating this ${label}.`),
  ]]);
}
