import { demand, EquationAlgebraError, type EquationStop } from '../execution';
import { rational, rCompare, type Rational } from '../algebra/rational';
import { compareReal, type RealRootOf, type RootOf } from '../algebraic/root-of';
import { asRoot, evaluateExact, type EvaluationDomain, type ExactValue } from './evaluate';
import { isSymbolName, type ExprId, type ExpressionStore } from './expression';
import { canonicalCondition, conditionKey, type Condition, type RelationProblem } from './relation';
import { expandConstant } from './angles';
import { enclose } from './enclosure';
import { realCompare, realSign, START_BITS } from './real-order';
import type { ProofLog } from './transform';

/**
 * Outcomes and solution sets of the private Equation core.
 *
 * An outcome is all-or-nothing: `solved` carries the complete set, `empty`
 * carries a proof, and every other kind reports honestly why there is no
 * answer. There is deliberately no partial-result kind.
 */
export const OUTCOME_KINDS = ['solved', 'empty', 'undecided', 'incomplete-implementation', 'unsupported', 'resource'] as const;
export type OutcomeKind = (typeof OUTCOME_KINDS)[number];

export type EquationOutcome =
  | { readonly kind: 'solved'; readonly set: SolutionSet; readonly proof: ProofLog }
  | { readonly kind: 'empty'; readonly proof: ProofLog }
  | { readonly kind: 'undecided'; readonly reason: string }
  | { readonly kind: 'incomplete-implementation'; readonly reason: string }
  | { readonly kind: 'unsupported'; readonly reason: string }
  | { readonly kind: 'resource'; readonly stop: EquationStop };

/**
 * A coordinate value: exact number, or a closed-form expression (for example
 * log 2). An algebraic value may carry `form`, a closed form (radicals) proven
 * to evaluate exactly to the same root; identity always stays the RootOf.
 */
export type PointValue = ExactValue | { readonly kind: 'algebraic'; readonly root: RootOf; readonly form?: ExprId } | { readonly kind: 'expression'; readonly id: ExprId } | RootValue;
/**
 * The index-th real root (1 = smallest) of a polynomial `poly` in `variable` whose
 * coefficients carry parameters (parameters gate): valid inside a case whose
 * conditions fix the number of real roots.
 */
export interface RootValue {
  readonly kind: 'root'; readonly poly: ExprId; readonly variable: string; readonly index: number;
  /** For a polynomial with constant (possibly transcendental) coefficients: rationals lo < root < hi isolating it. */
  readonly lo?: Rational; readonly hi?: Rational;
}
export type Point = readonly PointValue[];

/** An interval endpoint: ±∞ or an exact real value. */
export type Endpoint = { readonly kind: 'infinity'; readonly sign: -1 | 1 } | PointValue;
/** A real interval; infinite ends are open, and a degenerate interval [a, a] is a point. */
export interface Interval { readonly lo: Endpoint; readonly hi: Endpoint; readonly loClosed: boolean; readonly hiClosed: boolean }

export interface Case { readonly conditions: readonly Condition[]; readonly set: SolutionSet }
export interface Candidate { readonly point: Point; readonly derivations: readonly string[] }

export type SolutionSet =
  | { readonly kind: 'finite'; readonly variables: readonly string[]; readonly points: readonly Point[] }
  /** A union of disjoint real intervals (one variable), sorted and non-touching. */
  | { readonly kind: 'intervals'; readonly variables: readonly string[]; readonly intervals: readonly Interval[] }
  /** Every value of the domain except finitely many points. */
  | { readonly kind: 'cofinite'; readonly variables: readonly string[]; readonly except: readonly Point[] }
  | { readonly kind: 'union'; readonly sets: readonly SolutionSet[] }
  | { readonly kind: 'case-tree'; readonly cases: readonly Case[] }
  /**
   * One real variable: {x ∈ range : x − k·period ∈ some component for an integer k}.
   * Each component (a point or an interval shorter than the period) is stored
   * once, by its left end in the window (−period/2, period/2]; the range is ℝ or
   * a half-line that starts or ends at a component occurrence.
   */
  | { readonly kind: 'periodic-set'; readonly variables: readonly string[]; readonly period: PointValue; readonly components: readonly Interval[]; readonly range: Interval }
  /**
   * One real variable: the union over integers k with from ≤ k ≤ to (either bound may be absent) of
   * the intervals between lo(k) and hi(k), expressions in the parameter. Members are pairwise disjoint
   * and ordered in k (proven when the set is built); lower-bounded ranges start at k = 0.
   */
  | { readonly kind: 'interval-family'; readonly variables: readonly string[]; readonly parameter: string; readonly from?: bigint; readonly to?: bigint; readonly lo: ExprId; readonly hi: ExprId; readonly loClosed: boolean; readonly hiClosed: boolean }
  /** One variable: every root of `poly` in that variable (parameters gate, over ℂ, degree ≥ 3). */
  | { readonly kind: 'root-set'; readonly variables: readonly string[]; readonly poly: ExprId }
  /** values[i] gives variables[i] in terms of integer parameters (k ∈ ℤ), under constraints. */
  | { readonly kind: 'periodic'; readonly variables: readonly string[]; readonly values: readonly ExprId[]; readonly integerParameters: readonly string[]; readonly constraints: readonly Condition[] }
  /** values[i] gives variables[i] in terms of free continuous parameters, under constraints. */
  | { readonly kind: 'parametric'; readonly variables: readonly string[]; readonly values: readonly ExprId[]; readonly freeParameters: readonly string[]; readonly constraints: readonly Condition[] }
  /** A proven-equivalent relation problem left unsolved. */
  | { readonly kind: 'reduced-form'; readonly problem: RelationProblem }
  /** Candidates whose verification could not be decided, each with the derivations that produced it. */
  | { readonly kind: 'unconfirmed'; readonly variables: readonly string[]; readonly candidates: readonly Candidate[] }
  /**
   * A region of ℝⁿ as nested cells (EQUATION-SEMIALGEBRAIC1), in the form of Mathematica's Reduce: the points whose
   * first variable lies in one of `cells`, the second in one of that cell's children (whose ends are values in the
   * first variable), and so on; a cell without children leaves the remaining variables free.
   */
  | { readonly kind: 'cylindrical'; readonly variables: readonly string[]; readonly cells: readonly RegionCell[] }
  /** A decided statement (PR B): every name of the rows is quantified, so the answer is true or false. */
  | { readonly kind: 'truth'; readonly value: boolean };

/**
 * A cell of a cylindrical region: an interval of its level's variable (a section is [v, v]) whose ends are values in
 * the outer variables, and the cells of the next variable over it. Cells of one list are disjoint, ascending and
 * non-empty over the whole parent cell.
 */
export interface RegionCell extends Interval { readonly children?: readonly RegionCell[] }

export const SOLUTION_SET_KINDS = ['finite', 'intervals', 'cofinite', 'union', 'case-tree', 'periodic-set', 'interval-family', 'root-set', 'periodic', 'parametric', 'reduced-form', 'unconfirmed', 'cylindrical', 'truth'] as const;

const fail = (reason: string): never => demand(false, 'invalid-input', reason) as never;

/** Runtime guard: only the six outcome kinds, each with its own fields. */
export function assertOutcome(value: unknown): asserts value is EquationOutcome {
  const o = value as Record<string, unknown>;
  if (typeof o !== 'object' || o === null || !(OUTCOME_KINDS as readonly unknown[]).includes(o.kind)) fail('unknown outcome kind');
  const keys = Object.keys(o).sort().join(',');
  const shapes: Record<OutcomeKind, string> = {
    solved: 'kind,proof,set', empty: 'kind,proof', undecided: 'kind,reason',
    'incomplete-implementation': 'kind,reason', unsupported: 'kind,reason', resource: 'kind,stop',
  };
  if (keys !== shapes[o.kind as OutcomeKind]) fail(`malformed ${String(o.kind)} outcome`);
  if (o.kind === 'resource' && !['work', 'allocation', 'cancelled'].includes(o.stop as string)) fail('unknown resource stop');
  if ('reason' in o && (typeof o.reason !== 'string' || o.reason.length === 0)) fail('outcome reason required');
}

/** A typed resource stop from the execution context becomes the `resource` outcome; anything else is rethrown. */
export function resourceOutcome(error: unknown): EquationOutcome {
  if (error instanceof EquationAlgebraError && error.code === 'resource' && error.stop) return Object.freeze({ kind: 'resource', stop: error.stop });
  throw error;
}

// ---- values ----

export function valueKey(store: ExpressionStore, v: PointValue): string {
  if (v.kind === 'rational') return `q:${v.value.numerator}/${v.value.denominator}`;
  if (v.kind === 'algebraic') return `a:${store.roots.canonical(store.ctx, v.root).key}`;
  if (v.kind === 'root') return `r:${store.digest(v.poly)}:${v.variable}:${v.index}`;
  return `e:${store.digest(v.id)}`;
}

function rank(v: PointValue): number {
  return v.kind === 'rational' || (v.kind === 'algebraic' && v.root.kind === 'real') ? 0 : v.kind === 'algebraic' ? 1 : v.kind === 'root' ? 3 : 2;
}

/** A point value as an expression (a parametric root has none). */
export function valueExpression(store: ExpressionStore, v: PointValue): ExprId {
  demand(v.kind !== 'root', 'invalid-input', 'a parametric root has no closed form');
  return v.kind === 'expression' ? v.id : v.kind === 'rational' ? store.number(v.value) : store.algebraic(v.root);
}

/**
 * Canonical order: real values by size — closed forms included, compared by
 * certified enclosures — then non-real values by canonical identity, then
 * remaining expressions by digest.
 */
export function compareValues(store: ExpressionStore, a: PointValue, b: PointValue): number {
  const ctx = store.ctx;
  if ((a.kind === 'root' && a.lo) || (b.kind === 'root' && b.lo)) {
    const c = boundedCompare(store, a, b);
    if (c !== undefined) return c;
  }
  if (a.kind === 'expression' || b.kind === 'expression') {
    if (valueKey(store, a) === valueKey(store, b)) return 0;
    const real = (v: PointValue) => v.kind !== 'root' && (v.kind !== 'algebraic' || v.root.kind === 'real') && (v.kind !== 'expression' || store.freeSymbols(v.id).length === 0);
    if (real(a) && real(b)) {
      try {
        return realCompare(store, valueExpression(store, a), valueExpression(store, b));
      } catch (e) {
        // Non-real or not enclosable closed forms keep the canonical identity order below.
        if (!(e instanceof EquationAlgebraError) || e.code !== 'invalid-input') throw e;
      }
    }
  }
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 0) {
    const x = a as ExactValue, y = b as ExactValue;
    if (x.kind === 'rational' && y.kind === 'rational') return rCompare(ctx, x.value, y.value);
    return compareReal(ctx, asRoot(ctx, x) as RealRootOf, asRoot(ctx, y) as RealRootOf);
  }
  const ka = valueKey(store, a), kb = valueKey(store, b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

/**
 * Order against a root carrying isolating bounds: a value at or beyond one of
 * its bounds is on that side (the root lies strictly inside). Undefined when
 * the bounds do not separate the two values.
 */
function boundedCompare(store: ExpressionStore, a: PointValue, b: PointValue): number | undefined {
  if (valueKey(store, a) === valueKey(store, b)) return 0;
  const below = (v: PointValue, q: Rational): boolean | undefined => {
    // v ≤ q, exactly.
    if (v.kind === 'root') return v.hi ? rCompare(store.ctx, v.hi, q) <= 0 : undefined;
    if (v.kind === 'expression' && store.freeSymbols(v.id).length) return undefined;
    return realCompare(store, valueExpression(store, v), store.number(q)) <= 0;
  };
  const above = (v: PointValue, q: Rational): boolean | undefined => {
    if (v.kind === 'root') return v.lo ? rCompare(store.ctx, v.lo, q) >= 0 : undefined;
    if (v.kind === 'expression' && store.freeSymbols(v.id).length) return undefined;
    return realCompare(store, valueExpression(store, v), store.number(q)) >= 0;
  };
  if (a.kind === 'root' && a.lo && a.hi) {
    if (below(b, a.lo)) return 1;
    if (above(b, a.hi)) return -1;
  }
  if (b.kind === 'root' && b.lo && b.hi) {
    if (below(a, b.lo)) return -1;
    if (above(a, b.hi)) return 1;
  }
  return undefined;
}

/** Exact numbers in canonical form; expressions that evaluate exactly become numbers. */
function normalizeValue(store: ExpressionStore, v: PointValue, domain: EvaluationDomain): PointValue {
  if (v.kind === 'root') { store.node(v.poly); return Object.freeze({ ...v }); }
  if (v.kind === 'expression' && store.freeSymbols(v.id).length) return Object.freeze({ kind: 'expression', id: v.id });
  if (v.kind === 'expression') {
    store.node(v.id);
    const e = evaluateExact(store, v.id, domain);
    if (e.kind === 'undefined') fail(`solution value is undefined: ${e.detail}`);
    return e.kind === 'exact' ? normalizeValue(store, e.value, domain) : Object.freeze({ kind: 'expression', id: v.id });
  }
  if (v.kind === 'rational') return Object.freeze({ kind: 'rational', value: v.value });
  if (domain === 'real' && v.root.kind !== 'real') fail('non-real value in a real solution set');
  const c = store.roots.canonical(store.ctx, v.root);
  const form = 'form' in v ? v.form : undefined;
  if (form !== undefined) store.node(form);
  return Object.freeze(form === undefined ? { kind: 'algebraic', root: c.root } : { kind: 'algebraic', root: c.root, form });
}

function pointKey(store: ExpressionStore, p: Point): string { return p.map(v => valueKey(store, v)).join(';'); }

/**
 * The box of the certified isolated point a tuple's coordinates come from (EQUATION-CERTIFIED-NUMERICS1 PR B), or
 * undefined for a tuple without one. Its coordinates may coincide with another solution's (two solutions can share
 * an x), which refinement could never order, so such tuples are ordered by their boxes instead: disjoint boxes,
 * compared corner by corner, give a total order.
 */
function pointSource(store: ExpressionStore, p: Point): readonly { lo: Rational; hi: Rational }[] | undefined {
  for (const v of p) {
    if (v.kind !== 'expression') continue;
    const leaf = store.postorder([v.id]).find(n => store.node(n).kind === 'isolated-point');
    if (leaf !== undefined) return (store.node(leaf) as Extract<ReturnType<ExpressionStore['node']>, { kind: 'isolated-point' }>).box;
  }
  return undefined;
}

function compareBoxes(store: ExpressionStore, a: readonly { lo: Rational; hi: Rational }[], b: readonly { lo: Rational; hi: Rational }[]): number {
  for (let i = 0; i < a.length; i++) {
    const c = rCompare(store.ctx, a[i].lo, b[i].lo) || rCompare(store.ctx, a[i].hi, b[i].hi);
    if (c !== 0) return c;
  }
  return 0;
}

/** The order of tuples when either comes from a certified isolated point: exact ones first, then by box. */
export function compareCertifiedPoints(store: ExpressionStore, a: Point, b: Point): number | undefined {
  const sa = pointSource(store, a), sb = pointSource(store, b);
  if (!sa && !sb) return undefined;
  if (!sa || !sb) return sa ? 1 : -1;
  const c = compareBoxes(store, sa, sb);
  if (c !== 0) return c;
  const ka = pointKey(store, a), kb = pointKey(store, b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

function comparePoints(store: ExpressionStore, a: Point, b: Point): number {
  const certified = compareCertifiedPoints(store, a, b);
  if (certified !== undefined) return certified;
  for (let i = 0; i < a.length; i++) {
    const c = compareValues(store, a[i], b[i]);
    if (c !== 0) return c;
  }
  return 0;
}

function checkVariables(variables: readonly string[]): readonly string[] {
  if (!Array.isArray(variables) || !variables.every(isSymbolName) || new Set(variables).size !== variables.length) fail('solution variables');
  return Object.freeze([...variables]);
}

// ---- construction ----

/** Whether a set mentions parameter symbols or parametric roots (then it has no numeric normal form). */
export function parametric(store: ExpressionStore, set: SolutionSet): boolean {
  const value = (v: PointValue | Endpoint) => v.kind === 'root' || (v.kind === 'expression' && store.freeSymbols(v.id).length > 0);
  switch (set.kind) {
    case 'finite': return set.points.some(p => p.some(value));
    case 'cofinite': return set.except.some(p => p.some(value));
    case 'intervals': return set.intervals.some(i => value(i.lo) || value(i.hi));
    case 'union': return set.sets.some(x => parametric(store, x));
    case 'root-set': return true;
    case 'periodic-set': return value(set.period) || set.components.some(i => value(i.lo) || value(i.hi));
    default: return false;
  }
}

export function finiteSet(variables: readonly string[], points: readonly Point[]): SolutionSet {
  const vars = checkVariables(variables);
  for (const p of points) if (!Array.isArray(p) || p.length !== vars.length) fail('point arity');
  return Object.freeze({ kind: 'finite', variables: vars, points: Object.freeze(points.map(p => Object.freeze([...p]))) });
}

export function unionSet(sets: readonly SolutionSet[]): SolutionSet {
  if (!Array.isArray(sets) || sets.length === 0) fail('union of no sets');
  return Object.freeze({ kind: 'union', sets: Object.freeze([...sets]) });
}

export function setVariables(set: SolutionSet): readonly string[] {
  switch (set.kind) {
    case 'union': return setVariables(set.sets[0]);
    case 'case-tree': return set.cases.length ? setVariables(set.cases[0].set) : [];
    case 'reduced-form': return set.problem.targets;
    case 'truth': return [];
    default: return set.variables;
  }
}

// ---- normalization ----

/**
 * Canonical form: finite sets deduplicated exactly (two isolations of √2 are
 * one point) and sorted; unions flattened, finite parts merged, empty parts
 * dropped and children ordered; conditions canonical. Operations on
 * families arrive with their slices.
 */
export function normalizeSet(store: ExpressionStore, set: SolutionSet, domain: EvaluationDomain): SolutionSet {
  const ctx = store.ctx;
  ctx.tick();
  // Interval ends and family members in the parameters have no numeric order: kept as the parameters engine built them.
  if ((set.kind === 'intervals' || set.kind === 'periodic-set') && parametric(store, set)) return Object.freeze({ ...set, variables: checkVariables(set.variables) });
  switch (set.kind) {
    case 'finite': {
      ctx.allocate(set.points.length);
      const unique = new Map<string, Point>();
      for (const p of set.points) {
        const q = Object.freeze(p.map(v => normalizeValue(store, v, domain)));
        unique.set(pointKey(store, q), q);
      }
      const points = [...unique.values()].sort((a, b) => comparePoints(store, a, b));
      return finiteSet(set.variables, points);
    }
    case 'intervals': return normalizeIntervals(store, set, domain);
    case 'cofinite': {
      const finite = normalizeSet(store, finiteSet(set.variables, set.except), domain) as Extract<SolutionSet, { kind: 'finite' }>;
      return Object.freeze({ kind: 'cofinite', variables: finite.variables, except: finite.points });
    }
    case 'union': {
      const vars = setVariables(set).join(',');
      const flat: SolutionSet[] = [];
      const pending = [...set.sets];
      while (pending.length) {
        const s = pending.shift() as SolutionSet;
        if (setVariables(s).join(',') !== vars) fail('union of sets over different variables');
        if (s.kind === 'union') { pending.unshift(...s.sets); continue; }
        const n = normalizeSet(store, s, domain);
        if (n.kind === 'union') flat.push(...n.sets); else flat.push(n);
      }
      const mergedPeriodic = mergePeriodicSets(store, flat.filter(s => s.kind === 'periodic-set') as PeriodicSet[], domain);
      const periodicSets = mergedPeriodic.filter(s => s.kind === 'periodic-set') as PeriodicSet[];
      const finite = [...flat, ...mergedPeriodic].filter(s => s.kind === 'finite') as Extract<SolutionSet, { kind: 'finite' }>[];
      let others = [...flat.filter(s => s.kind !== 'finite' && s.kind !== 'periodic-set'), ...mergedPeriodic.filter(s => s.kind !== 'finite')];
      // Points that a periodic set already contains are absorbed by it.
      let loose = finite.flatMap(s => s.points).filter(p => p.length !== 1 || !periodicSets.some(ps => periodicContains(store, ps, p[0])));
      // Intervals of one real variable are joined (x < 0 ∨ x < 1 is x < 1), with the points they contain; a point
      // touching an open end closes it.
      const joinable = others.filter(s => s.kind === 'intervals' && !parametric(store, s)) as Extract<SolutionSet, { kind: 'intervals' }>[];
      if (domain === 'real' && joinable.length && joinable.length + loose.length > 1) {
        const all: Interval[] = [...joinable.flatMap(s => s.intervals), ...loose.map(p => ({ lo: p[0] as Endpoint, hi: p[0] as Endpoint, loClosed: true, hiClosed: true }))];
        const joined = normalizeIntervals(store, { kind: 'intervals', variables: joinable[0].variables, intervals: all }, domain) as Extract<SolutionSet, { kind: 'intervals' }>;
        const point = (i: Interval) => compareEndpoints(store, i.lo, i.hi) === 0;
        loose = joined.intervals.filter(point).map(i => Object.freeze([i.lo as PointValue]));
        const proper = joined.intervals.filter(i => !point(i));
        others = [...others.filter(s => !joinable.includes(s as Extract<SolutionSet, { kind: 'intervals' }>)), ...(proper.length ? [Object.freeze({ ...joined, intervals: Object.freeze(proper) })] : [])];
      }
      const merged = normalizeSet(store, finiteSet(setVariables(set), loose), domain);
      const parts = (merged.kind === 'finite' && merged.points.length === 0 ? [] : [merged]).concat(others);
      const byKey = new Map(parts.map(s => [setKey(store, s), s] as const));
      const ordered = [...byKey.keys()].sort().map(k => byKey.get(k) as SolutionSet);
      if (ordered.length === 0) return merged;
      return ordered.length === 1 ? ordered[0] : unionSet(ordered);
    }
    case 'case-tree': {
      // A case set in the parameters (ends such as (−b − √D)/(2a) or parametric roots) has no numeric order:
      // it keeps the order in which the parameters engine built it.
      // Finite sets have no order, so parametric points are still deduplicated and sorted (by identity).
      const cases = set.cases.map(c => Object.freeze({ conditions: canonicalConditions(store, c.conditions), set: parametric(store, c.set) && c.set.kind !== 'finite' ? Object.freeze(c.set) : normalizeSet(store, c.set, domain) }));
      const byKey = new Map(cases.map(c => [caseKey(store, c), c] as const));
      return Object.freeze({ kind: 'case-tree', cases: Object.freeze([...byKey.keys()].sort().map(k => byKey.get(k) as Case)) });
    }
    case 'periodic-set': return normalizePeriodicSet(store, set, domain);
    case 'periodic': case 'parametric':
      return Object.freeze({ ...set, constraints: canonicalConditions(store, set.constraints) });
    case 'root-set': {
      checkVariables(set.variables);
      store.node(set.poly);
      return Object.freeze({ ...set });
    }
    case 'interval-family': {
      checkVariables(set.variables);
      if (!isSymbolName(set.parameter) || set.variables.includes(set.parameter)) fail('interval-family parameter');
      if (set.from !== undefined && set.to !== undefined && set.from > set.to) fail('interval-family range');
      store.node(set.lo); store.node(set.hi);
      return Object.freeze({ ...set });
    }
    case 'reduced-form':
      return set;
    case 'cylindrical': return normalizeRegion(store, set);
    case 'truth': return set.value === true || set.value === false ? Object.freeze({ kind: 'truth', value: set.value }) : fail('a truth value');
    case 'unconfirmed': {
      const merged = new Map<string, { point: Point; derivations: Set<string> }>();
      for (const c of set.candidates) {
        const point = Object.freeze(c.point.map(v => normalizeValue(store, v, domain)));
        const key = pointKey(store, point);
        const entry = merged.get(key) ?? { point, derivations: new Set<string>() };
        for (const d of c.derivations) entry.derivations.add(d);
        merged.set(key, entry);
      }
      const candidates = [...merged.values()].sort((a, b) => comparePoints(store, a.point, b.point))
        .map(e => Object.freeze({ point: e.point, derivations: Object.freeze([...e.derivations].sort()) }));
      return Object.freeze({ kind: 'unconfirmed', variables: checkVariables(set.variables), candidates: Object.freeze(candidates) });
    }
  }
}

function canonicalConditions(store: ExpressionStore, list: readonly Condition[]): readonly Condition[] {
  const byKey = new Map(list.map(c => canonicalCondition(store, c)).map(c => [conditionKey(store, c), c] as const));
  return Object.freeze([...byKey.keys()].sort().map(k => byKey.get(k) as Condition));
}

function caseKey(store: ExpressionStore, c: Case): string {
  return `${c.conditions.map(x => conditionKey(store, x)).join('&')}=>${setKey(store, c.set)}`;
}

/** Canonical text of a (normalized) set; equal keys mean identical canonical sets. */
export function setKey(store: ExpressionStore, set: SolutionSet): string {
  const conds = (list: readonly Condition[]) => list.map(c => conditionKey(store, c)).join('&');
  switch (set.kind) {
    case 'finite': return `finite(${set.variables.join(',')}){${set.points.map(p => pointKey(store, p)).join('|')}}`;
    case 'intervals': return `intervals(${set.variables.join(',')}){${set.intervals.map(i => `${i.loClosed ? '[' : '('}${endpointKey(store, i.lo)},${endpointKey(store, i.hi)}${i.hiClosed ? ']' : ')'}`).join('|')}}`;
    case 'cofinite': return `cofinite(${set.variables.join(',')}){${set.except.map(p => pointKey(store, p)).join('|')}}`;
    case 'union': return `union{${set.sets.map(s => setKey(store, s)).join('|')}}`;
    case 'case-tree': return `cases{${set.cases.map(c => caseKey(store, c)).join('|')}}`;
    case 'periodic-set': {
      const iv = (i: Interval) => `${i.loClosed ? '[' : '('}${endpointKey(store, i.lo)},${endpointKey(store, i.hi)}${i.hiClosed ? ']' : ')'}`;
      return `periodic-set(${set.variables.join(',')}){${valueKey(store, set.period)}}{${set.components.map(iv).join('|')}}${iv(set.range)}`;
    }
    case 'periodic': return `periodic(${set.variables.join(',')};${set.integerParameters.join(',')}){${set.values.map(v => store.digest(v)).join('|')}}[${conds(set.constraints)}]`;
    case 'root-set': return `root-set(${set.variables.join(',')}){${store.digest(set.poly)}}`;
    case 'interval-family': return `interval-family(${set.variables.join(',')};${set.parameter}:${set.from ?? '-inf'}..${set.to ?? 'inf'})${set.loClosed ? '[' : '('}${store.digest(set.lo)},${store.digest(set.hi)}${set.hiClosed ? ']' : ')'}`;
    case 'parametric': return `parametric(${set.variables.join(',')};${set.freeParameters.join(',')}){${set.values.map(v => store.digest(v)).join('|')}}[${conds(set.constraints)}]`;
    case 'reduced-form': return `reduced{${set.problem.hash}}`;
    case 'unconfirmed': return `unconfirmed(${set.variables.join(',')}){${set.candidates.map(c => `${pointKey(store, c.point)}<${c.derivations.join(',')}>`).join('|')}}`;
    case 'cylindrical': return `cylindrical(${set.variables.join(',')}){${regionKey(store, set.cells)}}`;
    case 'truth': return `truth{${set.value}}`;
  }
}

/** Canonical text of a list of region cells. */
export function regionKey(store: ExpressionStore, cells: readonly RegionCell[]): string {
  return cells.map(c => `${c.loClosed ? '[' : '('}${endpointKey(store, c.lo)},${endpointKey(store, c.hi)}${c.hiClosed ? ']' : ')'}${c.children ? `{${regionKey(store, c.children)}}` : ''}`).join('|');
}

/**
 * Validate a cylindrical region: at most one level per variable, non-empty cell lists, outward open infinite ends,
 * constant first-level ends in ascending order. Ends in the outer variables keep the order the decomposition gave.
 */
function normalizeRegion(store: ExpressionStore, set: Extract<SolutionSet, { kind: 'cylindrical' }>): SolutionSet {
  const vars = checkVariables(set.variables);
  if (vars.length < 2) fail('a cylindrical region has several variables');
  const cell = (c: RegionCell, depth: number): RegionCell => {
    store.ctx.tick();
    const end = (e: Endpoint) => (e.kind === 'infinity' || !parametricValue(store, e) ? normalizeEndpoint(store, e) : normalizeValue(store, e, 'real'));
    const lo = end(c.lo), hi = end(c.hi), loClosed = c.loClosed === true, hiClosed = c.hiClosed === true;
    if ((lo.kind === 'infinity' && (lo.sign !== -1 || loClosed)) || (hi.kind === 'infinity' && (hi.sign !== 1 || hiClosed))) fail('infinite cell ends are open and outward');
    // First-level ends without parameters are ordered exactly; ends in parameters keep the decomposition's order.
    const symbolic = (e: Endpoint) => e.kind !== 'infinity' && parametricValue(store, e);
    if (depth === 1 && !symbolic(lo) && !symbolic(hi)) {
      const order = compareEndpoints(store, lo, hi);
      if (order > 0 || (order === 0 && !(loClosed && hiClosed))) fail('empty or reversed cell');
    }
    if (c.children !== undefined && (depth >= vars.length || c.children.length === 0)) fail('cell children');
    const children = c.children && Object.freeze(c.children.map(k => cell(k, depth + 1)));
    return Object.freeze(children ? { lo, hi, loClosed, hiClosed, children } : { lo, hi, loClosed, hiClosed });
  };
  if (set.cells.length === 0) fail('an empty cylindrical region');
  const cells = set.cells.map(c => cell(c, 1));
  for (let i = 1; i < cells.length; i++) {
    if ([cells[i - 1].hi, cells[i].lo].some(e => e.kind !== 'infinity' && parametricValue(store, e))) continue;
    const c = compareEndpoints(store, cells[i - 1].hi, cells[i].lo);
    if (c > 0 || (c === 0 && cells[i - 1].hiClosed && cells[i].loClosed)) fail('overlapping cells');
  }
  return Object.freeze({ kind: 'cylindrical', variables: vars, cells: Object.freeze(cells) });
}

const parametricValue = (store: ExpressionStore, v: PointValue) => v.kind === 'root' || (v.kind === 'expression' && store.freeSymbols(v.id).length > 0);

// ---- intervals ----

function endpointKey(store: ExpressionStore, e: Endpoint): string {
  return e.kind === 'infinity' ? (e.sign < 0 ? '-inf' : '+inf') : valueKey(store, e);
}

/** Exact order of endpoints (−∞ < every real < +∞). */
export function compareEndpoints(store: ExpressionStore, a: Endpoint, b: Endpoint): number {
  if (a.kind === 'infinity' || b.kind === 'infinity') {
    const ra = a.kind === 'infinity' ? a.sign * 2 : 0, rb = b.kind === 'infinity' ? b.sign * 2 : 0;
    if (ra !== rb) return ra - rb;
    return 0;
  }
  return compareValues(store, a, b);
}

function normalizeEndpoint(store: ExpressionStore, e: Endpoint): Endpoint {
  if (e.kind === 'infinity') {
    if (e.sign !== 1 && e.sign !== -1) fail('infinity sign');
    return Object.freeze({ kind: 'infinity', sign: e.sign });
  }
  // Closed-form endpoints (e.g. ln 2) are allowed; they are ordered by certified enclosures.
  return normalizeValue(store, e, 'real');
}

/** Validate, sort and merge overlapping or touching intervals. */
function normalizeIntervals(store: ExpressionStore, set: Extract<SolutionSet, { kind: 'intervals' }>, domain: EvaluationDomain): SolutionSet {
  if (domain !== 'real') fail('intervals need the real domain');
  const vars = checkVariables(set.variables);
  if (vars.length !== 1) fail('intervals describe one variable');
  const items = set.intervals.map(i => {
    const lo = normalizeEndpoint(store, i.lo), hi = normalizeEndpoint(store, i.hi);
    const loClosed = i.loClosed === true, hiClosed = i.hiClosed === true;
    if ((lo.kind === 'infinity' && (lo.sign !== -1 || loClosed)) || (hi.kind === 'infinity' && (hi.sign !== 1 || hiClosed))) fail('infinite interval ends are open and outward');
    const c = compareEndpoints(store, lo, hi);
    if (c > 0 || (c === 0 && !(loClosed && hiClosed))) fail('empty or reversed interval');
    return { lo, hi, loClosed, hiClosed };
  });
  items.sort((a, b) => compareEndpoints(store, a.lo, b.lo) || (a.loClosed === b.loClosed ? 0 : a.loClosed ? -1 : 1));
  const merged: Interval[] = [];
  for (const it of items) {
    store.ctx.tick();
    const last = merged[merged.length - 1];
    if (last) {
      const c = compareEndpoints(store, last.hi, it.lo);
      if (c > 0 || (c === 0 && (last.hiClosed || it.loClosed))) {
        const d = compareEndpoints(store, it.hi, last.hi);
        const hi = d > 0 ? it.hi : last.hi, hiClosed = d > 0 ? it.hiClosed : d < 0 ? last.hiClosed : last.hiClosed || it.hiClosed;
        merged[merged.length - 1] = Object.freeze({ lo: last.lo, loClosed: last.loClosed, hi, hiClosed });
        continue;
      }
    }
    merged.push(Object.freeze(it));
  }
  return Object.freeze({ kind: 'intervals', variables: vars, intervals: Object.freeze(merged) });
}

// ---- periodic sets ----

type PeriodicSet = Extract<SolutionSet, { kind: 'periodic-set' }>;
function isFullLine(i: Interval): boolean { return i.lo.kind === 'infinity' && i.hi.kind === 'infinity'; }

/** ⌊t⌋ of a real closed form, and whether t is exactly that integer (enclosures, then an exact sign at an integer). */
export function floorExact(store: ExpressionStore, t: ExprId): { readonly n: bigint; readonly integer: boolean } {
  const ctx = store.ctx;
  const floorOf = (r: { numerator: bigint; denominator: bigint }) => (r.numerator >= 0n ? r.numerator / r.denominator : -((-r.numerator + r.denominator - 1n) / r.denominator));
  for (let bits = START_BITS; ; bits *= 2) {
    ctx.tick();
    const e = enclose(store, t, bits);
    if (e.kind === 'undefined') fail(`floor of an undefined value: ${e.detail}`);
    if (e.kind !== 'bounds') continue;
    const a = floorOf(e.lo), b = floorOf(e.hi);
    if (b - a > 1n) continue;
    // At most one integer m with lo ≤ m ≤ hi: the exact sign of t − m decides.
    const m = b, inside = rCompare(ctx, e.lo, rational(ctx, m)) <= 0;
    if (!inside) return { n: a, integer: false };
    const sign = realSign(store, store.sub(t, store.integer(m)));
    return sign === 0 ? { n: m, integer: true } : sign > 0 ? { n: m, integer: false } : { n: m - 1n, integer: false };
  }
}

/**
 * v − k·P in the window: (−P/2, P/2] for points (principal residues), and
 * [−P/2, P/2) for the left end of an interval, so (−π/2, π/2) + πℤ stays as written.
 */
function intoWindow(store: ExpressionStore, v: ExprId, P: ExprId, intervalEnd = false): { value: ExprId; k: bigint } {
  const half = store.number(rational(store.ctx, 1n, 2n)), t = store.div(v, P);
  let k: bigint;
  if (intervalEnd) k = floorExact(store, store.add(t, half)).n;
  else { const f = floorExact(store, store.sub(t, half)); k = f.integer ? f.n : f.n + 1n; }
  return { value: k === 0n ? v : expandConstant(store, store.sub(v, store.mul(store.integer(k), P))), k };
}

const expr = (store: ExpressionStore, v: PointValue | Endpoint) => valueExpression(store, v as PointValue);
const asValue = (store: ExpressionStore, id: ExprId, domain: EvaluationDomain): PointValue => normalizeValue(store, { kind: 'expression', id }, domain);
const sameEnd = (store: ExpressionStore, a: Endpoint, b: Endpoint) => compareEndpoints(store, a, b) === 0;
function sameComponent(store: ExpressionStore, a: Interval, b: Interval): boolean {
  return a.loClosed === b.loClosed && a.hiClosed === b.hiClosed && sameEnd(store, a.lo, b.lo) && sameEnd(store, a.hi, b.hi);
}

/** Components shifted by `shift` and re-windowed, sorted and merged (also across the window edge). */
function windowed(store: ExpressionStore, components: readonly Interval[], P: ExprId, domain: EvaluationDomain, shift?: ExprId): Interval[] {
  const items = components.map(c => {
    const lo = shift === undefined ? expr(store, c.lo) : store.add(expr(store, c.lo), shift);
    const hi = shift === undefined ? expr(store, c.hi) : store.add(expr(store, c.hi), shift);
    const w = intoWindow(store, lo, P, !(c.loClosed && c.hiClosed && compareEndpoints(store, c.lo, c.hi) === 0));
    const hiShifted = w.k === 0n ? hi : store.sub(hi, store.mul(store.integer(w.k), P));
    return { lo: asValue(store, w.value, domain), hi: asValue(store, hiShifted, domain), loClosed: c.loClosed, hiClosed: c.hiClosed } as Interval;
  });
  items.sort((a, b) => compareEndpoints(store, a.lo, b.lo) || (a.loClosed === b.loClosed ? 0 : a.loClosed ? -1 : 1));
  const merged: Interval[] = [];
  const joins = (a: Interval, b: Interval) => { const c = compareEndpoints(store, a.hi, b.lo); return c > 0 || (c === 0 && (a.hiClosed || b.loClosed)); };
  const union = (a: Interval, b: Interval): Interval => {
    const d = compareEndpoints(store, b.hi, a.hi);
    return { lo: a.lo, loClosed: a.loClosed, hi: d > 0 ? b.hi : a.hi, hiClosed: d > 0 ? b.hiClosed : d < 0 ? a.hiClosed : a.hiClosed || b.hiClosed };
  };
  for (const it of items) {
    store.ctx.tick();
    const last = merged[merged.length - 1];
    if (last && joins(last, it)) merged[merged.length - 1] = union(last, it); else merged.push(it);
  }
  // Across the edge: the last component reaching the first one's next occurrence.
  while (merged.length > 1) {
    const last = merged[merged.length - 1], first = merged[0];
    const next: Interval = { lo: asValue(store, store.add(expr(store, first.lo), P), domain), hi: asValue(store, store.add(expr(store, first.hi), P), domain), loClosed: first.loClosed, hiClosed: first.hiClosed };
    if (!joins(last, next)) break;
    merged.pop();
    merged[0] = union(last, next);
    merged.push(merged.shift() as Interval);
    merged.sort((a, b) => compareEndpoints(store, a.lo, b.lo));
  }
  return merged.map(c => Object.freeze(c));
}

function divisorsDescending(n: number): number[] {
  const out: number[] = [];
  for (let m = n; m >= 2; m--) if (n % m === 0) out.push(m);
  return out;
}

/** The whole period is covered: the set is its range. */
function coversPeriod(store: ExpressionStore, components: readonly Interval[], P: ExprId): boolean {
  if (components.length !== 1) return false;
  const c = components[0], length = store.sub(expr(store, c.hi), expr(store, c.lo));
  const cmp = realCompare(store, length, P);
  return cmp > 0 || (cmp === 0 && (c.loClosed || c.hiClosed));
}

function rangeSet(store: ExpressionStore, variables: readonly string[], range: Interval, domain: EvaluationDomain): SolutionSet {
  return normalizeSet(store, { kind: 'intervals', variables, intervals: [range] }, domain);
}

export function normalizePeriodicSet(store: ExpressionStore, set: PeriodicSet, domain: EvaluationDomain): SolutionSet {
  if (domain !== 'real') fail('periodic sets need the real domain');
  const vars = checkVariables(set.variables);
  if (vars.length !== 1) fail('periodic sets describe one variable');
  let period = normalizeValue(store, set.period, 'real'), P = expr(store, period);
  if (realSign(store, P) <= 0) fail('period must be positive');
  const range = (normalizeIntervals(store, { kind: 'intervals', variables: vars, intervals: [set.range] }, 'real') as Extract<SolutionSet, { kind: 'intervals' }>).intervals;
  if (range.length !== 1 || (range[0].lo.kind !== 'infinity' && range[0].hi.kind !== 'infinity')) fail('a periodic range is ℝ or a half-line');
  for (const c of set.components) {
    const lo = normalizeEndpoint(store, c.lo), hi = normalizeEndpoint(store, c.hi);
    if (lo.kind === 'infinity' || hi.kind === 'infinity') fail('periodic components are bounded');
    const cmp = compareEndpoints(store, lo, hi);
    if (cmp > 0 || (cmp === 0 && !(c.loClosed && c.hiClosed))) fail('empty or reversed periodic component');
  }
  let components = windowed(store, set.components, P, 'real');
  if (components.length === 0) return finiteSet(vars, []);
  if (coversPeriod(store, components, P)) return rangeSet(store, vars, range[0], 'real');
  // Minimal period: a translation by P/m that maps the components onto themselves.
  for (let reduced = true; reduced;) {
    reduced = false;
    for (const m of divisorsDescending(components.length)) {
      const step = store.div(P, store.integer(m));
      const moved = windowed(store, components, P, 'real', step);
      if (moved.length !== components.length || !moved.every((c, i) => sameComponent(store, c, components[i]))) continue;
      period = asValue(store, step, 'real');
      P = step;
      components = windowed(store, components, P, 'real');
      reduced = true;
      break;
    }
  }
  const r = range[0];
  if (!isFullLine(r)) {
    // A half-line starts (or ends) exactly at a component occurrence, with its closedness.
    const end = r.lo.kind !== 'infinity' ? { at: r.lo, closed: r.loClosed, side: 'lo' as const } : { at: r.hi, closed: r.hiClosed, side: 'hi' as const };
    const ok = components.some(c => {
      const e = end.side === 'lo' ? c.lo : c.hi, closed = end.side === 'lo' ? c.loClosed : c.hiClosed;
      return closed === end.closed && floorExact(store, store.div(store.sub(expr(store, end.at), expr(store, e)), P)).integer;
    });
    if (!ok) fail('a periodic half-line must start or end at a component occurrence');
  }
  const base = Object.freeze({ kind: 'periodic-set' as const, variables: vars, period, components: Object.freeze(components), range: r });
  return isFullLine(r) && components.every(c => c.lo === c.hi || sameEnd(store, c.lo, c.hi)) ? orbitDecomposition(store, base) : base;
}

/**
 * Point families split canonically into maximal orbits: residues r + j·P/m
 * (j = 0…m−1) all present form one family of period P/m, largest m first;
 * cosets of one subgroup are disjoint, so the split is unique.
 */
function orbitDecomposition(store: ExpressionStore, set: PeriodicSet): SolutionSet {
  const P = expr(store, set.period);
  let remaining = [...set.components];
  const families = new Map<string, { period: PointValue; points: Interval[] }>();
  for (let m = remaining.length; m >= 2; m--) {
    for (let i = 0; i < remaining.length; i++) {
      store.ctx.tick();
      const r = remaining[i], step = store.div(P, store.integer(m));
      const orbit: number[] = [];
      for (let j = 0; j < m; j++) {
        const shifted = intoWindow(store, store.add(expr(store, r.lo), store.mul(store.integer(j), step)), P).value;
        const at = remaining.findIndex(c => compareEndpoints(store, c.lo, asValue(store, shifted, 'real')) === 0);
        if (at < 0) break;
        orbit.push(at);
      }
      if (orbit.length !== m) continue;
      const residue = asValue(store, intoWindow(store, expr(store, r.lo), step).value, 'real');
      const key = valueKey(store, asValue(store, step, 'real'));
      const family = families.get(key) ?? { period: asValue(store, step, 'real'), points: [] };
      family.points.push(Object.freeze({ lo: residue, hi: residue, loClosed: true, hiClosed: true }));
      families.set(key, family);
      remaining = remaining.filter((_, k) => !orbit.includes(k));
      i = -1;
    }
  }
  const sets: SolutionSet[] = [...families.values()].map(f => Object.freeze({ ...set, period: f.period, components: Object.freeze(windowed(store, f.points, expr(store, f.period), 'real')) }));
  if (remaining.length) sets.push(Object.freeze({ ...set, components: Object.freeze(remaining) }));
  if (sets.length === 1) return sets[0];
  const byKey = new Map(sets.map(x => [setKey(store, x), x] as const));
  return unionSet([...byKey.keys()].sort().map(k => byKey.get(k) as SolutionSet));
}

/** Whether a real point lies in a periodic set (exact). */
export function periodicContains(store: ExpressionStore, set: PeriodicSet, v: PointValue): boolean {
  const P = expr(store, set.period), x = valueExpression(store, v);
  const r = set.range;
  if (r.lo.kind !== 'infinity') { const c = compareValues(store, v, r.lo); if (c < 0 || (c === 0 && !r.loClosed)) return false; }
  if (r.hi.kind !== 'infinity') { const c = compareValues(store, v, r.hi); if (c > 0 || (c === 0 && !r.hiClosed)) return false; }
  const w = intoWindow(store, x, P).value;
  for (const shift of [store.sub(w, P), w, store.add(w, P)]) {
    const p = asValue(store, shift, 'real');
    for (const c of set.components) {
      const a = compareEndpoints(store, p, c.lo), b = compareEndpoints(store, p, c.hi);
      if ((a > 0 || (a === 0 && c.loClosed)) && (b < 0 || (b === 0 && c.hiClosed))) return true;
    }
  }
  return false;
}

/** Periodic sets with one range and commensurable periods merge over their common period. */
function mergePeriodicSets(store: ExpressionStore, sets: readonly PeriodicSet[], domain: EvaluationDomain): SolutionSet[] {
  const groups = new Map<string, PeriodicSet[]>();
  for (const s of sets) {
    const k = `${s.range.loClosed}${endpointKey(store, s.range.lo)}|${endpointKey(store, s.range.hi)}${s.range.hiClosed}`;
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  const out: SolutionSet[] = [];
  for (const group of groups.values()) {
    const pending = [...group];
    while (pending.length) {
      let acc = pending.shift() as PeriodicSet;
      for (let i = 0; i < pending.length; i++) {
        const ratio = store.numberValue(store.div(expr(store, pending[i].period), expr(store, acc.period)));
        if (!ratio) continue;
        // Common period L = b·P_acc = a·P_other for ratio a/b.
        const common = store.mul(store.integer(ratio.numerator), expr(store, acc.period));
        const expand = (s: PeriodicSet, times: bigint) => {
          const parts: Interval[] = [];
          for (let j = 0n; j < times; j++) {
            store.ctx.tick();
            const shift = store.mul(store.integer(j), expr(store, s.period));
            for (const c of s.components) parts.push({ ...c, lo: asValue(store, store.add(expr(store, c.lo), shift), domain), hi: asValue(store, store.add(expr(store, c.hi), shift), domain) });
          }
          return parts;
        };
        acc = Object.freeze({ ...acc, period: asValue(store, common, domain), components: [...expand(acc, ratio.numerator), ...expand(pending[i], ratio.denominator)] });
        pending.splice(i, 1);
        i = -1;
      }
      const n = normalizePeriodicSet(store, acc, domain);
      if (n.kind === 'union') out.push(...n.sets); else if (!(n.kind === 'finite' && n.points.length === 0)) out.push(n);
    }
  }
  return out;
}

// ---- membership ----

/** Exact membership of a point in a finite set: true, false, or 'unknown' when a closed-form value cannot be compared exactly. */
export function finiteContains(store: ExpressionStore, set: SolutionSet, point: Point, domain: EvaluationDomain): boolean | 'unknown' {
  demand(set.kind === 'finite', 'invalid-input', 'membership needs a finite set');
  if (point.length !== set.variables.length) fail('point arity');
  const p = point.map(v => normalizeValue(store, v, domain));
  let unknown = false;
  for (const q of set.points) {
    const n = q.map(v => normalizeValue(store, v, domain));
    let same: boolean | 'unknown' = true;
    for (let i = 0; i < p.length && same !== false; i++) {
      const a = p[i], b = n[i];
      if (a.kind === 'expression' || b.kind === 'expression') {
        if (a.kind === 'expression' && b.kind === 'expression' && a.id === b.id) continue;
        same = 'unknown';
      } else if (valueKey(store, a) !== valueKey(store, b)) same = false;
    }
    if (same === true) return true;
    if (same === 'unknown') unknown = true;
  }
  return unknown ? 'unknown' : false;
}
