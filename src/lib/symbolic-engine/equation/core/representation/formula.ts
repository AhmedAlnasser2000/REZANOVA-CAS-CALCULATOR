import { demand } from '../execution';
import { isSymbolName, type ExprId, type ExpressionStore } from './expression';
import { canonicalRelation, formulaKey, type Formula, type Relation, type RelationInput } from './relation';

export { formulaKey, type Formula };

/**
 * Formulas (EQUATION-SEMIALGEBRAIC1): a row may combine relations with ∧, ∨ and ¬ and quantify variables with ∀
 * and ∃. Negation never survives reading: it is pushed onto the relations (¬(a < b) is b ≤ a, ¬(a = b) is a ≠ b,
 * De Morgan for ∧ and ∨, ∀ and ∃ exchanged), so a formula is a tree of relations under ∧, ∨, ∀ and ∃ in negation
 * normal form. Formulas are canonical: relations canonical, ∧ and ∨ flattened, their arguments deduplicated and
 * sorted by key, so the problem hash does not depend on how a row was typed.
 */
/** Input before canonicalization: relations in any operator, and ¬. */
export type FormulaInput =
  | { readonly kind: 'rel'; readonly rel: RelationInput }
  | { readonly kind: 'and'; readonly args: readonly FormulaInput[] }
  | { readonly kind: 'or'; readonly args: readonly FormulaInput[] }
  | { readonly kind: 'not'; readonly arg: FormulaInput }
  | { readonly kind: 'forall'; readonly variable: string; readonly body: FormulaInput }
  | { readonly kind: 'exists'; readonly variable: string; readonly body: FormulaInput };

/** The negation of a canonical relation, canonical. */
export function negateRelation(store: ExpressionStore, r: Relation): Relation {
  switch (r.op) {
    case 'eq': return canonicalRelation(store, { op: 'ne', lhs: r.lhs, rhs: r.rhs });
    case 'ne': return canonicalRelation(store, { op: 'eq', lhs: r.lhs, rhs: r.rhs });
    case 'lt': return canonicalRelation(store, { op: 'le', lhs: r.rhs, rhs: r.lhs });
    case 'le': return canonicalRelation(store, { op: 'lt', lhs: r.rhs, rhs: r.lhs });
  }
}

/** Canonical negation normal form of a row's formula (recursion depth is the row's nesting of connectives). */
export function canonicalFormula(store: ExpressionStore, input: FormulaInput, negated = false): Formula {
  store.ctx.tick();
  switch (input.kind) {
    case 'rel': {
      const r = canonicalRelation(store, input.rel);
      return Object.freeze({ kind: 'rel', rel: negated ? negateRelation(store, r) : r });
    }
    case 'not': return canonicalFormula(store, input.arg, !negated);
    case 'and': case 'or': {
      const kind = (input.kind === 'and') !== negated ? 'and' : 'or';
      demand(input.args.length > 0, 'invalid-input', 'an empty connective');
      return junction(store, kind, input.args.map(a => canonicalFormula(store, a, negated)));
    }
    case 'forall': case 'exists': {
      demand(isSymbolName(input.variable), 'invalid-input', 'a quantified variable');
      const kind = (input.kind === 'forall') !== negated ? 'forall' : 'exists';
      return Object.freeze({ kind, variable: input.variable, body: canonicalFormula(store, input.body, negated) });
    }
  }
}

/** ∧ or ∨ of canonical formulas: flattened, deduplicated, sorted; a single argument stands alone. */
export function junction(store: ExpressionStore, kind: 'and' | 'or', args: readonly Formula[]): Formula {
  const flat: Formula[] = [];
  for (const a of args) if (a.kind === kind) flat.push(...a.args); else flat.push(a);
  const byKey = new Map(flat.map(a => [formulaKey(store, a), a] as const));
  const sorted = [...byKey.keys()].sort().map(k => byKey.get(k) as Formula);
  return sorted.length === 1 ? sorted[0] : Object.freeze({ kind, args: Object.freeze(sorted) });
}

/** Every relation in a formula. */
export function formulaRelations(f: Formula): Relation[] {
  const out: Relation[] = [], pending: Formula[] = [f];
  while (pending.length) {
    const g = pending.pop() as Formula;
    if (g.kind === 'rel') out.push(g.rel);
    else if (g.kind === 'and' || g.kind === 'or') pending.push(...g.args);
    else pending.push(g.body);
  }
  return out;
}

export const formulaRoots = (f: Formula): ExprId[] => formulaRelations(f).flatMap(r => [r.lhs, r.rhs]);

/** The variables bound by ∀ and ∃ anywhere in the formula. */
export function boundVariables(f: Formula): string[] {
  const out = new Set<string>(), pending: Formula[] = [f];
  while (pending.length) {
    const g = pending.pop() as Formula;
    if (g.kind === 'forall' || g.kind === 'exists') { out.add(g.variable); pending.push(g.body); }
    else if (g.kind === 'and' || g.kind === 'or') pending.push(...g.args);
  }
  return [...out].sort();
}

export const hasQuantifier = (f: Formula): boolean => boundVariables(f).length > 0;

/** The free symbols of a formula (bound variables excluded within their scope). */
export function formulaFreeSymbols(store: ExpressionStore, f: Formula): string[] {
  const out = new Set<string>();
  const walk = (g: Formula, bound: ReadonlySet<string>): void => {
    store.ctx.tick();
    if (g.kind === 'rel') { for (const s of store.freeSymbols(g.rel.lhs, g.rel.rhs)) if (!bound.has(s)) out.add(s); return; }
    if (g.kind === 'and' || g.kind === 'or') { g.args.forEach(a => walk(a, bound)); return; }
    walk(g.body, new Set([...bound, g.variable]));
  };
  walk(f, new Set());
  return [...out].sort();
}

/**
 * Disjunctive normal form of a conjunction of quantifier-free formulas: the list of conjunctions (each a list of
 * relations) whose union is the formula. Its size is the product of the disjunctions' sizes; it is built under the
 * budget only (every conjunction is charged), never truncated.
 */
export function disjunctiveForm(store: ExpressionStore, formulas: readonly Formula[]): Relation[][] {
  const ctx = store.ctx;
  const of = (f: Formula): Relation[][] => {
    ctx.tick();
    switch (f.kind) {
      case 'rel': return [[f.rel]];
      case 'or': return f.args.flatMap(of);
      case 'and': return f.args.map(of).reduce((acc, next) => product(acc, next), [[]] as Relation[][]);
      default: return demand(false, 'invalid-input', 'a quantifier in a quantifier-free form') as never;
    }
  };
  const product = (a: Relation[][], b: Relation[][]): Relation[][] => {
    const out: Relation[][] = [];
    for (const x of a) for (const y of b) { ctx.tick(); ctx.allocate(x.length + y.length); out.push([...x, ...y]); }
    return out;
  };
  return formulas.map(of).reduce((acc, next) => product(acc, next), [[]] as Relation[][]);
}
