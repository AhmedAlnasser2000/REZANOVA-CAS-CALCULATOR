import { demand, type ExecutionContext } from './execution';
import { requireField, type ExactField } from './field';
import type { Polynomial, PolynomialRing } from './polynomial';
import { exactDivide, polynomialGcd } from './polynomial-division';

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
  constructor(ring: PolynomialRing<E>) { requireField(ring.domain); this.ring = ring; Object.freeze(this); }
  assert(ctx: ExecutionContext, a: RationalFunction<E>): void {
    ctx.tick();
    demand(typeof a === 'object' && a !== null && this.#values.has(a), 'domain-mismatch', 'rational function field');
    this.ring.assert(ctx, a.numerator); this.ring.assert(ctx, a.denominator);
  }
  make(ctx: ExecutionContext, numerator: Polynomial<E>, denominator: Polynomial<E>): RationalFunction<E> {
    const r = this.ring;
    r.assert(ctx, numerator); r.assert(ctx, denominator);
    demand(!r.isZero(ctx, denominator), 'division-by-zero', 'rational function denominator');
    let n: Polynomial<E>, d: Polynomial<E>;
    if (r.degree(ctx, denominator) === 0) {
      // A nonzero constant is a unit: normalization needs no Euclidean algorithm.
      n = r.scale(ctx, numerator, r.domain.inverse(ctx, r.leading(ctx, denominator))); d = r.one(ctx);
    } else if (r.isZero(ctx, numerator)) { n = r.zero(ctx); d = r.one(ctx); }
    else {
      const gcd = polynomialGcd(ctx, r, numerator, denominator);
      n = exactDivide(ctx, r, numerator, gcd); d = exactDivide(ctx, r, denominator, gcd);
      const inverse = r.domain.inverse(ctx, r.leading(ctx, d));
      n = r.scale(ctx, n, inverse); d = r.scale(ctx, d, inverse);
    }
    demand(r.domain.equal(ctx, r.leading(ctx, d), r.domain.fromInteger(ctx, 1n)), 'verification-failed', 'fraction denominator not monic');
    // Monic degree-zero denominator is exactly one, hence coprime to every numerator.
    demand(r.degree(ctx, d) === 0 || r.equal(ctx, polynomialGcd(ctx, r, n, d), r.one(ctx)), 'verification-failed', 'fraction not coprime');
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
