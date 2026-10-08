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
  /** Rows with ∧, ∨, ∀ or ∃ (EQUATION-SEMIALGEBRAIC1); empty for plain conjunctions, which every slice reads. */
  readonly formulas: readonly Formula[];
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
  /** Rows that combine relations with ∧, ∨, ¬, ∀ or ∃, canonical (`formula.ts`); they hold together with `relations`. */
  readonly formulas?: readonly Formula[];
}

/**
 * A row's formula in negation normal form (EQUATION-SEMIALGEBRAIC1): relations under ∧, ∨, ∀ and ∃. Built and
 * canonicalized by `formula.ts`.
 */
export type Formula =
  | { readonly kind: 'rel'; readonly rel: Relation }
  | { readonly kind: 'and'; readonly args: readonly Formula[] }
  | { readonly kind: 'or'; readonly args: readonly Formula[] }
  | { readonly kind: 'forall'; readonly variable: string; readonly body: Formula }
  | { readonly kind: 'exists'; readonly variable: string; readonly body: Formula };

export function formulaKey(store: ExpressionStore, f: Formula): string {
  switch (f.kind) {
    case 'rel': return `r(${relationKey(store, f.rel)})`;
    case 'and': case 'or': return `${f.kind}(${f.args.map(a => formulaKey(store, a)).join(';')})`;
    case 'forall': case 'exists': return `${f.kind}(${f.variable}:${formulaKey(store, f.body)})`;
  }
}

/** Every relation in a formula, and the variables it binds. */
function formulaParts(f: Formula): { relations: Relation[]; bound: Set<string> } {
  const relations: Relation[] = [], bound = new Set<string>(), pending: Formula[] = [f];
  while (pending.length) {
    const g = pending.pop() as Formula;
    if (g.kind === 'rel') relations.push(g.rel);
    else if (g.kind === 'and' || g.kind === 'or') pending.push(...g.args);
    else { bound.add(g.variable); pending.push(g.body); }
  }
  return { relations, bound };
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
  const formulas = sortedUnique(input.formulas ?? [], f => formulaKey(store, f));
  const parts = formulas.map(formulaParts), bound = new Set(parts.flatMap(p => [...p.bound]));
  demand(input.domain === 'real' || parts.every(p => p.relations.every(r => r.op === 'eq' || r.op === 'ne')), 'invalid-input', 'order relations need the real domain');
  demand(targets.every(t => !bound.has(t)), 'invalid-input', 'a quantified variable cannot be a target');
  const roots = [...relations.flatMap(r => [r.lhs, r.rhs]), ...[...conditions, ...constraints].flatMap(c => ('other' in c ? [c.expr, c.other] : [c.expr])), ...generators.map(g => g.definition)];
  const taken = new Set([...targets, ...generators.map(g => g.symbol)]);
  // Bound variables are not parameters (a quantified name used free in another row is refused by the input layer).
  const formulaSymbols = store.freeSymbols(...parts.flatMap(p => p.relations.flatMap(r => [r.lhs, r.rhs]))).filter(s => !bound.has(s));
  const parameters = Object.freeze([...new Set([...store.freeSymbols(...roots), ...formulaSymbols])].filter(s => !taken.has(s)).sort());
  const text = JSON.stringify({
    v: 1, domain: input.domain, targets, parameters,
    relations: relations.map(r => relationKey(store, r)),
    conditions: conditions.map(c => conditionKey(store, c)),
    generators: generators.map(g => generatorKey(store, g)),
    constraints: constraints.map(c => conditionKey(store, c)),
    ...(formulas.length ? { formulas: formulas.map(f => formulaKey(store, f)) } : {}),
  });
  return Object.freeze({ store, domain: input.domain, relations, targets, parameters, conditions, generators, constraints, formulas, hash: sha256(ctx, text) });
}

/** Same problem with some parts replaced (re-canonicalized and re-hashed). */
export function withChanges(problem: RelationProblem, changes: Partial<ProblemInput>): RelationProblem {
  return relationProblem(problem.store, {
    domain: problem.domain, relations: problem.relations, targets: problem.targets, conditions: problem.conditions,
    generators: problem.generators, constraints: problem.constraints, formulas: problem.formulas, ...changes,
  });
}
