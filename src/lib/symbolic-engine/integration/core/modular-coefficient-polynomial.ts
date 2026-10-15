/** Private positive-characteristic polynomial mechanics. Coefficient quotients
 * may have zero divisors; every division checks an actual unit inverse. */
import {demand, type ExecutionContext} from './execution';

export interface ModularCoefficientRing<E> {
  readonly characteristic: bigint;
  assert(ctx: ExecutionContext, value: E): void;
  zero(ctx: ExecutionContext): E;
  one(ctx: ExecutionContext): E;
  isZero(ctx: ExecutionContext, value: E): boolean;
  equal(ctx: ExecutionContext, a: E, b: E): boolean;
  add(ctx: ExecutionContext, a: E, b: E): E;
  negate(ctx: ExecutionContext, a: E): E;
  multiply(ctx: ExecutionContext, a: E, b: E): E;
  inverse(ctx: ExecutionContext, value: E): E | null;
}
export interface ModularCoefficientPolynomial<E> {
  readonly ring: ModularCoefficientPolynomialRing<E>;
  readonly coefficients: readonly E[];
}
export interface ModularCoefficientBezout<E> {
  readonly gcd: ModularCoefficientPolynomial<E>;
  readonly s: ModularCoefficientPolynomial<E>;
  readonly t: ModularCoefficientPolynomial<E>;
}
export class ModularCoefficientPolynomialRing<E> {
  readonly coefficients: ModularCoefficientRing<E>;
  #values = new WeakSet<object>();
  constructor(ctx: ExecutionContext, coefficients: ModularCoefficientRing<E>) {
    ctx.integer(coefficients.characteristic); demand(coefficients.characteristic > 1n, 'invalid-input', 'positive characteristic');
    ctx.allocate(3); this.coefficients = coefficients; Object.freeze(this);
  }
  assert(ctx: ExecutionContext, p: ModularCoefficientPolynomial<E>): void {
    ctx.tick(); demand(p !== null && typeof p === 'object' && this.#values.has(p), 'domain-mismatch', 'owned modular coefficient polynomial');
    ctx.degree(p.coefficients.length - 1); for (const c of p.coefficients) this.coefficients.assert(ctx, c);
  }
  make(ctx: ExecutionContext, coefficients: readonly E[]): ModularCoefficientPolynomial<E> {
    demand(Array.isArray(coefficients), 'invalid-input', 'modular coefficient array');
    ctx.degree(coefficients.length - 1); ctx.allocate(coefficients.length + 2);
    const cs = [...coefficients]; for (const c of cs) this.coefficients.assert(ctx, c);
    while (cs.length && this.coefficients.isZero(ctx, cs.at(-1)!)) {ctx.tick(); cs.pop();}
    const value = Object.freeze({ring: this, coefficients: Object.freeze(cs)}); this.#values.add(value); return value;
  }
  equal(ctx: ExecutionContext, a: ModularCoefficientPolynomial<E>, b: ModularCoefficientPolynomial<E>): boolean {
    this.assert(ctx, a); this.assert(ctx, b);
    return a.coefficients.length === b.coefficients.length && a.coefficients.every((c, i) => this.coefficients.equal(ctx, c, b.coefficients[i]));
  }
  add(ctx: ExecutionContext, a: ModularCoefficientPolynomial<E>, b: ModularCoefficientPolynomial<E>) {
    this.assert(ctx, a); this.assert(ctx, b); const size = Math.max(a.coefficients.length, b.coefficients.length);
    ctx.allocate(size); const zero = this.coefficients.zero(ctx);
    return this.make(ctx, Array.from({length: size}, (_, i) => this.coefficients.add(ctx, a.coefficients[i] ?? zero, b.coefficients[i] ?? zero)));
  }
  scale(ctx: ExecutionContext, a: ModularCoefficientPolynomial<E>, scalar: E) {
    this.assert(ctx, a); this.coefficients.assert(ctx, scalar); ctx.allocate(a.coefficients.length);
    return this.make(ctx, a.coefficients.map(c => this.coefficients.multiply(ctx, c, scalar)));
  }
  subtract(ctx: ExecutionContext, a: ModularCoefficientPolynomial<E>, b: ModularCoefficientPolynomial<E>) {
    return this.add(ctx, a, this.scale(ctx, b, this.coefficients.negate(ctx, this.coefficients.one(ctx))));
  }
  multiply(ctx: ExecutionContext, a: ModularCoefficientPolynomial<E>, b: ModularCoefficientPolynomial<E>) {
    this.assert(ctx, a); this.assert(ctx, b);
    if (!a.coefficients.length || !b.coefficients.length) return this.make(ctx, []);
    const size = a.coefficients.length + b.coefficients.length - 1; ctx.degree(size - 1); ctx.allocate(size);
    const cs = Array<E>(size).fill(this.coefficients.zero(ctx));
    for (let i = 0; i < a.coefficients.length; i++) for (let j = 0; j < b.coefficients.length; j++) {
      ctx.tick(); cs[i + j] = this.coefficients.add(ctx, cs[i + j], this.coefficients.multiply(ctx, a.coefficients[i], b.coefficients[j]));
    }
    return this.make(ctx, cs);
  }
  divide(ctx: ExecutionContext, a: ModularCoefficientPolynomial<E>, b: ModularCoefficientPolynomial<E>) {
    this.assert(ctx, a); this.assert(ctx, b); demand(b.coefficients.length > 0, 'division-by-zero', 'modular coefficient polynomial');
    const inverse = this.coefficients.inverse(ctx, b.coefficients.at(-1)!); if (inverse === null) return null;
    const size = Math.max(0, a.coefficients.length - b.coefficients.length + 1); ctx.allocate(size + a.coefficients.length + 2);
    const quotient = Array<E>(size).fill(this.coefficients.zero(ctx)), remainder = [...a.coefficients];
    while (remainder.length >= b.coefficients.length) {
      ctx.tick(); const offset = remainder.length - b.coefficients.length, c = this.coefficients.multiply(ctx, remainder.at(-1)!, inverse); quotient[offset] = c;
      for (let i = 0; i < b.coefficients.length; i++) remainder[offset + i] = this.coefficients.add(ctx, remainder[offset + i], this.coefficients.negate(ctx, this.coefficients.multiply(ctx, c, b.coefficients[i])));
      while (remainder.length && this.coefficients.isZero(ctx, remainder.at(-1)!)) {ctx.tick(); remainder.pop();}
    }
    return Object.freeze({quotient: this.make(ctx, quotient), remainder: this.make(ctx, remainder)});
  }
  multiplyMod(ctx: ExecutionContext, a: ModularCoefficientPolynomial<E>, b: ModularCoefficientPolynomial<E>, modulus: ModularCoefficientPolynomial<E>) {
    this.assert(ctx, a); this.assert(ctx, b); this.assert(ctx, modulus);
    const reduced = this.divide(ctx, a, modulus); if (reduced === null) return null;
    let out = this.make(ctx, []);
    for (let i = b.coefficients.length - 1; i >= 0; i--) {
      ctx.tick(); ctx.allocate(out.coefficients.length + 1);
      const shifted = this.divide(ctx, this.make(ctx, [this.coefficients.zero(ctx), ...out.coefficients]), modulus); if (shifted === null) return null;
      out = this.add(ctx, shifted.remainder, this.scale(ctx, reduced.remainder, b.coefficients[i]));
    }
    return out;
  }
  bezout(ctx: ExecutionContext, a: ModularCoefficientPolynomial<E>, b: ModularCoefficientPolynomial<E>): ModularCoefficientBezout<E> | null {
    this.assert(ctx, a); this.assert(ctx, b);
    let previous = a, current = b, s = this.make(ctx, [this.coefficients.one(ctx)]), ns = this.make(ctx, []);
    let t = this.make(ctx, []), nt = s;
    while (current.coefficients.length) {
      const division = this.divide(ctx, previous, current); if (division === null) return null;
      const ss = this.subtract(ctx, s, this.multiply(ctx, division.quotient, ns));
      const tt = this.subtract(ctx, t, this.multiply(ctx, division.quotient, nt));
      previous = current; current = division.remainder; s = ns; ns = ss; t = nt; nt = tt;
    }
    if (previous.coefficients.length) {
      const inverse = this.coefficients.inverse(ctx, previous.coefficients.at(-1)!); if (inverse === null) return null;
      previous = this.scale(ctx, previous, inverse); s = this.scale(ctx, s, inverse); t = this.scale(ctx, t, inverse);
    }
    ctx.allocate(3); const proof = Object.freeze({gcd: previous, s, t}); this.verifyBezout(ctx, a, b, proof); return proof;
  }
  verifyBezout(ctx: ExecutionContext, a: ModularCoefficientPolynomial<E>, b: ModularCoefficientPolynomial<E>, proof: ModularCoefficientBezout<E>): void {
    for (const p of [a, b, proof.gcd, proof.s, proof.t]) this.assert(ctx, p);
    const size = Math.max(proof.gcd.coefficients.length,
      proof.s.coefficients.length && a.coefficients.length ? proof.s.coefficients.length + a.coefficients.length - 1 : 0,
      proof.t.coefficients.length && b.coefficients.length ? proof.t.coefficients.length + b.coefficients.length - 1 : 0);
    demand(Number.isSafeInteger(size), 'invalid-input', 'modular identity coverage');
    // Check complete coefficient coverage without constructing a polynomial of
    // artificial degree deg(s)+deg(a). Only actual residues are constructed.
    for (let k = 0; k < size; k++) {
      ctx.tick(); let value = this.coefficients.zero(ctx);
      for (let term = 0; term < 2; term++) {
        ctx.tick(); const left = term === 0 ? proof.s : proof.t, right = term === 0 ? a : b;
        for (let i = Math.max(0, k + 1 - right.coefficients.length); i <= Math.min(k, left.coefficients.length - 1); i++)
          value = this.coefficients.add(ctx, value, this.coefficients.multiply(ctx, left.coefficients[i], right.coefficients[k - i]));
      }
      demand(this.coefficients.equal(ctx, value, proof.gcd.coefficients[k] ?? this.coefficients.zero(ctx)), 'verification-failed', 'modular coefficient Bezout identity');
    }
    if (!proof.gcd.coefficients.length) demand(!a.coefficients.length && !b.coefficients.length, 'verification-failed', 'modular zero gcd');
    else {
      demand(this.coefficients.equal(ctx, proof.gcd.coefficients.at(-1)!, this.coefficients.one(ctx)), 'verification-failed', 'modular monic gcd');
      for (const value of [a, b]) {
        const division = this.divide(ctx, value, proof.gcd);
        demand(division !== null && division.remainder.coefficients.length === 0, 'verification-failed', 'modular gcd exact division');
      }
    }
  }
}
