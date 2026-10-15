import { demand, type ExecutionContext } from '../execution';
import type { Polynomial } from '../algebra/polynomial';
import { divideWithRemainder, integerToRational, monic } from '../algebra/polynomial-division';
import { extendedGcdQ } from '../algebra/polynomial-gcd';
import { rational, rDyadic, type Rational } from '../algebra/rational';
import { factorQ } from '../algebra/factor';
import { ALGEBRAIC_RING } from '../algebraic/root-of';
import { normalizeValue, type ExactValue } from '../representation/evaluate';
import type { ExpressionStore } from '../representation/expression';
import { diskAdd, diskMultiply, diskOf, mayContainZero, normPolynomial, type Disk } from './algebraic-coefficients';
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

/** A disk rounded outward to the grid 2^−W: centre coordinates truncated (each off by < 2^−W), radius rounded up. */
function rounded(ctx: ExecutionContext, d: Disk, W: number): Disk {
  const S = 1n << BigInt(W);
  const floor = (q: Rational) => { const n = q.numerator * S; return n >= 0n ? n / q.denominator : -((-n + q.denominator - 1n) / q.denominator); };
  return { re: rDyadic(ctx, floor(d.re), W), im: rDyadic(ctx, floor(d.im), W), r: rDyadic(ctx, -floor({ numerator: -d.r.numerator, denominator: d.r.denominator } as Rational) + 2n, W) };
}

/** A certified disk of Σ cᵢ(γ)·θⁱ at width 2^−w (Horner over z at γ's disk, then over y at θ's). */
function diskAt(ctx: ExecutionContext, f: KPoly, gamma: (w: number) => Disk, theta: ExactValue, w: number): Disk {
  const width = rational(ctx, 1n, 1n << BigInt(w)), W = w + 16, g = gamma(w), t = rounded(ctx, diskOf(ctx, theta, width), W);
  const zero: Disk = { re: rational(ctx, 0n), im: rational(ctx, 0n), r: rational(ctx, 0n) };
  const horner = (cs: readonly Disk[], x: Disk) => cs.reduceRight((acc, c) => { ctx.tick(); return rounded(ctx, diskAdd(ctx, diskMultiply(ctx, acc, x), c), W); }, zero);
  // Coefficients rounded to the working grid first (Euclid in K leaves rationals with large numerators and denominators).
  const exact = (q: Rational): Disk => rounded(ctx, { re: q, im: rational(ctx, 0n), r: rational(ctx, 0n) }, W);
  return horner(f.map(c => horner(c.coefficients.map(exact), g)), t);
}

export function numberFieldZeros(store: ExpressionStore, coefficients: readonly ExactValue[], domain: 'real' | 'complex'): ExactValue[] | undefined {
  const ctx = store.ctx;
  const generators = coefficients.flatMap(c => (c.kind === 'algebraic' ? [c] : []));
  if (generators.length === 0 || new Set(generators.map(c => store.roots.canonical(ctx, c.root).key)).size !== 1) return undefined;
  const gamma = generators[0], field = new NumberField(ctx, monic(ctx, QX, integerToRational(ctx, QX, (gamma as { root: { poly: Polynomial<bigint> } }).root.poly)));
  const z = QX.make(ctx, [rational(ctx, 0n), rational(ctx, 1n)]);
  const f: KPoly = coefficients.map(c => (c.kind === 'rational' ? QX.constant(ctx, c.value) : z));
  // γ's disk at each working precision, shared by every root and both factors.
  const gammaDisks = new Map<number, Disk>();
  const gammaAt = (w: number) => {
    let d = gammaDisks.get(w);
    if (!d) { d = rounded(ctx, diskOf(ctx, gamma, rational(ctx, 1n, 1n << BigInt(w))), w + 16); gammaDisks.set(w, d); }
    return d;
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
        if (!mayContainZero(ctx, diskAt(ctx, split.q, gammaAt, theta, w))) { out.push(theta); break; }
        if (!mayContainZero(ctx, diskAt(ctx, G, gammaAt, theta, w))) break;
      }
    }
  }
  return out;
}
