import type { DisplayDetailSection } from '../../types/calculator';

type BuildParameterizedDetailSectionsOptions = {
  target: string;
  parameterNames: string[];
  familyTitle: string;
  familyLines: string[];
  extraSections?: DisplayDetailSection[];
};

export function normalizeParameterizedSupplementLatex(entries?: string[]) {
  if (!entries || entries.length === 0) {
    return undefined;
  }

  const normalized = entries
    .map(normalizeRestrictionLatex)
    .filter((entry) => entry.trim().length > 0);

  return dedupe(normalized);
}

export function normalizeRestrictionLatex(latex: string) {
  const trimmed = latex.trim();
  const outerLeftRightInverse = trimmed.match(/^\\left\((.+)\\right\)\^\{-1\}(.+)$/);
  if (outerLeftRightInverse) {
    return `\\frac{1}{${outerLeftRightInverse[1]}}${outerLeftRightInverse[2]}`;
  }

  const outerPlainInverse = trimmed.match(/^\((.+)\)\^\{-1\}(.+)$/);
  if (outerPlainInverse) {
    return `\\frac{1}{${outerPlainInverse[1]}}${outerPlainInverse[2]}`;
  }

  return trimmed;
}

export function buildParameterizedSolveTargetSection(
  target: string,
  parameterNames: string[],
): DisplayDetailSection {
  return {
    title: 'Solve Target',
    lines: [
      `Selected target: ${target}`,
      parameterNames.length > 0
        ? `Symbolic parameters: ${parameterNames.join(', ')}`
        : 'No symbolic parameters were preserved.',
    ],
  };
}

export function buildParameterizedDetailSections({
  target,
  parameterNames,
  familyTitle,
  familyLines,
  extraSections = [],
}: BuildParameterizedDetailSectionsOptions): DisplayDetailSection[] {
  return normalizeParameterizedDetailSections([
    buildParameterizedSolveTargetSection(target, parameterNames),
    {
      title: familyTitle,
      lines: familyLines,
    },
    ...extraSections,
  ]);
}

export function normalizeParameterizedDetailSections(
  sections: DisplayDetailSection[],
): DisplayDetailSection[] {
  return sections.map((section) => ({
    ...section,
    lines: section.lines.map(normalizeRestrictionLine),
  }));
}

function normalizeRestrictionLine(line: string) {
  return line.replace(/\\left\(([^]+?)\\right\)\^\{-1\}/g, (_match, denominator: string) =>
    `\\frac{1}{${denominator}}`,
  );
}

function dedupe(entries: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of entries) {
    if (seen.has(entry)) {
      continue;
    }

    seen.add(entry);
    result.push(entry);
  }

  return result;
}
