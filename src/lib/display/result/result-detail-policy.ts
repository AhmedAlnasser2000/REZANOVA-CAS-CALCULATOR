import type { DisplayDetailSection } from '../../../types/calculator';
import { cloneDisplayDetailSection } from './result-detail-lines';

export type ResultDetailPolicy = {
  detailedFactsEnabled: boolean;
};

const ASSUMPTION_SECTION_TITLES = new Set([
  'Domain Facts',
  'Interval Safety',
  'Candidate Checking',
  'Branch Facts',
]);

function cleanLine(line: string) {
  return line.trim().replace(/\s+Trust:.*$/u, '').trim();
}

function uniqueLines(lines: readonly string[]) {
  return [...new Set(lines.map(cleanLine).filter(Boolean))];
}

function isCriticalTrustLine(line: string) {
  return /\b(blocked|failed|unsafe|rejected|could not)\b/iu.test(line);
}

function concisePartialFractions(section: DisplayDetailSection): DisplayDetailSection | null {
  const lines: string[] = ['Used bounded partial fractions over the shared polynomial/rational core.'];

  if (section.lines.some((line) => /backcheck/iu.test(line))) {
    lines.push('The antiderivative passed the derivative backcheck.');
  }

  return { title: section.title, lines };
}

function conciseTrust(section: DisplayDetailSection): DisplayDetailSection | null {
  const criticalLines = uniqueLines(section.lines.filter(isCriticalTrustLine));
  return criticalLines.length > 0
    ? { title: section.title, lines: criticalLines }
    : null;
}

function conciseAssumptionSection(section: DisplayDetailSection): DisplayDetailSection | null {
  const seen = new Set<string>();
  const indexes: number[] = [];
  for (const [index, line] of section.lines.entries()) {
    const cleaned = cleanLine(line);
    if (!cleaned || seen.has(cleaned)) {
      continue;
    }
    seen.add(cleaned);
    indexes.push(index);
    if (indexes.length >= 2) {
      break;
    }
  }

  if (indexes.length === 0) {
    return null;
  }

  return {
    title: section.title,
    lines: indexes.map((index) => cleanLine(section.lines[index])),
    lineKinds: section.lineKinds || section.lineKind
      ? indexes.map((index) => section.lineKinds?.[index] ?? section.lineKind ?? 'text')
      : undefined,
    lineParts: section.lineParts ? indexes.map((index) => section.lineParts?.[index] ?? []) : undefined,
  };
}

export function displayDetailSectionsForPolicy(
  sections: readonly DisplayDetailSection[] | undefined,
  policy: ResultDetailPolicy,
): DisplayDetailSection[] | undefined {
  if (!sections?.length) {
    return undefined;
  }

  if (policy.detailedFactsEnabled) {
    return sections.map(cloneDisplayDetailSection);
  }

  const visibleSections = sections.flatMap((section) => {
    if (section.title === 'Partial Fractions') {
      return concisePartialFractions(section) ?? [];
    }

    if (section.title === 'Trust') {
      return conciseTrust(section) ?? [];
    }

    if (section.title === 'Variable Policy') {
      return [];
    }

    if (ASSUMPTION_SECTION_TITLES.has(section.title)) {
      return conciseAssumptionSection(section) ?? [];
    }

    return cloneDisplayDetailSection(section);
  });

  return visibleSections.length > 0 ? visibleSections : undefined;
}
