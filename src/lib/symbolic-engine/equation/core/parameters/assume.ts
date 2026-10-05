import { demand } from '../execution';
import { rational } from '../algebra/rational';
import { exactPolynomial, rationalForm } from '../decision/rational-form';
import { pieces, sortedDistinct } from '../decision/real-set';
import { zerosOf } from '../decision/univariate';
import type { ExactValue } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { conditionKey, type Condition, type ProblemDomain, type Relation, type RelationProblem } from '../representation/relation';
import {
  compareValues, finiteSet, normalizeSet, setKey, valueExpression, valueKey, type Case, type EquationOutcome, type SolutionSet,
} from '../representation/solution-set';
import { conditionHolds } from './verify';

/**
 * Assumptions: relations on the parameters only, entered beside a problem (a > 0 beside x² = a).
 *
 * The problem is decided without them; then every case whose conditions cannot hold together with the
 * assumptions is dropped, and every case condition the assumptions imply is removed. Decisions are exact:
 * - conditions on one parameter p (rational in p, exact coefficients) are decided by cells: every real zero of a
 *   numerator or denominator, and a rational in every gap and beyond (over ℂ: every zero and one generic rational);
 *   all signs are constant between samples, so a conjunction holds somewhere iff it holds at a sample;
 * - a condition on several parameters whose expression is c·∏ pᵢ^eᵢ is decided from the signs each pᵢ can take.
 * Anything else is kept as it is (still true, possibly vacuous), and the result is marked incomplete.
 */
export interface AssumedOutcome { readonly outcome: EquationOutcome; readonly complete: boolean }

const exprOf = (store: ExpressionStore, c: Condition) => ('other' in c ? store.sub(c.expr, c.other) : c.expr);

/** An assumption as a condition (canonical relations are eq, ne, lt and le). */
export function assumptionCondition(store: ExpressionStore, r: Relation): Condition {
  switch (r.op) {
    case 'eq': return { kind: 'equal', expr: r.lhs, other: r.rhs };
    case 'ne': return { kind: 'not-equal', expr: r.lhs, other: r.rhs };
    case 'lt': return { kind: 'positive', expr: store.sub(r.rhs, r.lhs) };
    case 'le': return { kind: 'nonnegative', expr: store.sub(r.rhs, r.lhs) };
  }
}

function negation(store: ExpressionStore, c: Condition): Condition | undefined {
  switch (c.kind) {
    case 'positive': return { kind: 'nonnegative', expr: store.neg(c.expr) };
    case 'nonnegative': return { kind: 'positive', expr: store.neg(c.expr) };
    case 'nonzero': return { kind: 'equal', expr: c.expr, other: store.integer(0) };
    case 'equal': return { kind: 'not-equal', expr: c.expr, other: c.other };
    case 'not-equal': return { kind: 'equal', expr: c.expr, other: c.other };
    case 'in-domain': return undefined;
  }
}

/** Sample values of one parameter at which every condition's sign pattern occurs; undefined when not decidable here. */
export function parameterSamples(store: ExpressionStore, conditions: readonly Condition[], p: string, domain: ProblemDomain): ExprId[] | undefined {
  const ctx = store.ctx, critical: ExactValue[] = [];
  for (const c of conditions) {
    ctx.tick();
    if (c.kind === 'in-domain') return undefined;
    const r = rationalForm(store, exprOf(store, c), p);
    if (!r.ok) return undefined;
    for (const part of [r.form.num, r.form.den]) {
      const e = exactPolynomial(store, part, domain);
      if (e.kind !== 'ok') return undefined;
      const zero = e.poly.kind === 'rational' ? e.poly.poly.coefficients.length === 0 : e.poly.coefficients.length === 0;
      if (!zero) critical.push(...zerosOf(store, e.poly, domain));
    }
  }
  if (domain === 'real') return pieces(store, sortedDistinct(store, critical)).map(x => (x.kind === 'open' ? store.number(x.sample) : valueExpression(store, x.value)));
  const distinct = new Map(critical.map(v => [valueKey(store, v), v] as const));
  let n = 0, t = rational(ctx, 0n);
  // One generic rational: not a zero of anything above (there are finitely many).
  while ([...distinct.values()].some(v => compareValues(store, v, { kind: 'rational', value: t }) === 0)) {
    n++;
    t = rational(ctx, BigInt(n % 2 ? (n + 1) / 2 : -n / 2));
  }
  return [...[...distinct.values()].map(v => valueExpression(store, v)), store.number(t)];
}

/** Whether the conditions on one parameter (or none) can hold together; undefined when not decidable here. */
function satisfiable(store: ExpressionStore, conditions: readonly Condition[], domain: ProblemDomain): boolean | undefined {
  const params = store.freeSymbols(...conditions.map(c => exprOf(store, c)));
  if (params.length > 1) return undefined;
  const p = params[0] ?? '_';
  const samples = parameterSamples(store, conditions, p, domain);
  if (!samples) return undefined;
  return samples.some(e => conditions.every(c => conditionHolds(store, c, new Map([[p, e]]), domain)));
}

type Signs = ReadonlySet<-1 | 0 | 1>;

/** c·∏ pᵢ^eᵢ with integer eᵢ ≠ 0, or undefined. */
function monomial(store: ExpressionStore, id: ExprId): { sign: number; powers: [string, bigint][] } | undefined {
  const node = store.node(id), factors = node.kind === 'mul' ? node.args : [id];
  let sign = 1;
  const powers: [string, bigint][] = [];
  for (const f of factors) {
    const n = store.node(f), q = store.numberValue(f);
    if (q !== undefined) { if (q.numerator === 0n) return undefined; sign *= q.numerator < 0n ? -1 : 1; continue; }
    if (n.kind === 'symbol') { powers.push([n.name, 1n]); continue; }
    const e = n.kind === 'pow' ? store.numberValue(n.exponent) : undefined;
    if (n.kind !== 'pow' || store.node(n.base).kind !== 'symbol' || !e || e.denominator !== 1n || e.numerator === 0n) return undefined;
    powers.push([(store.node(n.base) as { name: string }).name, e.numerator]);
  }
  return { sign, powers };
}

/** Truth of a monomial condition over every combination of possible signs: true, false or undefined (mixed). */
function monomialTruth(store: ExpressionStore, c: Condition, signs: ReadonlyMap<string, Signs>): boolean | undefined {
  if (c.kind === 'in-domain') return undefined;
  const m = monomial(store, exprOf(store, c));
  if (!m || m.powers.some(([p]) => !signs.has(p))) return undefined;
  let values: (number | 'undefined')[] = [m.sign];
  for (const [p, e] of m.powers) {
    store.ctx.tick(values.length);
    const next: (number | 'undefined')[] = [];
    for (const v of values) for (const s of signs.get(p) as Signs) {
      if (v === 'undefined' || (s === 0 && e < 0n)) next.push('undefined');
      else next.push(v * (s === 0 ? 0 : s < 0 && e % 2n !== 0n ? -1 : 1));
    }
    values = [...new Set(next)];
  }
  const kind = c.kind;
  const truth = values.map(v => v !== 'undefined' && ({ positive: v > 0, nonnegative: v >= 0, nonzero: v !== 0, equal: v === 0, 'not-equal': v !== 0 })[kind]);
  return truth.every(Boolean) ? true : truth.some(Boolean) ? undefined : false;
}

/** The kept conditions of one case, or undefined when the case cannot hold under the assumptions. */
function prune(store: ExpressionStore, conditions: readonly Condition[], assumptions: readonly Condition[], domain: ProblemDomain): { kept: Condition[]; complete: boolean } | undefined {
  const single = (c: Condition) => store.freeSymbols(exprOf(store, c)).length <= 1;
  const group = (cs: readonly Condition[], c: Condition) => {
    const own = store.freeSymbols(exprOf(store, c));
    return cs.filter(k => single(k) && store.freeSymbols(exprOf(store, k)).every(s => own.includes(s)) && (own.length === 1 || store.freeSymbols(exprOf(store, k)).length === 0));
  };
  let complete = true;
  const all = [...conditions, ...assumptions];
  // One group per parameter: the case is dropped when a group cannot hold.
  for (const p of store.freeSymbols(...all.map(c => exprOf(store, c)))) {
    const own = all.filter(c => single(c) && store.freeSymbols(exprOf(store, c)).includes(p));
    if (own.length === 0) continue;
    const s = satisfiable(store, own, domain);
    if (s === false) return undefined;
    if (s === undefined) complete = false;
  }
  if (satisfiable(store, all.filter(c => store.freeSymbols(exprOf(store, c)).length === 0), domain) === false) return undefined;
  let kept = [...conditions];
  for (const c of conditions) {
    store.ctx.tick();
    const rest = [...kept.filter(k => k !== c), ...assumptions];
    if (single(c)) {
      const not = negation(store, c);
      const s = not && satisfiable(store, [...group(rest, c), not], domain);
      if (s === false) kept = kept.filter(k => k !== c);
      else if (s === undefined) complete = false;
      continue;
    }
    // Several parameters: the signs each one can take under the single-parameter conditions.
    const signs = new Map<string, Signs>();
    for (const p of store.freeSymbols(exprOf(store, c))) {
      const own = rest.filter(k => single(k) && store.freeSymbols(exprOf(store, k)).includes(p)), x = store.symbol(p), zero = store.integer(0);
      const possible = ([-1, 0, 1] as const).filter(s => satisfiable(store, [...own, s === 0 ? { kind: 'equal', expr: x, other: zero } : { kind: 'positive', expr: s > 0 ? x : store.neg(x) }], domain) !== false);
      signs.set(p, new Set(possible));
    }
    const t = domain === 'real' ? monomialTruth(store, c, signs) : undefined;
    if (t === false) return undefined;
    if (t === true) kept = kept.filter(k => k !== c);
    else complete = false;
  }
  return { kept, complete };
}

const isEmpty = (s: SolutionSet) => s.kind === 'finite' && s.points.length === 0;

/** Apply assumptions to a decided outcome (see the module comment). Non-case answers are unchanged. */
export function assumeOutcome(problem: RelationProblem, assumptions: readonly Relation[], outcome: EquationOutcome): AssumedOutcome {
  const store = problem.store;
  if (assumptions.length === 0 || outcome.kind !== 'solved' || outcome.set.kind !== 'case-tree') return { outcome, complete: true };
  const given = assumptions.map(r => assumptionCondition(store, r));
  const cases: Case[] = [];
  let complete = true;
  for (const c of outcome.set.cases) {
    const r = prune(store, c.conditions, given, problem.domain);
    if (!r) continue;
    complete &&= r.complete;
    cases.push({ conditions: r.kept, set: c.set });
  }
  const proof = outcome.proof;
  if (cases.every(c => isEmpty(c.set))) return { outcome: { kind: 'empty', proof }, complete };
  if (cases.length === 1 && cases[0].conditions.length === 0) return { outcome: { kind: 'solved', set: normalizeSet(store, cases[0].set, problem.domain), proof }, complete };
  return { outcome: { kind: 'solved', set: normalizeSet(store, { kind: 'case-tree', cases }, problem.domain), proof }, complete };
}

/** Whether the assumptions can hold together: false only when that is decided exactly. */
export function assumptionsSatisfiable(problem: RelationProblem, assumptions: readonly Relation[]): boolean {
  const store = problem.store, given = assumptions.map(r => assumptionCondition(store, r));
  for (const p of store.freeSymbols(...given.map(c => exprOf(store, c)))) {
    if (satisfiable(store, given.filter(c => { const f = store.freeSymbols(exprOf(store, c)); return f.length === 1 && f[0] === p; }), problem.domain) === false) return false;
  }
  return satisfiable(store, given.filter(c => store.freeSymbols(exprOf(store, c)).length === 0), problem.domain) !== false;
}

// ---- independent evidence ----

const fail = (reason: string): never => demand(false, 'verification-failed', reason) as never;
const casesOf = (o: EquationOutcome, targets: readonly string[]): readonly Case[] =>
  (o.kind === 'empty' ? [{ conditions: [], set: finiteSet(targets, []) }] : o.kind === 'solved' ? (o.set.kind === 'case-tree' ? o.set.cases : [{ conditions: [], set: o.set }]) : []);

/**
 * Evidence for an assumed outcome against the full (independently verified) outcome:
 * - every kept case is a case of the full outcome with a subset of its conditions;
 * - at a grid of parameter values (each parameter's own cell samples, and −2, −1, 0, ½, 1, 2) where every
 *   assumption holds, exactly one assumed case holds, with the same set as the full outcome's case there;
 * - re-deriving gives the same outcome.
 */
export function verifyAssumedOutcome(problem: RelationProblem, assumptions: readonly Relation[], full: EquationOutcome, assumed: EquationOutcome): void {
  const store = problem.store, domain = problem.domain, ctx = store.ctx;
  if (full.kind !== 'solved' && full.kind !== 'empty') { if (assumed !== full) fail('an assumed outcome changes a non-answer'); return; }
  if (assumed.kind !== 'solved' && assumed.kind !== 'empty') return fail('assumptions turned an answer into a non-answer');
  const fullCases = casesOf(full, problem.targets), kept = casesOf(assumed, problem.targets);
  const norm = (s: SolutionSet) => setKey(store, normalizeSet(store, s, domain));
  for (const k of kept) {
    const keys = new Set(k.conditions.map(c => conditionKey(store, c)));
    const source = fullCases.some(f => norm(f.set) === norm(k.set) && f.conditions.filter(c => keys.has(conditionKey(store, c))).length === keys.size);
    if (!source && !(isEmpty(k.set) && k.conditions.length === 0)) fail('a kept case is not a case of the full outcome');
  }
  const given = assumptions.map(r => assumptionCondition(store, r));
  const allConditions = [...given, ...fullCases.flatMap(c => c.conditions)];
  const grid: Map<string, ExprId>[] = [new Map()];
  const fixed = [-2n, -1n, 0n, 1n, 2n].map(n => store.integer(n)).concat(store.fraction(1, 2));
  for (const p of problem.parameters) {
    const own = allConditions.filter(c => { const f = store.freeSymbols(exprOf(store, c)); return f.length === 1 && f[0] === p; });
    const values = [...(parameterSamples(store, own, p, domain) ?? []), ...fixed];
    const next: Map<string, ExprId>[] = [];
    for (const g of grid) for (const v of values) { ctx.tick(); next.push(new Map([...g, [p, v]])); }
    grid.splice(0, grid.length, ...next);
  }
  for (const sample of grid) {
    ctx.tick();
    if (!given.every(c => conditionHolds(store, c, sample, domain))) continue;
    const f = fullCases.filter(c => c.conditions.every(k => conditionHolds(store, k, sample, domain)));
    if (f.length !== 1) continue;
    const a = kept.filter(c => c.conditions.every(k => conditionHolds(store, k, sample, domain)));
    if (a.length !== 1) fail(a.length ? 'assumed cases overlap at a sample' : 'no assumed case covers a sample');
    if (norm(a[0].set) !== norm(f[0].set)) fail('an assumed case differs from the full outcome at a sample');
  }
  const again = assumeOutcome(problem, assumptions, full).outcome;
  if (again.kind !== assumed.kind || (again.kind === 'solved' && assumed.kind === 'solved' && norm(again.set) !== norm(assumed.set))) fail('re-deriving the assumed outcome differs');
}
