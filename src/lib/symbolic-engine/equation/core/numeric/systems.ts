import { rAbs, rAdd, rational, rCompare, rMultiply, rSubtract, type Rational } from '../algebra/rational';
import { excludesZero, WHOLE, type XRange } from '../composition/range';
import type { Refusal } from '../decision/rational-form';
import { simplestBetween } from '../generators/samples';
import { enclose } from '../representation/enclosure';
import { evaluateExact } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { realSign } from '../representation/real-order';
import type { Relation } from '../representation/relation';
import { rangeBound } from './isolated';
import { contractSystem, meanValueRange } from './contract';
import { newtonGuess } from './floats';
import { fromDouble, fromRange, ivHull, ivIntersect, ivMid, toDouble, type Iv } from './interval';
import { bitsFor, boxMap, definedOn, krawczyk, squareSystem, type SquareSystem } from './krawczyk';

/**
 * Certified solutions of square systems (EQUATION-CERTIFIED-NUMERICS1 PR B): n equations in n unknowns with no
 * exact route, solved by branch and prune over a bounded search box.
 *
 * The search box comes from range rows (constant bounds on single unknowns), then HC4 contraction over the
 * rest of the space bounds what it can (eˣ + sin y = 1 forces x ≤ ln 2); unknowns still unbounded are refused
 * by name, with the range row that would fix it. Each box is then
 * 1. dropped when some kernel is undefined throughout it, or some equation's certified range (natural ∩
 *    mean-value) excludes 0;
 * 2. contracted by HC4 (an empty result proves no solution);
 * 3. tested by Krawczyk: none proves no solution, unique proves exactly one (the box becomes a root box);
 * 4. otherwise searched by floating-point Newton from its centre (within the search box): a converged guess becomes a root box by ε-inflation and the
 *    exact Krawczyk test (a simple rational point that satisfies every equation exactly is kept exact), the
 *    box grown while the test still holds;
 * 5. otherwise split across its widest side at a point slightly off the middle.
 * Boxes inside a root box are covered. Every box is either excluded or covered when the work list empties, so
 * the roots found are all the solutions in the search box (the verifier re-proves this independently). A box
 * that shrinks to 2^−40 of its scale without being decided holds a tangent (singular) solution, which the
 * Krawczyk test can never prove: refused honestly (user decision 2026-10-07). No other limit applies; the
 * budget is the only stop.
 */
const OWNER = 'EQUATION-CERTIFIED-NUMERICS1';
class Stop { readonly refusal: Refusal; constructor(refusal: Refusal) { this.refusal = refusal; } }
const stop = (detail: string): never => { throw new Stop({ owner: OWNER, detail, specific: true }); };

/** A range row's bound on one unknown: the constant and whether the inequality is strict. */
export interface SearchBound { readonly at: ExprId; readonly strict: boolean }
export interface SearchRange { readonly lo?: SearchBound; readonly hi?: SearchBound }

export type SystemRoots =
  | { readonly kind: 'points'; readonly points: readonly (readonly ExprId[])[] }
  | { readonly kind: 'refused'; readonly refusal: Refusal };

interface Root { box: Iv[]; readonly exact?: readonly Rational[] }


/** The closed rational range enclosing a range row's bounds (open where there is none). */
export function initialRange(store: ExpressionStore, r: SearchRange | undefined): XRange {
  if (!r) return WHOLE;
  const lo = r.lo ? enclose(store, r.lo.at, 64) : undefined, hi = r.hi ? enclose(store, r.hi.at, 64) : undefined;
  return {
    ...(lo?.kind === 'bounds' ? { lo: lo.lo } : {}), ...(hi?.kind === 'bounds' ? { hi: hi.hi } : {}),
    loOpen: lo?.kind !== 'bounds', hiOpen: hi?.kind !== 'bounds',
  };
}

export const overlaps = (store: ExpressionStore, a: readonly Iv[], b: readonly Iv[]) => a.every((x, i) => ivIntersect(store.ctx, x, b[i]) !== undefined);
export const inside = (store: ExpressionStore, a: readonly Iv[], b: readonly Iv[]) => a.every((x, i) => rCompare(store.ctx, b[i].lo, x.lo) <= 0 && rCompare(store.ctx, x.hi, b[i].hi) <= 0);

/** Whether some equation's certified range on the box excludes 0. */
export function excluded(store: ExpressionStore, sys: SquareSystem, X: readonly Iv[], bits: number): boolean {
  const map = boxMap(sys.vars, X);
  return sys.fs.some((f, i) => excludesZero(meanValueRange(store, f, sys.jacobian[i], sys.vars, map, bits)));
}

/** The box with centre c and half-width r in every coordinate (r relative to 1 + |cᵢ|). */
export function around(store: ExpressionStore, c: readonly Rational[], r: Rational): Iv[] {
  const ctx = store.ctx;
  return c.map(x => { const w = rMultiply(ctx, r, rAdd(ctx, rational(ctx, 1n), rAbs(ctx, x))); return { lo: rSubtract(ctx, x, w), hi: rAdd(ctx, x, w) }; });
}

/** A root box around a converged guess: exact when a simple rational point solves the system exactly. */
function rootAround(store: ExpressionStore, sys: SquareSystem, guess: readonly number[], limit: Rational): Root | undefined {
  const ctx = store.ctx;
  const q = guess.map(v => fromDouble(ctx, v));
  // A simple rational point near the guess that satisfies every equation exactly is an exact solution.
  const delta = rational(ctx, 1n, 1n << 30n);
  const simple = q.map(x => { const w = rMultiply(ctx, delta, rAdd(ctx, rational(ctx, 1n), rAbs(ctx, x))); return simplestBetween(ctx, rSubtract(ctx, x, w), rAdd(ctx, x, w)); });
  const at = new Map(sys.vars.map((v, i) => [v, store.number(simple[i])] as const));
  const exact = sys.fs.every(f => { const e = evaluateExact(store, store.substitute(f, at), 'real'); return e.kind === 'exact' && e.value.kind === 'rational' && e.value.value.numerator === 0n; });
  const centre = exact ? simple : q;
  // ε-inflation: the smallest proven box, then grown while the test still proves exactly one solution.
  let best: Iv[] | undefined;
  for (const e of [40n, 60n]) {
    const B = around(store, centre, rational(ctx, 1n, 1n << e));
    if (krawczyk(store, sys, B).kind === 'unique') { best = B; break; }
  }
  if (!best) return undefined;
  for (let r = rational(ctx, 1n, 1n << 36n); rCompare(ctx, r, limit) <= 0; r = rMultiply(ctx, r, rational(ctx, 16n))) {
    ctx.tick();
    const B = around(store, centre, r);
    if (krawczyk(store, sys, B).kind !== 'unique') break;
    best = B;
  }
  return { box: niceBox(store, sys, best), ...(exact ? { exact: simple } : {}) };
}

/** A box with simple rational ends between the proven box and a contracted core, when it still proves itself. */
function niceBox(store: ExpressionStore, sys: SquareSystem, B: Iv[]): Iv[] {
  const ctx = store.ctx;
  let core: readonly Iv[] = B;
  for (let i = 0; i < 2; i++) {
    const k = krawczyk(store, sys, core);
    if (k.kind !== 'unique') return B;
    core = k.box;
  }
  const nice = B.map((b, i) => ({ lo: simplestBetween(ctx, b.lo, core[i].lo), hi: simplestBetween(ctx, core[i].hi, b.hi) }));
  return krawczyk(store, sys, nice).kind === 'unique' ? nice : B;
}

/** Add a root, merging it with an overlapping root box of the same solution and separating distinct ones. */
function addRoot(store: ExpressionStore, sys: SquareSystem, roots: Root[], root: Root): void {
  const ctx = store.ctx;
  for (;;) {
    ctx.tick();
    const other = roots.find(r => overlaps(store, r.box, root.box));
    if (!other) { roots.push(root); return; }
    const hull = other.box.map((b, i) => ivHull(ctx, b, root.box[i]));
    if (krawczyk(store, sys, hull).kind === 'unique') {
      // One solution: keep one root (an exact one when either is), with the larger proven box.
      roots.splice(roots.indexOf(other), 1);
      root = { box: hull, ...(other.exact ? { exact: other.exact } : root.exact ? { exact: root.exact } : {}) };
      continue;
    }
    // Two solutions with overlapping boxes: contract both until they separate.
    for (const r of [other, root]) {
      const k = krawczyk(store, sys, r.box);
      if (k.kind !== 'unique') return stop('two nearby solutions could not be separated');
      r.box = [...k.box];
    }
  }
}

/** Whether a box has shrunk to 2^−40 of its scale in every coordinate (only a tangent solution keeps it open). */
export function tiny(store: ExpressionStore, X: readonly Iv[]): boolean {
  const ctx = store.ctx, scale = rational(ctx, 1n << 40n);
  return X.every(b => rCompare(ctx, rMultiply(ctx, rSubtract(ctx, b.hi, b.lo), scale), rAdd(ctx, rational(ctx, 1n), rAbs(ctx, ivMid(ctx, b)))) < 0);
}

/** Split across the widest side (relative), slightly off the middle so no split face lands on a simple root. */
export function split(store: ExpressionStore, X: readonly Iv[]): [Iv[], Iv[]] {
  const ctx = store.ctx;
  let best = 0, bestWidth = rational(ctx, -1n);
  X.forEach((b, i) => {
    const w = rSubtract(ctx, b.hi, b.lo);
    if (rCompare(ctx, w, bestWidth) > 0) { best = i; bestWidth = w; }
  });
  const b = X[best], cut = rAdd(ctx, b.lo, rMultiply(ctx, rSubtract(ctx, b.hi, b.lo), rational(ctx, 33n, 64n)));
  return [X.map((x, i) => (i === best ? { lo: x.lo, hi: cut } : x)), X.map((x, i) => (i === best ? { lo: cut, hi: x.hi } : x))];
}

/**
 * Whether a coordinate satisfies its range rows: decided exactly for exact values; for values built from a certified
 * point by certified enclosures (64 to 256 bits); undefined when such a value may sit on a range boundary (callers
 * refuse honestly).
 */
export function satisfiesRange(store: ExpressionStore, coordinate: ExprId, r: SearchRange | undefined): boolean | undefined {
  if (!r) return true;
  const numeric = store.postorder([coordinate]).some(n => { const k = store.node(n).kind; return k === 'isolated-point' || k === 'isolated'; });
  const side = (b: SearchBound | undefined, below: boolean): boolean | undefined => {
    if (!b) return true;
    const d = store.sub(coordinate, b.at);
    let s: number | undefined;
    if (!numeric) s = realSign(store, d);
    else {
      for (const bits of [64, 128, 256]) {
        const e = enclose(store, d, bits);
        if (e.kind === 'bounds' && e.lo.numerator > 0n) { s = 1; break; }
        if (e.kind === 'bounds' && e.hi.numerator < 0n) { s = -1; break; }
      }
      if (s === undefined) return undefined;
    }
    return below ? s > 0 || (s === 0 && !b.strict) : s < 0 || (s === 0 && !b.strict);
  };
  const lo = side(r.lo, true), hi = side(r.hi, false);
  return lo === false || hi === false ? false : lo === undefined || hi === undefined ? undefined : true;
}

/** Range rows of a system: order relations a·t + b < 0 or ≤ 0 on one target t with constant b, the tighter bound kept per side. */
export function systemRanges(store: ExpressionStore, relations: readonly Relation[], targets: readonly string[]): { ranges: Map<string, SearchRange>; rows: Relation[]; other: Relation[] } {
  const ranges = new Map<string, SearchRange>(), rows: Relation[] = [], other: Relation[] = [];
  for (const r of relations) {
    if (r.op === 'eq') continue;
    const free = store.freeSymbols(store.sub(r.lhs, r.rhs)).filter(s => targets.includes(s));
    const b = free.length === 1 ? rangeBound(store, r.lhs, r.rhs, r.op, free[0]) : undefined;
    if (!b) { other.push(r); continue; }
    rows.push(r);
    const t = free[0], cur = ranges.get(t) ?? {}, bound: SearchBound = { at: b.at, strict: r.op === 'lt' };
    const prior = b.side === 1 ? cur.hi : cur.lo;
    const c = prior ? realSign(store, store.sub(bound.at, prior.at)) : 0;
    const keep = !prior ? bound : c === 0 ? (bound.strict ? bound : prior) : (b.side === 1 ? c < 0 : c > 0) ? bound : prior;
    ranges.set(t, b.side === 1 ? { ...cur, hi: keep } : { ...cur, lo: keep });
  }
  return { ranges, rows, other };
}

export function solveSquareSystem(store: ExpressionStore, fs: readonly ExprId[], vars: readonly string[], ranges: ReadonlyMap<string, SearchRange>): SystemRoots {
  try {
    return { kind: 'points', points: solve(store, fs, vars, ranges) };
  } catch (e) {
    if (e instanceof Stop) return { kind: 'refused', refusal: e.refusal };
    throw e;
  }
}

function solve(store: ExpressionStore, fs: readonly ExprId[], vars: readonly string[], ranges: ReadonlyMap<string, SearchRange>): ExprId[][] {
  const ctx = store.ctx;
  const sys = squareSystem(store, fs, vars) ?? stop('a derivative outside the supported functions');
  // 1. The search box.
  const contracted = contractSystem(store, fs, new Map(vars.map(v => [v, initialRange(store, ranges.get(v))] as const)), 64);
  if (!contracted) return [];
  const unbounded = vars.filter(v => fromRange(contracted.get(v) as XRange) === undefined);
  if (unbounded.length) {
    const names = unbounded.join(' and ');
    stop(`the solutions are not bounded in ${names}; add range rows for ${names}, such as −10 ≤ ${unbounded[0]} ≤ 10`);
  }
  const pad = rational(ctx, 1n, 1n << 60n);
  const X0: Iv[] = vars.map(v => {
    const b = fromRange(contracted.get(v) as XRange) as Iv;
    return rCompare(ctx, b.lo, b.hi) < 0 ? b : { lo: rSubtract(ctx, b.lo, pad), hi: rAdd(ctx, b.hi, pad) };
  });
  const margin = { lo: X0.map(b => toDouble(b.lo) - (toDouble(b.hi) - toDouble(b.lo)) / 16 - 1e-9), hi: X0.map(b => toDouble(b.hi) + (toDouble(b.hi) - toDouble(b.lo)) / 16 + 1e-9) };
  const limit = X0.reduce((m, b) => { const w = rSubtract(ctx, b.hi, b.lo); return rCompare(ctx, w, m) > 0 ? w : m; }, rational(ctx, 0n));
  // 2. Branch and prune.
  const roots: Root[] = [], work: Iv[][] = [X0];
  while (work.length) {
    ctx.tick();
    let X = work.pop() as Iv[];
    if (roots.some(r => inside(store, X, r.box))) continue;
    const bits = bitsFor(X);
    if (definedOn(store, sys, X, bits) === false || excluded(store, sys, X, bits)) continue;
    const c = contractSystem(store, fs, boxMap(vars, X), bits);
    if (!c) continue;
    X = vars.map((v, i) => fromRange(c.get(v) as XRange) ?? X[i]);
    if (X.some(b => rCompare(ctx, b.lo, b.hi) >= 0)) X = X.map(b => (rCompare(ctx, b.lo, b.hi) < 0 ? b : { lo: rSubtract(ctx, b.lo, pad), hi: rAdd(ctx, b.hi, pad) }));
    const k = krawczyk(store, sys, X, bits);
    if (k.kind === 'none') continue;
    if (k.kind === 'unique') { addRoot(store, sys, roots, { box: niceBox(store, sys, X) }); continue; }
    // Every zero of X lies in K(X) ∩ X.
    if (k.box.every(b => rCompare(ctx, b.lo, b.hi) < 0)) X = [...k.box];
    // The guess may settle anywhere in (a margin around) the search box: the proof box is built around it, not
    // inside this piece. Contraction can leave a piece too thin for its own test, and a solution can sit on the
    // search box's face: x² + y² + z² = 3 squeezes z to a sliver near (0, 0, √3), where z = √3 is also extreme.
    const guess = newtonGuess(store, fs, sys.jacobian, vars, X.map(b => toDouble(ivMid(ctx, b))), margin.lo, margin.hi);
    if (guess && !roots.some(r => r.box.every((b, i) => toDouble(b.lo) <= guess[i] && guess[i] <= toDouble(b.hi)))) {
      const root = rootAround(store, sys, guess, limit);
      if (root) { addRoot(store, sys, roots, root); work.push(X); continue; }
    }
    if (tiny(store, X)) stop('a tangent (singular) solution, where the equations touch, cannot be certified');
    work.push(...split(store, X));
  }
  // 3. Points, kept when they satisfy the range rows, in the order of their boxes.
  const points = roots.map(r => (r.exact ? r.exact.map(q => store.number(q)) : vars.map((_, i) => store.isolatedPoint(fs, vars, r.box, i))));
  return points.filter(p => p.every((c, i) => satisfiesRange(store, c, ranges.get(vars[i])) ?? stop('a solution on the boundary of a range row')));
}

