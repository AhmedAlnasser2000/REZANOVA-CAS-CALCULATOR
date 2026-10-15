/** Positive-characteristic quotient arithmetic. Reducible moduli remain rings. */
import {demand, type ExecutionContext} from './execution';
import {FactorPrimeField, modularBezout, verifyModularBezout, type FactorModularPolynomial} from './factorization-modular';
import {ModularCoefficientPolynomialRing, type ModularCoefficientRing} from './modular-coefficient-polynomial';

export interface NumberFieldResidue {readonly ring: NumberFieldModularRing; readonly value: FactorModularPolynomial}
const rings = new WeakSet<object>();
export class NumberFieldModularRing implements ModularCoefficientRing<NumberFieldResidue> {
  readonly capability = 'ring' as const;
  readonly characteristic: bigint;
  readonly polynomials: ModularCoefficientPolynomialRing<NumberFieldResidue>;
  readonly field: FactorPrimeField;
  readonly modulus: FactorModularPolynomial;
  #values = new WeakSet<object>();
  constructor(ctx: ExecutionContext, field: FactorPrimeField, modulus: FactorModularPolynomial) {
    field.assert(ctx, modulus); demand(modulus.coefficients.length > 1
      && modulus.coefficients.at(-1) === 1n, 'invalid-input', 'monic nonconstant modular number-field relation');
    ctx.allocate(7); this.field = field; this.modulus = modulus; this.characteristic = field.modulus;
    this.polynomials = new ModularCoefficientPolynomialRing(ctx, this); rings.add(this); Object.freeze(this);
  }
  assert(ctx: ExecutionContext, a: NumberFieldResidue): void {
    ctx.tick(); demand(a !== null && typeof a === 'object' && rings.has(this) && this.#values.has(a), 'domain-mismatch', 'owned number-field residue');
    this.field.assert(ctx, a.value);
  }
  make(ctx: ExecutionContext, coefficients: readonly bigint[]): NumberFieldResidue {
    const polynomial = this.field.make(ctx, coefficients), value = polynomial.coefficients.length < this.modulus.coefficients.length ? polynomial
      : this.field.divide(ctx, polynomial, this.modulus).remainder;
    ctx.allocate(2); const out = Object.freeze({ring: this, value}); this.#values.add(out); return out;
  }
  zero(ctx: ExecutionContext) {return this.make(ctx, []);}
  one(ctx: ExecutionContext) {return this.make(ctx, [1n]);}
  isZero(ctx: ExecutionContext, a: NumberFieldResidue) {this.assert(ctx, a); return a.value.coefficients.length === 0;}
  equal(ctx: ExecutionContext, a: NumberFieldResidue, b: NumberFieldResidue) {this.assert(ctx, a); this.assert(ctx, b); return this.field.equal(ctx, a.value, b.value);}
  add(ctx: ExecutionContext, a: NumberFieldResidue, b: NumberFieldResidue) {
    this.assert(ctx, a); this.assert(ctx, b); return this.make(ctx, this.field.add(ctx, a.value, b.value).coefficients);
  }
  negate(ctx: ExecutionContext, a: NumberFieldResidue) {this.assert(ctx, a); return this.make(ctx, this.field.scale(ctx, a.value, -1n).coefficients);}
  subtract(ctx: ExecutionContext, a: NumberFieldResidue, b: NumberFieldResidue) {return this.add(ctx, a, this.negate(ctx, b));}
  multiply(ctx: ExecutionContext, a: NumberFieldResidue, b: NumberFieldResidue) {
    this.assert(ctx, a); this.assert(ctx, b); return this.make(ctx, this.field.multiplyMod(ctx, a.value, b.value, this.modulus).coefficients);
  }
  inverse(ctx: ExecutionContext, a: NumberFieldResidue): NumberFieldResidue | null {
    this.assert(ctx, a);
    if (!a.value.coefficients.length) return null;
    if (a.value.coefficients.length === 1) return this.make(ctx, [this.field.inverse(ctx, a.value.coefficients[0])]);
    const e = modularBezout(ctx, this.field, a.value, this.modulus);
    verifyModularBezout(ctx, this.field, a.value, this.modulus, e);
    if (e.gcd.length !== 1 || e.gcd[0] !== 1n) return null;
    const inverse = this.make(ctx, e.s);
    demand(this.equal(ctx, this.multiply(ctx, a, inverse), this.one(ctx)), 'verification-failed', 'checked quotient-ring inverse'); return inverse;
  }
}
