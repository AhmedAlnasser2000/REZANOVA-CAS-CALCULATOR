import type { SolveDomainConstraint } from '../../../types/calculator';
import type {
  ExactSupplementEntry,
  ExactSupplementRelation,
  ExactSupplementSource,
} from '../../../types/calculator/exact-supplement-types';

export type EquationFactAttachmentScope = 'global' | 'root-set' | 'root-group' | 'branch';

export type EquationFactAttachment = {
  scope: EquationFactAttachmentScope;
  ownerId?: string;
};

export type EquationBranchDomainFact = {
  entry: ExactSupplementEntry;
  attachment: EquationFactAttachment;
};

type FactOptions = {
  source?: ExactSupplementSource;
  attachment?: Partial<EquationFactAttachment>;
};

type RelationalEntry = Extract<ExactSupplementEntry, { kind: 'condition' | 'exclusion' }>;
type InformationalEntry = Exclude<ExactSupplementEntry, RelationalEntry>;

const DEFAULT_ATTACHMENT: EquationFactAttachment = { scope: 'global' };
const CONDITION_PREFIX = '\\text{Conditions: } ';
const EXCLUSION_PREFIX = '\\text{Exclusions: } ';
const RELATIONS: ExactSupplementRelation[] = ['\\ne0', '\\ge0', '>0'];

export function createDenominatorExclusionFact(
  expressionLatex: string,
  attachment?: Partial<EquationFactAttachment>,
): EquationBranchDomainFact {
  return createRelationalFact(expressionLatex, '\\ne0', {
    source: 'denominator',
    attachment,
  });
}

export function createDomainConditionFact(
  expressionLatex: string,
  relation: Extract<ExactSupplementRelation, '\\ge0' | '>0'>,
  options: FactOptions = {},
): EquationBranchDomainFact {
  return createRelationalFact(expressionLatex, relation, {
    source: options.source ?? 'radical-domain',
    attachment: options.attachment,
  });
}

export function factsFromLegacySupplementLatex(
  latex: string[] | undefined,
  options: FactOptions = {},
): EquationBranchDomainFact[] {
  const source = options.source ?? 'legacy';
  return (latex ?? [])
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) =>
      parseLegacySupplementLine(line, source).map((entry) =>
        attachEntry(entry, options.attachment)));
}

export function factsFromDomainConstraints(
  constraints: SolveDomainConstraint[] | undefined,
  options: FactOptions = {},
): EquationBranchDomainFact[] {
  const source = options.source ?? 'legacy';
  return (constraints ?? []).flatMap((constraint) => {
    switch (constraint.kind) {
      case 'nonzero':
        return [createRelationalFact(constraint.expressionLatex, '\\ne0', {
          source,
          attachment: options.attachment,
        })];
      case 'positive':
        return [createRelationalFact(constraint.expressionLatex, '>0', {
          source,
          attachment: options.attachment,
        })];
      case 'nonnegative':
        return [createRelationalFact(constraint.expressionLatex, '\\ge0', {
          source,
          attachment: options.attachment,
        })];
      default:
        return [];
    }
  });
}

export function mergeEquationBranchDomainFacts(
  ...factLists: Array<EquationBranchDomainFact[] | undefined>
): EquationBranchDomainFact[] {
  const merged = new Map<string, EquationBranchDomainFact>();

  for (const fact of factLists.flatMap((list) => list ?? [])) {
    const key = factKey(fact);
    if (!merged.has(key)) {
      merged.set(key, fact);
    }
  }

  return [...merged.values()];
}

export function renderRawSupplementLatexFromFacts(facts: EquationBranchDomainFact[] | undefined) {
  const rendered = (facts ?? [])
    .map((fact) => renderFactEntry(fact.entry))
    .filter(Boolean);
  return [...new Set(rendered)];
}

function createRelationalFact(
  expressionLatex: string,
  relation: ExactSupplementRelation,
  options: Required<Pick<FactOptions, 'source'>> & Pick<FactOptions, 'attachment'>,
): EquationBranchDomainFact {
  const expression = expressionLatex.trim();
  const entry: ExactSupplementEntry = {
    kind: relation === '\\ne0' ? 'exclusion' : 'condition',
    expressionLatex: expression,
    relation,
    source: options.source,
  };
  return attachEntry(entry, options.attachment);
}

function attachEntry(
  entry: ExactSupplementEntry,
  attachment: Partial<EquationFactAttachment> = {},
): EquationBranchDomainFact {
  return {
    entry,
    attachment: {
      ...DEFAULT_ATTACHMENT,
      ...attachment,
    },
  };
}

function parseLegacySupplementLine(
  line: string,
  source: ExactSupplementSource,
): ExactSupplementEntry[] {
  const exclusionEntries = parseStructuredRelationalLine(line, EXCLUSION_PREFIX, source);
  if (exclusionEntries) {
    return exclusionEntries;
  }

  const conditionEntries = parseStructuredRelationalLine(line, CONDITION_PREFIX, source);
  if (conditionEntries) {
    return conditionEntries;
  }

  const relational = parseRelationalLine(line, source);
  if (relational) {
    return [relational];
  }

  return [{
    kind: 'note',
    latex: line,
    source,
  }];
}

function parseStructuredRelationalLine(
  line: string,
  prefix: string,
  source: ExactSupplementSource,
): ExactSupplementEntry[] | null {
  if (!line.startsWith(prefix)) {
    return null;
  }

  const fragments = line
    .slice(prefix.length)
    .split(',\\;')
    .map((fragment) => fragment.trim())
    .filter(Boolean);

  const entries = fragments.map((fragment) => parseRelationalLine(fragment, source));
  if (entries.some((entry) => entry === null)) {
    return [{
      kind: 'note',
      latex: line,
      source,
    }];
  }

  return entries.filter((entry): entry is ExactSupplementEntry => entry !== null);
}

function parseRelationalLine(
  line: string,
  source: ExactSupplementSource,
): ExactSupplementEntry | null {
  for (const relation of RELATIONS) {
    if (!line.endsWith(relation)) {
      continue;
    }

    const expressionLatex = line.slice(0, -relation.length).trim();
    if (!expressionLatex) {
      return null;
    }

    return {
      kind: relation === '\\ne0' ? 'exclusion' : 'condition',
      expressionLatex,
      relation,
      source,
    };
  }

  return null;
}

function renderFactEntry(entry: ExactSupplementEntry) {
  if (isRelationalEntry(entry)) {
    return `${entry.expressionLatex}${entry.relation}`;
  }
  return (entry as InformationalEntry).latex;
}

function factKey(fact: EquationBranchDomainFact) {
  return `${attachmentKey(fact.attachment)}:${entryKey(fact.entry)}`;
}

function attachmentKey(attachment: EquationFactAttachment) {
  return `${attachment.scope}:${attachment.ownerId ?? ''}`;
}

function entryKey(entry: ExactSupplementEntry) {
  if (isRelationalEntry(entry)) {
    return `${entry.kind}:${normalizeLatexKey(entry.expressionLatex)}:${entry.relation}:${entry.source}`;
  }

  return `${entry.kind}:${normalizeLatexKey((entry as InformationalEntry).latex)}:${entry.source}`;
}

function isRelationalEntry(entry: ExactSupplementEntry): entry is RelationalEntry {
  return entry.kind === 'condition' || entry.kind === 'exclusion';
}

function normalizeLatexKey(value: string) {
  return value.replace(/\s+/g, '');
}
