import { demand, type ExecutionContext } from './execution';
import { OwnedValidation } from './owned-validation';
import { rationalField, type ExactField, type ExactRing } from './field';

export interface Polynomial<E, D extends ExactRing<E> = ExactField<E>> {
  readonly ring: PolynomialRing<E, D>;
  readonly coefficients: readonly E[];
}
const owners = new WeakSet<object>();
export function assertPolynomialRingOwner(ctx: ExecutionContext, owner: unknown): asserts owner is PolynomialRing<unknown> {
  ctx.tick(); demand(owner instanceof PolynomialRing && owners.has(owner), 'domain-mismatch', 'polynomial ring owner');
}

export class PolynomialRing<E, D extends ExactRing<E> = ExactField<E>> {
  readonly identity = Symbol('polynomial-ring');
  readonly domain: D;
  readonly variable: string;
  #values = new WeakSet<object>();
  #validation = new OwnedValidation();
  constructor(domain: D & ExactRing<E>, variable: string) {
    demand(domain.characteristic === 0, 'domain-mismatch', 'requires characteristic zero');
    demand(typeof variable === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(variable),
      'invalid-input', 'invalid indeterminate name');
    this.domain = domain; this.variable = variable; owners.add(this);
    Object.freeze(this);
  }
  assert(ctx: ExecutionContext, a: Polynomial<E, D>): void {
    ctx.tick();
    demand(typeof a === 'object' && a !== null && this.#values.has(a), 'domain-mismatch', 'polynomial ring');
    const validate = () => {
      ctx.degree(a.coefficients.length - 1);
      for (const c of a.coefficients) this.domain.assert(ctx, c);
    };
    // Only Q coefficients have a closed, immutable scalar representation here.
    // Custom ring implementations may own values with mutable nested state.
    if (Object.is(this.domain, rationalField)) this.#validation.check(ctx, a, validate);
    else validate();
  }
  make(ctx: ExecutionContext, coefficients: readonly E[]): Polynomial<E, D> {
    demand(Array.isArray(coefficients), 'invalid-input', 'coefficient array');
    ctx.degree(coefficients.length - 1); ctx.allocate(coefficients.length + 1);
    for (const c of coefficients) this.domain.assert(ctx, c);
    let length = coefficients.length;
    while (length && this.domain.isZero(ctx, coefficients[length - 1])) length--;
    const value = Object.freeze({ ring: this, coefficients: Object.freeze(coefficients.slice(0, length)) });
    this.#values.add(value); return value;
  }
  zero(ctx: ExecutionContext) { return this.make(ctx, []); }
  one(ctx: ExecutionContext) { return this.constant(ctx, this.domain.fromInteger(ctx, 1n)); }
  constant(ctx: ExecutionContext, c: E) { return this.make(ctx, [c]); }
  degree(ctx: ExecutionContext, a: Polynomial<E, D>) { this.assert(ctx, a); return a.coefficients.length - 1; }
  isZero(ctx: ExecutionContext, a: Polynomial<E, D>) { return this.degree(ctx, a) === -1; }
  leading(ctx: ExecutionContext, a: Polynomial<E, D>): E {
    this.assert(ctx, a);
    demand(a.coefficients.length > 0, 'invalid-input', 'zero polynomial has no leading coefficient');
    return a.coefficients[a.coefficients.length - 1];
  }
  equal(ctx: ExecutionContext, a: Polynomial<E, D>, b: Polynomial<E, D>): boolean {
    this.assert(ctx, a); this.assert(ctx, b);
    return a.coefficients.length === b.coefficients.length && a.coefficients.every((c, i) => this.domain.equal(ctx, c, b.coefficients[i]));
  }
  add(ctx: ExecutionContext, a: Polynomial<E, D>, b: Polynomial<E, D>): Polynomial<E, D> {
    this.assert(ctx, a); this.assert(ctx, b);
    const n = Math.max(a.coefficients.length, b.coefficients.length); ctx.allocate(n);
    const zero = this.domain.fromInteger(ctx, 0n);
    const out: E[] = [];
    for (let i = 0; i < n; i++) out.push(this.domain.add(ctx, a.coefficients[i] ?? zero, b.coefficients[i] ?? zero));
    return this.make(ctx, out);
  }
  negate(ctx: ExecutionContext, a: Polynomial<E, D>) {
    this.assert(ctx, a); ctx.allocate(a.coefficients.length);
    return this.make(ctx, a.coefficients.map(c => this.domain.negate(ctx, c)));
  }
  subtract(ctx: ExecutionContext, a: Polynomial<E, D>, b: Polynomial<E, D>) { return this.add(ctx, a, this.negate(ctx, b)); }
  scale(ctx: ExecutionContext, a: Polynomial<E, D>, c: E) {
    this.assert(ctx, a); this.domain.assert(ctx, c); ctx.allocate(a.coefficients.length);
    return this.make(ctx, a.coefficients.map(v => this.domain.multiply(ctx, v, c)));
  }
  multiply(ctx: ExecutionContext, a: Polynomial<E, D>, b: Polynomial<E, D>): Polynomial<E, D> {
    this.assert(ctx, a); this.assert(ctx, b);
    if (!a.coefficients.length || !b.coefficients.length) return this.zero(ctx);
    const n = a.coefficients.length + b.coefficients.length - 1;
    ctx.degree(n - 1); ctx.allocate(n);
    const out = Array<E>(n).fill(this.domain.fromInteger(ctx, 0n));
    for (let i = 0; i < a.coefficients.length; i++) for (let j = 0; j < b.coefficients.length; j++) {
      ctx.tick(); out[i + j] = this.domain.add(ctx, out[i + j], this.domain.multiply(ctx, a.coefficients[i], b.coefficients[j]));
    }
    return this.make(ctx, out);
  }
  derivative(ctx: ExecutionContext, a: Polynomial<E, D>): Polynomial<E, D> {
    this.assert(ctx, a); ctx.allocate(a.coefficients.length);
    const out: E[] = [];
    for (let i = 1; i < a.coefficients.length; i++) out.push(this.domain.multiply(ctx, a.coefficients[i], this.domain.fromInteger(ctx, BigInt(i))));
    return this.make(ctx, out);
  }
  power(ctx: ExecutionContext, a: Polynomial<E, D>, exponent: number): Polynomial<E, D> {
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
