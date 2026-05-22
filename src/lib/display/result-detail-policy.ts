import type { DisplayDetailSection } from '../../types/calculator';

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
  const lines = uniqueLines(section.lines).slice(0, 2);
  return lines.length > 0 ? { title: section.title, lines } : null;
}

function cloneSection(section: DisplayDetailSection): DisplayDetailSection {
  return { title: section.title, lines: [...section.lines] };
}

export function displayDetailSectionsForPolicy(
  sections: readonly DisplayDetailSection[] | undefined,
  policy: ResultDetailPolicy,
): DisplayDetailSection[] | undefined {
  if (!sections?.length) {
    return undefined;
  }

  if (policy.detailedFactsEnabled) {
    return sections.map(cloneSection);
  }

  const visibleSections = sections.flatMap((section) => {
    if (section.title === 'Partial Fractions') {
      return concisePartialFractions(section) ?? [];
    }

    if (section.title === 'Trust') {
      return conciseTrust(section) ?? [];
    }

    if (ASSUMPTION_SECTION_TITLES.has(section.title)) {
      return conciseAssumptionSection(section) ?? [];
    }

    return cloneSection(section);
  });

  return visibleSections.length > 0 ? visibleSections : undefined;
}
