import { demand } from '../execution';
import { sha256 } from './digest';
import { isSymbolName, type ExprId, type ExpressionStore } from './expression';

/**
 * A relation problem: what is asked, over which domain, about which
 * variables, under which conditions. Problems are immutable and canonical:
 * `>`/`≥` become `<`/`≤` by swapping sides, `=`/`≠` sides are ordered by
 * digest, and every list is sorted and deduplicated. The state hash is a
 * SHA-256 over that canonical content, independent of the store's ids.
 */
export const RELATION_OPERATORS = ['eq', 'ne', 'lt', 'le', 'gt', 'ge'] as const;
export type RelationOperator = (typeof RELATION_OPERATORS)[number];
export type CanonicalOperator = Exclude<RelationOperator, 'gt' | 'ge'>;
export type ProblemDomain = 'real' | 'complex';

export interface Relation { readonly op: CanonicalOperator; readonly lhs: ExprId; readonly rhs: ExprId }

export const CONDITION_KINDS = ['nonzero', 'positive', 'nonnegative', 'equal', 'not-equal', 'in-domain'] as const;
export type ConditionKind = (typeof CONDITION_KINDS)[number];
/** `equal` and `not-equal` compare `expr` with `other`; the other kinds concern `expr` alone. */
export type Condition =
  | { readonly kind: Exclude<ConditionKind, 'equal' | 'not-equal'>; readonly expr: ExprId }
  | { readonly kind: 'equal' | 'not-equal'; readonly expr: ExprId; readonly other: ExprId };

/** Generator slot (filled by later slices): a symbol standing for a defining expression. */
export interface Generator { readonly symbol: string; readonly definition: ExprId }

export interface RelationProblem {
  readonly store: ExpressionStore;
  readonly domain: ProblemDomain;
  readonly relations: readonly Relation[];
  readonly targets: readonly string[];
  /** Free symbols that are not targets, derived. */
  readonly parameters: readonly string[];
  readonly conditions: readonly Condition[];
  readonly generators: readonly Generator[];
  /** Constraint store slot (filled by later slices). */
  readonly constraints: readonly Condition[];
  readonly hash: string;
}

export interface RelationInput { readonly op: RelationOperator; readonly lhs: ExprId; readonly rhs: ExprId }
export interface ProblemInput {
  readonly domain: ProblemDomain;
  readonly relations: readonly RelationInput[];
  readonly targets: readonly string[];
  readonly conditions?: readonly Condition[];
  readonly generators?: readonly Generator[];
  readonly constraints?: readonly Condition[];
}

export function canonicalRelation(store: ExpressionStore, r: RelationInput): Relation {
  demand((RELATION_OPERATORS as readonly string[]).includes(r.op), 'invalid-input', 'relation operator');
  store.node(r.lhs); store.node(r.rhs);
  if (r.op === 'gt') return Object.freeze({ op: 'lt', lhs: r.rhs, rhs: r.lhs });
  if (r.op === 'ge') return Object.freeze({ op: 'le', lhs: r.rhs, rhs: r.lhs });
  if ((r.op === 'eq' || r.op === 'ne') && store.compare(r.lhs, r.rhs) > 0) return Object.freeze({ op: r.op, lhs: r.rhs, rhs: r.lhs });
  return Object.freeze({ op: r.op, lhs: r.lhs, rhs: r.rhs });
}

export function canonicalCondition(store: ExpressionStore, c: Condition): Condition {
  demand(typeof c === 'object' && c !== null && (CONDITION_KINDS as readonly string[]).includes(c.kind), 'invalid-input', 'condition kind');
  store.node(c.expr);
  if (c.kind === 'equal' || c.kind === 'not-equal') {
    store.node(c.other);
    const [a, b] = store.compare(c.expr, c.other) <= 0 ? [c.expr, c.other] : [c.other, c.expr];
    return Object.freeze({ kind: c.kind, expr: a, other: b });
  }
  return Object.freeze({ kind: c.kind, expr: c.expr });
}

export function relationKey(store: ExpressionStore, r: Relation): string { return `${r.op}|${store.digest(r.lhs)}|${store.digest(r.rhs)}`; }
export function conditionKey(store: ExpressionStore, c: Condition): string {
  return 'other' in c ? `${c.kind}|${store.digest(c.expr)}|${store.digest(c.other)}` : `${c.kind}|${store.digest(c.expr)}`;
}
function generatorKey(store: ExpressionStore, g: Generator): string { return `${g.symbol}|${store.digest(g.definition)}`; }

function sortedUnique<T>(items: readonly T[], key: (x: T) => string): readonly T[] {
  const byKey = new Map<string, T>();
  for (const x of items) byKey.set(key(x), x);
  return Object.freeze([...byKey.keys()].sort().map(k => byKey.get(k) as T));
}

export function relationProblem(store: ExpressionStore, input: ProblemInput): RelationProblem {
  const ctx = store.ctx;
  ctx.tick();
  demand(input.domain === 'real' || input.domain === 'complex', 'invalid-input', 'problem domain');
  demand(Array.isArray(input.relations) && Array.isArray(input.targets), 'invalid-input', 'problem shape');
  ctx.allocate(input.relations.length + input.targets.length);
  const relations = sortedUnique(input.relations.map(r => canonicalRelation(store, r)), r => relationKey(store, r));
  demand(input.domain === 'real' || relations.every(r => r.op === 'eq' || r.op === 'ne'), 'invalid-input', 'order relations need the real domain');
  for (const t of input.targets) demand(isSymbolName(t), 'invalid-input', 'target symbol name');
  const targets = Object.freeze([...new Set(input.targets)].sort());
  const conditions = sortedUnique((input.conditions ?? []).map(c => canonicalCondition(store, c)), c => conditionKey(store, c));
  const constraints = sortedUnique((input.constraints ?? []).map(c => canonicalCondition(store, c)), c => conditionKey(store, c));
  for (const g of input.generators ?? []) { demand(isSymbolName(g.symbol), 'invalid-input', 'generator symbol'); store.node(g.definition); }
  const generators = sortedUnique((input.generators ?? []).map(g => Object.freeze({ symbol: g.symbol, definition: g.definition })), g => generatorKey(store, g));
  demand(new Set(generators.map(g => g.symbol)).size === generators.length, 'invalid-input', 'generator defined twice');
  const roots = [...relations.flatMap(r => [r.lhs, r.rhs]), ...[...conditions, ...constraints].flatMap(c => ('other' in c ? [c.expr, c.other] : [c.expr])), ...generators.map(g => g.definition)];
  const taken = new Set([...targets, ...generators.map(g => g.symbol)]);
  const parameters = Object.freeze(store.freeSymbols(...roots).filter(s => !taken.has(s)));
  const text = JSON.stringify({
    v: 1, domain: input.domain, targets, parameters,
    relations: relations.map(r => relationKey(store, r)),
    conditions: conditions.map(c => conditionKey(store, c)),
    generators: generators.map(g => generatorKey(store, g)),
    constraints: constraints.map(c => conditionKey(store, c)),
  });
  return Object.freeze({ store, domain: input.domain, relations, targets, parameters, conditions, generators, constraints, hash: sha256(ctx, text) });
}

/** Same problem with some parts replaced (re-canonicalized and re-hashed). */
export function withChanges(problem: RelationProblem, changes: Partial<ProblemInput>): RelationProblem {
  return relationProblem(problem.store, {
    domain: problem.domain, relations: problem.relations, targets: problem.targets, conditions: problem.conditions,
    generators: problem.generators, constraints: problem.constraints, ...changes,
  });
}
