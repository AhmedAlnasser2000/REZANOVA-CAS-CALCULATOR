import type {
  DisplayDetailLineKind,
  DisplayDetailLinePart,
  DisplayDetailSection,
} from '../../types/calculator';
import {
  detailLineFromParts,
  mathPart,
  mixedDetailSection,
  textPart,
} from '../display/result-detail-lines';
import type {
  AssumptionFact,
  AssumptionFactKind,
  AssumptionFactSource,
  AssumptionFactTrust,
} from './assumptions-core';
import { mergeAssumptionFacts } from './assumptions-core';

type ReadbackGroup = {
  title: string;
  factKinds: AssumptionFactKind[];
};

const READBACK_GROUPS: ReadbackGroup[] = [
  {
    title: 'Domain Facts',
    factKinds: ['domain-exclusion', 'domain-constraint'],
  },
  {
    title: 'Inequality Facts',
    factKinds: ['inequality-constraint'],
  },
  {
    title: 'Complex Domain',
    factKinds: ['complex-domain-note'],
  },
  {
    title: 'Interval Safety',
    factKinds: ['interval-hazard'],
  },
  {
    title: 'Candidate Checking',
    factKinds: ['candidate-rejection'],
  },
  {
    title: 'Branch Facts',
    factKinds: ['branch-principal-range'],
  },
  {
    title: 'Trust',
    factKinds: ['equivalence-trust'],
  },
];

function sourceLabel(source: AssumptionFactSource) {
  switch (source) {
    case 'rational-function-core':
      return 'rational-function core';
    case 'domain-range-core':
      return 'domain/range core';
    case 'value-domain-core':
      return 'value/domain core';
    case 'inequality-core':
      return 'inequality core';
    case 'complex-core':
      return 'complex core';
    case 'branch-core':
      return 'branch core';
    case 'candidate-validation':
      return 'candidate validation';
    case 'simplify-policy':
      return 'simplify policy';
    case 'calculus-verification':
      return 'calculus verification';
    case 'legacy':
      return 'legacy metadata';
  }
}

function trustLabel(trust: AssumptionFactTrust) {
  switch (trust) {
    case 'proved':
      return 'proved';
    case 'validated':
      return 'validated';
    case 'sampled':
      return 'sampled';
    case 'display-only':
      return 'display-only';
    case 'blocked':
      return 'blocked';
  }
}

function linePartsForFact(fact: AssumptionFact): DisplayDetailLinePart[] {
  const suffix = `Trust: ${trustLabel(fact.trust)} via ${sourceLabel(fact.source)}.`;
  const expressionPrefix = fact.expressionLatex && fact.message.startsWith(fact.expressionLatex)
    ? fact.expressionLatex
    : fact.variable && fact.message.startsWith(fact.variable)
      ? fact.variable
      : undefined;

  if (!expressionPrefix) {
    return [textPart(`${fact.message} ${suffix}`)];
  }

  return [
    mathPart(expressionPrefix),
    textPart(`${fact.message.slice(expressionPrefix.length)} ${suffix}`),
  ];
}

function uniqueFactRows(facts: readonly AssumptionFact[]) {
  const rows = new Map<string, DisplayDetailLinePart[]>();
  for (const fact of facts) {
    const parts = linePartsForFact(fact);
    rows.set(detailLineFromParts(parts).line, parts);
  }
  return [...rows.values()];
}

type MergedDetailLine = {
  line: string;
  lineKind?: DisplayDetailLineKind;
  lineParts?: DisplayDetailLinePart[];
};

function cloneLineParts(parts: readonly DisplayDetailLinePart[] | undefined) {
  return parts?.map((part) => ({ ...part }));
}

function detailLineKindAt(section: DisplayDetailSection, index: number) {
  return section.lineKinds?.[index] ?? section.lineKind;
}

function detailLinePartsAt(section: DisplayDetailSection, index: number) {
  return cloneLineParts(section.lineParts?.[index]);
}

function mergeSections(
  sections: readonly DisplayDetailSection[],
): DisplayDetailSection[] {
  const merged = new Map<string, MergedDetailLine[]>();

  for (const section of sections) {
    const lines = merged.get(section.title) ?? [];
    for (const [index, line] of section.lines.entries()) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      const existing = lines.find((entry) => entry.line === trimmed);
      if (existing) {
        existing.lineKind ??= detailLineKindAt(section, index);
        existing.lineParts ??= detailLinePartsAt(section, index);
        continue;
      }

      lines.push({
        line: trimmed,
        lineKind: detailLineKindAt(section, index),
        lineParts: detailLinePartsAt(section, index),
      });
    }
    if (lines.length > 0) {
      merged.set(section.title, lines);
    }
  }

  return [...merged.entries()].map(([title, entries]) => {
    const hasLineKind = entries.some((entry) => entry.lineKind);
    const hasLineParts = entries.some((entry) => entry.lineParts);
    return {
      title,
      lines: entries.map((entry) => entry.line),
      lineKinds: hasLineKind
        ? entries.map((entry) => entry.lineKind ?? 'text')
        : undefined,
      lineParts: hasLineParts
        ? entries.map((entry) => entry.lineParts ?? [])
        : undefined,
    };
  });
}

export function assumptionFactsToDetailSections(
  facts: readonly AssumptionFact[] = [],
): DisplayDetailSection[] {
  const deduped = mergeAssumptionFacts([...facts]);
  const sections: DisplayDetailSection[] = [];

  for (const group of READBACK_GROUPS) {
    const groupFacts = deduped.filter((fact) => group.factKinds.includes(fact.kind));
    if (groupFacts.length === 0) {
      continue;
    }

    sections.push(mixedDetailSection(group.title, uniqueFactRows(groupFacts)));
  }

  return sections;
}

export function mergeAssumptionDetailSections(
  existing: readonly DisplayDetailSection[] | undefined,
  facts: readonly AssumptionFact[] = [],
): DisplayDetailSection[] | undefined {
  const generated = assumptionFactsToDetailSections(facts);
  const merged = mergeSections([...(existing ?? []), ...generated]);
  return merged.length > 0 ? merged : undefined;
}
