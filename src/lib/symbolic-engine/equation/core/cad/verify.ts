import { demand } from '../execution';
import { rational } from '../algebra/rational';
import { evaluateExact, type ExactValue } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { relationProblem, type Condition, type Formula, type Relation, type RelationProblem } from '../representation/relation';
import {
  assertOutcome, compareValues, finiteSet, normalizeSet, type Endpoint, type EquationOutcome, type PointValue, type RegionCell, type SolutionSet,
} from '../representation/solution-set';
import { exactSign } from '../representation/real-order';
import { instantiate } from '../parameters/specialize';
import { cadProblem } from './atoms';
import { decompose, sectorSample, type CadCell } from './decompose';
import { locate } from './locate';
import { hasQuantifier } from '../representation/formula';
import { fiberRoots } from './fiber';
import { fromMPoly } from './recursive';
import { fractionOf } from '../parameters/mpoly';

/**
 * Evidence for answers decided by cylindrical decomposition (EQUATION-SEMIALGEBRAIC1), at re-derivation strength:
 *
 * 1. Every claimed cell is non-empty and inside the solutions: at one sample point of it, chosen from its own ends
 *    (outer coordinates first), the original rows hold — decided by exact evaluation of the rows themselves, not of
 *    the polynomials the decomposition worked with.
 * 2. Nothing is missing or extra: an independent decomposition in another variable order (the unknowns reversed)
 *    has cells on which the rows' truth is constant; at each cell's sample the claimed answer must contain the point
 *    exactly when the rows hold there.
 */
const fail = (reason: string): never => demand(false, 'verification-failed', reason) as never;

const valueExpression = (store: ExpressionStore, v: ExactValue): ExprId => (v.kind === 'rational' ? store.number(v.value) : store.algebraic(v.root));

/** The sign of an expression at a point, or undefined outside its natural domain. */
function signAt(store: ExpressionStore, e: ExprId, env: ReadonlyMap<string, ExprId>): number | undefined {
  const r = evaluateExact(store, store.substitute(e, env), 'real');
  if (r.kind === 'undefined') return undefined;
  if (r.kind !== 'exact') return fail(`a row could not be evaluated exactly at a sample (${r.detail})`);
  return exactSign(store.ctx, r.value);
}

function relationHolds(store: ExpressionStore, r: Relation, env: ReadonlyMap<string, ExprId>): boolean {
  const s = signAt(store, store.sub(r.lhs, r.rhs), env);
  if (s === undefined) return false;
  return r.op === 'eq' ? s === 0 : r.op === 'ne' ? s !== 0 : r.op === 'lt' ? s < 0 : s <= 0;
}

function formulaHolds(store: ExpressionStore, f: Formula, env: ReadonlyMap<string, ExprId>): boolean {
  if (f.kind === 'rel') return relationHolds(store, f.rel, env);
  if (f.kind === 'and') return f.args.every(g => formulaHolds(store, g, env));
  if (f.kind === 'or') return f.args.some(g => formulaHolds(store, g, env));
  return fail('a quantifier in a decomposition answer');
}

/** Whether the problem's rows hold at a point (one exact value per target). */
export function rowsHold(problem: RelationProblem, point: readonly ExactValue[]): boolean {
  const store = problem.store, env = new Map(problem.targets.map((t, i) => [t, valueExpression(store, point[i])] as const));
  // Every row must be defined at the point (its natural domain), then hold.
  for (const r of problem.relations) if (!relationHolds(store, r, env)) return false;
  for (const c of problem.conditions) {
    if (c.kind === 'in-domain') continue;
    const s = signAt(store, 'other' in c ? store.sub(c.expr, c.other) : c.expr, env);
    if (s === undefined) return false;
    const ok = c.kind === 'nonzero' || c.kind === 'not-equal' ? s !== 0 : c.kind === 'positive' ? s > 0 : c.kind === 'nonnegative' ? s >= 0 : s === 0;
    if (!ok) return false;
  }
  return problem.formulas.every(f => formulaHolds(store, f, env));
}

/** A cell end at a point of the outer variables, exactly. */
/**
 * A cell end (or point coordinate) at a point: `names` is the order of the point's coordinates, `outer` the values of
 * the names before this one. Closed forms are evaluated by substitution, roots by the decomposition's fibres.
 */
function endAt(problem: RelationProblem, e: Endpoint, outer: readonly ExactValue[], names: readonly string[] = problem.targets): Endpoint {
  if (e.kind === 'infinity' || e.kind === 'rational' || e.kind === 'algebraic') return e;
  const store = problem.store;
  if (e.kind === 'root') {
    // The index-th root of the cell's polynomial at the outer point, by the decomposition's fibres (norms by resultants).
    const k = names.indexOf(e.variable) + 1, f = fractionOf(store, e.poly, names.slice(0, k));
    if (k !== outer.length + 1 || !f) return fail('a cell end is not a root in its cell\'s variable');
    const roots = fiberRoots(store, fromMPoly(store.ctx, f.num, names.slice(0, k).map((_, i) => i + 1), k), k, outer);
    return roots !== 'nullified' && e.index <= roots.length ? roots[e.index - 1] : fail('a cell end is not defined over its cell');
  }
  const values = new Map(outer.map((v, i) => [names[i], valueExpression(store, v)] as const));
  const set = instantiate(store, finiteSet([names[outer.length]], [[e as PointValue]]), values, 'real');
  if (!set || set.kind !== 'finite' || set.points.length !== 1) return fail('a cell end is not defined over its cell');
  return set.points[0][0];
}

const compareEnd = (store: ExpressionStore, a: Endpoint, b: ExactValue): number => (a.kind === 'infinity' ? a.sign : compareValues(store, a, b));
function inside(store: ExpressionStore, lo: Endpoint, hi: Endpoint, loClosed: boolean, hiClosed: boolean, v: ExactValue): boolean {
  const a = compareEnd(store, lo, v), b = compareEnd(store, hi, v);
  return (a < 0 || (a === 0 && loClosed)) && (b > 0 || (b === 0 && hiClosed));
}

/** Whether a parameter case's conditions hold at the parameters' values (exactly). */
function conditionsHold(problem: RelationProblem, conditions: readonly Condition[], env: ReadonlyMap<string, ExprId>): boolean {
  const store = problem.store;
  return conditions.every(c => {
    const s = signAt(store, 'other' in c ? store.sub(c.expr, c.other) : c.expr, env);
    if (s === undefined) return false;
    return c.kind === 'equal' ? s === 0 : c.kind === 'positive' ? s > 0 : c.kind === 'nonnegative' ? s >= 0 : c.kind === 'in-domain' ? true : s !== 0;
  });
}

/**
 * Whether the claimed answer contains a point whose coordinates follow `names` (the parameters, then the unknowns);
 * `start` is the first coordinate the set describes. A case tree must have exactly one case holding there.
 */
export function contains(problem: RelationProblem, set: SolutionSet, point: readonly ExactValue[], names: readonly string[] = problem.targets, start = 0): boolean {
  const store = problem.store;
  if (set.kind === 'case-tree') {
    const env = new Map(names.slice(0, problem.parameters.length).map((n, i) => [n, valueExpression(store, point[i])] as const));
    const holding = set.cases.filter(c => conditionsHold(problem, c.conditions, env));
    if (holding.length !== 1) return fail(holding.length ? 'cases overlap' : 'no case covers a parameter value');
    return contains(problem, holding[0].set, point, names, problem.parameters.length);
  }
  if (set.kind === 'finite') {
    return set.points.some(p => p.every((v, i) => {
      const at = endAt(problem, v, point.slice(0, start + i), names);
      return at.kind !== 'infinity' && compareValues(store, at, point[start + i]) === 0;
    }));
  }
  if (set.kind !== 'cylindrical' && set.kind !== 'intervals') return fail(`a decomposition answer is never ${set.kind}`);
  let cells: readonly RegionCell[] | undefined = set.kind === 'cylindrical' ? set.cells : set.intervals;
  for (let d = start; d < point.length; d++) {
    store.ctx.tick();
    if (!cells) return true;
    const outer = point.slice(0, d), v = point[d];
    const cell: RegionCell | undefined = cells.find(c => inside(store, endAt(problem, c.lo, outer, names), endAt(problem, c.hi, outer, names), c.loClosed, c.hiClosed, v));
    if (!cell) return false;
    cells = cell.children;
  }
  return true;
}

/** One sample point per claimed cell (outer coordinates first; free variables at 0). */
function claimedSamples(problem: RelationProblem, set: SolutionSet): ExactValue[][] {
  const store = problem.store, ctx = store.ctx, n = problem.targets.length, out: ExactValue[][] = [];
  if (set.kind === 'finite') return set.points.map(p => p.map(v => (v.kind === 'rational' || v.kind === 'algebraic' ? v as ExactValue : fail('a point of a decomposition answer is not exact'))));
  const exact = (e: Endpoint): ExactValue | undefined => (e.kind === 'infinity' ? undefined : e.kind === 'rational' || e.kind === 'algebraic' ? e as ExactValue : fail('a cell end did not evaluate exactly'));
  const walk = (cells: readonly RegionCell[], outer: readonly ExactValue[]): void => {
    for (const c of cells) {
      ctx.tick();
      const lo = exact(endAt(problem, c.lo, outer)), hi = exact(endAt(problem, c.hi, outer));
      let v: ExactValue;
      if (lo && hi && compareValues(store, lo, hi) === 0) v = lo;
      else {
        if (lo && hi && compareValues(store, lo, hi) > 0) fail('a reversed cell');
        v = { kind: 'rational', value: sectorSample(ctx, lo, hi) };
      }
      const point = [...outer, v];
      if (c.children) walk(c.children, point);
      else out.push([...point, ...Array.from({ length: n - point.length }, (): ExactValue => ({ kind: 'rational', value: rational(ctx, 0n) }))]);
    }
  };
  walk(set.kind === 'intervals' ? set.intervals : (set as Extract<SolutionSet, { kind: 'cylindrical' }>).cells, []);
  return out;
}

function leaves(c: CadCell): CadCell[] { return c.children ? c.children.flatMap(leaves) : [c]; }

/** The problem with its unknowns fixed at rational values: only quantified names remain (a decided statement). */
function atRationalPoint(problem: RelationProblem, point: readonly ExactValue[]): RelationProblem {
  const s = problem.store, env = new Map(problem.targets.map((t, i) => [t, valueExpression(s, point[i])] as const));
  const sub = (e: ExprId) => s.substitute(e, env);
  const formula = (f: Formula): Formula => {
    if (f.kind === 'rel') return { kind: 'rel', rel: { ...f.rel, lhs: sub(f.rel.lhs), rhs: sub(f.rel.rhs) } };
    if (f.kind === 'and' || f.kind === 'or') return { kind: f.kind, args: f.args.map(formula) };
    return { ...f, body: formula(f.body) };
  };
  return relationProblem(s, {
    domain: 'real', targets: [], relations: problem.relations.map(r => ({ op: r.op, lhs: sub(r.lhs), rhs: sub(r.rhs) })),
    conditions: problem.conditions.map(c => ('other' in c ? { ...c, expr: sub(c.expr), other: sub(c.other) } : { ...c, expr: sub(c.expr) })),
    formulas: problem.formulas.map(formula),
  });
}

export function verifyCadOutcome(problem: RelationProblem, outcome: EquationOutcome): void {
  assertOutcome(outcome);
  if (outcome.kind !== 'solved' && outcome.kind !== 'empty') return;
  if (outcome.proof.root !== problem.hash) fail('proof does not start from the problem');
  const store = problem.store, ctx = store.ctx, n = problem.targets.length, quantified = problem.formulas.some(hasQuantifier);
  const claimed = outcome.kind === 'solved' ? normalizeSet(store, outcome.set, 'real') : n ? finiteSet(problem.targets, []) : fail('a statement is true or false');
  // Coordinates: the parameters, then the unknowns.
  const names = [...problem.parameters, ...problem.targets];
  // A decomposition in the reversed variable order (with quantifiers: lifted in full, every cell, no early truth).
  const order = [...names].reverse(), p = cadProblem(problem, order);
  if (!p) return fail('the problem is not polynomial');
  const second = decompose(store, p, { full: quantified });
  if (claimed.kind === 'truth') {
    if (n !== 0 || second.free !== 0 || claimed.value !== (second.root.truth === true)) fail('the statement\'s truth differs from a second decomposition');
    return;
  }
  const reorder = (sample: readonly ExactValue[]) => names.map(t => sample[order.indexOf(t)]);
  // 1. Each claimed cell holds at a sample of it: the rows themselves, exactly; quantified rows by deciding the
  //    statement at a rational sample (a smaller decomposition), or by the second decomposition's cell there.
  //    Answers with parameters are checked by step 2 alone (case trees: the cases disjoint and covering).
  for (const pt of problem.parameters.length ? [] : claimedSamples(problem, claimed)) {
    ctx.tick();
    let holds: boolean;
    if (!quantified) holds = rowsHold(problem, pt);
    else if (pt.every(v => v.kind === 'rational')) {
      const q = cadProblem(atRationalPoint(problem, pt), []);
      holds = q ? decompose(store, q).root.truth === true : fail('a sample statement is not polynomial');
    } else holds = locate(store, second, order.map(t => pt[problem.targets.indexOf(t)])).truth;
    if (!holds) fail('a claimed cell does not satisfy the rows at its sample');
  }
  // 2. The second decomposition agrees at every one of its cells.
  const zero: ExactValue = { kind: 'rational', value: rational(ctx, 0n) };
  for (const leaf of leaves(second.root)) {
    ctx.tick();
    const point = reorder([...leaf.sample, ...Array.from({ length: second.free - leaf.level }, () => zero)]);
    if (contains(problem, claimed, point, names, claimed.kind === 'case-tree' ? 0 : problem.parameters.length) !== (leaf.truth === true)) fail('the answer differs from a decomposition in another variable order');
  }
}
