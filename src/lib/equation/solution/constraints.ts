import type { SolveDomainConstraint } from '../../../types/calculator';
import type {
  ExactSupplementEntry,
  ExactSupplementRelation,
  ExactSupplementSource,
} from '../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';

export type EquationConstraintKind =
  | 'denominator-exclusion'
  | 'radical-domain'
  | 'log-domain'
  | 'trig-range'
  | 'integer-parameter'
  | 'branch-validity'
  | 'rejected-candidate'
  | 'note';

export type EquationConstraintSource =
  | 'denominator'
  | 'radical-domain'
  | 'log-domain'
  | 'trig-range'
  | 'integer-parameter'
  | 'branch-validity'
  | 'candidate-validation'
  | 'legacy';

export type EquationConstraint = {
  kind: EquationConstraintKind;
  source: EquationConstraintSource;
  expressionLatex?: string;
  relation?: ExactSupplementRelation;
  latex?: string;
  branchId?: string;
  candidateLatex?: string;
  reason?: string;
};

export type EquationConstraintRenderStyle = 'raw' | 'grouped';

type RenderOptions = {
  style?: EquationConstraintRenderStyle;
  preserveOrder?: boolean;
};

const CONDITION_PREFIX = '\\text{Conditions: } ';
const EXCLUSION_PREFIX = '\\text{Exclusions: } ';
const BRANCH_CONDITION_PREFIX = '\\text{Branch conditions: } ';
const PRINCIPAL_RANGE_PREFIX = '\\text{Principal range: } ';
const RELATIONS: ExactSupplementRelation[] = ['\\ne0', '\\ge0', '>0', '=0', '<0'];

const SOURCE_ORDER: EquationConstraintSource[] = [
  'denominator',
  'radical-domain',
  'log-domain',
  'trig-range',
  'integer-parameter',
  'branch-validity',
  'candidate-validation',
  'legacy',
];

export function normalizeConstraintLatex(latex: string) {
  const trimmed = latex.trim();
  const reciprocalNonzero = trimmed.match(/^\\frac\{1\}\{(.+)\}\\ne0$/);
  if (reciprocalNonzero) {
    return `${reciprocalNonzero[1]}\\ne0`;
  }

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

export function createEquationConstraint(input: EquationConstraint): EquationConstraint {
  return input;
}

export function equationConstraintsFromLatex(
  entries: readonly string[] = [],
  source: EquationConstraintSource = 'legacy',
): EquationConstraint[] {
  return entries.flatMap((entry) => parseConstraintLatex(entry, source));
}

export function equationConstraintsFromDomainConstraints(
  constraints: readonly SolveDomainConstraint[] = [],
  source: EquationConstraintSource = 'legacy',
): EquationConstraint[] {
  return constraints.flatMap((constraint): EquationConstraint[] => {
    switch (constraint.kind) {
      case 'nonzero':
        return [relationalConstraint('denominator-exclusion', source, constraint.expressionLatex, '\\ne0')];
      case 'positive':
        return [relationalConstraint('log-domain', source, constraint.expressionLatex, '>0')];
      case 'nonnegative':
        return [relationalConstraint('radical-domain', source, constraint.expressionLatex, '\\ge0')];
      case 'carrier-range':
        return [noteConstraint('trig-range', 'trig-range', `${constraint.carrier}\\in[-1,1]`)];
      case 'carrier-square-range':
        return [noteConstraint('trig-range', 'trig-range', `${constraint.carrier}\\in[0,1]`)];
      case 'exp-positive':
        return [noteConstraint('log-domain', 'log-domain', 'exponential carrier is positive')];
      default:
        return [];
    }
  });
}

export function mergeEquationConstraints(
  constraints: readonly EquationConstraint[],
  options: Pick<RenderOptions, 'preserveOrder'> = {},
) {
  const merged = new Map<string, EquationConstraint>();

  for (const constraint of constraints) {
    const key = constraintKey(constraint);
    const existing = merged.get(key);
    if (!existing || compareConstraints(constraint, existing) < 0) {
      merged.set(key, constraint);
    }
  }

  const values = [...merged.values()];
  return options.preserveOrder ? values : values.sort(compareConstraints);
}

export function renderEquationConstraintsLatex(
  constraints: readonly EquationConstraint[],
  options: RenderOptions = {},
) {
  const merged = mergeEquationConstraints(constraints, {
    preserveOrder: options.preserveOrder ?? options.style === 'raw',
  });
  return options.style === 'grouped'
    ? renderGroupedConstraints(merged)
    : renderRawConstraints(merged);
}

export function normalizeEquationConstraintLatex(
  entries?: readonly string[],
  options: RenderOptions = { style: 'raw', preserveOrder: true },
) {
  if (!entries || entries.length === 0) {
    return undefined;
  }

  const rendered = renderEquationConstraintsLatex(
    equationConstraintsFromLatex(entries),
    options,
  );
  return rendered.length > 0 ? rendered : undefined;
}

function parseConstraintLatex(
  latex: string,
  source: EquationConstraintSource,
): EquationConstraint[] {
  const normalized = normalizeConstraintLatex(latex);
  if (normalized.length === 0) {
    return [];
  }

  const prefixedConditions = parsePrefixedRelationalList(normalized, CONDITION_PREFIX, source, 'radical-domain');
  if (prefixedConditions) {
    return prefixedConditions;
  }

  const prefixedExclusions = parsePrefixedRelationalList(normalized, EXCLUSION_PREFIX, source, 'denominator-exclusion');
  if (prefixedExclusions) {
    return prefixedExclusions;
  }

  if (normalized.startsWith(BRANCH_CONDITION_PREFIX)) {
    return [noteConstraint('branch-validity', 'branch-validity', normalized)];
  }

  if (normalized.startsWith(PRINCIPAL_RANGE_PREFIX)) {
    return [noteConstraint('trig-range', 'trig-range', normalized)];
  }

  const relational = parseRelationalConstraint(normalized, source);
  if (relational) {
    return [relational];
  }

  if (/\\in\\mathbb\{Z\}/.test(normalized)) {
    return [noteConstraint('integer-parameter', 'integer-parameter', normalized)];
  }

  return [noteConstraint('note', source, normalized)];
}

function parsePrefixedRelationalList(
  line: string,
  prefix: string,
  source: EquationConstraintSource,
  fallbackKind: EquationConstraintKind,
) {
  if (!line.startsWith(prefix)) {
    return null;
  }

  return line
    .slice(prefix.length)
    .split(',\\;')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => parseRelationalConstraint(entry, source) ?? noteConstraint(fallbackKind, source, entry));
}

function parseRelationalConstraint(
  latex: string,
  source: EquationConstraintSource,
) {
  for (const relation of RELATIONS) {
    if (!latex.endsWith(relation)) {
      continue;
    }

    const expressionLatex = normalizeConstraintLatex(latex.slice(0, -relation.length));
    if (expressionLatex.length === 0) {
      return null;
    }

    return relationalConstraint(kindForRelation(relation, source), source, expressionLatex, relation);
  }

  return null;
}

function relationalConstraint(
  kind: EquationConstraintKind,
  source: EquationConstraintSource,
  expressionLatex: string,
  relation: ExactSupplementRelation,
): EquationConstraint {
  return {
    kind,
    source,
    expressionLatex: expressionLatex.trim(),
    relation,
  };
}

function noteConstraint(
  kind: EquationConstraintKind,
  source: EquationConstraintSource,
  latex: string,
): EquationConstraint {
  return {
    kind,
    source,
    latex: normalizeConstraintLatex(latex),
  };
}

function kindForRelation(
  relation: ExactSupplementRelation,
  source: EquationConstraintSource,
): EquationConstraintKind {
  if (relation === '\\ne0') {
    return 'denominator-exclusion';
  }
  if (source === 'log-domain' || relation === '>0') {
    return 'log-domain';
  }
  return 'radical-domain';
}

function renderRawConstraints(constraints: readonly EquationConstraint[]) {
  return constraints
    .map((constraint) => {
      if (constraint.expressionLatex && constraint.relation) {
        return `${constraint.expressionLatex}${constraint.relation}`;
      }
      return constraint.latex;
    })
    .filter((entry): entry is string => Boolean(entry && entry.trim().length > 0));
}

function renderGroupedConstraints(constraints: readonly EquationConstraint[]) {
  return mergeExactSupplementLatex({
    entries: constraints.map(exactSupplementEntryFromConstraint),
    source: 'legacy',
  });
}

function exactSupplementEntryFromConstraint(constraint: EquationConstraint): ExactSupplementEntry {
  if (constraint.expressionLatex && constraint.relation) {
    return {
      kind: constraint.relation === '\\ne0' ? 'exclusion' : 'condition',
      expressionLatex: constraint.expressionLatex,
      relation: constraint.relation,
      source: exactSupplementSourceFromConstraint(constraint.source),
    };
  }

  return {
    kind: constraint.kind === 'trig-range'
      ? 'principal-range'
      : constraint.kind === 'branch-validity'
        ? 'branch-condition'
        : 'note',
    latex: constraint.latex ?? '',
    source: exactSupplementSourceFromConstraint(constraint.source),
  };
}

function exactSupplementSourceFromConstraint(source: EquationConstraintSource): ExactSupplementSource {
  switch (source) {
    case 'denominator':
      return 'denominator';
    case 'radical-domain':
    case 'log-domain':
    case 'trig-range':
      return 'radical-domain';
    case 'integer-parameter':
    case 'branch-validity':
      return 'periodic-family';
    case 'candidate-validation':
      return 'candidate-validation';
    default:
      return 'legacy';
  }
}

function constraintKey(constraint: EquationConstraint) {
  if (constraint.expressionLatex && constraint.relation) {
    return `${constraint.kind}:${constraint.expressionLatex.replace(/\s+/g, '')}:${constraint.relation}`;
  }

  return `${constraint.kind}:${(constraint.latex ?? '').replace(/\s+/g, '')}`;
}

function compareConstraints(left: EquationConstraint, right: EquationConstraint) {
  const sourceDiff = SOURCE_ORDER.indexOf(left.source) - SOURCE_ORDER.indexOf(right.source);
  if (sourceDiff !== 0) {
    return sourceDiff;
  }
  return constraintKey(left).localeCompare(constraintKey(right));
}
