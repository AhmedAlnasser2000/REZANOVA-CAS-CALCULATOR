import { rational } from '../algebra/rational';
import type { Refusal } from '../decision/rational-form';
import { canonicalAngle } from '../representation/angles';
import { evaluateExact } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { realCompare, realSign } from '../representation/real-order';
import { relationProblem, type Condition, type RelationOperator } from '../representation/relation';
import { floorExact, normalizeSet, type Interval, type PointValue, type SolutionSet } from '../representation/solution-set';
import { polynomialCoefficients, replaceSubexpressions } from '../generators/lattice';
import { decideClosedForm } from '../generators/closed-form-set';
import { rewriteGenerators } from '../generators/solve';
import { dependsOn } from '../generators/normal-form';
import type { ZeroInterval } from '../generators/inversion';

const TRIG_FUNCTIONS = new Set(['sin', 'cos', 'tan']);

/**
 * Families of zeros.
 *
 * - An affine family {r + P·k : k ∈ ℤ} (P > 0) is a residue r modulo P; a set
 *   of residues is kept canonical (minimal period, principal residues) by the
 *   periodic-set normalization.
 * - A parametric family is a value in integer parameters, each ranging over a
 *   (possibly half-infinite) integer interval. Ranges are decided exactly: the
 *   condition on a level L(κ) is a one-dimensional problem in a real u,
 *   decided by the closed-form engine, then intersected with ℤ by exact
 *   floors. Levels are monotone in their parameter by construction (they are
 *   built by monotone inversions), so each condition gives integer intervals.
 */
export interface Param { readonly name: string; readonly from?: bigint; readonly to?: bigint }
export interface PeriodicZeros {
  readonly period: ExprId; readonly points: readonly ExprId[];
  /** Zero intervals of one period, each by its left end (abs of periodic expressions). */
  readonly intervals?: readonly ZeroInterval[];
}
export interface FamilyZeros { readonly value: ExprId; readonly params: readonly Param[] }

/** u = a·v + b with a number-only, exactly nonzero real a; undefined otherwise. */
export function affineIn(store: ExpressionStore, u: ExprId, v: string): { a: ExprId; b: ExprId } | undefined {
  const c = polynomialCoefficients(store, u, v);
  if (!c || c.length !== 2 || store.freeSymbols(c[0], c[1]).length) return undefined;
  const e = evaluateExact(store, c[1], 'real');
  if (e.kind === 'undefined') return undefined;
  if (e.kind === 'exact' && e.value.kind === 'rational' && e.value.value.numerator === 0n) return undefined;
  return { a: c[1], b: c[0] };
}

/**
 * Canonical residue groups of a set of residues modulo P: rational multiples
 * of π exact (asin(√3/2) → π/3), the period minimal, and point families split
 * into maximal orbits (so {0, π} mod 2π is 0 + πℤ).
 */
export function residueGroups(store: ExpressionStore, residues: readonly ExprId[], period: ExprId): PeriodicZeros[] {
  if (residues.length === 0) return [];
  const point = (id: ExprId): Interval => {
    const v: PointValue = { kind: 'expression', id: canonicalAngle(store, id) };
    return { lo: v, hi: v, loClosed: true, hiClosed: true };
  };
  const full: Interval = { lo: { kind: 'infinity', sign: -1 }, hi: { kind: 'infinity', sign: 1 }, loClosed: false, hiClosed: false };
  const set = normalizeSet(store, { kind: 'periodic-set', variables: ['x'], period: { kind: 'expression', id: period }, components: residues.map(point), range: full }, 'real');
  return groupsOf(store, set);
}

const idOf = (store: ExpressionStore, v: PointValue) => (v.kind === 'expression' ? v.id : v.kind === 'rational' ? store.number(v.value) : store.algebraic(v.root));

/** The point families of a normalized set of point families. */
export function groupsOf(store: ExpressionStore, set: SolutionSet): PeriodicZeros[] {
  if (set.kind === 'union') return set.sets.flatMap(s => groupsOf(store, s));
  if (set.kind === 'finite' && set.points.length === 0) return [];
  if (set.kind !== 'periodic-set') return [];
  return [{ period: idOf(store, set.period), points: set.components.map(c => idOf(store, c.lo as PointValue)) }];
}

/** Integer intervals [from, to] (either end may be open-ended). */
export interface IntegerRange { readonly from?: bigint; readonly to?: bigint }

function ceilOf(store: ExpressionStore, id: ExprId, closed: boolean): bigint {
  const f = floorExact(store, id);
  return f.integer && closed ? f.n : f.n + 1n;
}
function floorOf(store: ExpressionStore, id: ExprId, closed: boolean): bigint {
  const f = floorExact(store, id);
  return f.integer && !closed ? f.n - 1n : f.n;
}

/**
 * The integers κ in `param`'s range with L(κ) op α for each condition, as
 * integer intervals. L may depend on this parameter only.
 */
export function restrictParam(
  store: ExpressionStore, level: ExprId, param: Param, conditions: readonly { op: RelationOperator; against: ExprId }[],
): IntegerRange[] | { refusal: Refusal } {
  const u = store.symbol(param.name);
  const relations = conditions.map(c => ({ op: c.op, lhs: level, rhs: c.against }));
  // The current range first (conditions are evaluated before relations), then the level's natural domain.
  const bounds: Condition[] = [];
  if (param.from !== undefined) bounds.push({ kind: 'nonnegative', expr: store.sub(u, store.integer(param.from)) });
  if (param.to !== undefined) bounds.push({ kind: 'nonnegative', expr: store.sub(store.integer(param.to), u) });
  const problem = relationProblem(store, { domain: 'real', targets: [param.name], relations, conditions: bounds });
  const decision = decideClosedForm(rewriteGenerators(problem).leaf);
  if (decision.kind === 'refused') return { refusal: decision.refusal };
  if (decision.kind === 'empty') return [];
  const set = decision.set, out: IntegerRange[] = [];
  if (set.kind === 'finite') {
    for (const [p] of set.points) {
      const f = floorExact(store, idOf(store, p));
      if (f.integer) out.push({ from: f.n, to: f.n });
    }
    return out;
  }
  if (set.kind !== 'intervals') return { refusal: { owner: 'EQUATION-COMPOSITION1', detail: 'an unexpected parameter range' } };
  for (const i of set.intervals) {
    const from = i.lo.kind === 'infinity' ? undefined : ceilOf(store, idOf(store, i.lo as PointValue), i.loClosed);
    const to = i.hi.kind === 'infinity' ? undefined : floorOf(store, idOf(store, i.hi as PointValue), i.hiClosed);
    if (from !== undefined && to !== undefined && from > to) continue;
    out.push({ from, to });
  }
  return out;
}

/** Residues of fn(u) = c over one period (sin, cos: 2π; tan: π), before canonicalization; [] when c is out of range. */
export function trigResidues(store: ExpressionStore, fn: 'sin' | 'cos' | 'tan', c: ExprId): { period: ExprId; residues: ExprId[] } {
  const pi = store.constant('pi'), twoPi = store.mul(store.integer(2), pi);
  if (fn === 'tan') return { period: pi, residues: [store.apply('atan', c)] };
  const above = realSign(store, store.sub(c, store.integer(1))), below = realSign(store, store.add(c, store.integer(1)));
  if (above > 0 || below < 0) return { period: twoPi, residues: [] };
  if (fn === 'sin') {
    if (above === 0) return { period: twoPi, residues: [store.mul(store.number(rational(store.ctx, 1n, 2n)), pi)] };
    if (below === 0) return { period: twoPi, residues: [store.mul(store.number(rational(store.ctx, -1n, 2n)), pi)] };
    const a = store.apply('asin', c);
    return { period: twoPi, residues: [a, store.sub(pi, a)] };
  }
  if (above === 0) return { period: twoPi, residues: [store.integer(0)] };
  if (below === 0) return { period: twoPi, residues: [pi] };
  const a = store.apply('acos', c);
  return { period: twoPi, residues: [a, store.neg(a)] };
}

/** Periods of the affine trig kernels of f (sin, cos: 2π/|a|; tan: π/|a|), any depth. */
export function kernelPeriods(store: ExpressionStore, f: ExprId, x: string): ExprId[] {
  const out: ExprId[] = [], pi = store.constant('pi');
  for (const n of store.postorder([f])) {
    const node = store.node(n);
    if (node.kind !== 'apply' || !TRIG_FUNCTIONS.has(node.fn) || !dependsOn(store, node.arg, x)) continue;
    const aff = affineIn(store, node.arg, x);
    if (!aff) continue;
    const base = node.fn === 'tan' ? pi : store.mul(store.integer(2), pi);
    out.push(store.div(base, realSign(store, aff.a) < 0 ? store.neg(aff.a) : aff.a));
  }
  return out;
}

export function hasTrig(store: ExpressionStore, f: ExprId, x: string): boolean {
  return store.postorder([f]).some(n => { const node = store.node(n); return node.kind === 'apply' && TRIG_FUNCTIONS.has(node.fn) && dependsOn(store, node.arg, x); });
}

/** lcm of commensurable periods; undefined when two are incommensurable. */
export function commonPeriod(store: ExpressionStore, periods: readonly ExprId[]): ExprId | undefined {
  let P = periods[0];
  for (const p of periods.slice(1)) {
    const r = store.numberValue(store.div(p, P));
    if (!r) return undefined;
    P = store.mul(store.integer(r.numerator), P);
  }
  return P;
}

/**
 * f(x + P) = f(x) structurally: every occurrence of x is inside a trig kernel
 * with an affine argument a·x + b, and shifting each argument by a·P folds
 * back to the same kernel (sin(u + 2πn) = sin u, …).
 */
export function periodicIn(store: ExpressionStore, f: ExprId, x: string, P: ExprId): boolean {
  const kernels = new Map<ExprId, ExprId>();
  for (const n of store.postorder([f])) {
    const node = store.node(n);
    if (node.kind !== 'apply' || !TRIG_FUNCTIONS.has(node.fn) || !dependsOn(store, node.arg, x)) continue;
    const aff = affineIn(store, node.arg, x);
    if (!aff) continue;
    if (store.apply(node.fn, store.add(node.arg, store.mul(aff.a, P))) !== n) return false;
    kernels.set(n, store.symbol(`ω${kernels.size}`));
  }
  return !dependsOn(store, replaceSubexpressions(store, f, kernels), x);
}

/** Whether a point is a member of one of the affine zero families (points or periodic zero intervals; exact). */
export function inFamilies(store: ExpressionStore, families: readonly PeriodicZeros[], point: ExprId): boolean {
  for (const fam of families) {
    for (const r of fam.points) if (floorExact(store, store.div(store.sub(point, r), fam.period)).integer) return true;
    for (const i of fam.intervals ?? []) {
      // q = point − k·P in [lo, lo + P) for k = ⌊(point − lo)/P⌋ (components are shorter than P).
      const f = floorExact(store, store.div(store.sub(point, i.lo as ExprId), fam.period));
      const q = store.sub(point, store.mul(store.integer(f.n), fam.period));
      const a = realCompare(store, q, i.lo as ExprId), b = realCompare(store, q, i.hi as ExprId);
      if ((a > 0 || (a === 0 && i.loClosed)) && (b < 0 || (b === 0 && i.hiClosed))) return true;
    }
  }
  return false;
}

/** Sorted distinct closed forms (numerically equal ones merged). */
export function sortedDistinct(store: ExpressionStore, values: Iterable<ExprId>): ExprId[] {
  const sorted = [...new Set(values)].sort((a, b) => realCompare(store, a, b));
  const out: ExprId[] = [];
  for (const c of sorted) if (out.length === 0 || realCompare(store, out[out.length - 1], c) !== 0) out.push(c);
  return out;
}

/** Members r + k·P of an affine family inside [lo, hi]. */
export function lifted(store: ExpressionStore, r: ExprId, P: ExprId, lo: ExprId, hi: ExprId): ExprId[] {
  const from = floorExact(store, store.div(store.sub(lo, r), P)), to = floorExact(store, store.div(store.sub(hi, r), P));
  const out: ExprId[] = [];
  for (let k = from.integer ? from.n : from.n + 1n; k <= to.n; k++) {
    store.ctx.tick();
    out.push(k === 0n ? r : store.add(r, store.mul(store.integer(k), P)));
  }
  return out;
}

/**
 * Affine families b + a·κ over half-infinite parameter ranges (and finite
 * zeros) that together cover a whole residue class r + |a|·ℤ become one
 * periodic family ({0} ∪ {πk : k ≥ 1} ∪ {−πk : k ≥ 1} is πℤ).
 */
export function mergeAffineFamilies(store: ExpressionStore, values: readonly ExprId[], families: readonly FamilyZeros[]): { values: ExprId[]; families: FamilyZeros[]; periodic: PeriodicZeros[] } {
  type Member = { family?: FamilyZeros; value?: ExprId; P: ExprId; b: ExprId; from?: bigint; to?: bigint };
  const members: Member[] = [];
  const kept: FamilyZeros[] = [];
  for (const f of families) {
    const aff = f.params.length === 1 ? affineIn(store, f.value, f.params[0].name) : undefined;
    if (!aff || store.freeSymbols(aff.b).length) { kept.push(f); continue; }
    const p = f.params[0], positive = realSign(store, aff.a) > 0;
    members.push({ family: f, P: positive ? aff.a : store.neg(aff.a), b: aff.b, from: positive ? p.from : p.to === undefined ? undefined : -p.to, to: positive ? p.to : p.from === undefined ? undefined : -p.from });
  }
  const periodic: PeriodicZeros[] = [], used = new Set<Member>(), usedValues = new Set<ExprId>();
  for (const m of members) {
    if (used.has(m)) continue;
    const group = members.filter(o => !used.has(o) && store.numberValue(store.div(o.P, m.P))?.numerator === store.numberValue(store.div(o.P, m.P))?.denominator && floorExact(store, store.div(store.sub(o.b, m.b), m.P)).integer);
    // Index ranges relative to m.b, plus finite zeros in the class.
    const ranges = group.map(o => { const shift = floorExact(store, store.div(store.sub(o.b, m.b), m.P)).n; return { from: o.from === undefined ? undefined : o.from + shift, to: o.to === undefined ? undefined : o.to + shift }; });
    const points = values.filter(v => floorExact(store, store.div(store.sub(v, m.b), m.P)).integer);
    for (const v of points) { const n = floorExact(store, store.div(store.sub(v, m.b), m.P)).n; ranges.push({ from: n, to: n }); }
    ranges.sort((a, b) => (a.from === undefined ? -1 : b.from === undefined ? 1 : a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
    let reach: bigint | undefined, covered = ranges.length > 0 && ranges[0].from === undefined, top = false;
    for (const r of ranges) {
      if (r.from !== undefined && reach !== undefined && r.from > reach + 1n) { covered = false; break; }
      if (r.to === undefined) { top = true; break; }
      reach = reach === undefined || r.to > reach ? r.to : reach;
    }
    if (!(covered && top)) continue;
    group.forEach(o => used.add(o));
    points.forEach(v => usedValues.add(v));
    periodic.push({ period: m.P, points: [m.b] });
  }
  for (const m of members) if (!used.has(m)) kept.push(m.family as FamilyZeros);
  return { values: values.filter(v => !usedValues.has(v)), families: kept, periodic };
}
