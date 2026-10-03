import { demand, EquationAlgebraError, type EquationStop } from '../execution';
import { rCompare } from '../algebra/rational';
import { compareReal, type RealRootOf, type RootOf } from '../algebraic/root-of';
import { asRoot, evaluateExact, type EvaluationDomain, type ExactValue } from './evaluate';
import { isSymbolName, type ExprId, type ExpressionStore } from './expression';
import { canonicalCondition, conditionKey, type Condition, type RelationProblem } from './relation';
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
export type PointValue = ExactValue | { readonly kind: 'algebraic'; readonly root: RootOf; readonly form?: ExprId } | { readonly kind: 'expression'; readonly id: ExprId };
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
  /** values[i] gives variables[i] in terms of integer parameters (k ∈ ℤ), under constraints. */
  | { readonly kind: 'periodic'; readonly variables: readonly string[]; readonly values: readonly ExprId[]; readonly integerParameters: readonly string[]; readonly constraints: readonly Condition[] }
  /** values[i] gives variables[i] in terms of free continuous parameters, under constraints. */
  | { readonly kind: 'parametric'; readonly variables: readonly string[]; readonly values: readonly ExprId[]; readonly freeParameters: readonly string[]; readonly constraints: readonly Condition[] }
  /** A proven-equivalent relation problem left unsolved. */
  | { readonly kind: 'reduced-form'; readonly problem: RelationProblem }
  /** Candidates whose verification could not be decided, each with the derivations that produced it. */
  | { readonly kind: 'unconfirmed'; readonly variables: readonly string[]; readonly candidates: readonly Candidate[] };

export const SOLUTION_SET_KINDS = ['finite', 'intervals', 'cofinite', 'union', 'case-tree', 'periodic', 'parametric', 'reduced-form', 'unconfirmed'] as const;

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
  return `e:${store.digest(v.id)}`;
}

function rank(v: PointValue): number {
  return v.kind === 'rational' || (v.kind === 'algebraic' && v.root.kind === 'real') ? 0 : v.kind === 'algebraic' ? 1 : 2;
}

/** Canonical order: real values by size, then non-real by canonical identity, then expressions by digest. */
export function compareValues(store: ExpressionStore, a: PointValue, b: PointValue): number {
  const ctx = store.ctx, ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 0) {
    const x = a as ExactValue, y = b as ExactValue;
    if (x.kind === 'rational' && y.kind === 'rational') return rCompare(ctx, x.value, y.value);
    return compareReal(ctx, asRoot(ctx, x) as RealRootOf, asRoot(ctx, y) as RealRootOf);
  }
  const ka = valueKey(store, a), kb = valueKey(store, b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

/** Exact numbers in canonical form; expressions that evaluate exactly become numbers. */
function normalizeValue(store: ExpressionStore, v: PointValue, domain: EvaluationDomain): PointValue {
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

function comparePoints(store: ExpressionStore, a: Point, b: Point): number {
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
        if (s.kind === 'union') pending.unshift(...s.sets); else flat.push(normalizeSet(store, s, domain));
      }
      const finite = flat.filter(s => s.kind === 'finite') as Extract<SolutionSet, { kind: 'finite' }>[];
      const others = flat.filter(s => s.kind !== 'finite');
      const merged = normalizeSet(store, finiteSet(setVariables(set), finite.flatMap(s => s.points)), domain);
      const parts = (merged.kind === 'finite' && merged.points.length === 0 ? [] : [merged]).concat(others);
      const byKey = new Map(parts.map(s => [setKey(store, s), s] as const));
      const ordered = [...byKey.keys()].sort().map(k => byKey.get(k) as SolutionSet);
      if (ordered.length === 0) return merged;
      return ordered.length === 1 ? ordered[0] : unionSet(ordered);
    }
    case 'case-tree': {
      const cases = set.cases.map(c => Object.freeze({ conditions: canonicalConditions(store, c.conditions), set: normalizeSet(store, c.set, domain) }));
      const byKey = new Map(cases.map(c => [caseKey(store, c), c] as const));
      return Object.freeze({ kind: 'case-tree', cases: Object.freeze([...byKey.keys()].sort().map(k => byKey.get(k) as Case)) });
    }
    case 'periodic': case 'parametric':
      return Object.freeze({ ...set, constraints: canonicalConditions(store, set.constraints) });
    case 'reduced-form':
      return set;
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
    case 'periodic': return `periodic(${set.variables.join(',')};${set.integerParameters.join(',')}){${set.values.map(v => store.digest(v)).join('|')}}[${conds(set.constraints)}]`;
    case 'parametric': return `parametric(${set.variables.join(',')};${set.freeParameters.join(',')}){${set.values.map(v => store.digest(v)).join('|')}}[${conds(set.constraints)}]`;
    case 'reduced-form': return `reduced{${set.problem.hash}}`;
    case 'unconfirmed': return `unconfirmed(${set.variables.join(',')}){${set.candidates.map(c => `${pointKey(store, c.point)}<${c.derivations.join(',')}>`).join('|')}}`;
  }
}

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
  const v = normalizeValue(store, e, 'real');
  if (v.kind === 'expression') fail('interval endpoints must be exact numbers');
  return v;
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
