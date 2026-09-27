import { demand, type ExecutionContext } from './execution';
import type { ExactField } from './field';

export interface Polynomial<E> {
  readonly ring: PolynomialRing<E>;
  readonly coefficients: readonly E[];
}

export class PolynomialRing<E> {
  readonly identity = Symbol('polynomial-ring');
  readonly field: ExactField<E>;
  readonly variable: string;
  #values = new WeakSet<object>();
  constructor(field: ExactField<E>, variable: string) {
    demand(field.characteristic === 0, 'domain-mismatch', 'requires characteristic zero');
    demand(typeof variable === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(variable),
      'invalid-input', 'invalid indeterminate name');
    this.field = field; this.variable = variable;
    Object.freeze(this);
  }
  assert(ctx: ExecutionContext, a: Polynomial<E>): void {
    ctx.tick();
    demand(typeof a === 'object' && a !== null && this.#values.has(a), 'domain-mismatch', 'polynomial ring');
    ctx.degree(a.coefficients.length - 1);
    for (const c of a.coefficients) this.field.assert(ctx, c);
  }
  make(ctx: ExecutionContext, coefficients: readonly E[]): Polynomial<E> {
    demand(Array.isArray(coefficients), 'invalid-input', 'coefficient array');
    ctx.degree(coefficients.length - 1); ctx.allocate(coefficients.length + 1);
    for (const c of coefficients) this.field.assert(ctx, c);
    let length = coefficients.length;
    while (length && this.field.isZero(ctx, coefficients[length - 1])) length--;
    const value = Object.freeze({ ring: this, coefficients: Object.freeze(coefficients.slice(0, length)) });
    this.#values.add(value); return value;
  }
  zero(ctx: ExecutionContext) { return this.make(ctx, []); }
  one(ctx: ExecutionContext) { return this.constant(ctx, this.field.fromInteger(ctx, 1n)); }
  constant(ctx: ExecutionContext, c: E) { return this.make(ctx, [c]); }
  degree(ctx: ExecutionContext, a: Polynomial<E>) { this.assert(ctx, a); return a.coefficients.length - 1; }
  isZero(ctx: ExecutionContext, a: Polynomial<E>) { return this.degree(ctx, a) === -1; }
  leading(ctx: ExecutionContext, a: Polynomial<E>): E {
    this.assert(ctx, a);
    demand(a.coefficients.length > 0, 'invalid-input', 'zero polynomial has no leading coefficient');
    return a.coefficients[a.coefficients.length - 1];
  }
  equal(ctx: ExecutionContext, a: Polynomial<E>, b: Polynomial<E>): boolean {
    this.assert(ctx, a); this.assert(ctx, b);
    return a.coefficients.length === b.coefficients.length && a.coefficients.every((c, i) => this.field.equal(ctx, c, b.coefficients[i]));
  }
  add(ctx: ExecutionContext, a: Polynomial<E>, b: Polynomial<E>): Polynomial<E> {
    this.assert(ctx, a); this.assert(ctx, b);
    const n = Math.max(a.coefficients.length, b.coefficients.length); ctx.allocate(n);
    const zero = this.field.fromInteger(ctx, 0n);
    const out: E[] = [];
    for (let i = 0; i < n; i++) out.push(this.field.add(ctx, a.coefficients[i] ?? zero, b.coefficients[i] ?? zero));
    return this.make(ctx, out);
  }
  negate(ctx: ExecutionContext, a: Polynomial<E>) {
    this.assert(ctx, a); ctx.allocate(a.coefficients.length);
    return this.make(ctx, a.coefficients.map(c => this.field.negate(ctx, c)));
  }
  subtract(ctx: ExecutionContext, a: Polynomial<E>, b: Polynomial<E>) { return this.add(ctx, a, this.negate(ctx, b)); }
  scale(ctx: ExecutionContext, a: Polynomial<E>, c: E) {
    this.assert(ctx, a); this.field.assert(ctx, c); ctx.allocate(a.coefficients.length);
    return this.make(ctx, a.coefficients.map(v => this.field.multiply(ctx, v, c)));
  }
  multiply(ctx: ExecutionContext, a: Polynomial<E>, b: Polynomial<E>): Polynomial<E> {
    this.assert(ctx, a); this.assert(ctx, b);
    if (!a.coefficients.length || !b.coefficients.length) return this.zero(ctx);
    const n = a.coefficients.length + b.coefficients.length - 1;
    ctx.degree(n - 1); ctx.allocate(n);
    const out = Array<E>(n).fill(this.field.fromInteger(ctx, 0n));
    for (let i = 0; i < a.coefficients.length; i++) for (let j = 0; j < b.coefficients.length; j++) {
      ctx.tick(); out[i + j] = this.field.add(ctx, out[i + j], this.field.multiply(ctx, a.coefficients[i], b.coefficients[j]));
    }
    return this.make(ctx, out);
  }
  derivative(ctx: ExecutionContext, a: Polynomial<E>): Polynomial<E> {
    this.assert(ctx, a); ctx.allocate(a.coefficients.length);
    const out: E[] = [];
    for (let i = 1; i < a.coefficients.length; i++) out.push(this.field.multiply(ctx, a.coefficients[i], this.field.fromInteger(ctx, BigInt(i))));
    return this.make(ctx, out);
  }
  power(ctx: ExecutionContext, a: Polynomial<E>, exponent: number): Polynomial<E> {
    this.assert(ctx, a);
    demand(Number.isSafeInteger(exponent) && exponent >= 0, 'invalid-input', 'nonnegative integer exponent required');
    if (a.coefficients.length > 1) ctx.degree((a.coefficients.length - 1) * exponent);
    let result = this.one(ctx), base = a, n = exponent;
    while (n > 0) {
      ctx.tick();
      if (n % 2) result = this.multiply(ctx, result, base);
      n = Math.floor(n / 2);
      if (n) base = this.multiply(ctx, base, base);
    }
    return result;
  }
}
