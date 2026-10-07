import { demand, type ExecutionContext } from './execution';

/** Private positive-characteristic arithmetic; deliberately not an ExactField. */
export interface FactorModularPolynomial {
  readonly ring: FactorModularRing;
  readonly coefficients: readonly bigint[];
}
export interface FactorModularBezout {
  readonly gcd: readonly bigint[];
  readonly s: readonly bigint[];
  readonly t: readonly bigint[];
}
const rings = new WeakSet<object>();

export function verifyFactorPrime(ctx: ExecutionContext, p: bigint): void {
  demand(isFactorPrime(ctx, p), 'verification-failed', 'factorization prime');
}
export function isFactorPrime(ctx: ExecutionContext, p: bigint): boolean {
  ctx.integer(p); if (p < 2n) return false;
  for (let d = 2n; ctx.multiply(d, d) <= p; d = ctx.add(d, 1n)) {
    if (ctx.remainder(p, d) === 0n) return false;
  }
  return true;
}

export class FactorModularRing {
  readonly modulus: bigint;
  #values = new WeakSet<object>();
  constructor(ctx: ExecutionContext, modulus: bigint) {
    ctx.integer(modulus); demand(modulus > 1n, 'invalid-input', 'modular ring modulus');
    ctx.allocate(5); this.modulus = modulus; rings.add(this);
    if (new.target === FactorModularRing) Object.freeze(this);
  }
  residue(ctx: ExecutionContext, a: bigint): bigint {
    const r = ctx.remainder(a, this.modulus); return r < 0n ? ctx.add(r, this.modulus) : r;
  }
  plus(ctx: ExecutionContext, a: bigint, b: bigint) { return this.residue(ctx, ctx.add(a, b)); }
  times(ctx: ExecutionContext, a: bigint, b: bigint) { return this.residue(ctx, ctx.multiply(a, b)); }
  inverse(ctx: ExecutionContext, a: bigint): bigint {
    let r = this.modulus, next = this.residue(ctx, a), s = 0n, ns = 1n;
    while (next) {
      const q = ctx.quotient(r, next), nr = ctx.add(r, -ctx.multiply(q, next));
      const t = ctx.add(s, -ctx.multiply(q, ns)); r = next; next = nr; s = ns; ns = t;
    }
    demand(r === 1n, 'nonexact-division', 'nonunit in modular ring');
    const result = this.residue(ctx, s);
    demand(this.times(ctx, a, result) === 1n, 'verification-failed', 'modular inverse identity');
    return result;
  }
  assert(ctx: ExecutionContext, p: FactorModularPolynomial): void {
    ctx.tick(); demand(rings.has(this) && p !== null && typeof p === 'object' && this.#values.has(p),
      'domain-mismatch', 'owned modular polynomial');
    ctx.degree(p.coefficients.length - 1);
    for (const c of p.coefficients) ctx.integer(c);
  }
  make(ctx: ExecutionContext, cs: readonly bigint[]): FactorModularPolynomial {
    demand(Array.isArray(cs), 'invalid-input', 'modular polynomial coefficients');
    ctx.degree(cs.length - 1); ctx.allocate(cs.length + 2);
    const out = cs.map(c => this.residue(ctx, c));
    while (out.length && out[out.length - 1] === 0n) out.pop();
    const p = Object.freeze({ring: this, coefficients: Object.freeze(out)}); this.#values.add(p); return p;
  }
  /** Bind untrusted evidence only after checking its canonical representation. */
  bind(ctx: ExecutionContext, cs: readonly bigint[]) {
    demand(Array.isArray(cs), 'verification-failed', 'modular evidence coefficients');
    ctx.degree(cs.length - 1);
    for (const c of cs) { ctx.integer(c); demand(c >= 0n && c < this.modulus, 'verification-failed', 'noncanonical residue'); }
    demand(!cs.length || cs[cs.length - 1] !== 0n, 'verification-failed', 'modular trailing zero');
    return this.make(ctx, cs);
  }
  one(ctx: ExecutionContext) { return this.make(ctx, [1n]); }
  zero(ctx: ExecutionContext) { return this.make(ctx, []); }
  x(ctx: ExecutionContext) { return this.make(ctx, [0n, 1n]); }
  equal(ctx: ExecutionContext, a: FactorModularPolynomial, b: FactorModularPolynomial): boolean {
    this.assert(ctx, a); this.assert(ctx, b);
    return a.coefficients.length === b.coefficients.length && a.coefficients.every((c, i) => { ctx.tick(); return c === b.coefficients[i]; });
  }
  add(ctx: ExecutionContext, a: FactorModularPolynomial, b: FactorModularPolynomial) {
    this.assert(ctx, a); this.assert(ctx, b);
    const size = Math.max(a.coefficients.length, b.coefficients.length); ctx.allocate(size);
    const cs: bigint[] = [];
    for (let i = 0; i < size; i++) cs.push(this.plus(ctx, a.coefficients[i] ?? 0n, b.coefficients[i] ?? 0n));
    return this.make(ctx, cs);
  }
  scale(ctx: ExecutionContext, a: FactorModularPolynomial, scalar: bigint) {
    this.assert(ctx, a); ctx.allocate(a.coefficients.length);
    return this.make(ctx, a.coefficients.map(c => this.times(ctx, c, scalar)));
  }
  subtract(ctx: ExecutionContext, a: FactorModularPolynomial, b: FactorModularPolynomial) {
    return this.add(ctx, a, this.scale(ctx, b, -1n));
  }
  multiply(ctx: ExecutionContext, a: FactorModularPolynomial, b: FactorModularPolynomial) {
    this.assert(ctx, a); this.assert(ctx, b);
    if (!a.coefficients.length || !b.coefficients.length) return this.zero(ctx);
    const size = a.coefficients.length + b.coefficients.length - 1; ctx.degree(size - 1); ctx.allocate(size);
    const cs = Array<bigint>(size).fill(0n);
    for (let i = 0; i < a.coefficients.length; i++) for (let j = 0; j < b.coefficients.length; j++)
      cs[i + j] = this.plus(ctx, cs[i + j], this.times(ctx, a.coefficients[i], b.coefficients[j]));
    return this.make(ctx, cs);
  }
  divide(ctx: ExecutionContext, a: FactorModularPolynomial, b: FactorModularPolynomial) {
    this.assert(ctx, a); this.assert(ctx, b); demand(b.coefficients.length > 0, 'division-by-zero', 'modular polynomial');
    const size = Math.max(0, a.coefficients.length - b.coefficients.length + 1);
    ctx.allocate(size + a.coefficients.length); const q = Array<bigint>(size).fill(0n), r = [...a.coefficients];
    const inv = this.inverse(ctx, b.coefficients[b.coefficients.length - 1]);
    while (r.length >= b.coefficients.length) {
      const offset = r.length - b.coefficients.length, c = this.times(ctx, r[r.length - 1], inv); q[offset] = c;
      for (let j = 0; j < b.coefficients.length; j++) r[offset + j] = this.plus(ctx, r[offset + j], -this.times(ctx, c, b.coefficients[j]));
      while (r.length && r[r.length - 1] === 0n) { ctx.tick(); r.pop(); }
    }
    return Object.freeze({quotient: this.make(ctx, q), remainder: this.make(ctx, r)});
  }
  derivative(ctx: ExecutionContext, a: FactorModularPolynomial) {
    this.assert(ctx, a); ctx.allocate(a.coefficients.length);
    return this.make(ctx, a.coefficients.slice(1).map((c, i) => this.times(ctx, c, BigInt(i + 1))));
  }
  monic(ctx: ExecutionContext, a: FactorModularPolynomial) {
    this.assert(ctx, a); demand(a.coefficients.length > 0, 'invalid-input', 'modular monic zero');
    return this.scale(ctx, a, this.inverse(ctx, a.coefficients[a.coefficients.length - 1]));
  }
  /** Reduce during multiplication: never construct an artificial degree 2*deg(f). */
  multiplyMod(ctx: ExecutionContext, a: FactorModularPolynomial, b: FactorModularPolynomial, f: FactorModularPolynomial) {
    this.assert(ctx, a); this.assert(ctx, b); this.assert(ctx, f);
    let out = this.zero(ctx); const ar = this.divide(ctx, a, f).remainder;
    for (let i = b.coefficients.length - 1; i >= 0; i--) {
      ctx.tick(); ctx.allocate(out.coefficients.length + 1);
      out = this.divide(ctx, this.make(ctx, [0n, ...out.coefficients]), f).remainder;
      out = this.add(ctx, out, this.scale(ctx, ar, b.coefficients[i]));
    }
    return out;
  }
  powMod(ctx: ExecutionContext, a: FactorModularPolynomial, exponent: bigint, f: FactorModularPolynomial) {
    ctx.integer(exponent); demand(exponent >= 0n, 'invalid-input', 'modular exponent');
    let n = exponent, base = this.divide(ctx, a, f).remainder, out = this.divide(ctx, this.one(ctx), f).remainder;
    while (n) {
      if (ctx.remainder(n, 2n)) out = this.multiplyMod(ctx, out, base, f);
      n = ctx.quotient(n, 2n); if (n) base = this.multiplyMod(ctx, base, base, f);
    }
    return out;
  }
}

/** Construction checks primality; composite and truncated rings stay separate. */
export class FactorPrimeField extends FactorModularRing {
  readonly capability = 'field' as const;
  constructor(ctx: ExecutionContext, prime: bigint) { verifyFactorPrime(ctx, prime); super(ctx, prime); Object.freeze(this); }
}

export function modularBezout(ctx: ExecutionContext, field: FactorPrimeField,
  a: FactorModularPolynomial, b: FactorModularPolynomial): FactorModularBezout {
  let r = a, nr = b, s = field.one(ctx), ns = field.zero(ctx), t = field.zero(ctx), nt = field.one(ctx);
  while (nr.coefficients.length) {
    const d = field.divide(ctx, r, nr), ss = field.subtract(ctx, s, field.multiply(ctx, d.quotient, ns));
    const tt = field.subtract(ctx, t, field.multiply(ctx, d.quotient, nt));
    r = nr; nr = d.remainder; s = ns; ns = ss; t = nt; nt = tt;
  }
  if (r.coefficients.length) {
    const inv = field.inverse(ctx, r.coefficients[r.coefficients.length - 1]);
    r = field.scale(ctx, r, inv); s = field.scale(ctx, s, inv); t = field.scale(ctx, t, inv);
  }
  const proof = Object.freeze({gcd: r.coefficients, s: s.coefficients, t: t.coefficients});
  verifyModularBezout(ctx, field, a, b, proof); return proof;
}
export function verifyModularBezout(ctx: ExecutionContext, field: FactorPrimeField,
  a: FactorModularPolynomial, b: FactorModularPolynomial, proof: FactorModularBezout): void {
  const g = field.bind(ctx, proof.gcd), s = field.bind(ctx, proof.s), t = field.bind(ctx, proof.t);
  demand(field.equal(ctx, field.add(ctx, field.multiply(ctx, s, a), field.multiply(ctx, t, b)), g),
    'verification-failed', 'modular Bezout reconstruction');
  if (!g.coefficients.length) demand(!a.coefficients.length && !b.coefficients.length, 'verification-failed', 'modular zero GCD');
  else {
    demand(g.coefficients[g.coefficients.length - 1] === 1n, 'verification-failed', 'modular GCD normalization');
    for (const v of [a, b]) demand(field.divide(ctx, v, g).remainder.coefficients.length === 0,
      'verification-failed', 'modular GCD division');
  }
}
