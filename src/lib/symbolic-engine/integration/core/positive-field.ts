import { demand, type ExecutionContext } from './execution';
import { verifyFactorPrime } from './factorization-modular';

/** Private positive-characteristic owners. None implement ExactRing/ExactField. */
export interface PositiveRing<E> {
  readonly characteristic: bigint;
  readonly identity: symbol;
  readonly capability: 'ring' | 'field';
  assert(ctx: ExecutionContext, value: E): void;
  fromInteger(ctx: ExecutionContext, value: bigint): E;
  add(ctx: ExecutionContext, a: E, b: E): E;
  subtract(ctx: ExecutionContext, a: E, b: E): E;
  negate(ctx: ExecutionContext, a: E): E;
  multiply(ctx: ExecutionContext, a: E, b: E): E;
  equal(ctx: ExecutionContext, a: E, b: E): boolean;
  isZero(ctx: ExecutionContext, a: E): boolean;
}
export interface PositiveField<E> extends PositiveRing<E> {
  readonly capability: 'field';
  inverse(ctx: ExecutionContext, a: E): E;
  exactDivide(ctx: ExecutionContext, a: E, b: E): E;
}
export interface FiniteField<E> extends PositiveField<E> {
  readonly size: bigint;
  element(ctx: ExecutionContext, index: bigint): E;
  index(ctx: ExecutionContext, value: E): bigint;
}
export interface PrimeValue { readonly owner: PositivePrimeField; readonly value: bigint }
const primeOwners = new WeakSet<object>();
export class PositivePrimeField implements FiniteField<PrimeValue> {
  readonly identity = Symbol('positive-prime-field');
  readonly capability = 'field' as const;
  readonly characteristic: bigint;
  readonly size: bigint;
  #values = new WeakSet<object>();
  #units=new Map<bigint,PrimeValue>();
  constructor(ctx: ExecutionContext, prime: bigint) {
    verifyFactorPrime(ctx, prime); ctx.allocate(5); this.characteristic = this.size = prime; primeOwners.add(this); Object.freeze(this);
  }
  assert(ctx: ExecutionContext, a: PrimeValue): void {
    ctx.tick(); demand(primeOwners.has(this) && a !== null && typeof a === 'object' && this.#values.has(a), 'domain-mismatch', 'owned positive prime value'); ctx.integer(a.value);
  }
  fromInteger(ctx: ExecutionContext, n: bigint): PrimeValue {
    let value = ctx.remainder(n, this.characteristic); if (value < 0n) value = ctx.add(value, this.characteristic);
    const old=(value===0n||value===1n)?this.#units.get(value):undefined;if(old){ctx.tick();ctx.allocate(1);return old;}
    ctx.allocate(2); const result = Object.freeze({owner: this, value}); this.#values.add(result);if(value===0n||value===1n)this.#units.set(value,result);return result;
  }
  element(ctx: ExecutionContext, index: bigint) { ctx.integer(index); demand(index >= 0n && index < this.size, 'invalid-input', 'finite element index'); return this.fromInteger(ctx, index); }
  index(ctx: ExecutionContext, a: PrimeValue) { this.assert(ctx, a); return a.value; }
  add(ctx: ExecutionContext, a: PrimeValue, b: PrimeValue) { this.assert(ctx, a); this.assert(ctx, b); return this.fromInteger(ctx, ctx.add(a.value, b.value)); }
  negate(ctx: ExecutionContext, a: PrimeValue) { this.assert(ctx, a); return this.fromInteger(ctx, -a.value); }
  subtract(ctx: ExecutionContext, a: PrimeValue, b: PrimeValue) { return this.add(ctx, a, this.negate(ctx, b)); }
  multiply(ctx: ExecutionContext, a: PrimeValue, b: PrimeValue) { this.assert(ctx, a); this.assert(ctx, b); return this.fromInteger(ctx, ctx.multiply(a.value, b.value)); }
  equal(ctx: ExecutionContext, a: PrimeValue, b: PrimeValue) { this.assert(ctx, a); this.assert(ctx, b); return a.value === b.value; }
  isZero(ctx: ExecutionContext, a: PrimeValue) { this.assert(ctx, a); return a.value === 0n; }
  inverse(ctx: ExecutionContext, a: PrimeValue) {
    this.assert(ctx, a); demand(a.value !== 0n, 'division-by-zero', 'positive prime inverse');
    const result = positivePower(ctx, this, a, this.characteristic - 2n);
    demand(this.equal(ctx, this.multiply(ctx, a, result), this.fromInteger(ctx, 1n)), 'verification-failed', 'positive prime inverse identity'); return result;
  }
  exactDivide(ctx: ExecutionContext, a: PrimeValue, b: PrimeValue) { return this.multiply(ctx, a, this.inverse(ctx, b)); }
}
export function positivePower<E>(ctx: ExecutionContext, ring: PositiveRing<E>, a: E, exponent: bigint): E {
  ring.assert(ctx, a); ctx.integer(exponent); demand(exponent >= 0n, 'invalid-input', 'positive-ring exponent');
  let value = ring.fromInteger(ctx, 1n), base = a, n = exponent;
  while (n) { if (ctx.remainder(n, 2n)) value = ring.multiply(ctx, value, base); n = ctx.quotient(n, 2n); if (n) base = ring.multiply(ctx, base, base); }
  return value;
}
export function requirePositiveField<E>(field: PositiveRing<E>): asserts field is PositiveField<E> {
  demand(field!==null&&typeof field==='object'&&(primeOwners.has(field)||isPositiveFiniteExtension(field)||isPositiveFractionField(field)||isReducedCurveField(field))&&field.characteristic > 0n && field.capability === 'field' && typeof (field as PositiveField<E>).inverse === 'function', 'domain-mismatch', 'registered positive field required');
}
import {isPositiveFiniteExtension} from './positive-extension';
import {isPositiveFractionField} from './positive-fraction';
import {isReducedCurveField} from './reduced-curve';
export function immutablePositiveEvidence(ctx: ExecutionContext, value: unknown, seen = new WeakSet<object>()): void {
  if (value === null || typeof value !== 'object' || seen.has(value)) return; ctx.allocate(1); seen.add(value);
  demand(Object.isFrozen(value), 'invalid-input', 'mutable positive-characteristic evidence');
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return;
  for (const key of Reflect.ownKeys(value)) { ctx.tick(); const descriptor = Object.getOwnPropertyDescriptor(value, key)!; demand('value' in descriptor, 'invalid-input', 'positive evidence accessor'); immutablePositiveEvidence(ctx, descriptor.value, seen); }
}
