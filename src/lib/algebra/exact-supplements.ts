import { ComputeEngine } from '@cortex-js/compute-engine';
import type { SolveDomainConstraint } from '../../types/calculator';
import type {
  ExactSupplementEntry,
  ExactSupplementRelation,
  ExactSupplementSource,
} from '../../types/calculator/exact-supplement-types';
import { evaluateRealNumericExpression } from '../real-numeric-eval';

const ce = new ComputeEngine();

const CONDITION_PREFIX = '\\text{Conditions: } ';
const EXCLUSION_PREFIX = '\\text{Exclusions: } ';
const BRANCH_CONDITION_PREFIX = '\\text{Branch conditions: } ';
const PRINCIPAL_RANGE_PREFIX = '\\text{Principal range: } ';

type ExactSupplementInput = {
  entries?: ExactSupplementEntry[];
  latex?: string[];
  constraints?: SolveDomainConstraint[];
  source?: ExactSupplementSource;
};

type RelationalSupplementEntry = Extract<ExactSupplementEntry, { kind: 'condition' | 'exclusion' }>;
type InformationalSupplementEntry = Exclude<ExactSupplementEntry, RelationalSupplementEntry>;

function dedupe<T>(values: T[]) {
  return [...new Set(values)];
}

function normalizeLatexKey(value: string) {
  return value.replace(/\s+/g, '');
}

function buildRelationalEntry(
  expressionLatex: string,
  relation: ExactSupplementRelation,
  source: ExactSupplementSource,
): ExactSupplementEntry {
  return {
    kind: relation === '\\ne0' ? 'exclusion' : 'condition',
    expressionLatex: expressionLatex.trim(),
    relation,
    source,
  };
}

function isRelationalEntry(entry: ExactSupplementEntry): entry is RelationalSupplementEntry {
  return entry.kind === 'condition' || entry.kind === 'exclusion';
}

function isInformationalEntry(entry: ExactSupplementEntry): entry is InformationalSupplementEntry {
  return !isRelationalEntry(entry);
}

function parseRelationalFragment(
  fragment: string,
  source: ExactSupplementSource,
): ExactSupplementEntry | null {
  const trimmed = fragment.trim();
  const operators: ExactSupplementRelation[] = ['\\ne0', '\\ge0', '>0'];

  for (const operator of operators) {
    if (!trimmed.endsWith(operator)) {
      continue;
    }

    const expressionLatex = trimmed.slice(0, -operator.length).trim();
    if (!expressionLatex) {
      return null;
    }

    return buildRelationalEntry(expressionLatex, operator, source);
  }

  return null;
}

function isTautologicalRelationalEntry(entry: ExactSupplementEntry) {
  if (entry.kind !== 'condition' && entry.kind !== 'exclusion') {
    return false;
  }

  let numericInput: unknown;
  try {
    numericInput = ce.parse(entry.expressionLatex).json;
  } catch {
    return false;
  }

  const numeric = evaluateRealNumericExpression(numericInput, entry.expressionLatex);
  if (numeric.kind !== 'success') {
    return false;
  }

  if (entry.relation === '\\ge0') {
    return numeric.value >= -1e-10;
  }

  if (entry.relation === '>0') {
    return numeric.value > 1e-10;
  }

  return Math.abs(numeric.value) > 1e-10;
}

function parseStructuredLegacyLine(
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
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (fragments.length === 0) {
    return [];
  }

  const parsed = fragments.map((fragment) => parseRelationalFragment(fragment, source));
  if (parsed.some((entry) => entry === null)) {
    return [{
      kind: 'note',
      latex: line,
      source,
    }];
  }

  return parsed.filter((entry): entry is ExactSupplementEntry => entry !== null);
}

function parseLegacySupplementLine(
  line: string,
  source: ExactSupplementSource,
): ExactSupplementEntry[] {
  const parsedConditions = parseStructuredLegacyLine(line, CONDITION_PREFIX, source);
  if (parsedConditions) {
    return parsedConditions;
  }

  const parsedExclusions = parseStructuredLegacyLine(line, EXCLUSION_PREFIX, source);
  if (parsedExclusions) {
    return parsedExclusions;
  }

  if (line.startsWith(BRANCH_CONDITION_PREFIX)) {
    return [{
      kind: 'branch-condition',
      latex: line,
      source,
    }];
  }

  if (line.startsWith(PRINCIPAL_RANGE_PREFIX)) {
    return [{
      kind: 'principal-range',
      latex: line,
      source,
    }];
  }

  return [{
    kind: 'note',
    latex: line,
    source,
  }];
}

function buildConstraintEntries(
  constraints: SolveDomainConstraint[] = [],
  source: ExactSupplementSource,
): ExactSupplementEntry[] {
  return constraints.flatMap((constraint) => {
    switch (constraint.kind) {
      case 'nonzero':
        return [buildRelationalEntry(constraint.expressionLatex, '\\ne0', source)];
      case 'positive':
        return [buildRelationalEntry(constraint.expressionLatex, '>0', source)];
      case 'nonnegative':
        return [buildRelationalEntry(constraint.expressionLatex, '\\ge0', source)];
      default:
        return [];
    }
  });
}

function buildInputEntries(input: ExactSupplementInput): ExactSupplementEntry[] {
  const source = input.source ?? 'legacy';
  const entries = [
    ...(input.entries ?? []),
    ...((input.latex ?? [])
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => parseLegacySupplementLine(line, source))),
    ...buildConstraintEntries(input.constraints, source),
  ];

  return entries.filter((entry) => !isTautologicalRelationalEntry(entry));
}

function entryKey(entry: ExactSupplementEntry) {
  if (isRelationalEntry(entry)) {
    return `${entry.kind}:${normalizeLatexKey(entry.expressionLatex)}:${entry.relation}`;
  }

  return `${entry.kind}:${normalizeLatexKey(entry.latex)}`;
}

function renderStandaloneEntries(entries: ExactSupplementEntry[]) {
  const standalone: string[] = [];

  for (const entry of entries) {
    if (!isInformationalEntry(entry)) {
      continue;
    }

    standalone.push(entry.latex);
  }

  return dedupe(standalone);
}

function renderRelationalEntries(
  entries: ExactSupplementEntry[],
  kind: 'condition' | 'exclusion',
) {
  const fragments = entries
    .filter((entry): entry is RelationalSupplementEntry => isRelationalEntry(entry) && entry.kind === kind)
    .map((entry) => `${entry.expressionLatex}${entry.relation}`);

  if (fragments.length === 0) {
    return null;
  }

  const prefix = kind === 'exclusion' ? EXCLUSION_PREFIX : CONDITION_PREFIX;
  return `${prefix}${dedupe(fragments).join(',\\;')}`;
}

export function mergeExactSupplementEntries(
  ...inputs: ExactSupplementInput[]
): ExactSupplementEntry[] {
  const merged = new Map<string, ExactSupplementEntry>();

  for (const entry of inputs.flatMap((input) => buildInputEntries(input))) {
    const key = entryKey(entry);
    if (!merged.has(key)) {
      merged.set(key, entry);
    }
  }

  return [...merged.values()];
}

export function renderExactSupplementLatex(entries: ExactSupplementEntry[]) {
  const lines = [
    ...renderStandaloneEntries(entries),
  ];

  const exclusions = renderRelationalEntries(entries, 'exclusion');
  if (exclusions) {
    lines.push(exclusions);
  }

  const conditions = renderRelationalEntries(entries, 'condition');
  if (conditions) {
    lines.push(conditions);
  }

  return lines;
}

export function mergeExactSupplementLatex(
  ...inputs: ExactSupplementInput[]
) {
  return renderExactSupplementLatex(mergeExactSupplementEntries(...inputs));
}

export function buildConstraintSupplementLatex(
  constraints: SolveDomainConstraint[] = [],
  source: ExactSupplementSource = 'legacy',
) {
  return mergeExactSupplementLatex({ constraints, source });
}
