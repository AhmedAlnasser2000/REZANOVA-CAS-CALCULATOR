import { demand, type ExecutionContext } from './execution';
import { requirePositiveField, type PositiveField } from './positive-field';
import { OwnedValidation } from './owned-validation';

export interface PositivePolynomial<E> { readonly ring: PositivePolynomialRing<E>; readonly coefficients: readonly E[] }
const owners = new WeakSet<object>();
export class PositivePolynomialRing<E> {
  readonly identity = Symbol('positive-polynomial');
  readonly field: PositiveField<E>;
  readonly variable: string;
  #values = new WeakSet<object>();
  #validation = new OwnedValidation();
  constructor(field: PositiveField<E>, variable: string) {
    requirePositiveField(field); demand(/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(variable), 'invalid-input', 'positive indeterminate');
    this.field = field; this.variable = variable; owners.add(this); Object.freeze(this);
  }
  assert(ctx: ExecutionContext, a: PositivePolynomial<E>): void {
    ctx.tick(); demand(owners.has(this) && a !== null && typeof a === 'object' && this.#values.has(a), 'domain-mismatch', 'owned positive polynomial');
    this.#validation.check(ctx, a, () => { ctx.degree(a.coefficients.length - 1); for (const c of a.coefficients) this.field.assert(ctx, c); });
  }
  make(ctx: ExecutionContext, coefficients: readonly E[]): PositivePolynomial<E> {
    demand(Array.isArray(coefficients), 'invalid-input', 'positive coefficients'); ctx.degree(coefficients.length - 1); ctx.allocate(coefficients.length + 2);
    for (const c of coefficients) this.field.assert(ctx, c); let n = coefficients.length;
    while (n && this.field.isZero(ctx, coefficients[n - 1])) n--;
    const value = Object.freeze({ring: this, coefficients: Object.freeze(coefficients.slice(0, n))}); this.#values.add(value); return value;
  }
  zero(ctx: ExecutionContext) { return this.make(ctx, []); }
  one(ctx: ExecutionContext) { return this.make(ctx, [this.field.fromInteger(ctx, 1n)]); }
  constant(ctx: ExecutionContext, c: E) { return this.make(ctx, [c]); }
  x(ctx: ExecutionContext) { return this.make(ctx, [this.field.fromInteger(ctx, 0n), this.field.fromInteger(ctx, 1n)]); }
  degree(ctx: ExecutionContext, p: PositivePolynomial<E>) { this.assert(ctx, p); return p.coefficients.length - 1; }
  isZero(ctx: ExecutionContext, p: PositivePolynomial<E>) { return this.degree(ctx, p) < 0; }
  leading(ctx: ExecutionContext, p: PositivePolynomial<E>) { this.assert(ctx, p); demand(p.coefficients.length > 0, 'invalid-input', 'positive zero leading'); return p.coefficients[p.coefficients.length - 1]; }
  equal(ctx: ExecutionContext, a: PositivePolynomial<E>, b: PositivePolynomial<E>) { this.assert(ctx, a); this.assert(ctx, b); return a.coefficients.length === b.coefficients.length && a.coefficients.every((v, i) => this.field.equal(ctx, v, b.coefficients[i])); }
  add(ctx: ExecutionContext, a: PositivePolynomial<E>, b: PositivePolynomial<E>) {
    this.assert(ctx, a); this.assert(ctx, b); const n = Math.max(a.coefficients.length, b.coefficients.length), zero = this.field.fromInteger(ctx, 0n); ctx.allocate(n);
    return this.make(ctx, Array.from({length: n}, (_, i) => this.field.add(ctx, a.coefficients[i] ?? zero, b.coefficients[i] ?? zero)));
  }
  scale(ctx: ExecutionContext, a: PositivePolynomial<E>, c: E) { this.assert(ctx, a); this.field.assert(ctx, c); ctx.allocate(a.coefficients.length); return this.make(ctx, a.coefficients.map(v => this.field.multiply(ctx, v, c))); }
  negate(ctx: ExecutionContext, a: PositivePolynomial<E>) { return this.scale(ctx, a, this.field.fromInteger(ctx, -1n)); }
  subtract(ctx: ExecutionContext, a: PositivePolynomial<E>, b: PositivePolynomial<E>) { return this.add(ctx, a, this.negate(ctx, b)); }
  multiply(ctx: ExecutionContext, a: PositivePolynomial<E>, b: PositivePolynomial<E>) {
    this.assert(ctx, a); this.assert(ctx, b); if (!a.coefficients.length || !b.coefficients.length) return this.zero(ctx);
    const n = a.coefficients.length + b.coefficients.length - 1; ctx.degree(n - 1); ctx.allocate(n); const out = Array<E>(n).fill(this.field.fromInteger(ctx, 0n));
    for (let i = 0; i < a.coefficients.length; i++) for (let j = 0; j < b.coefficients.length; j++) out[i + j] = this.field.add(ctx, out[i + j], this.field.multiply(ctx, a.coefficients[i], b.coefficients[j]));
    return this.make(ctx, out);
  }
  monic(ctx: ExecutionContext, a: PositivePolynomial<E>) { return this.scale(ctx, a, this.field.inverse(ctx, this.leading(ctx, a))); }
  derivative(ctx: ExecutionContext, a: PositivePolynomial<E>) { this.assert(ctx, a); ctx.allocate(a.coefficients.length); return this.make(ctx, a.coefficients.slice(1).map((c, i) => this.field.multiply(ctx, c, this.field.fromInteger(ctx, BigInt(i + 1))))); }
  shift(ctx: ExecutionContext, a: PositivePolynomial<E>, power: number) { this.assert(ctx, a); demand(Number.isSafeInteger(power) && power >= 0, 'invalid-input', 'positive shift'); if (!a.coefficients.length) return a; ctx.degree(a.coefficients.length - 1 + power); ctx.allocate(power + a.coefficients.length); return this.make(ctx, [...Array<E>(power).fill(this.field.fromInteger(ctx, 0n)), ...a.coefficients]); }
  divide(ctx: ExecutionContext, a: PositivePolynomial<E>, b: PositivePolynomial<E>) {
    this.assert(ctx, a); this.assert(ctx, b); demand(b.coefficients.length > 0, 'division-by-zero', 'positive polynomial division');
    const n = Math.max(0, a.coefficients.length - b.coefficients.length + 1); ctx.allocate(n + a.coefficients.length);
    const q = Array<E>(n).fill(this.field.fromInteger(ctx, 0n)), rest = [...a.coefficients], inverse = this.field.inverse(ctx, this.leading(ctx, b));
    while (rest.length >= b.coefficients.length) {
      const offset = rest.length - b.coefficients.length, c = this.field.multiply(ctx, rest[rest.length - 1], inverse); q[offset] = c;
      for (let j = 0; j < b.coefficients.length; j++) rest[offset + j] = this.field.subtract(ctx, rest[offset + j], this.field.multiply(ctx, c, b.coefficients[j]));
      while (rest.length && this.field.isZero(ctx, rest[rest.length - 1])) rest.pop();
    }
    return Object.freeze({quotient: this.make(ctx, q), remainder: this.make(ctx, rest)});
  }
  exactDivide(ctx: ExecutionContext, a: PositivePolynomial<E>, b: PositivePolynomial<E>) { const d = this.divide(ctx, a, b); demand(this.isZero(ctx, d.remainder), 'nonexact-division', 'positive exact polynomial quotient'); return d.quotient; }
  powMod(ctx: ExecutionContext, a: PositivePolynomial<E>, exponent: bigint, modulus: PositivePolynomial<E>) {
    ctx.integer(exponent); demand(exponent >= 0n, 'invalid-input', 'Frobenius exponent'); let base = this.divide(ctx, a, modulus).remainder, value = this.one(ctx), n = exponent;
    while (n) { if (ctx.remainder(n, 2n)) value = this.divide(ctx, this.multiply(ctx, value, base), modulus).remainder;
      n = ctx.quotient(n, 2n); if (n) base = this.divide(ctx, this.multiply(ctx, base, base), modulus).remainder; } return value;
  }
}
export interface PositiveBezout<E> { readonly gcd: PositivePolynomial<E>; readonly s: PositivePolynomial<E>; readonly t: PositivePolynomial<E> }
export function positiveBezout<E>(ctx: ExecutionContext, r: PositivePolynomialRing<E>, a: PositivePolynomial<E>, b: PositivePolynomial<E>): PositiveBezout<E> {
  let old = a, next = b, s = r.one(ctx), ns = r.zero(ctx), t = r.zero(ctx), nt = r.one(ctx);
  while (!r.isZero(ctx, next)) { const d = r.divide(ctx, old, next), ss = r.subtract(ctx, s, r.multiply(ctx, d.quotient, ns)), tt = r.subtract(ctx, t, r.multiply(ctx, d.quotient, nt)); old = next; next = d.remainder; s = ns; ns = ss; t = nt; nt = tt; }
  if (!r.isZero(ctx, old)) { const inverse = r.field.inverse(ctx, r.leading(ctx, old)); old = r.scale(ctx, old, inverse); s = r.scale(ctx, s, inverse); t = r.scale(ctx, t, inverse); }
  const proof = Object.freeze({gcd: old, s, t}); verifyPositiveBezout(ctx, r, a, b, proof); return proof;
}
export function verifyPositiveBezout<E>(ctx: ExecutionContext, r: PositivePolynomialRing<E>, a: PositivePolynomial<E>, b: PositivePolynomial<E>, proof: PositiveBezout<E>): void {
  demand(r.equal(ctx, r.add(ctx, r.multiply(ctx, a, proof.s), r.multiply(ctx, b, proof.t)), proof.gcd), 'verification-failed', 'positive Bezout identity');
  if (r.isZero(ctx, proof.gcd)) demand(r.isZero(ctx, a) && r.isZero(ctx, b), 'verification-failed', 'positive zero GCD');
  else demand(r.field.equal(ctx, r.leading(ctx, proof.gcd), r.field.fromInteger(ctx, 1n)) && r.isZero(ctx, r.divide(ctx, a, proof.gcd).remainder) && r.isZero(ctx, r.divide(ctx, b, proof.gcd).remainder), 'verification-failed', 'positive GCD normalization/divisibility');
}
