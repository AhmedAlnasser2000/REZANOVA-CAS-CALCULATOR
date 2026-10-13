import { demand, type ExecutionContext } from './execution';
import type { PositiveField } from './positive-field';
import { PositivePolynomialRing, positiveBezout, type PositivePolynomial } from './positive-polynomial';
import { OwnedValidation } from './owned-validation';
export interface PositiveFraction<E> { readonly owner: PositiveFractionField<E>; readonly numerator: PositivePolynomial<E>; readonly denominator: PositivePolynomial<E> }
const owners = new WeakSet<object>();
export function isPositiveFractionField(value:unknown):value is PositiveFractionField<unknown>{return value!==null&&typeof value==='object'&&owners.has(value);}
export class PositiveFractionField<E> implements PositiveField<PositiveFraction<E>> {
  readonly identity = Symbol('positive-fraction'); readonly capability = 'field' as const; readonly characteristic: bigint;
  readonly ring: PositivePolynomialRing<E>; #values = new WeakSet<object>();
  #validation=new OwnedValidation();
  #units=new Map<bigint,PositiveFraction<E>>();
  constructor(ring: PositivePolynomialRing<E>) { this.ring = ring; this.characteristic = ring.field.characteristic; owners.add(this); Object.freeze(this); }
  assert(ctx: ExecutionContext, a: PositiveFraction<E>): void { ctx.tick(); demand(owners.has(this) && a !== null && typeof a === 'object' && this.#values.has(a), 'domain-mismatch', 'owned positive fraction'); this.#validation.check(ctx,a,()=>{this.ring.assert(ctx, a.numerator); this.ring.assert(ctx, a.denominator);}); }
  make(ctx: ExecutionContext, numerator: PositivePolynomial<E>, denominator: PositivePolynomial<E>): PositiveFraction<E> {
    const r = this.ring; r.assert(ctx, numerator); r.assert(ctx, denominator); demand(!r.isZero(ctx, denominator), 'division-by-zero', 'positive fraction denominator');
    if(r.degree(ctx,denominator)===0){const n=r.scale(ctx,numerator,r.field.inverse(ctx,r.leading(ctx,denominator)));ctx.allocate(3);const value=Object.freeze({owner:this,numerator:n,denominator:r.one(ctx)});this.#values.add(value);return value;}
    if(r.isZero(ctx,numerator))return this.make(ctx,r.zero(ctx),r.one(ctx));
    const gcd = positiveBezout(ctx, r, numerator, denominator).gcd, n = r.exactDivide(ctx, numerator, gcd), d = r.exactDivide(ctx, denominator, gcd), inverse = r.field.inverse(ctx, r.leading(ctx, d));
    ctx.allocate(3); const value = Object.freeze({owner: this, numerator: r.scale(ctx, n, inverse), denominator: r.scale(ctx, d, inverse)}); this.#values.add(value); return value;
  }
  fromCoefficient(ctx: ExecutionContext, c: E) { return this.make(ctx, this.ring.constant(ctx, c), this.ring.one(ctx)); }
  fromInteger(ctx: ExecutionContext, n: bigint) {ctx.integer(n);const key=ctx.remainder(n,this.characteristic),old=(key===0n||key===1n)?this.#units.get(key):undefined;if(old){ctx.tick();ctx.allocate(1);this.assert(ctx,old);return old;}const value=this.fromCoefficient(ctx,this.ring.field.fromInteger(ctx,n));if(key===0n||key===1n)this.#units.set(key,value);return value;}
  equal(ctx: ExecutionContext, a: PositiveFraction<E>, b: PositiveFraction<E>) { this.assert(ctx, a); this.assert(ctx, b); return this.ring.equal(ctx, a.numerator, b.numerator) && this.ring.equal(ctx, a.denominator, b.denominator); }
  isZero(ctx: ExecutionContext, a: PositiveFraction<E>) { this.assert(ctx, a); return this.ring.isZero(ctx, a.numerator); }
  add(ctx: ExecutionContext, a: PositiveFraction<E>, b: PositiveFraction<E>) { this.assert(ctx, a); this.assert(ctx, b); const r = this.ring; return this.make(ctx, r.add(ctx, r.multiply(ctx, a.numerator, b.denominator), r.multiply(ctx, b.numerator, a.denominator)), r.multiply(ctx, a.denominator, b.denominator)); }
  negate(ctx: ExecutionContext, a: PositiveFraction<E>) { this.assert(ctx, a); return this.make(ctx, this.ring.negate(ctx, a.numerator), a.denominator); }
  subtract(ctx: ExecutionContext, a: PositiveFraction<E>, b: PositiveFraction<E>) { return this.add(ctx, a, this.negate(ctx, b)); }
  multiply(ctx: ExecutionContext, a: PositiveFraction<E>, b: PositiveFraction<E>) { this.assert(ctx, a); this.assert(ctx, b); return this.make(ctx, this.ring.multiply(ctx, a.numerator, b.numerator), this.ring.multiply(ctx, a.denominator, b.denominator)); }
  inverse(ctx: ExecutionContext, a: PositiveFraction<E>) { this.assert(ctx, a); return this.make(ctx, a.denominator, a.numerator); }
  exactDivide(ctx: ExecutionContext, a: PositiveFraction<E>, b: PositiveFraction<E>) { return this.multiply(ctx, a, this.inverse(ctx, b)); }
}
export function reciprocalPositiveFraction<E>(ctx: ExecutionContext, target: PositiveFractionField<E>, a: PositiveFraction<E>): PositiveFraction<E> {
  a.owner.assert(ctx, a); demand(a.owner.ring.field === target.ring.field, 'domain-mismatch', 'positive reciprocal constants'); const r = target.ring;
  const reverse = (p: PositivePolynomial<E>) => r.make(ctx, [...p.coefficients].reverse());
  const n = a.numerator.coefficients.length - 1, d = a.denominator.coefficients.length - 1;
  if (n < 0) return target.fromInteger(ctx, 0n);
  return target.make(ctx, r.shift(ctx, reverse(a.numerator), Math.max(0, d - n)), r.shift(ctx, reverse(a.denominator), Math.max(0, n - d)));
}
