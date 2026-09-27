import { demand, type ExecutionContext } from './execution';
import { requireField, type ExactRing } from './field';
import type { Polynomial, PolynomialRing } from './polynomial';
import { exactDivide, extendedGcd, polynomialDivide, polynomialGcd, verifyBezout, type Bezout } from './polynomial-division';

export interface QuotientElement<E> {
  readonly algebra: SquareFreeQuotientAlgebra<E>;
  readonly representative: Polynomial<E>;
}
export interface QuotientSplit<E> {
  readonly factor: Polynomial<E>;
  readonly complement: Polynomial<E>;
  readonly coprime: Bezout<E>;
}
export type UnitAnalysis<E> =
  | { readonly kind: 'zero' }
  | { readonly kind: 'unit'; readonly inverse: QuotientElement<E>; readonly bezout: Bezout<E> }
  | { readonly kind: 'nonunit'; readonly bezout: Bezout<E>; readonly split: QuotientSplit<E> };

/** Square-free does not imply irreducible: deliberately only a ring capability. */
export class SquareFreeQuotientAlgebra<E> implements ExactRing<QuotientElement<E>> {
  readonly identity = Symbol('square-free-quotient');
  readonly capability = 'ring' as const;
  readonly characteristic = 0 as const;
  readonly ring: PolynomialRing<E>;
  readonly modulus: Polynomial<E>;
  #values = new WeakSet<object>();
  constructor(ctx: ExecutionContext, ring: PolynomialRing<E>, modulus: Polynomial<E>) {
    requireField(ring.domain); ring.assert(ctx, modulus);
    demand(ring.degree(ctx, modulus) > 0 && ring.domain.equal(ctx, ring.leading(ctx, modulus), ring.domain.fromInteger(ctx, 1n)),
      'invalid-input', 'quotient requires nonconstant monic modulus');
    demand(ring.equal(ctx, polynomialGcd(ctx, ring, modulus, ring.derivative(ctx, modulus)), ring.one(ctx)),
      'invalid-input', 'quotient requires square-free modulus');
    ctx.allocate(3); this.ring = ring; this.modulus = modulus; Object.freeze(this);
  }
  assert(ctx: ExecutionContext, a: QuotientElement<E>) {
    ctx.tick(); demand(typeof a === 'object' && a !== null && this.#values.has(a), 'domain-mismatch', 'quotient ownership');
    this.ring.assert(ctx, a.representative);
  }
  make(ctx: ExecutionContext, a: Polynomial<E>): QuotientElement<E> {
    const representative = polynomialDivide(ctx, this.ring, a, this.modulus).remainder;
    ctx.allocate(2); const value = Object.freeze({ algebra: this, representative });
    this.#values.add(value); return value;
  }
  fromInteger(ctx: ExecutionContext, n: bigint) { return this.make(ctx, this.ring.constant(ctx, this.ring.domain.fromInteger(ctx, n))); }
  equal(ctx: ExecutionContext, a: QuotientElement<E>, b: QuotientElement<E>) {
    this.assert(ctx, a); this.assert(ctx, b); return this.ring.equal(ctx, a.representative, b.representative);
  }
  isZero(ctx: ExecutionContext, a: QuotientElement<E>) { this.assert(ctx, a); return this.ring.isZero(ctx, a.representative); }
  add(ctx: ExecutionContext, a: QuotientElement<E>, b: QuotientElement<E>) {
    this.assert(ctx, a); this.assert(ctx, b); return this.make(ctx, this.ring.add(ctx, a.representative, b.representative));
  }
  subtract(ctx: ExecutionContext, a: QuotientElement<E>, b: QuotientElement<E>) { return this.add(ctx, a, this.negate(ctx, b)); }
  negate(ctx: ExecutionContext, a: QuotientElement<E>) { this.assert(ctx, a); return this.make(ctx, this.ring.negate(ctx, a.representative)); }
  multiply(ctx: ExecutionContext, a: QuotientElement<E>, b: QuotientElement<E>) {
    this.assert(ctx, a); this.assert(ctx, b); return this.make(ctx, this.ring.multiply(ctx, a.representative, b.representative));
  }
  analyzeUnit(ctx: ExecutionContext, a: QuotientElement<E>): UnitAnalysis<E> {
    this.assert(ctx, a); const r = this.ring; let result: UnitAnalysis<E>;
    if (this.isZero(ctx, a)) result = Object.freeze({ kind: 'zero' });
    else {
      const bezout = extendedGcd(ctx, r, a.representative, this.modulus);
      if (r.equal(ctx, bezout.gcd, r.one(ctx))) result = Object.freeze({ kind: 'unit', inverse: this.make(ctx, bezout.s), bezout });
      else {
        const factor = bezout.gcd, complement = exactDivide(ctx, r, this.modulus, factor);
        const split = Object.freeze({ factor, complement, coprime: extendedGcd(ctx, r, factor, complement) });
        result = Object.freeze({ kind: 'nonunit', bezout, split });
      }
    }
    ctx.allocate(7); this.verifyUnit(ctx, a, result); return result;
  }
  verifySplit(ctx: ExecutionContext, split: QuotientSplit<E>) {
    const r = this.ring;
    demand(r.degree(ctx, split.factor) > 0 && r.degree(ctx, split.complement) > 0,
      'verification-failed', 'split must be proper');
    for (const p of [split.factor, split.complement]) demand(r.domain.equal(ctx, r.leading(ctx, p), r.domain.fromInteger(ctx, 1n)),
      'verification-failed', 'nonmonic split');
    demand(r.equal(ctx, r.multiply(ctx, split.factor, split.complement), this.modulus), 'verification-failed', 'split reconstruction');
    verifyBezout(ctx, r, split.factor, split.complement, split.coprime);
    demand(r.equal(ctx, split.coprime.gcd, r.one(ctx)), 'verification-failed', 'split not coprime');
  }
  verifyUnit(ctx: ExecutionContext, a: QuotientElement<E>, proof: UnitAnalysis<E>) {
    this.assert(ctx, a); const r = this.ring;
    if (proof.kind === 'zero') { demand(this.isZero(ctx, a), 'verification-failed', 'false zero unit analysis'); return; }
    demand(proof.kind === 'unit' || proof.kind === 'nonunit', 'verification-failed', 'unit analysis kind');
    verifyBezout(ctx, r, a.representative, this.modulus, proof.bezout);
    if (proof.kind === 'unit') {
      demand(r.equal(ctx, proof.bezout.gcd, r.one(ctx)), 'verification-failed', 'inverse gcd');
      demand(this.equal(ctx, proof.inverse, this.make(ctx, proof.bezout.s))
        && this.equal(ctx, this.multiply(ctx, a, proof.inverse), this.fromInteger(ctx, 1n)), 'verification-failed', 'inverse identity');
    } else {
      demand(!this.isZero(ctx, a), 'verification-failed', 'zero is separate from nonunit');
      this.verifySplit(ctx, proof.split);
      demand(r.equal(ctx, proof.bezout.gcd, proof.split.factor), 'verification-failed', 'split does not witness nonunit');
    }
  }
  components(ctx: ExecutionContext, split: QuotientSplit<E>) {
    this.verifySplit(ctx, split); ctx.allocate(2);
    return Object.freeze([new SquareFreeQuotientAlgebra(ctx, this.ring, split.factor),
      new SquareFreeQuotientAlgebra(ctx, this.ring, split.complement)] as const);
  }
  project(ctx: ExecutionContext, a: QuotientElement<E>, component: SquareFreeQuotientAlgebra<E>) {
    this.assert(ctx, a);
    exactDivide(ctx, this.ring, this.modulus, component.modulus);
    const result = component.make(ctx, a.representative);
    // Reduction already carries its checked division identity.
    demand(component.ring.degree(ctx, result.representative) < component.ring.degree(ctx, component.modulus),
      'verification-failed', 'quotient projection degree');
    return result;
  }
  recombine(ctx: ExecutionContext, split: QuotientSplit<E>, left: QuotientElement<E>, right: QuotientElement<E>) {
    this.verifySplit(ctx, split); const r = this.ring;
    left.algebra.assert(ctx, left); right.algebra.assert(ctx, right);
    demand(r.equal(ctx, left.algebra.modulus, split.factor) && r.equal(ctx, right.algebra.modulus, split.complement),
      'domain-mismatch', 'CRT component moduli');
    const lifted = r.add(ctx, r.multiply(ctx, left.representative, r.multiply(ctx, split.coprime.t, split.complement)),
      r.multiply(ctx, right.representative, r.multiply(ctx, split.coprime.s, split.factor)));
    const result = this.make(ctx, lifted);
    this.verifyRecombination(ctx, split, left, right, result); return result;
  }
  verifyRecombination(ctx: ExecutionContext, split: QuotientSplit<E>, left: QuotientElement<E>, right: QuotientElement<E>, result: QuotientElement<E>) {
    this.verifySplit(ctx, split); const r = this.ring;
    demand(r.equal(ctx, left.algebra.modulus, split.factor) && r.equal(ctx, right.algebra.modulus, split.complement), 'domain-mismatch', 'CRT component moduli');
    demand(left.algebra.equal(ctx, this.project(ctx, result, left.algebra), left)
      && right.algebra.equal(ctx, this.project(ctx, result, right.algebra), right), 'verification-failed', 'CRT projections');
  }
}
