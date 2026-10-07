import { demand, type ExecutionContext } from './execution';
import { FactorModularRing } from './factorization-modular';

export interface FactorLocalTerm { readonly powers: readonly number[]; readonly coefficient: bigint }
export interface FactorLocalPolynomial { readonly ring: FactorLocalRing; readonly terms: readonly FactorLocalTerm[] }
/** Z/(p^k)[z,Y]/(Y_i^(d_i+1)). This owned truncated algebra has no field capability. */
export class FactorLocalRing {
  readonly modulus: bigint;
  readonly degrees: readonly number[];
  readonly scalars: FactorModularRing;
  #values = new WeakSet<object>();
  constructor(ctx: ExecutionContext, modulus: bigint, degrees: readonly number[]) {
    ctx.allocate(degrees.length + 4); for (const d of degrees) { ctx.degree(d); demand(d >= 0, 'invalid-input', 'local partial degree'); }
    this.modulus = modulus; this.degrees = Object.freeze([...degrees]); this.scalars = new FactorModularRing(ctx, modulus); Object.freeze(this);
  }
  assert(ctx: ExecutionContext, p: FactorLocalPolynomial) {
    ctx.tick(); demand(p !== null && typeof p === 'object' && this.#values.has(p), 'domain-mismatch', 'local factor ring');
    for (const t of p.terms) { ctx.integer(t.coefficient); for (const n of t.powers) ctx.degree(n); }
  }
  make(ctx: ExecutionContext, ts: readonly FactorLocalTerm[]): FactorLocalPolynomial {
    demand(Array.isArray(ts), 'invalid-input', 'local factor terms'); ctx.allocate(ts.length * (this.degrees.length + 5) + 2);
    const entries = new Map<string, FactorLocalTerm>();
    for (const t of ts) {
      demand(Array.isArray(t.powers) && t.powers.length === this.degrees.length + 1, 'invalid-input', 'local coordinates');
      t.powers.forEach((n: number) => { ctx.degree(n); demand(n >= 0, 'invalid-input', 'negative local power'); });
      demand(t.powers.slice(1).every((n: number, i: number) => n <= this.degrees[i]), 'invalid-input', 'untruncated local term');
      ctx.allocate(t.powers.length * 20 + 2); const key = t.powers.join(','), prior = entries.get(key);
      const c = this.scalars.residue(ctx, prior ? ctx.add(prior.coefficient, t.coefficient) : t.coefficient);
      if (c) entries.set(key, Object.freeze({powers: Object.freeze([...t.powers]), coefficient: c})); else entries.delete(key);
    }
    const terms = [...entries.values()]; terms.sort((a, b) => { for (let i = 0; i < a.powers.length; i++) { ctx.tick(); if (a.powers[i] !== b.powers[i]) return b.powers[i] - a.powers[i]; } return 0; });
    const value = Object.freeze({ring: this, terms: Object.freeze(terms)}); this.#values.add(value); return value;
  }
  bind(ctx: ExecutionContext, ts: readonly FactorLocalTerm[]) {
    const p = this.make(ctx, ts);
    demand(ts.length === p.terms.length && ts.every((t, i) => t.coefficient === p.terms[i].coefficient
      && t.powers.every((n, j) => n === p.terms[i].powers[j])), 'invalid-input', 'noncanonical local polynomial'); return p;
  }
  constant(ctx: ExecutionContext, c: bigint) { return this.make(ctx, [{powers: Array(this.degrees.length + 1).fill(0), coefficient: c}]); }
  one(ctx: ExecutionContext) { return this.constant(ctx, 1n); }
  equal(ctx: ExecutionContext, a: FactorLocalPolynomial, b: FactorLocalPolynomial) {
    this.assert(ctx, a); this.assert(ctx, b); return a.terms.length === b.terms.length && a.terms.every((t, i) => {
      ctx.tick(t.powers.length + 1); return t.coefficient === b.terms[i].coefficient && t.powers.every((n, j) => n === b.terms[i].powers[j]); });
  }
  add(ctx: ExecutionContext, a: FactorLocalPolynomial, b: FactorLocalPolynomial) {
    this.assert(ctx, a); this.assert(ctx, b); ctx.allocate(a.terms.length + b.terms.length); return this.make(ctx, [...a.terms, ...b.terms]);
  }
  scale(ctx: ExecutionContext, a: FactorLocalPolynomial, c: bigint) {
    this.assert(ctx, a); ctx.allocate(a.terms.length * 2); return this.make(ctx, a.terms.map(t => ({powers: t.powers, coefficient: this.scalars.times(ctx, t.coefficient, c)})));
  }
  subtract(ctx: ExecutionContext, a: FactorLocalPolynomial, b: FactorLocalPolynomial) { return this.add(ctx, a, this.scale(ctx, b, -1n)); }
  multiply(ctx: ExecutionContext, a: FactorLocalPolynomial, b: FactorLocalPolynomial) {
    this.assert(ctx, a); this.assert(ctx, b); ctx.allocate(a.terms.length * b.terms.length * (this.degrees.length + 3)); const ts: FactorLocalTerm[] = [];
    for (const s of a.terms) for (const t of b.terms) {
      ctx.tick(this.degrees.length + 1); const powers = s.powers.map((n, i) => n + t.powers[i]);
      if (powers.slice(1).some((n, i) => n > this.degrees[i])) continue;
      ctx.degree(powers[0]); ts.push({powers, coefficient: this.scalars.times(ctx, s.coefficient, t.coefficient)});
    }
    return this.make(ctx, ts);
  }
  univariate(ctx: ExecutionContext, cs: readonly bigint[], powers: readonly number[]) {
    ctx.allocate(cs.length * (powers.length + 2)); return this.make(ctx, cs.map((c, i) => ({powers: [i, ...powers], coefficient: c})));
  }
  coefficient(ctx: ExecutionContext, p: FactorLocalPolynomial, powers: readonly number[]): readonly bigint[] {
    this.assert(ctx, p); ctx.allocate(p.terms.length);
    const cs: bigint[] = [];
    for (const t of p.terms) if (t.powers.slice(1).every((n, i) => n === powers[i])) {
      ctx.allocate(Math.max(0, t.powers[0] + 1 - cs.length)); while (cs.length <= t.powers[0]) cs.push(0n); cs[t.powers[0]] = t.coefficient;
    }
    return Object.freeze(cs);
  }
  inverseCoefficient(ctx: ExecutionContext, p: FactorLocalPolynomial): FactorLocalPolynomial {
    this.assert(ctx, p); demand(p.terms.every(t => t.powers[0] === 0), 'verification-failed', 'local coefficient inverse');
    const zero = Array(this.degrees.length).fill(0), c = this.coefficient(ctx, p, zero)[0] ?? 0n, scalar = this.scalars.inverse(ctx, c);
    const h = this.subtract(ctx, this.one(ctx), this.scale(ctx, p, scalar)); let term = this.one(ctx), out = term;
    let nilpotence = 0; for (const d of this.degrees) { ctx.tick(); demand(Number.isSafeInteger(nilpotence + d), 'invalid-input', 'local degree sum'); nilpotence += d; }
    for (let i = 1; i <= nilpotence; i++) { term = this.multiply(ctx, term, h); if (!term.terms.length) break; out = this.add(ctx, out, term); }
    out = this.scale(ctx, out, scalar);
    demand(this.equal(ctx, this.multiply(ctx, p, out), this.one(ctx)), 'verification-failed', 'local coefficient inverse identity'); return out;
  }
}
/** Box indices stream in increasing total degree, without a tensor-sized allocation. */
export function* factorLocalIndices(ctx: ExecutionContext, degrees: readonly number[]): Generator<readonly number[]> {
  let total = 0; for (const d of degrees) { ctx.degree(d); demand(Number.isSafeInteger(total + d), 'invalid-input', 'local degree sum'); total += d; }
  function* visit(i: number, rest: number, prefix: readonly number[]): Generator<readonly number[]> {
    ctx.tick(); if (i === degrees.length) { if (!rest) { ctx.allocate(prefix.length); yield Object.freeze([...prefix]); } return; }
    for (let n = 0; n <= Math.min(degrees[i], rest); n++) { ctx.allocate(prefix.length + 1); yield* visit(i + 1, rest - n, [...prefix, n]); }
  }
  for (let n = 1; n <= total; n++) yield* visit(0, n, []);
}
