import { demand } from '../execution';
import { rational, rCompare, rSubtract, type Rational } from '../algebra/rational';
import { derivative } from '../composition/derivative';
import { rangeOverBox, type XRange } from '../composition/range';
import { enclose, setPointRefiner } from '../representation/enclosure';
import { pointVariable, type ExprId, type ExpressionStore, type PointBound } from '../representation/expression';
import { domainNeeds, type Need } from './isolated';
import {
  approximateInverse, fromDouble, fromRange, identityMinus, ivAdd, ivIntersect, ivMatVec, ivMid, ivSub, matVec, point, strictlyInside, toDouble, toRange, type Iv,
} from './interval';

/**
 * The Krawczyk test for square systems (EQUATION-CERTIFIED-NUMERICS1 PR B). For F = (f₁ … fₙ) in x₁ … xₙ on a
 * bounded box X where every kernel of F is defined and continuously differentiable (`domainNeeds`), with m the
 * midpoint, J(X) the certified ranges of the Jacobian over X and Y any real matrix,
 *
 *   K(X) = m − Y·F(m) + (I − Y·J(X))·(X − m).
 *
 * Every solution of F = 0 in X lies in K(X) (mean-value theorem); so K(X) ∩ X = ∅ proves X holds none, and
 * K(X) ⊂ int X proves X holds exactly one (Krawczyk, Moore; Y is then nonsingular and the map
 * x ↦ x − Y·F(x) contracts X into itself). Y is a floating-point approximate inverse of the midpoint Jacobian,
 * converted exactly: it only makes the test likely to succeed, never makes it true. All interval arithmetic is
 * rational, rounded outward.
 */
const fail = (reason: string): never => demand(false, 'verification-failed', reason) as never;

export interface SquareSystem {
  readonly fs: readonly ExprId[];
  readonly vars: readonly string[];
  readonly jacobian: readonly (readonly ExprId[])[];
  readonly needs: readonly Need[];
}

/** The system with its Jacobian, or undefined when some partial derivative is outside the vocabulary. */
export function squareSystem(store: ExpressionStore, fs: readonly ExprId[], vars: readonly string[]): SquareSystem | undefined {
  const jacobian: ExprId[][] = [];
  for (const f of fs) {
    const row: ExprId[] = [];
    for (const v of vars) {
      const d = derivative(store, f, v);
      if (d === undefined) return undefined;
      row.push(d);
    }
    jacobian.push(row);
  }
  return { fs, vars, jacobian, needs: fs.flatMap(f => domainNeeds(store, f, vars)) };
}

export type KrawczykResult =
  | { readonly kind: 'unique'; readonly box: readonly Iv[] }
  | { readonly kind: 'none' }
  | { readonly kind: 'unknown'; readonly box: readonly Iv[] };

/** Working precision for a box: well below its narrowest side. */
export function bitsFor(box: readonly Iv[]): number {
  let k = 0;
  for (const b of box) {
    const num = b.hi.numerator * b.lo.denominator - b.lo.numerator * b.hi.denominator, den = b.hi.denominator * b.lo.denominator;
    if (num <= 0n) continue;
    k = Math.max(k, den.toString(2).length - num.toString(2).length);
  }
  return Math.max(64, k + 48);
}

export const boxMap = (vars: readonly string[], box: readonly Iv[]): Map<string, XRange> => new Map(vars.map((v, i) => [v, toRange(box[i])] as const));

/** Whether every kernel is defined on the box: true, false (undefined throughout for some kernel) or undefined. */
export function definedOn(store: ExpressionStore, sys: SquareSystem, box: readonly Iv[], bits: number): boolean | undefined {
  const map = boxMap(sys.vars, box);
  let all = true;
  for (const n of sys.needs) {
    const t = n.test(rangeOverBox(store, n.arg, map, bits));
    if (t === false) return false;
    if (t === undefined) all = false;
  }
  return all ? true : undefined;
}

/** One Krawczyk step on a bounded box. */
export function krawczyk(store: ExpressionStore, sys: SquareSystem, X: readonly Iv[], bits = bitsFor(X)): KrawczykResult {
  const ctx = store.ctx, n = sys.vars.length;
  ctx.tick();
  const defined = definedOn(store, sys, X, bits);
  if (defined === false) return { kind: 'none' };
  if (defined === undefined) return { kind: 'unknown', box: X };
  const m = X.map(b => ivMid(ctx, b));
  const at = new Map(sys.vars.map((v, i) => [v, store.number(m[i])] as const));
  const fm: Iv[] = [];
  for (const f of sys.fs) {
    const e = enclose(store, store.substitute(f, at), bits);
    if (e.kind !== 'bounds') return { kind: 'unknown', box: X };
    fm.push({ lo: e.lo, hi: e.hi });
  }
  const map = boxMap(sys.vars, X), J: Iv[][] = [];
  for (const row of sys.jacobian) {
    const r: Iv[] = [];
    for (const d of row) {
      const iv = fromRange(rangeOverBox(store, d, map, bits));
      if (!iv) return { kind: 'unknown', box: X };
      r.push(iv);
    }
    J.push(r);
  }
  const inv = approximateInverse(J.map(row => row.map(c => toDouble(ivMid(ctx, c)))));
  if (!inv) return { kind: 'unknown', box: X };
  const Y: Rational[][] = inv.map(row => row.map(v => fromDouble(ctx, v)));
  const newton = matVec(ctx, Y, fm, bits);
  const spread = ivMatVec(ctx, identityMinus(ctx, Y, J, bits), X.map((b, i) => ivSub(ctx, b, point(m[i]), bits)), bits);
  const K = Array.from({ length: n }, (_, i) => ivAdd(ctx, ivSub(ctx, point(m[i]), newton[i], bits), spread[i], bits));
  const cut: Iv[] = [];
  for (let i = 0; i < n; i++) {
    const c = ivIntersect(ctx, K[i], X[i]);
    if (!c) return { kind: 'none' };
    cut.push(c);
  }
  return K.every((k, i) => strictlyInside(ctx, k, X[i])) ? { kind: 'unique', box: K } : { kind: 'unknown', box: cut };
}

const toIv = (b: PointBound): Iv => ({ lo: b.lo, hi: b.hi });

/** Check a point's certificate: the Krawczyk test proves exactly one solution of the system in the box. */
export function certifyPoint(store: ExpressionStore, system: readonly ExprId[], vars: readonly string[], box: readonly PointBound[]): SquareSystem {
  const sys = squareSystem(store, system, vars) ?? fail('the system has no derivative here');
  const r = krawczyk(store, sys, box.map(toIv));
  if (r.kind !== 'unique') fail('the Krawczyk test does not prove exactly one solution in the box');
  return sys;
}

// ---- refinement of isolated points (installed into `enclose`) ----

const SYSTEMS = new WeakMap<ExpressionStore, Map<string, { sys: SquareSystem; box: Iv[] }>>();

function pointKey(node: { system: readonly ExprId[]; box: readonly PointBound[] }): string {
  return `${node.system.join(',')}|${node.box.map(b => `${b.lo.numerator}/${b.lo.denominator}:${b.hi.numerator}/${b.hi.denominator}`).join(',')}`;
}

/** The point's current best box (shared by its coordinates), refined until coordinate `index` is narrower than 2^−bits. */
export function refinePointBox(store: ExpressionStore, id: ExprId, bits: number): readonly Iv[] {
  const ctx = store.ctx, node = store.node(id);
  if (node.kind !== 'isolated-point') return fail('not an isolated point');
  let cache = SYSTEMS.get(store);
  if (!cache) { cache = new Map(); SYSTEMS.set(store, cache); }
  const key = pointKey(node);
  let entry = cache.get(key);
  if (!entry) {
    // The certificate first: refinement converges only on a box that provably holds exactly one solution.
    const vars = node.system.map((_, i) => pointVariable(i));
    entry = { sys: certifyPoint(store, node.system, vars, node.box), box: node.box.map(toIv) };
    cache.set(key, entry);
  }
  const target = rational(ctx, 1n, 1n << BigInt(bits));
  for (let extra = 0; rCompare(ctx, rSubtract(ctx, entry.box[node.index].hi, entry.box[node.index].lo), target) > 0;) {
    ctx.tick();
    const before = entry.box;
    const r = krawczyk(store, entry.sys, before, Math.max(bitsFor(before), bits + 16) + extra);
    if (r.kind === 'none') return fail('an isolated point lost its solution while refining');
    const after = r.kind === 'unique' ? r.box.map((k, i) => ivIntersect(ctx, k, before[i]) as Iv) : [...r.box];
    // Without progress, the rounding is too coarse for the box: work at higher precision.
    const progress = after.some((b, i) => rCompare(ctx, rSubtract(ctx, b.hi, b.lo), rSubtract(ctx, before[i].hi, before[i].lo)) < 0);
    if (!progress) extra += 32;
    entry.box = after;
  }
  return entry.box;
}

setPointRefiner((store, id, bits) => {
  const node = store.node(id) as Extract<ReturnType<ExpressionStore['node']>, { kind: 'isolated-point' }>;
  const b = refinePointBox(store, id, bits)[node.index];
  return { lo: b.lo, hi: b.hi };
});
