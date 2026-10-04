import { rational, rNegate } from '../algebra/rational';
import { OWNERS } from '../decision/rational-form';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { relationProblem, type Condition, type RelationProblem } from '../representation/relation';
import { finiteSet, valueExpression, type PointValue, type SolutionSet } from '../representation/solution-set';
import type { ParamCase } from '../parameters/cells';
import type { MPoly } from '../parameters/mpoly';
import { decideParametricProblem } from '../parameters/solve';
import type { ParamAtom } from '../parameters/specialize';
import { groebner, type Order, type Poly } from './groebner';
import { quotient, zeroDimensionalPoints } from './zero-dim';

/**
 * Nonlinear polynomial systems without parameters.
 *
 * - The reduced grevlex Gröbner basis {1}: no solution (over ℂ, hence ℝ).
 * - A finite normal set: the solutions are exact points (zero-dim.ts). The
 *   ≠ atoms g are enforced exactly by fresh unknowns u with u·g − 1 = 0
 *   (Rabinowitsch), so a point with g = 0 is not a solution at all.
 * - Otherwise, a lex basis (targets in their order, later ones last) splits
 *   the targets into free trailing ones U (no basis element lies in ℚ[U]) and
 *   dependent ones. The last dependent d is solved by the parameters gate
 *   with U as parameters (its basis elements in ℚ[d, U] as relations); each
 *   earlier dependent must have exactly one basis element, with leading
 *   monomial the dependent itself (v + r(later) = 0), so v = −r. The cases
 *   become parametric sets in U (d free where the gate says every d works),
 *   constrained by the case conditions.
 */
export type SystemResult = { readonly kind: 'cases'; readonly cases: readonly ParamCase[] } | { readonly kind: 'refused'; readonly reason: string };

const zeros = (n: number) => Array.from({ length: n }, () => 0);

/** An MPoly over [targets…] as a Poly in `width` variables (extra ones zero). */
export function toPoly(a: MPoly, n: number, width: number, order: Order, shift: Record<number, number> = {}): Poly {
  const terms = [...a.terms].map(([k, c]) => {
    const e = [...k.split(',').map(Number).slice(0, n), ...zeros(width - n)];
    for (const [i, d] of Object.entries(shift)) e[Number(i)] += d;
    return { e, c };
  });
  return terms.sort((x, y) => cmp(order, y.e, x.e));
}
function cmp(order: Order, a: readonly number[], b: readonly number[]): number {
  if (order === 'grevlex') {
    const da = a.reduce((s, v) => s + v, 0), db = b.reduce((s, v) => s + v, 0);
    if (da !== db) return da - db;
    for (let i = a.length - 1; i >= 0; i--) if (a[i] !== b[i]) return b[i] - a[i];
    return 0;
  }
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

export function polyExpression(store: ExpressionStore, p: Poly, names: readonly string[]): ExprId {
  return store.add(store.integer(0), ...p.map(t => store.mul(store.number(t.c), ...t.e.flatMap((d, i) => (d === 0 ? [] : [store.pow(store.symbol(names[i]), store.integer(d))])))));
}

/** The equations and the Rabinowitsch-extended system (u_k·g_k − 1 for each ≠ atom). */
export function systemPolys(store: ExpressionStore, n: number, atoms: readonly ParamAtom[], order: Order): { readonly plain: Poly[]; readonly extended: Poly[]; readonly width: number } {
  const ctx = store.ctx, eqs = atoms.filter(a => a.op === 'eq'), nes = atoms.filter(a => a.op === 'ne');
  const width = n + nes.length;
  const plain = eqs.map(a => toPoly(a.poly, n, n, order)).filter(p => p.length);
  const extended = [
    ...eqs.map(a => toPoly(a.poly, n, width, order)).filter(p => p.length),
    ...nes.map((a, k) => [...toPoly(a.poly, n, width, order, { [n + k]: 1 }), { e: zeros(width), c: rNegate(ctx, rational(ctx, 1n)) }].sort((x, y) => cmp(order, y.e, x.e))),
  ];
  return { plain, extended, width };
}

export function decidePolynomialSystem(problem: RelationProblem, atoms: readonly ParamAtom[]): SystemResult {
  const store = problem.store, ctx = store.ctx, n = problem.targets.length, targets = problem.targets;
  const { plain, extended, width } = systemPolys(store, n, atoms, 'grevlex');
  const none = finiteSet(targets, []);
  const G = groebner(ctx, 'grevlex', plain);
  if (G.length === 1 && G[0].p.length === 1 && G[0].p[0].e.every(v => v === 0)) return { kind: 'cases', cases: [{ conditions: [], set: none }] };
  if (quotient(ctx, 'grevlex', G, n)) {
    const H = width === n ? G : groebner(ctx, 'grevlex', extended);
    if (H.length === 1 && H[0].p.length === 1 && H[0].p[0].e.every(v => v === 0)) return { kind: 'cases', cases: [{ conditions: [], set: none }] };
    const q = quotient(ctx, 'grevlex', H, width);
    if (!q) return { kind: 'refused', reason: `${OWNERS.systems}: an exclusion made a finite system infinite` };
    const { points } = zeroDimensionalPoints(store, q, problem.domain, n);
    return { kind: 'cases', cases: [{ conditions: [], set: finiteSet(targets, points) }] };
  }
  return triangular(problem, atoms);
}

function triangular(problem: RelationProblem, atoms: readonly ParamAtom[]): SystemResult {
  const store = problem.store, ctx = store.ctx, n = problem.targets.length, targets = problem.targets;
  const refuse = (detail: string): SystemResult => ({ kind: 'refused', reason: `${OWNERS.systems}: ${detail} (follow-up ledger)` });
  const G = groebner(ctx, 'lex', atoms.filter(a => a.op === 'eq').map(a => toPoly(a.poly, n, n, 'lex')).filter(p => p.length)).map(g => g.p);
  const lowest = (p: Poly) => p.reduce((m, t) => Math.min(m, t.e.findIndex(v => v > 0) < 0 ? n : t.e.findIndex(v => v > 0)), n);
  // U = targets j..n−1 with j minimal such that no basis element lies in ℚ[U].
  let j = 0;
  while (j < n && G.some(p => lowest(p) >= j)) j++;
  if (j === 0 || j === n) return refuse('a positive-dimensional system without free targets');
  const U = targets.slice(j), d = j - 1;
  const hard = G.filter(p => lowest(p) === d);
  const linearOf = new Map<number, Poly>();
  for (const p of G.filter(q => lowest(q) < d)) {
    const v = lowest(p), lt = p[0].e;
    if (linearOf.has(v) || !lt.every((x, i) => (i === v ? x === 1 : x === 0))) return refuse('a positive-dimensional system that is not triangular');
    linearOf.set(v, p);
  }
  for (let v = 0; v < d; v++) if (!linearOf.has(v)) return refuse('a positive-dimensional system that is not triangular');
  // The last dependent with the free targets as parameters.
  const conditions: Condition[] = atoms.filter(a => a.op === 'ne').map(a => ({ kind: 'nonzero', expr: polyExpression(store, toPoly(a.poly, n, n, 'lex'), targets) }));
  const own = conditions.filter(c => store.freeSymbols(c.expr).every(s => s === targets[d] || U.includes(s)));
  const sub = relationProblem(store, { domain: problem.domain, targets: [targets[d]], relations: hard.map(p => ({ op: 'eq', lhs: polyExpression(store, p, targets), rhs: store.integer(0) })), conditions: own });
  const outcome = hard.length ? decideParametricProblem(sub) : undefined;
  if (outcome && outcome.kind !== 'solved' && outcome.kind !== 'empty') return { kind: 'refused', reason: 'reason' in outcome ? outcome.reason : `${OWNERS.systems}: a resource stop` };
  const cases: readonly ParamCase[] = !outcome ? [{ conditions: [], set: { kind: 'intervals', variables: [targets[d]], intervals: [] } }]
    : outcome.kind === 'empty' ? [] : outcome.set.kind === 'case-tree' ? outcome.set.cases : [{ conditions: [], set: outcome.set }];
  const rest = conditions.filter(c => !own.includes(c));
  const pieces: SolutionSet[] = [];
  const build = (conds: readonly Condition[], dValue: ExprId | undefined, extra: readonly Condition[]) => {
    const values: ExprId[] = targets.map(t => store.symbol(t));
    if (dValue !== undefined) values[d] = dValue;
    for (let v = d - 1; v >= 0; v--) {
      const p = linearOf.get(v) as Poly, r = p.slice(1);
      const env = new Map(targets.map((t, i) => [t, values[i]] as const));
      values[v] = store.neg(store.substitute(polyExpression(store, r, targets), env));
    }
    const env = new Map(targets.map((t, i) => [t, values[i]] as const));
    const constraints = [...conds, ...extra, ...rest.map(c => ({ ...c, expr: store.substitute(c.expr, env) }) as Condition)];
    pieces.push({ kind: 'parametric', variables: targets, values, freeParameters: dValue === undefined ? [targets[d], ...U] : [...U], constraints });
  };
  for (const c of cases) {
    const s = c.set;
    if (!outcome || (s.kind === 'intervals' && s.intervals.length === 1 && s.intervals[0].lo.kind === 'infinity' && s.intervals[0].hi.kind === 'infinity') || (s.kind === 'cofinite')) {
      if (d > 0 && s.kind === 'cofinite' && s.except.length) return refuse('a free dependent target with exclusions and further dependents');
      build(c.conditions, undefined, s.kind === 'cofinite' ? s.except.map(([e]) => ({ kind: 'not-equal', expr: store.symbol(targets[d]), other: valueExpression(store, e) }) as Condition) : []);
      continue;
    }
    if (s.kind !== 'finite') return refuse(`a ${s.kind} set for a dependent target`);
    for (const [value] of s.points) {
      if ((value as PointValue).kind === 'root') return refuse('a dependent target given by a root of degree ≥ 3');
      build(c.conditions, valueExpression(store, value), []);
    }
  }
  if (pieces.length === 0) return { kind: 'cases', cases: [{ conditions: [], set: finiteSet(targets, []) }] };
  return { kind: 'cases', cases: [{ conditions: [], set: pieces.length === 1 ? pieces[0] : { kind: 'union', sets: pieces } }] };
}
