import type { DisplayDetailSection } from '../../types/calculator';
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

function lineForFact(fact: AssumptionFact) {
  const suffix = `Trust: ${trustLabel(fact.trust)} via ${sourceLabel(fact.source)}.`;
  return `${fact.message} ${suffix}`;
}

function mergeSections(
  sections: readonly DisplayDetailSection[],
): DisplayDetailSection[] {
  const merged = new Map<string, string[]>();

  for (const section of sections) {
    const lines = merged.get(section.title) ?? [];
    for (const line of section.lines) {
      const trimmed = line.trim();
      if (trimmed && !lines.includes(trimmed)) {
        lines.push(trimmed);
      }
    }
    if (lines.length > 0) {
      merged.set(section.title, lines);
    }
  }

  return [...merged.entries()].map(([title, lines]) => ({ title, lines }));
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

    sections.push({
      title: group.title,
      lines: [...new Set(groupFacts.map(lineForFact))],
    });
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
