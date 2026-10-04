import { demand, type ExecutionContext } from './execution';
import { requireField, type ExactField } from './field';
import type { Polynomial, PolynomialRing } from './polynomial';
import { exactDivide, extendedGcd, polynomialGcd } from './polynomial-division';
import { registerFractionCoefficient } from './fraction-coefficient';

export interface RationalFunction<E> {
  readonly field: RationalFunctionField<E>;
  readonly numerator: Polynomial<E>;
  readonly denominator: Polynomial<E>;
}

export class RationalFunctionField<E> implements ExactField<RationalFunction<E>> {
  readonly capability = 'field' as const;
  readonly identity = Symbol('fraction-field');
  readonly characteristic = 0 as const;
  readonly ring: PolynomialRing<E>;
  #values = new WeakSet<object>();
  constructor(ring: PolynomialRing<E>) {
    requireField(ring.domain); this.ring = ring;
    registerFractionCoefficient(this, { ring,
      read: (ctx, value) => { this.assert(ctx, value); return value; },
      make: (ctx, n, d) => this.make(ctx, n, d) });
    Object.freeze(this);
  }
  assert(ctx: ExecutionContext, a: RationalFunction<E>): void {
    ctx.tick();
    demand(typeof a === 'object' && a !== null && this.#values.has(a), 'domain-mismatch', 'rational function field');
    this.ring.assert(ctx, a.numerator); this.ring.assert(ctx, a.denominator);
  }
  /** Nonzero polynomial c*t^k. Callers have already checked ring ownership. */
  private monomial(ctx: ExecutionContext, p: Polynomial<E>): boolean {
    if (!p.coefficients.length) return false;
    for (let i = 0; i < p.coefficients.length - 1; i++) {
      ctx.tick(); if (!this.ring.domain.isZero(ctx, p.coefficients[i])) return false;
    }
    return true;
  }
  private shift(ctx: ExecutionContext, p: Polynomial<E>, power: number): Polynomial<E> {
    if (!p.coefficients.length || power === 0) return p;
    const size = p.coefficients.length + power;
    ctx.degree(size - 1); ctx.allocate(size);
    const cs: E[] = Array(power).fill(this.ring.domain.fromInteger(ctx, 0n));
    for (const c of p.coefficients) { ctx.tick(); cs.push(c); }
    return this.ring.make(ctx, cs);
  }
  private order(ctx: ExecutionContext, p: Polynomial<E>, limit: number): number {
    let k = 0;
    while (k < limit && k < p.coefficients.length && this.ring.domain.isZero(ctx, p.coefficients[k])) { ctx.tick(); k++; }
    return k;
  }
  private removePower(ctx: ExecutionContext, p: Polynomial<E>, k: number): Polynomial<E> {
    if (!k) return p;
    ctx.allocate(p.coefficients.length - k);
    const out = this.ring.make(ctx, p.coefficients.slice(k));
    demand(this.ring.equal(ctx, this.shift(ctx, out, k), p), 'verification-failed', 'monomial cancellation');
    return out;
  }
  make(ctx: ExecutionContext, numerator: Polynomial<E>, denominator: Polynomial<E>): RationalFunction<E> {
    const r = this.ring;
    r.assert(ctx, numerator); r.assert(ctx, denominator);
    demand(!r.isZero(ctx, denominator), 'division-by-zero', 'rational function denominator');
    let n: Polynomial<E>, d: Polynomial<E>, monomial = false, coprime = false;
    if (r.degree(ctx, denominator) === 0) {
      // A nonzero constant is a unit: normalization needs no Euclidean algorithm.
      n = r.scale(ctx, numerator, r.domain.inverse(ctx, r.leading(ctx, denominator))); d = r.one(ctx);
    } else if (r.isZero(ctx, numerator)) { n = r.zero(ctx); d = r.one(ctx); }
    else if (this.monomial(ctx, denominator)) {
      monomial = true;
      const k = denominator.coefficients.length - 1;
      const cancel = this.order(ctx, numerator, k);
      // A nonzero numerator has a nonzero final coefficient, so this scan
      // cannot pass its end. Cancellation is checked by the identity below.
      ctx.allocate(numerator.coefficients.length - cancel + k - cancel + 1);
      n = r.scale(ctx, r.make(ctx, numerator.coefficients.slice(cancel)), r.domain.inverse(ctx, r.leading(ctx, denominator)));
      const cs: E[] = Array(k - cancel).fill(r.domain.fromInteger(ctx, 0n));
      cs.push(r.domain.fromInteger(ctx, 1n)); d = r.make(ctx, cs);
    } else {
      const proof = extendedGcd(ctx, r, numerator, denominator);
      n = exactDivide(ctx, r, numerator, proof.gcd); d = exactDivide(ctx, r, denominator, proof.gcd);
      const inverse = r.domain.inverse(ctx, r.leading(ctx, d));
      n = r.scale(ctx, n, inverse); d = r.scale(ctx, d, inverse);
      // s*N+t*D=g and N=g*n/c, D=g*d/c imply s*n+t*d=c.
      // A checked nonzero constant combination proves coprimality without
      // producing a second Euclidean sequence for the normalized pair.
      coprime = !r.domain.isZero(ctx, inverse) && r.equal(ctx,
        r.add(ctx, r.multiply(ctx, proof.s, n), r.multiply(ctx, proof.t, d)), r.constant(ctx, inverse));
    }
    demand(r.domain.equal(ctx, r.leading(ctx, d), r.domain.fromInteger(ctx, 1n)), 'verification-failed', 'fraction denominator not monic');
    // Monic degree-zero denominator is exactly one, hence coprime to every numerator.
    // For t^k, coprimality is exactly n(0) != 0. Recheck the normalized
    // denominator shape independently of the cancellation scan.
    demand(r.degree(ctx, d) === 0 || (monomial
      ? this.monomial(ctx, d) && !r.domain.isZero(ctx, n.coefficients[0])
      : coprime), 'verification-failed', 'fraction not coprime');
    demand(r.equal(ctx, r.multiply(ctx, n, denominator), r.multiply(ctx, numerator, d)), 'verification-failed', 'fraction normalization changed value');
    ctx.allocate(3);
    const value = Object.freeze({ field: this, numerator: n, denominator: d });
    this.#values.add(value); return value;
  }
  fromInteger(ctx: ExecutionContext, n: bigint) { return this.fromCoefficient(ctx, this.ring.domain.fromInteger(ctx, n)); }
  fromCoefficient(ctx: ExecutionContext, a: E) { return this.make(ctx, this.ring.constant(ctx, a), this.ring.one(ctx)); }
  equal(ctx: ExecutionContext, a: RationalFunction<E>, b: RationalFunction<E>) {
    this.assert(ctx, a); this.assert(ctx, b);
    return this.ring.equal(ctx, a.numerator, b.numerator) && this.ring.equal(ctx, a.denominator, b.denominator);
  }
  isZero(ctx: ExecutionContext, a: RationalFunction<E>) { this.assert(ctx, a); return this.ring.isZero(ctx, a.numerator); }
  negate(ctx: ExecutionContext, a: RationalFunction<E>) { this.assert(ctx, a); return this.make(ctx, this.ring.negate(ctx, a.numerator), a.denominator); }
  add(ctx: ExecutionContext, a: RationalFunction<E>, b: RationalFunction<E>) {
    this.assert(ctx, a); this.assert(ctx, b); const r = this.ring;
    if (r.isZero(ctx, a.numerator)) return b;
    if (r.isZero(ctx, b.numerator)) return a;
    if (r.equal(ctx, a.denominator, b.denominator)) return this.make(ctx, r.add(ctx, a.numerator, b.numerator), a.denominator);
    if (this.monomial(ctx, a.denominator) && this.monomial(ctx, b.denominator)) {
      const ak = a.denominator.coefficients.length - 1, bk = b.denominator.coefficients.length - 1, k = Math.max(ak, bk);
      return this.make(ctx, r.add(ctx, this.shift(ctx, a.numerator, k - ak), this.shift(ctx, b.numerator, k - bk)),
        ak >= bk ? a.denominator : b.denominator);
    }
    const g = polynomialGcd(ctx, r, a.denominator, b.denominator);
    const ad = exactDivide(ctx, r, a.denominator, g), bd = exactDivide(ctx, r, b.denominator, g);
    return this.make(ctx, r.add(ctx, r.multiply(ctx, a.numerator, bd), r.multiply(ctx, b.numerator, ad)), r.multiply(ctx, ad, b.denominator));
  }
  multiply(ctx: ExecutionContext, a: RationalFunction<E>, b: RationalFunction<E>) {
    this.assert(ctx, a); this.assert(ctx, b); const r = this.ring;
    if (r.isZero(ctx, a.numerator)) return a;
    if (r.isZero(ctx, b.numerator)) return b;
    if (r.equal(ctx, a.numerator, a.denominator)) return b;
    if (r.equal(ctx, b.numerator, b.denominator)) return a;
    if (this.monomial(ctx, a.denominator) && this.monomial(ctx, b.denominator)) {
      const ak = a.denominator.coefficients.length - 1, bk = b.denominator.coefficients.length - 1;
      const ac = this.order(ctx, a.numerator, bk), bc = this.order(ctx, b.numerator, ak);
      // Cancel across the product before allocating it: t^m*(1+t^m)/t^m
      // must not require an intermediate degree 2m merely for normalization.
      const an = this.removePower(ctx, a.numerator, ac), bn = this.removePower(ctx, b.numerator, bc);
      const d = this.shift(ctx, this.removePower(ctx, a.denominator, bc), bk - ac);
      return this.make(ctx, r.multiply(ctx, an, bn), d);
    }
    const g = polynomialGcd(ctx, r, a.numerator, b.denominator), h = polynomialGcd(ctx, r, b.numerator, a.denominator);
    return this.make(ctx,
      r.multiply(ctx, exactDivide(ctx, r, a.numerator, g), exactDivide(ctx, r, b.numerator, h)),
      r.multiply(ctx, exactDivide(ctx, r, a.denominator, h), exactDivide(ctx, r, b.denominator, g)));
  }
  subtract(ctx: ExecutionContext, a: RationalFunction<E>, b: RationalFunction<E>) { return this.add(ctx, a, this.negate(ctx, b)); }
  inverse(ctx: ExecutionContext, a: RationalFunction<E>) { this.assert(ctx, a); return this.make(ctx, a.denominator, a.numerator); }
  exactDivide(ctx: ExecutionContext, a: RationalFunction<E>, b: RationalFunction<E>) {
    const q = this.multiply(ctx, a, this.inverse(ctx, b));
    demand(this.equal(ctx, this.multiply(ctx, q, b), a), 'verification-failed', 'fraction exact division');
    return q;
  }
  derivative(ctx: ExecutionContext, a: RationalFunction<E>) {
    this.assert(ctx, a); const r = this.ring;
    return this.make(ctx,
      r.subtract(ctx, r.multiply(ctx, r.derivative(ctx, a.numerator), a.denominator), r.multiply(ctx, a.numerator, r.derivative(ctx, a.denominator))),
      r.multiply(ctx, a.denominator, a.denominator));
  }
}
