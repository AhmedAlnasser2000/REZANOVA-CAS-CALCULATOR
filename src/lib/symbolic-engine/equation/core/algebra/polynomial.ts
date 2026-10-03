import { demand, type ExecutionContext } from '../execution';
import type { ExactDomain } from './domain';

export interface Polynomial<E> {
  readonly ring: PolynomialRing<E>;
  /** Ascending coefficients; no trailing zeros; zero is []. */
  readonly coefficients: readonly E[];
}

/**
 * Below this many coefficients schoolbook multiplication is faster than
 * Karatsuba. An algorithm crossover measured on this core, not a limit.
 */
const KARATSUBA_THRESHOLD = 24;

/** Univariate dense polynomials over an exact domain with an explicit variable identity. */
export class PolynomialRing<E> {
  readonly identity = Symbol('equation-polynomial-ring');
  readonly domain: ExactDomain<E>;
  readonly variable: string;
  readonly #owned = new WeakSet<object>();

  constructor(domain: ExactDomain<E>, variable: string) {
    demand(typeof variable === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(variable), 'invalid-input', 'invalid variable name');
    this.domain = domain;
    this.variable = variable;
    Object.freeze(this);
  }

  assert(ctx: ExecutionContext, a: Polynomial<E>): void {
    ctx.tick();
    demand(typeof a === 'object' && a !== null && this.#owned.has(a), 'domain-mismatch', 'polynomial from another ring');
  }

  make(ctx: ExecutionContext, coefficients: readonly E[]): Polynomial<E> {
    demand(Array.isArray(coefficients), 'invalid-input', 'coefficient array');
    ctx.allocate(coefficients.length + 1);
    for (const c of coefficients) this.domain.assert(ctx, c);
    let length = coefficients.length;
    while (length > 0 && this.domain.isZero(ctx, coefficients[length - 1])) length--;
    const value = Object.freeze({ ring: this, coefficients: Object.freeze(coefficients.slice(0, length)) });
    this.#owned.add(value);
    return value;
  }

  fromIntegers(ctx: ExecutionContext, coefficients: readonly (bigint | number)[]): Polynomial<E> {
    return this.make(ctx, coefficients.map(c => this.domain.fromInteger(ctx, BigInt(c))));
  }

  zero(ctx: ExecutionContext) { return this.make(ctx, []); }
  one(ctx: ExecutionContext) { return this.make(ctx, [this.domain.fromInteger(ctx, 1n)]); }
  constant(ctx: ExecutionContext, c: E) { return this.make(ctx, [c]); }
  /** c·x^k */
  monomial(ctx: ExecutionContext, c: E, k: number): Polynomial<E> {
    demand(Number.isSafeInteger(k) && k >= 0, 'invalid-input', 'monomial exponent');
    ctx.allocate(k + 1);
    const zero = this.domain.fromInteger(ctx, 0n);
    const out = Array<E>(k + 1).fill(zero);
    out[k] = c;
    return this.make(ctx, out);
  }

  degree(ctx: ExecutionContext, a: Polynomial<E>): number { this.assert(ctx, a); return a.coefficients.length - 1; }
  isZero(ctx: ExecutionContext, a: Polynomial<E>): boolean { return this.degree(ctx, a) === -1; }
  leading(ctx: ExecutionContext, a: Polynomial<E>): E {
    this.assert(ctx, a);
    demand(a.coefficients.length > 0, 'invalid-input', 'zero polynomial has no leading coefficient');
    return a.coefficients[a.coefficients.length - 1];
  }

  equal(ctx: ExecutionContext, a: Polynomial<E>, b: Polynomial<E>): boolean {
    this.assert(ctx, a); this.assert(ctx, b);
    return a.coefficients.length === b.coefficients.length
      && a.coefficients.every((c, i) => this.domain.equal(ctx, c, b.coefficients[i]));
  }

  add(ctx: ExecutionContext, a: Polynomial<E>, b: Polynomial<E>): Polynomial<E> {
    this.assert(ctx, a); this.assert(ctx, b);
    return this.make(ctx, addArrays(this.domain, ctx, a.coefficients, b.coefficients));
  }

  negate(ctx: ExecutionContext, a: Polynomial<E>): Polynomial<E> {
    this.assert(ctx, a);
    return this.make(ctx, a.coefficients.map(c => this.domain.negate(ctx, c)));
  }

  subtract(ctx: ExecutionContext, a: Polynomial<E>, b: Polynomial<E>): Polynomial<E> {
    this.assert(ctx, a); this.assert(ctx, b);
    return this.make(ctx, subArrays(this.domain, ctx, a.coefficients, b.coefficients));
  }

  scale(ctx: ExecutionContext, a: Polynomial<E>, c: E): Polynomial<E> {
    this.assert(ctx, a); this.domain.assert(ctx, c);
    return this.make(ctx, a.coefficients.map(v => this.domain.multiply(ctx, v, c)));
  }

  /** Exact division of every coefficient by a scalar. */
  divideScalar(ctx: ExecutionContext, a: Polynomial<E>, c: E): Polynomial<E> {
    this.assert(ctx, a); this.domain.assert(ctx, c);
    return this.make(ctx, a.coefficients.map(v => this.domain.exactDivide(ctx, v, c)));
  }

  multiply(ctx: ExecutionContext, a: Polynomial<E>, b: Polynomial<E>): Polynomial<E> {
    this.assert(ctx, a); this.assert(ctx, b);
    return this.make(ctx, multiplyArrays(this.domain, ctx, a.coefficients, b.coefficients));
  }

  power(ctx: ExecutionContext, a: Polynomial<E>, exponent: number): Polynomial<E> {
    demand(Number.isSafeInteger(exponent) && exponent >= 0, 'invalid-input', 'polynomial exponent');
    let result = this.one(ctx), base = a, e = exponent;
    while (e > 0) {
      ctx.tick();
      if (e % 2 === 1) result = this.multiply(ctx, result, base);
      e = Math.floor(e / 2);
      if (e > 0) base = this.multiply(ctx, base, base);
    }
    return result;
  }

  /** Multiply by x^k. */
  shift(ctx: ExecutionContext, a: Polynomial<E>, k: number): Polynomial<E> {
    this.assert(ctx, a);
    demand(Number.isSafeInteger(k) && k >= 0, 'invalid-input', 'shift amount');
    if (a.coefficients.length === 0) return a;
    ctx.allocate(k);
    const zero = this.domain.fromInteger(ctx, 0n);
    return this.make(ctx, [...Array<E>(k).fill(zero), ...a.coefficients]);
  }

  derivative(ctx: ExecutionContext, a: Polynomial<E>): Polynomial<E> {
    this.assert(ctx, a);
    return this.make(ctx, a.coefficients.slice(1).map((c, i) => this.domain.multiply(ctx, c, this.domain.fromInteger(ctx, BigInt(i + 1)))));
  }

  /** Horner evaluation at a domain element. */
  evaluate(ctx: ExecutionContext, a: Polynomial<E>, x: E): E {
    this.assert(ctx, a); this.domain.assert(ctx, x);
    let acc = this.domain.fromInteger(ctx, 0n);
    for (let i = a.coefficients.length - 1; i >= 0; i--) acc = this.domain.add(ctx, this.domain.multiply(ctx, acc, x), a.coefficients[i]);
    return acc;
  }
}

function addArrays<E>(d: ExactDomain<E>, ctx: ExecutionContext, a: readonly E[], b: readonly E[]): E[] {
  const n = Math.max(a.length, b.length);
  ctx.allocate(n);
  const out: E[] = [];
  for (let i = 0; i < n; i++) out.push(i >= a.length ? b[i] : i >= b.length ? a[i] : d.add(ctx, a[i], b[i]));
  return out;
}

function subArrays<E>(d: ExactDomain<E>, ctx: ExecutionContext, a: readonly E[], b: readonly E[]): E[] {
  const n = Math.max(a.length, b.length);
  ctx.allocate(n);
  const out: E[] = [];
  for (let i = 0; i < n; i++) out.push(i >= a.length ? d.negate(ctx, b[i]) : i >= b.length ? a[i] : d.subtract(ctx, a[i], b[i]));
  return out;
}

function schoolbook<E>(d: ExactDomain<E>, ctx: ExecutionContext, a: readonly E[], b: readonly E[]): E[] {
  const n = a.length + b.length - 1;
  ctx.allocate(n);
  const zero = d.fromInteger(ctx, 0n);
  const out = Array<E>(n).fill(zero);
  for (let i = 0; i < a.length; i++) {
    if (d.isZero(ctx, a[i])) continue;
    for (let j = 0; j < b.length; j++) out[i + j] = d.add(ctx, out[i + j], d.multiply(ctx, a[i], b[j]));
  }
  return out;
}

/** Karatsuba multiplication on raw coefficient arrays; results may carry trailing zeros. */
export function multiplyArrays<E>(d: ExactDomain<E>, ctx: ExecutionContext, a: readonly E[], b: readonly E[]): E[] {
  if (a.length === 0 || b.length === 0) return [];
  if (Math.min(a.length, b.length) < KARATSUBA_THRESHOLD) return schoolbook(d, ctx, a, b);
  const m = Math.floor(Math.max(a.length, b.length) / 2);
  const a0 = a.slice(0, m), a1 = a.slice(m), b0 = b.slice(0, m), b1 = b.slice(m);
  ctx.allocate(a.length + b.length);
  const z0 = multiplyArrays(d, ctx, a0, b0);
  const z2 = multiplyArrays(d, ctx, a1, b1);
  const z1 = subArrays(d, ctx, subArrays(d, ctx, multiplyArrays(d, ctx, addArrays(d, ctx, a0, a1), addArrays(d, ctx, b0, b1)), z0), z2);
  const n = a.length + b.length - 1;
  ctx.allocate(n);
  const zero = d.fromInteger(ctx, 0n);
  const out = Array<E>(n).fill(zero);
  const place = (src: readonly E[], offset: number) => {
    for (let i = 0; i < src.length; i++) if (i + offset < n) out[i + offset] = d.add(ctx, out[i + offset], src[i]);
  };
  place(z0, 0); place(z1, m); place(z2, 2 * m);
  return out;
}
