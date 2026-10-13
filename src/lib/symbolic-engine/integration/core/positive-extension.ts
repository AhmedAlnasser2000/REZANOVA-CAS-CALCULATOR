import { demand, type ExecutionContext } from './execution';
import { type FiniteField, type PositiveField, positivePower, immutablePositiveEvidence } from './positive-field';
import { PositivePolynomialRing, positiveBezout, verifyPositiveBezout, type PositivePolynomial, type PositiveBezout } from './positive-polynomial';
import { OwnedValidation } from './owned-validation';

export interface FiniteIrreducibility<E> { readonly frobenius: readonly PositivePolynomial<E>[]; readonly exclusions: readonly Readonly<{index: number; bezout: PositiveBezout<E>}>[] }
function indices(ctx: ExecutionContext, degree: number) {
  ctx.degree(degree); const result: number[] = []; let n = degree;
  for (let d = 2; d * d <= n; d++) { ctx.tick(); if (n % d) continue; ctx.allocate(1); result.push(degree / d); while (n % d === 0) n /= d; }
  if (n > 1) { ctx.allocate(1); result.push(degree / n); } return result;
}
export function finiteIrreducibility<E>(ctx: ExecutionContext, r: PositivePolynomialRing<E>, f: PositivePolynomial<E>, size: bigint): FiniteIrreducibility<E> {
  const n = r.degree(ctx, f), x = r.divide(ctx, r.x(ctx), f).remainder, frobenius = [x]; let h = x; ctx.allocate(n + 1);
  for (let i = 0; i < n; i++) { h = r.powMod(ctx, h, size, f); frobenius.push(h); }
  const exclusions = indices(ctx, n).map(index => Object.freeze({index, bezout: positiveBezout(ctx, r, f, r.subtract(ctx, frobenius[index], x))}));
  const proof = Object.freeze({frobenius: Object.freeze(frobenius), exclusions: Object.freeze(exclusions)}); verifyFiniteExtensionIrreducibility(ctx, r, f, size, proof); return proof;
}
export function verifyFiniteExtensionIrreducibility<E>(ctx: ExecutionContext, r: PositivePolynomialRing<E>, f: PositivePolynomial<E>, size: bigint, proof: FiniteIrreducibility<E>): void {
  const n = r.degree(ctx, f); demand(n > 0 && r.field.equal(ctx, r.leading(ctx, f), r.field.fromInteger(ctx, 1n)) && proof.frobenius.length === n + 1, 'verification-failed', 'finite irreducibility degree/coverage');
  const x = r.divide(ctx, r.x(ctx), f).remainder; demand(r.equal(ctx, proof.frobenius[0], x), 'verification-failed', 'finite Frobenius initial');
  for (let i = 1; i <= n; i++) demand(r.equal(ctx, r.powMod(ctx, proof.frobenius[i - 1], size, f), proof.frobenius[i]), 'verification-failed', 'finite Frobenius recurrence');
  demand(r.equal(ctx, proof.frobenius[n], x), 'verification-failed', 'finite Frobenius final');
  const expected = indices(ctx, n); demand(expected.length === proof.exclusions.length, 'verification-failed', 'finite irreducibility complete exclusions');
  for (let i = 0; i < expected.length; i++) { const e = proof.exclusions[i]; demand(e.index === expected[i], 'verification-failed', 'finite exclusion index');
    verifyPositiveBezout(ctx, r, f, r.subtract(ctx, proof.frobenius[e.index], x), e.bezout); demand(r.equal(ctx, e.bezout.gcd, r.one(ctx)), 'verification-failed', 'finite irreducibility exclusion'); }
}
export interface FiniteExtensionValue<E> { readonly owner: PositiveFiniteExtension<E>; readonly polynomial: PositivePolynomial<E> }
const extensions = new WeakSet<object>();
export function isPositiveFiniteExtension(value:unknown):value is PositiveFiniteExtension<unknown>{return value!==null&&typeof value==='object'&&extensions.has(value);}
export class PositiveFiniteExtension<E> implements FiniteField<FiniteExtensionValue<E>> {
  readonly identity = Symbol('positive-finite-extension'); readonly capability = 'field' as const;
  readonly characteristic: bigint; readonly size: bigint; readonly parent: FiniteField<E>;
  readonly ring: PositivePolynomialRing<E>; readonly modulus: PositivePolynomial<E>; readonly irreducibility: FiniteIrreducibility<E>;
  #values = new WeakSet<object>();
  #validation = new OwnedValidation();
  #units=new Map<bigint,FiniteExtensionValue<E>>();
  constructor(ctx: ExecutionContext, parent: FiniteField<E>, ring: PositivePolynomialRing<E>, modulus: PositivePolynomial<E>, proof: FiniteIrreducibility<E>) {
    immutablePositiveEvidence(ctx, proof);
    demand(ring.field === parent, 'domain-mismatch', 'finite extension parent'); verifyFiniteExtensionIrreducibility(ctx, ring, modulus, parent.size, proof);
    this.parent = parent; this.ring = ring; this.modulus = modulus; this.irreducibility = proof; this.characteristic = parent.characteristic;
    let size = 1n; for (let i = 0; i < ring.degree(ctx, modulus); i++) size = ctx.multiply(size, parent.size); this.size = size;
    ctx.allocate(8); extensions.add(this); Object.freeze(this);
  }
  assert(ctx: ExecutionContext, a: FiniteExtensionValue<E>): void { ctx.tick(); demand(extensions.has(this) && a !== null && typeof a === 'object' && this.#values.has(a), 'domain-mismatch', 'owned finite extension value'); this.#validation.check(ctx,a,()=>this.ring.assert(ctx, a.polynomial)); }
  make(ctx: ExecutionContext, p: PositivePolynomial<E>): FiniteExtensionValue<E> { this.ring.assert(ctx,p); let polynomial:PositivePolynomial<E>;
    if(p.coefficients.length<this.modulus.coefficients.length)polynomial=p;
    else if(this.modulus.coefficients.length===2){const root=this.parent.negate(ctx,this.modulus.coefficients[0]);let value=this.parent.fromInteger(ctx,0n);for(let i=p.coefficients.length-1;i>=0;i--)value=this.parent.add(ctx,this.parent.multiply(ctx,value,root),p.coefficients[i]);polynomial=this.ring.constant(ctx,value);}
    else polynomial = this.ring.divide(ctx, p, this.modulus).remainder; ctx.allocate(2); const result = Object.freeze({owner: this, polynomial}); this.#values.add(result); return result; }
  embed(ctx: ExecutionContext, c: E) { return this.make(ctx, this.ring.constant(ctx, c)); }
  fromInteger(ctx: ExecutionContext, n: bigint) {ctx.integer(n);const key=ctx.remainder(n,this.characteristic),old=(key===0n||key===1n)?this.#units.get(key):undefined;if(old){ctx.tick();ctx.allocate(1);this.assert(ctx,old);return old;}const value=this.embed(ctx,this.parent.fromInteger(ctx,n));if(key===0n||key===1n)this.#units.set(key,value);return value;}
  generator(ctx: ExecutionContext) { return this.make(ctx, this.ring.x(ctx)); }
  equal(ctx: ExecutionContext, a: FiniteExtensionValue<E>, b: FiniteExtensionValue<E>) { this.assert(ctx, a); this.assert(ctx, b); return this.ring.equal(ctx, a.polynomial, b.polynomial); }
  isZero(ctx: ExecutionContext, a: FiniteExtensionValue<E>) { this.assert(ctx, a); return this.ring.isZero(ctx, a.polynomial); }
  add(ctx: ExecutionContext, a: FiniteExtensionValue<E>, b: FiniteExtensionValue<E>) { this.assert(ctx, a); this.assert(ctx, b); return this.make(ctx, this.ring.add(ctx, a.polynomial, b.polynomial)); }
  negate(ctx: ExecutionContext, a: FiniteExtensionValue<E>) { this.assert(ctx, a); return this.make(ctx, this.ring.negate(ctx, a.polynomial)); }
  subtract(ctx: ExecutionContext, a: FiniteExtensionValue<E>, b: FiniteExtensionValue<E>) { return this.add(ctx, a, this.negate(ctx, b)); }
  multiply(ctx: ExecutionContext, a: FiniteExtensionValue<E>, b: FiniteExtensionValue<E>) { this.assert(ctx, a); this.assert(ctx, b); if(this.modulus.coefficients.length===2)return this.embed(ctx,this.parent.multiply(ctx,a.polynomial.coefficients[0]??this.parent.fromInteger(ctx,0n),b.polynomial.coefficients[0]??this.parent.fromInteger(ctx,0n)));return this.make(ctx, this.ring.multiply(ctx, a.polynomial, b.polynomial)); }
  inverse(ctx: ExecutionContext, a: FiniteExtensionValue<E>) { this.assert(ctx, a); demand(!this.isZero(ctx, a), 'division-by-zero', 'finite extension inverse');
    if(a.polynomial.coefficients.length===1)return this.embed(ctx,this.parent.inverse(ctx,a.polynomial.coefficients[0]));
    const proof = positiveBezout(ctx, this.ring, a.polynomial, this.modulus); demand(this.ring.equal(ctx, proof.gcd, this.ring.one(ctx)), 'verification-failed', 'finite inverse Bezout'); const value = this.make(ctx, proof.s);
    demand(this.equal(ctx, this.multiply(ctx, a, value), this.fromInteger(ctx, 1n)), 'verification-failed', 'finite inverse identity'); return value; }
  exactDivide(ctx: ExecutionContext, a: FiniteExtensionValue<E>, b: FiniteExtensionValue<E>) { return this.multiply(ctx, a, this.inverse(ctx, b)); }
  element(ctx: ExecutionContext, index: bigint) { ctx.integer(index); demand(index >= 0n && index < this.size, 'invalid-input', 'finite extension element index');
    const cs: E[] = []; let n = index; for (let i = 0; i < this.ring.degree(ctx, this.modulus); i++) { ctx.allocate(1); cs.push(this.parent.element(ctx, ctx.remainder(n, this.parent.size))); n = ctx.quotient(n, this.parent.size); } return this.make(ctx, this.ring.make(ctx, cs)); }
  index(ctx: ExecutionContext, a: FiniteExtensionValue<E>) { this.assert(ctx, a); let n = 0n; for (let i = a.polynomial.coefficients.length - 1; i >= 0; i--) n = ctx.add(ctx.multiply(n, this.parent.size), this.parent.index(ctx, a.polynomial.coefficients[i])); return n; }
}
export function finiteInverseFrobenius<E>(ctx: ExecutionContext, field: FiniteField<E>, a: E) { return positivePower(ctx, field, a, ctx.quotient(field.size, field.characteristic)); }
export type AnyPositiveField<E> = PositiveField<E>;
