import { demand, type ExecutionContext } from '../execution';
import { factorQ } from '../algebra/factor';
import { determinant } from '../algebra/linear';
import type { Polynomial } from '../algebra/polynomial';
import { gcdQ } from '../algebra/polynomial-gcd';
import { exactQuotient } from '../algebra/polynomial-division';
import { rAbs, rAdd, rational, rCompare, rDivide, rIsZero, rMultiply, rNegate, rSubtract, type Rational } from '../algebra/rational';
import { ALGEBRAIC_RING } from '../algebraic/root-of';
import { diskAdd, diskMultiply, diskOf, type Disk } from '../decision/algebraic-coefficients';
import { attachForm } from '../decision/radical-forms';
import { QX } from '../decision/rational-form';
import { normalizeValue, type EvaluationDomain, type ExactValue } from '../representation/evaluate';
import type { ExpressionStore } from '../representation/expression';
import type { Point, PointValue } from '../representation/solution-set';
import { reduce, type Order, type Tracked } from './groebner';

/**
 * Zero-dimensional systems: the quotient ℚ[x]/I has a finite monomial basis B
 * (the normal set of a Gröbner basis), multiplication by xᵥ is a matrix Mᵥ on
 * B, and every symmetric function of the solutions is a trace.
 *
 * - The Hermite form H = (Tr(M_{bᵢ}·M_{bⱼ})) has rank = the number of distinct
 *   complex solutions and signature = the number of distinct real ones.
 * - A separating element t = Σ cᵥ·xᵥ is accepted when the square-free part
 *   f of χ_t = det(T − M_t) has degree equal to that rank.
 * - The rational univariate representation gives each coordinate as
 *   xᵥ = gᵥ(t)/g₁(t) with g_q(T) = Σᵢ Tr(q·tⁱ)·Σⱼ a_{i+j+1}Tʲ (Rouillier).
 * - Each root τ of f is one solution; each coordinate is the unique root of
 *   the eliminant χ_{xᵥ} whose certified disk contains gᵥ(τ)/g₁(τ).
 */
export type Matrix = Rational[][];

export interface Quotient {
  readonly basis: readonly (readonly number[])[];
  readonly index: ReadonlyMap<string, number>;
  readonly G: readonly Tracked[];
  readonly order: Order;
  readonly n: number;
}

const key = (e: readonly number[]) => e.join(',');

/** The normal set, or undefined when it is infinite (some variable has no pure power leading monomial). */
export function quotient(ctx: ExecutionContext, order: Order, G: readonly Tracked[], n: number): Quotient | undefined {
  const lts = G.map(g => g.p[0].e);
  for (let v = 0; v < n; v++) if (!lts.some(e => e[v] > 0 && e.every((x, i) => i === v || x === 0))) return undefined;
  const basis: number[][] = [], index = new Map<string, number>(), stack: number[][] = [Array(n).fill(0)];
  while (stack.length) {
    ctx.tick();
    const e = stack.pop() as number[];
    if (index.has(key(e)) || lts.some(l => l.every((x, i) => x <= e[i]))) continue;
    index.set(key(e), basis.length);
    basis.push(e);
    for (let v = 0; v < n; v++) stack.push(e.map((x, i) => (i === v ? x + 1 : x)));
  }
  return { basis, index, G, order, n };
}

function coordinates(ctx: ExecutionContext, q: Quotient, e: readonly number[]): Rational[] {
  const r = reduce(ctx, q.order, { p: [{ e, c: rational(ctx, 1n) }] }, q.G).p;
  const out = q.basis.map(() => rational(ctx, 0n));
  for (const t of r) {
    const i = q.index.get(key(t.e));
    demand(i !== undefined, 'verification-failed', 'a normal form left the normal set');
    out[i] = t.c;
  }
  return out;
}

/** M with M[i][j] = coefficient of bᵢ in NF(x^m · bⱼ). */
export function multiplication(ctx: ExecutionContext, q: Quotient, m: readonly number[]): Matrix {
  const D = q.basis.length, M: Matrix = Array.from({ length: D }, () => Array.from({ length: D }, () => rational(ctx, 0n)));
  q.basis.forEach((b, j) => coordinates(ctx, q, b.map((x, i) => x + m[i])).forEach((c, i) => { M[i][j] = c; }));
  return M;
}

export function matMul(ctx: ExecutionContext, a: Matrix, b: Matrix): Matrix {
  const D = a.length;
  ctx.allocate(D * D);
  return a.map(row => Array.from({ length: D }, (_, j) => {
    let s = rational(ctx, 0n);
    for (let k = 0; k < D; k++) if (!rIsZero(ctx, row[k]) && !rIsZero(ctx, b[k][j])) s = rAdd(ctx, s, rMultiply(ctx, row[k], b[k][j]));
    return s;
  }));
}
const linear = (ctx: ExecutionContext, ms: readonly Matrix[], cs: readonly Rational[]): Matrix =>
  ms[0].map((row, i) => row.map((_, j) => ms.reduce((s, m, k) => rAdd(ctx, s, rMultiply(ctx, cs[k], m[i][j])), rational(ctx, 0n))));
export function trace(ctx: ExecutionContext, a: Matrix): Rational { return a.reduce((s, row, i) => rAdd(ctx, s, row[i]), rational(ctx, 0n)); }
function traceProduct(ctx: ExecutionContext, a: Matrix, b: Matrix): Rational {
  let s = rational(ctx, 0n);
  for (let i = 0; i < a.length; i++) for (let k = 0; k < a.length; k++) if (!rIsZero(ctx, a[i][k]) && !rIsZero(ctx, b[k][i])) s = rAdd(ctx, s, rMultiply(ctx, a[i][k], b[k][i]));
  return s;
}

/** det(T·I − M) by Bareiss determinants at T = 0..D and Newton interpolation. */
export function charpoly(ctx: ExecutionContext, M: Matrix): Polynomial<Rational> {
  const D = M.length, xs: Rational[] = [], ys: Rational[] = [];
  for (let k = 0; k <= D; k++) {
    ctx.tick();
    const t = rational(ctx, BigInt(k));
    xs.push(t);
    ys.push(determinant(ctx, M.map((row, i) => row.map((v, j) => (i === j ? rSubtract(ctx, t, v) : rNegate(ctx, v))))));
  }
  const c = [...ys];
  for (let j = 1; j < xs.length; j++) for (let i = xs.length - 1; i >= j; i--) c[i] = rDivide(ctx, rSubtract(ctx, c[i], c[i - 1]), rSubtract(ctx, xs[i], xs[i - j]));
  let out = QX.constant(ctx, c[c.length - 1]);
  for (let i = c.length - 2; i >= 0; i--) out = QX.add(ctx, QX.multiply(ctx, out, QX.make(ctx, [rNegate(ctx, xs[i]), rational(ctx, 1n)])), QX.constant(ctx, c[i]));
  return out;
}

/** Rank and signature of a symmetric rational matrix (congruence diagonalization, Sylvester's law). */
export function rankSignature(ctx: ExecutionContext, H: Matrix): { rank: number; positive: number; negative: number } {
  const A = H.map(r => [...r]), D = A.length;
  let positive = 0, negative = 0;
  for (let k = 0; k < D; k++) {
    ctx.tick();
    let p = -1;
    for (let i = k; i < D; i++) if (!rIsZero(ctx, A[i][i])) { p = i; break; }
    if (p < 0) {
      // No nonzero diagonal: add row/column j to i where A[i][j] ≠ 0 (2·A[i][j] appears on the diagonal).
      let found: [number, number] | undefined;
      for (let i = k; i < D && !found; i++) for (let j = i + 1; j < D; j++) if (!rIsZero(ctx, A[i][j])) { found = [i, j]; break; }
      if (!found) break;
      const [i, j] = found;
      for (let c = 0; c < D; c++) A[i][c] = rAdd(ctx, A[i][c], A[j][c]);
      for (let r = 0; r < D; r++) A[r][i] = rAdd(ctx, A[r][i], A[r][j]);
      p = i;
    }
    [A[k], A[p]] = [A[p], A[k]];
    for (const row of A) [row[k], row[p]] = [row[p], row[k]];
    const d = A[k][k];
    if (d.numerator > 0n) positive++; else negative++;
    for (let i = k + 1; i < D; i++) {
      if (rIsZero(ctx, A[i][k])) continue;
      const f = rDivide(ctx, A[i][k], d);
      for (let j = k; j < D; j++) A[i][j] = rSubtract(ctx, A[i][j], rMultiply(ctx, f, A[k][j]));
      for (let r = k; r < D; r++) A[r][i] = rSubtract(ctx, A[r][i], rMultiply(ctx, f, A[r][k]));
    }
  }
  return { rank: positive + negative, positive, negative };
}

/** The matrices of multiplication by each basis monomial, and the Hermite form. */
export function hermite(ctx: ExecutionContext, q: Quotient, vars: readonly Matrix[]): Matrix {
  const D = q.basis.length;
  const mono = q.basis.map(b => {
    let m: Matrix = Array.from({ length: D }, (_, i) => Array.from({ length: D }, (_, j) => rational(ctx, i === j ? 1n : 0n)));
    b.forEach((k, v) => { for (let s = 0; s < k; s++) m = matMul(ctx, m, vars[v]); });
    return m;
  });
  return mono.map(a => mono.map(b => traceProduct(ctx, a, b)));
}

export function squareFreePart(ctx: ExecutionContext, f: Polynomial<Rational>): Polynomial<Rational> {
  const g = gcdQ(ctx, QX, f, QX.derivative(ctx, f));
  const s = exactQuotient(ctx, QX, f, g);
  return QX.divideScalar(ctx, s, QX.leading(ctx, s));
}

/** All distinct roots (real only over ℝ) of a nonzero polynomial over ℚ. */
export function rootsOf(store: ExpressionStore, f: Polynomial<Rational>, domain: EvaluationDomain): ExactValue[] {
  const out: ExactValue[] = [];
  if (QX.degree(store.ctx, f) <= 0) return out;
  for (const { factor } of factorQ(store.ctx, QX, f, ALGEBRAIC_RING).factors) {
    for (const r of store.roots.roots(store.ctx, factor)) if (domain === 'complex' || r.kind === 'real') out.push(normalizeValue(r));
  }
  return out;
}

// ---- certified disks ----

function diskInverse(ctx: ExecutionContext, d: Disk): Disk | undefined {
  // |1/z − 1/c| ≤ r/(|c|(|c| − r)) with |c| bounded below by max(|re|, |im|).
  const low = rCompare(ctx, rAbs(ctx, d.re), rAbs(ctx, d.im)) > 0 ? rAbs(ctx, d.re) : rAbs(ctx, d.im);
  if (rCompare(ctx, low, d.r) <= 0) return undefined;
  const n2 = rAdd(ctx, rMultiply(ctx, d.re, d.re), rMultiply(ctx, d.im, d.im));
  return { re: rDivide(ctx, d.re, n2), im: rDivide(ctx, rNegate(ctx, d.im), n2), r: rDivide(ctx, d.r, rMultiply(ctx, low, rSubtract(ctx, low, d.r))) };
}
export function diskPoly(ctx: ExecutionContext, f: Polynomial<Rational>, z: Disk): Disk {
  const c = f.coefficients, zero = rational(ctx, 0n);
  let acc: Disk = { re: c.length ? c[c.length - 1] : zero, im: zero, r: zero };
  for (let i = c.length - 2; i >= 0; i--) acc = diskAdd(ctx, diskMultiply(ctx, acc, z), { re: c[i], im: zero, r: zero });
  return acc;
}
export function meets(ctx: ExecutionContext, a: Disk, b: Disk): boolean {
  return !(rCompare(ctx, rAbs(ctx, rSubtract(ctx, a.re, b.re)), rAdd(ctx, a.r, b.r)) > 0 || rCompare(ctx, rAbs(ctx, rSubtract(ctx, a.im, b.im)), rAdd(ctx, a.r, b.r)) > 0);
}

/**
 * The rational univariate representation for `rank` distinct solutions: a separating element t = Σ cᵥ·xᵥ (the
 * first of cᵥ = aᵛ, a = 0, 1, … whose square-free characteristic polynomial f has degree `rank`), f, and
 * g(q) = g_q, so that each coordinate is xᵥ = g(Mᵥ)(t)/g(undefined)(t) at the roots of f.
 */
export interface Univariate {
  readonly f: Polynomial<Rational>;
  readonly cs: readonly Rational[];
  readonly g: (q: Matrix | undefined) => Polynomial<Rational>;
}

export function univariate(ctx: ExecutionContext, vars: readonly Matrix[], rank: number): Univariate {
  let Mt: Matrix | undefined, f: Polynomial<Rational> | undefined, chosen: Rational[] = [];
  for (let a = 0; !Mt; a++) {
    ctx.tick();
    const cs = vars.map((_, v) => rational(ctx, BigInt(a) ** BigInt(v)));
    const M = linear(ctx, vars, cs), sf = squareFreePart(ctx, charpoly(ctx, M));
    if (QX.degree(ctx, sf) === rank) { Mt = M; f = sf; chosen = cs; }
  }
  const Ft = f as Polynomial<Rational>, M = Mt as Matrix, N = rank;
  // Traces Tr(q·tⁱ) for i < N via powers of M_t.
  const powers: Matrix[] = [vars[0].map((row, i) => row.map((_, j) => rational(ctx, i === j ? 1n : 0n)))];
  for (let i = 1; i < N; i++) powers.push(matMul(ctx, powers[i - 1], M));
  const a = Ft.coefficients;
  const g = (qm: Matrix | undefined): Polynomial<Rational> => {
    const tr = powers.map(P => (qm ? traceProduct(ctx, qm, P) : trace(ctx, P)));
    const out = Array.from({ length: N }, () => rational(ctx, 0n));
    for (let i = 0; i < N; i++) for (let j = 0; j + i + 1 <= N; j++) out[j] = rAdd(ctx, out[j], rMultiply(ctx, tr[i], a[i + j + 1]));
    return QX.make(ctx, out);
  };
  return { f: Ft, cs: chosen, g };
}

export interface ZeroDimResult { readonly points: readonly Point[]; readonly complexCount: number; readonly realCount: number }

/**
 * All solutions of a zero-dimensional system (over ℝ: the real ones),
 * projected to the first `keep` coordinates (later ones are auxiliary).
 */
export function zeroDimensionalPoints(store: ExpressionStore, q: Quotient, domain: EvaluationDomain, keep: number): ZeroDimResult {
  const ctx = store.ctx, n = q.n;
  const vars = Array.from({ length: n }, (_, v) => multiplication(ctx, q, Array.from({ length: n }, (_, i) => (i === v ? 1 : 0))));
  const { rank, positive, negative } = rankSignature(ctx, hermite(ctx, q, vars));
  const realCount = positive - negative;
  if (rank === 0 || (domain === 'real' && realCount === 0)) return { points: [], complexCount: rank, realCount };
  const { f: Ft, g } = univariate(ctx, vars, rank);
  const g1 = g(undefined), gv = vars.slice(0, keep).map(m => g(m));
  const candidates = vars.slice(0, keep).map(m => rootsOf(store, squareFreePart(ctx, charpoly(ctx, m)), 'complex'));
  const points: Point[] = [];
  for (const tau of rootsOf(store, Ft, domain)) {
    const point: PointValue[] = [];
    for (let v = 0; v < keep; v++) {
      let chosen: ExactValue | undefined;
      for (let bits = 16n; !chosen; bits *= 2n) {
        ctx.tick();
        const w = rational(ctx, 1n, 1n << bits), z = diskOf(ctx, tau, w);
        const den = diskInverse(ctx, diskPoly(ctx, g1, z));
        if (!den) continue;
        const value = diskMultiply(ctx, diskPoly(ctx, gv[v], z), den);
        const hits = candidates[v].filter(c => meets(ctx, diskOf(ctx, c, w), value));
        demand(hits.length > 0, 'verification-failed', 'a coordinate matches no root of its eliminant');
        if (hits.length === 1) chosen = hits[0];
      }
      point.push(chosen.kind === 'algebraic' ? attachForm(store, chosen) : chosen);
    }
    points.push(point);
  }
  return { points, complexCount: rank, realCount };
}
