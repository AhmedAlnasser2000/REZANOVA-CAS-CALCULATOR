import { demand } from '../execution';
import { evaluateExact, type ExactValue } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import {
  compareValues, finiteSet, normalizeSet, valueKey, type Endpoint, type Interval, type PointValue, type RegionCell, type SolutionSet,
} from '../representation/solution-set';
import type { CadCell, Decomposition, Section } from './decompose';
import { fiberRoots } from './fiber';
import { coefficient, constant, degree, divide, multiply, negate, scale, subtract, terms, toExpression, trueLevel, type RPoly } from './recursive';
import { igcd, isqrt } from '../algebra/integer';
import { rational, rMultiply, type Rational } from '../algebra/rational';
import { signAtPoint } from './sign';
import { attachForm } from '../decision/radical-forms';

/**
 * The answer of a decomposition (EQUATION-SEMIALGEBRAIC1): ∅, finitely many points, intervals of one variable, or a
 * cylindrical region in the form of Mathematica's Reduce.
 *
 * Each stack becomes cells of its variable whose ends are its sections: a constant when every outer coordinate is
 * fixed (the cell lies over sections only), else a function of the outer variables — −c₀/c₁ for degree 1,
 * (−c₁ ± √(c₁² − 4c₂c₀))/(2c₂) for degree 2 (the sign fixed by c₂'s sign on the cell, which is invariant there),
 * and the index-th real root of the section's polynomial otherwise. Fixed outer coordinates are substituted.
 *
 * Adjacent cells merge when one description holds on both: a section joins a neighbouring sector whose description,
 * evaluated exactly at the section's sample point, is the section's own; two sectors join across a section when
 * their descriptions are identical and hold at the section. Evaluation at one sample decides the whole section: the
 * descriptions are made of roots of basis polynomials (and closed forms of them, defined exactly where their
 * leading coefficients and discriminants — projection polynomials, sign-invariant on the section — allow), which are
 * delineable over the section, so both descriptions select the same sections of its stack at every point of it.
 */
interface Bound {
  readonly value: PointValue;
  readonly level: number;
  /** The section's polynomial and root index (for exact evaluation at other points); absent for a constant. */
  readonly poly?: RPoly;
  readonly index?: number;
  /** A closed form, evaluated by substitution. */
  readonly closed?: ExprId;
  /** From a Lazard evaluation over a nullified cell: not delineable over neighbouring cells, so never merged. */
  readonly lazard?: true;
}
interface Piece { readonly level: number; readonly lo?: Bound; readonly hi?: Bound; readonly loClosed: boolean; readonly hiClosed: boolean; readonly desc: Desc }
type Desc = 'all' | 'none' | readonly Piece[];

interface Builder { readonly store: ExpressionStore; readonly d: Decomposition; readonly names: readonly string[] }

/** A constant end or coordinate, with its radical form when one is proven (quadratics, binomials). */
const exactValue = (store: ExpressionStore, v: ExactValue): PointValue => (v.kind === 'algebraic' ? attachForm(store, v) : v);

/** The section's end: constant over fixed outer coordinates, else a closed form or an indexed root. */
function sectionBound(b: Builder, parent: CadCell, cell: CadCell, fixed: ReadonlyMap<string, ExprId>): Bound {
  const store = b.store, ctx = store.ctx, k = cell.level;
  const def = [...cell.sections].sort((x, y) => degree(x.poly) - degree(y.poly))[0] as Section;
  const lazard = def.lazard ? { lazard: true as const } : {};
  const base = { level: k, poly: def.poly, index: def.index, ...lazard };
  if (fixed.size === k - 1) return { value: exactValue(store, cell.sample[k - 1]), ...base };
  // The effective degree over the parent cell: the top coefficient that does not vanish there.
  const c = Array.from({ length: degree(def.poly) + 1 }, (_, i) => coefficient(def.poly, i, k));
  let top = c.length - 1;
  while (top > 0 && signAtPoint(ctx, c[top], k - 1, parent.sample) === 0) top--;
  const m = k - 1, expr = (a: RPoly, scale = rational(ctx, 1n)) => polyExpression(store, a, m, b.names, scale);
  /** a / d for polynomials, as a polynomial with rational coefficients when d is a constant. */
  const quotient = (a: RPoly, d: RPoly): ExprId => {
    const t = trueLevel(d, m);
    return t.level === 0 ? expr(a, rational(ctx, 1n, t.poly as bigint)) : store.div(expr(a), expr(d));
  };
  let closed: ExprId | undefined;
  if (top === 1) closed = quotient(negate(ctx, c[0], m), c[1]);
  else if (top === 2 && def.count === 1) closed = quotient(negate(ctx, c[1], m), scale(ctx, c[2], 2n, m));
  else if (top === 2) {
    // (−c₁ ± s·√D′)/(2c₂) with D = c₁² − 4c₂c₀ = s²·D′, the sign from c₂'s sign on the cell.
    const sign = BigInt((def.index === 1 ? -1 : 1) * signAtPoint(ctx, c[2], m, parent.sample));
    const D = subtract(ctx, multiply(ctx, c[1], c[1], m), scale(ctx, multiply(ctx, c[2], c[0], m), 4n, m), m);
    const s = squarePart(ctx, integerContent(ctx, D, m)), root = store.sqrt(expr(divide(ctx, D, constant(s * s, m), m)));
    const t = trueLevel(c[2], m);
    closed = t.level === 0
      ? store.add(quotient(negate(ctx, c[1], m), scale(ctx, c[2], 2n, m)), store.mul(store.number(rational(ctx, sign * s, 2n * (t.poly as bigint))), root))
      : store.div(store.add(expr(negate(ctx, c[1], m)), store.mul(store.integer(sign * s), root)), expr(scale(ctx, c[2], 2n, m)));
  }
  if (closed !== undefined) {
    const id = store.substitute(closed, fixed);
    return { value: { kind: 'expression', id }, closed: id, ...base };
  }
  const poly = toExpression(store, def.poly, k, b.names);
  return { value: { kind: 'root', poly, variable: b.names[k - 1], index: def.index }, ...base };
}

/** Σ (c·scale)·x^e as an expression. */
function polyExpression(store: ExpressionStore, a: RPoly, n: number, names: readonly string[], scaleBy: Rational): ExprId {
  const ctx = store.ctx;
  const parts = terms(a, n).map(t => store.mul(store.number(rMultiply(ctx, rational(ctx, t.c), scaleBy)), ...t.exps.flatMap((e, i) => (e === 0 ? [] : [store.pow(store.symbol(names[i]), store.integer(e))]))));
  return parts.length ? store.add(...parts) : store.integer(0);
}

/** The integer content of a polynomial (positive). */
function integerContent(ctx: ExpressionStore['ctx'], a: RPoly, n: number): bigint {
  let g = 0n;
  for (const t of terms(a, n)) g = igcd(ctx, g, t.c);
  return g;
}

/** The largest s found with s² dividing g (small primes, then a square cofactor): √g = s·√(g/s²). */
function squarePart(ctx: ExpressionStore['ctx'], g: bigint): bigint {
  let s = 1n, rest = g;
  for (let p = 2n; p < 1000n && p * p <= rest; p += p === 2n ? 1n : 2n) {
    ctx.tick();
    while (rest % (p * p) === 0n) { rest /= p * p; s *= p; }
  }
  const r = isqrt(ctx, rest);
  return r * r === rest ? s * r : s;
}

/** The description of the formula over a cell: all, none, or the cells of the next variable. */
function describe(b: Builder, cell: CadCell, fixed: ReadonlyMap<string, ExprId>): Desc {
  const store = b.store;
  store.ctx.tick();
  if (cell.truth !== undefined) return cell.truth ? 'all' : 'none';
  const stack = cell.children as readonly CadCell[];
  const bounds = stack.map((c, i) => (i % 2 === 1 ? sectionBound(b, cell, c, fixed) : undefined));
  const pieces: Piece[] = stack.map((c, i) => {
    if (i % 2 === 1) {
      const v = bounds[i] as Bound, x = b.names[c.level - 1];
      const inner = fixed.size === c.level - 1 && v.value.kind !== 'expression' && v.value.kind !== 'root' ? new Map([...fixed, [x, valueExpression(store, v.value)]]) : fixed;
      return { level: c.level, lo: v, hi: v, loClosed: true, hiClosed: true, desc: describe(b, c, inner) };
    }
    return { level: c.level, lo: bounds[i - 1], hi: bounds[i + 1], loClosed: false, hiClosed: false, desc: describe(b, c, fixed) };
  });
  return merge(b, stack, pieces);
}

const valueExpression = (store: ExpressionStore, v: ExactValue) => (v.kind === 'rational' ? store.number(v.value) : store.algebraic(v.root));

// ---- merging ----

/** A bound's exact value at a point (coordinates of the outer variables), or its symbolic key when some are free. */
function boundAt(b: Builder, bound: Bound, point: readonly (ExactValue | undefined)[]): { readonly exact?: ExactValue; readonly key: string } | undefined {
  const store = b.store, k = bound.level, known = point.slice(0, k - 1);
  const v = bound.value;
  if (v.kind === 'rational' || v.kind === 'algebraic') return { exact: v as ExactValue, key: valueKey(store, v) };
  if (known.every(c => c !== undefined)) {
    if (bound.closed !== undefined) {
      const env = new Map(known.map((c, i) => [b.names[i], valueExpression(store, c as ExactValue)] as const));
      const e = evaluateExact(store, store.substitute(bound.closed, env), 'real');
      return e.kind === 'exact' ? { exact: e.value, key: valueKey(store, e.value) } : undefined;
    }
    const roots = fiberRoots(store, bound.poly as RPoly, k, known as ExactValue[]);
    if (roots === 'nullified' || (bound.index as number) > roots.length) return undefined;
    const r = roots[(bound.index as number) - 1];
    return { exact: r, key: valueKey(store, r) };
  }
  // Some outer coordinates are free: the bound with the known ones substituted, as a symbolic key.
  if (bound.closed !== undefined) {
    const env = new Map(known.flatMap((c, i) => (c ? [[b.names[i], valueExpression(store, c)] as const] : [])));
    return { key: `e:${store.digest(store.substitute(bound.closed, env))}` };
  }
  const fixed = known.map((c, i) => (c ? `${i}=${valueKey(store, c)}` : '')).join(',');
  return { key: `${valueKey(store, v)}@${fixed}` };
}

/** A canonical key of a description evaluated at a point (undefined when it is not defined there). */
function descAt(b: Builder, desc: Desc, point: readonly (ExactValue | undefined)[]): string | undefined {
  if (desc === 'all' || desc === 'none') return desc;
  const parts: string[] = [];
  for (const p of desc) {
    b.store.ctx.tick();
    if (p.lo?.lazard || p.hi?.lazard) return undefined;
    const lo = p.lo ? boundAt(b, p.lo, point) : { key: '-inf' }, hi = p.hi ? boundAt(b, p.hi, point) : { key: '+inf' };
    if (!lo || !hi) return undefined;
    // Deeper levels see this level's coordinate when the cell is a single point here.
    let deeper: (ExactValue | undefined)[] = [...point.slice(0, p.level - 1), undefined];
    if (lo.exact && hi.exact) {
      const c = compareValues(b.store, lo.exact, hi.exact);
      if (c > 0) return undefined;
      if (c === 0 && !(p.loClosed && p.hiClosed)) continue; // an empty interval at this point
      if (c === 0) deeper = [...point.slice(0, p.level - 1), lo.exact];
    }
    const inner = descAt(b, p.desc, deeper);
    if (inner === undefined) return undefined;
    if (inner === 'none') continue;
    parts.push(`${p.loClosed ? '[' : '('}${lo.key},${hi.key}${p.hiClosed ? ']' : ')'}{${inner}}`);
  }
  return parts.length ? parts.join('|') : 'none';
}

/** Merge the pieces of a stack whose descriptions agree (see the module comment), dropping empty ones. */
function merge(b: Builder, stack: readonly CadCell[], pieces: readonly Piece[]): Desc {
  const groups: { from: number; to: number; desc: Desc }[] = [];
  const holdsAt = (desc: Desc, section: number) => {
    // A section without points stays a boundary: merging it would only widen the written interval.
    const point = stack[section].sample, own = descAt(b, pieces[section].desc, point);
    return own !== undefined && own !== 'none' && descAt(b, desc, point) === own;
  };
  const same = (x: Desc, y: Desc) => (typeof x === 'string' || typeof y === 'string' ? x === y : regionKeyOf(b, x) === regionKeyOf(b, y));
  groups.push({ from: 0, to: 0, desc: pieces[0].desc });
  for (let i = 1; i < pieces.length; i += 2) {
    const last = groups[groups.length - 1], next = pieces[i + 1].desc, section = pieces[i].desc;
    const left = last.to === i - 1 && holdsAt(last.desc, i), right = holdsAt(next, i);
    if (left && same(last.desc, next)) { last.to = i + 1; continue; }
    if (left) { last.to = i; groups.push({ from: i + 1, to: i + 1, desc: next }); continue; }
    if (right) { groups.push({ from: i, to: i + 1, desc: next }); continue; }
    groups.push({ from: i, to: i, desc: section }, { from: i + 1, to: i + 1, desc: next });
  }
  const kept = groups.filter(g => g.desc !== 'none');
  if (kept.length === 0) return 'none';
  const out = kept.map(g => ({
    level: pieces[g.from].level, lo: pieces[g.from].lo, hi: pieces[g.to].hi, loClosed: pieces[g.from].loClosed, hiClosed: pieces[g.to].hiClosed, desc: g.desc,
  }));
  if (out.length === 1 && !out[0].lo && !out[0].hi && out[0].desc === 'all') return 'all';
  return out;
}

function regionKeyOf(b: Builder, pieces: readonly Piece[]): string {
  const end = (x: Bound | undefined, inf: string) => (x ? `${valueKey(b.store, x.value)}${x.lazard ? '!' : ''}` : inf);
  return pieces.map(p => `${p.loClosed ? '[' : '('}${end(p.lo, '-inf')},${end(p.hi, '+inf')}${p.hiClosed ? ']' : ')'}{${typeof p.desc === 'string' ? p.desc : regionKeyOf(b, p.desc)}}`).join('|');
}

// ---- the answer ----

const endpoint = (x: Bound | undefined, sign: -1 | 1): Endpoint => (x ? x.value : { kind: 'infinity', sign });
function cells(pieces: readonly Piece[]): RegionCell[] {
  return pieces.map(p => {
    const head = { lo: endpoint(p.lo, -1), hi: endpoint(p.hi, 1), loClosed: p.loClosed, hiClosed: p.hiClosed };
    return typeof p.desc === 'string' ? head : { ...head, children: cells(p.desc) };
  });
}

/** True leaves at full dimension reached through sections only: the region is finitely many points. */
function points(cell: CadCell, n: number, out: ExactValue[][]): boolean {
  if (cell.truth !== undefined) {
    if (!cell.truth) return true;
    if (cell.level !== n) return false;
    out.push([...cell.sample]);
    return true;
  }
  return (cell.children as readonly CadCell[]).every((c, i) => (i % 2 === 0 ? c.truth === false || (c.truth === undefined && hasNoTruth(c)) : points(c, n, out)));
}
function hasNoTruth(cell: CadCell): boolean {
  return cell.truth !== undefined ? !cell.truth : (cell.children as readonly CadCell[]).every(hasNoTruth);
}

/** The decomposition's true region as a solution set over `variables` (x₁ … xₙ); undefined when it is empty. */
export function regionSet(store: ExpressionStore, d: Decomposition, variables: readonly string[]): SolutionSet | undefined {
  demand(variables.length === d.n, 'invalid-input', 'one variable per level');
  const found: ExactValue[][] = [];
  if (points(d.root, d.n, found)) return found.length ? normalizeSet(store, finiteSet(variables, found.map(p => p.map(v => exactValue(store, v)))), 'real') : undefined;
  const desc = describe({ store, d, names: variables }, d.root, new Map());
  if (desc === 'none') return undefined;
  const all: RegionCell[] = [{ lo: { kind: 'infinity', sign: -1 }, hi: { kind: 'infinity', sign: 1 }, loClosed: false, hiClosed: false }];
  const list = desc === 'all' ? all : cells(desc);
  if (d.n === 1) return normalizeSet(store, { kind: 'intervals', variables, intervals: list.map((c): Interval => ({ lo: c.lo, hi: c.hi, loClosed: c.loClosed, hiClosed: c.hiClosed })) }, 'real');
  return normalizeSet(store, { kind: 'cylindrical', variables, cells: list }, 'real');
}
