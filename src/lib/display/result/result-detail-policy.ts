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
const NUMERIC_DIAGNOSTIC_SECTION_TITLES = new Set([
  'Domain Probe',
  'Search Diagnostics',
  'Extraneous Solutions',
]);
const NUMERIC_DIAGNOSTIC_COMPACT_LINE_CAP = 8;
const NUMERIC_DIAGNOSTIC_DETAILED_LINE_CAP = 16;

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

function cappedNumericDiagnosticSection(
  section: DisplayDetailSection,
  policy: ResultDetailPolicy,
): DisplayDetailSection {
  const cap = policy.detailedFactsEnabled
    ? NUMERIC_DIAGNOSTIC_DETAILED_LINE_CAP
    : NUMERIC_DIAGNOSTIC_COMPACT_LINE_CAP;
  if (section.lines.length <= cap) {
    return cloneDisplayDetailSection(section);
  }

  const hiddenCount = section.lines.length - cap;
  const overflowLine = policy.detailedFactsEnabled
    ? `${hiddenCount} additional diagnostic line${hiddenCount === 1 ? '' : 's'} hidden by the numeric diagnostics cap.`
    : `${hiddenCount} additional diagnostic line${hiddenCount === 1 ? '' : 's'} hidden; enable Detailed Facts to show more.`;
  return {
    ...section,
    lines: [...section.lines.slice(0, cap), overflowLine],
    lineKinds: section.lineKinds
      ? [...section.lineKinds.slice(0, cap), 'text']
      : section.lineKind
        ? [...Array.from({ length: cap }, () => section.lineKind ?? 'text'), 'text']
        : undefined,
    lineParts: section.lineParts
      ? [
          ...section.lineParts.slice(0, cap).map((parts) => parts.map((part) => ({ ...part }))),
          [{ kind: 'text', text: overflowLine }],
        ]
      : undefined,
  };
}

function splitReadableSolveNoteLine(line: string) {
  return line
    .split(/;\s+(?=(?:Composition branch|Periodic family|Parameterized family|Nested recursion|Exact reduced|Reduced carrier|Branch):)/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function readableSolveNoteSection(section: DisplayDetailSection): DisplayDetailSection {
  const lines = section.lines.flatMap(splitReadableSolveNoteLine);
  if (lines.length === section.lines.length) {
    return cloneDisplayDetailSection(section);
  }

  return {
    title: section.title,
    lines,
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
    return sections.map((section) =>
      NUMERIC_DIAGNOSTIC_SECTION_TITLES.has(section.title)
        ? cappedNumericDiagnosticSection(section, policy)
        : section.title === 'Solve Note'
          ? readableSolveNoteSection(section)
        : cloneDisplayDetailSection(section));
  }

  const visibleSections = sections.flatMap((section) => {
    if (NUMERIC_DIAGNOSTIC_SECTION_TITLES.has(section.title)) {
      return cappedNumericDiagnosticSection(section, policy);
    }

    if (section.title === 'Solve Note') {
      return readableSolveNoteSection(section);
    }

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
