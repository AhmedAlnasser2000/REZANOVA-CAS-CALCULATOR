import { demand, type ExecutionContext } from '../execution';
import type { Polynomial } from '../algebra/polynomial';
import { divideWithRemainder, integerToRational, monic } from '../algebra/polynomial-division';
import { extendedGcdQ } from '../algebra/polynomial-gcd';
import { rational, type Rational } from '../algebra/rational';
import { factorQ } from '../algebra/factor';
import { ALGEBRAIC_RING } from '../algebraic/root-of';
import { normalizeValue, type ExactValue } from '../representation/evaluate';
import type { ExpressionStore } from '../representation/expression';
import { diskOf, normPolynomial, type Disk } from './algebraic-coefficients';
import { QX } from './rational-form';

/**
 * Zeros of f = Σ cᵢ·yⁱ whose non-rational coefficients are all one algebraic number γ (a parameter specialized at
 * an algebraic sample), by dynamic evaluation (the D5 principle) in K = ℚ(γ) = ℚ[z]/(m): for each ℚ-irreducible
 * factor h of the norm N(f), G = gcd(f, h) in K[y] (Euclid; inverses in K by the extended gcd with m, so no
 * factorization over K). h is square-free, so h = G·(h/G) with no common root and at a root θ of h exactly one
 * factor vanishes: θ is a zero of f exactly when G(θ) = 0, decided by refining certified disks of G(θ) and
 * (h/G)(θ) until one excludes 0. deg G = 0 or G ~ h decide every root of h at once. No Liouville bound is needed
 * (it grows with deg N·deg γ). Undefined when f has several distinct non-rational coefficients.
 */
type K = Polynomial<Rational>;
type KPoly = K[];

class NumberField {
  readonly ctx: ExecutionContext;
  readonly m: K;
  constructor(ctx: ExecutionContext, m: K) { this.ctx = ctx; this.m = m; }
  reduce(a: K): K { return divideWithRemainder(this.ctx, QX, a, this.m).remainder; }
  isZero(a: K): boolean { return QX.isZero(this.ctx, a); }
  sub(a: K, b: K): K { return QX.subtract(this.ctx, a, b); }
  mul(a: K, b: K): K { return this.reduce(QX.multiply(this.ctx, a, b)); }
  inverse(a: K): K {
    const e = extendedGcdQ(this.ctx, QX, a, this.m);
    demand(QX.degree(this.ctx, e.gcd) === 0, 'verification-failed', 'a nonzero element of a number field is invertible');
    return this.reduce(e.s);
  }
  trim(a: KPoly): KPoly { const out = [...a]; while (out.length && this.isZero(out[out.length - 1])) out.pop(); return out; }
  /** a = q·b + r in K[y] (b ≠ 0). */
  divide(a: KPoly, b: KPoly): { q: KPoly; r: KPoly } {
    const r = this.trim(a), db = b.length - 1, inv = this.inverse(b[db]);
    const q: KPoly = Array.from({ length: Math.max(0, r.length - db) }, () => QX.zero(this.ctx));
    for (let k = r.length - 1; k >= db; k--) {
      this.ctx.tick();
      if (this.isZero(r[k])) continue;
      const c = this.mul(r[k], inv);
      q[k - db] = c;
      for (let j = 0; j <= db; j++) r[k - db + j] = this.sub(r[k - db + j], this.mul(c, b[j]));
    }
    return { q: this.trim(q), r: this.trim(r.slice(0, db)) };
  }
  gcd(a: KPoly, b: KPoly): KPoly {
    let [x, y] = [this.trim(a), this.trim(b)];
    while (y.length) { this.ctx.tick(); [x, y] = [y, this.divide(x, y).r]; }
    const inv = this.inverse(x[x.length - 1]);
    return x.map(c => this.mul(c, inv));
  }
}

/**
 * Fixed-point disks: centre (re, im)·2^−W and radius r·2^−W in bigints. Each truncated centre coordinate moves the
 * centre by less than one unit, so a rounding adds 2 units to the radius (√2 < 2); radii round up.
 */
interface Fixed { readonly re: bigint; readonly im: bigint; readonly r: bigint }
const floorDiv = (n: bigint, d: bigint) => (n >= 0n ? n / d : -((-n + d - 1n) / d));
const abs = (v: bigint) => (v < 0n ? -v : v);

function fixedOf(q: Rational, S: bigint): Fixed {
  const n = q.numerator * S;
  return { re: floorDiv(n, q.denominator), im: 0n, r: n % q.denominator === 0n ? 0n : 1n };
}
function fixedDisk(d: Disk, S: bigint): Fixed {
  const at = (q: Rational) => floorDiv(q.numerator * S, q.denominator);
  return { re: at(d.re), im: at(d.im), r: -floorDiv(-d.r.numerator * S, d.r.denominator) + 2n };
}
function fixedMulAdd(ctx: ExecutionContext, acc: Fixed, x: Fixed, c: Fixed, S: bigint): Fixed {
  ctx.tick();
  const re = floorDiv(acc.re * x.re - acc.im * x.im, S), im = floorDiv(acc.re * x.im + acc.im * x.re, S);
  const r = -floorDiv(-((abs(acc.re) + abs(acc.im)) * x.r + (abs(x.re) + abs(x.im)) * acc.r + acc.r * x.r), S) + 2n;
  return { re: re + c.re, im: im + c.im, r: r + c.r };
}
const horner = (ctx: ExecutionContext, cs: readonly Fixed[], x: Fixed, S: bigint): Fixed =>
  cs.reduceRight((acc, c) => fixedMulAdd(ctx, acc, x, c, S), { re: 0n, im: 0n, r: 0n });
const excludesZero = (d: Fixed) => d.re * d.re + d.im * d.im > d.r * d.r;

export function numberFieldZeros(store: ExpressionStore, coefficients: readonly ExactValue[], domain: 'real' | 'complex'): ExactValue[] | undefined {
  const ctx = store.ctx;
  const generators = coefficients.flatMap(c => (c.kind === 'algebraic' ? [c] : []));
  if (generators.length === 0 || new Set(generators.map(c => store.roots.canonical(ctx, c.root).key)).size !== 1) return undefined;
  const gamma = generators[0], field = new NumberField(ctx, monic(ctx, QX, integerToRational(ctx, QX, (gamma as { root: { poly: Polynomial<bigint> } }).root.poly)));
  const z = QX.make(ctx, [rational(ctx, 0n), rational(ctx, 1n)]);
  const f: KPoly = coefficients.map(c => (c.kind === 'rational' ? QX.constant(ctx, c.value) : z));
  // γ's disk and the coefficient disks cᵢ(γ) of each polynomial, once per working precision (they do not depend on θ).
  const coefficientDisks = new Map<KPoly, Map<number, Fixed[]>>();
  const coefficientsAt = (p: KPoly, w: number): Fixed[] => {
    let byW = coefficientDisks.get(p);
    if (!byW) { byW = new Map(); coefficientDisks.set(p, byW); }
    let cs = byW.get(w);
    if (!cs) {
      const S = 1n << BigInt(w + 16), g = fixedDisk(diskOf(ctx, gamma, rational(ctx, 1n, 1n << BigInt(w))), S);
      cs = p.map(c => horner(ctx, c.coefficients.map(q => fixedOf(q, S)), g, S));
      byW.set(w, cs);
    }
    return cs;
  };
  const valueAt = (p: KPoly, theta: ExactValue, w: number) => {
    const S = 1n << BigInt(w + 16);
    return horner(ctx, coefficientsAt(p, w), fixedDisk(diskOf(ctx, theta, rational(ctx, 1n, 1n << BigInt(w))), S), S);
  };
  const out: ExactValue[] = [];
  for (const { factor } of factorQ(ctx, QX, normPolynomial(store, coefficients), ALGEBRAIC_RING).factors) {
    const h = integerToRational(ctx, QX, factor), H: KPoly = h.coefficients.map(c => QX.constant(ctx, c));
    if (H.length <= 1) continue;
    const G = field.gcd(f, H);
    if (G.length <= 1) continue;
    const roots = store.roots.roots(ctx, factor).filter(r => domain === 'complex' || r.kind === 'real').map(normalizeValue);
    if (G.length === H.length) { out.push(...roots); continue; }
    const split = field.divide(H, G);
    demand(split.r.length === 0, 'verification-failed', 'gcd divides the factor');
    for (const theta of roots) {
      for (let w = 16; ; w *= 2) {
        ctx.tick();
        if (excludesZero(valueAt(split.q, theta, w))) { out.push(theta); break; }
        if (excludesZero(valueAt(G, theta, w))) break;
      }
    }
  }
  return out;
}
