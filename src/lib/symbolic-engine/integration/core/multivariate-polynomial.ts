import { demand, type ExecutionContext } from './execution';
import { requireField, type ExactField } from './field';

export interface MultivariateTerm<E> {
  readonly powers: readonly number[];
  readonly coefficient: E;
}
export interface MultivariatePolynomial<E> {
  readonly ring: MultivariateRing<E>;
  /** Descending lexicographic order, first coordinate outermost. */
  readonly terms: readonly MultivariateTerm<E>[];
}

function compare(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return 0;
}
const rings = new WeakSet<object>();
export function assertMultivariateRing(ctx: ExecutionContext, ring: unknown): asserts ring is MultivariateRing<unknown> {
  ctx.tick(); demand(ring instanceof MultivariateRing && rings.has(ring), 'domain-mismatch', 'multivariate ring owner');
}

/** Private sparse working ring. Arity is ownership, never a printed-name match. */
export class MultivariateRing<E> {
  readonly field: ExactField<E>;
  readonly arity: number;
  readonly lower: MultivariateRing<E> | undefined;
  #owned = new WeakSet<object>();
  constructor(ctx: ExecutionContext, field: ExactField<E>, arity: number, lower?: MultivariateRing<E>) {
    requireField(field);
    demand(Number.isSafeInteger(arity) && arity >= 0, 'invalid-input', 'multivariate arity');
    demand(arity === 0 ? lower === undefined : lower !== undefined && rings.has(lower) && lower.arity === arity - 1 && lower.field === field,
      'domain-mismatch', 'multivariate coefficient ring');
    ctx.allocate(4); this.field = field; this.arity = arity; this.lower = lower; rings.add(this); Object.freeze(this);
  }
  static create<E>(ctx: ExecutionContext, field: ExactField<E>, arity: number): MultivariateRing<E> {
    demand(Number.isSafeInteger(arity) && arity >= 0, 'invalid-input', 'multivariate arity');
    ctx.allocate(arity + 1);
    let ring = new MultivariateRing(ctx, field, 0);
    for (let i = 1; i <= arity; i++) { ctx.tick(); ring = new MultivariateRing(ctx, field, i, ring); }
    return ring;
  }
  assert(ctx: ExecutionContext, value: MultivariatePolynomial<E>): void {
    ctx.tick();
    demand(value !== null && typeof value === 'object' && this.#owned.has(value), 'domain-mismatch', 'multivariate polynomial');
    for (const term of value.terms) {
      ctx.tick(); this.field.assert(ctx, term.coefficient);
      for (const n of term.powers) ctx.degree(n);
    }
  }
  make(ctx: ExecutionContext, terms: readonly MultivariateTerm<E>[]): MultivariatePolynomial<E> {
    demand(Array.isArray(terms), 'invalid-input', 'multivariate terms');
    ctx.allocate(terms.length * (this.arity + 4) + 3);
    const map = new Map<string, {powers: readonly number[]; coefficient: E}>();
    for (const term of terms) {
      ctx.tick();
      demand(term !== null && typeof term === 'object' && Array.isArray(term.powers)
        && term.powers.length === this.arity, 'invalid-input', 'multivariate exponents');
      for (const n of term.powers) { demand(n >= 0, 'invalid-input', 'negative polynomial exponent'); ctx.degree(n); }
      this.field.assert(ctx, term.coefficient);
      ctx.allocate(this.arity * 20 + 1);
      const key = term.powers.join(','); const previous = map.get(key);
      const coefficient = previous ? this.field.add(ctx, previous.coefficient, term.coefficient) : term.coefficient;
      if (this.field.isZero(ctx, coefficient)) map.delete(key);
      else map.set(key, {powers: Object.freeze([...term.powers]), coefficient});
    }
    const out = [...map.values()];
    out.sort((a, b) => { ctx.tick(this.arity + 1); return -compare(a.powers, b.powers); });
    const value = Object.freeze({ring: this, terms: Object.freeze(out.map(t => Object.freeze(t)))});
    this.#owned.add(value); return value;
  }
  constant(ctx: ExecutionContext, value: E) {
    ctx.allocate(this.arity + 1);
    return this.make(ctx, [{powers: Array(this.arity).fill(0), coefficient: value}]);
  }
  zero(ctx: ExecutionContext) { return this.make(ctx, []); }
  one(ctx: ExecutionContext) { return this.constant(ctx, this.field.fromInteger(ctx, 1n)); }
  isZero(ctx: ExecutionContext, a: MultivariatePolynomial<E>) { this.assert(ctx, a); return a.terms.length === 0; }
  equal(ctx: ExecutionContext, a: MultivariatePolynomial<E>, b: MultivariatePolynomial<E>): boolean {
    this.assert(ctx, a); this.assert(ctx, b);
    if (a.terms.length !== b.terms.length) return false;
    for (let i = 0; i < a.terms.length; i++) {
      ctx.tick(this.arity + 1);
      if (compare(a.terms[i].powers, b.terms[i].powers) || !this.field.equal(ctx, a.terms[i].coefficient, b.terms[i].coefficient)) return false;
    }
    return true;
  }
  add(ctx: ExecutionContext, a: MultivariatePolynomial<E>, b: MultivariatePolynomial<E>) {
    this.assert(ctx, a); this.assert(ctx, b); ctx.allocate(a.terms.length + b.terms.length);
    return this.make(ctx, [...a.terms, ...b.terms]);
  }
  scale(ctx: ExecutionContext, a: MultivariatePolynomial<E>, c: E) {
    this.assert(ctx, a); this.field.assert(ctx, c); ctx.allocate(a.terms.length * 2);
    return this.make(ctx, a.terms.map(t => ({powers: t.powers, coefficient: this.field.multiply(ctx, t.coefficient, c)})));
  }
  negate(ctx: ExecutionContext, a: MultivariatePolynomial<E>) { return this.scale(ctx, a, this.field.fromInteger(ctx, -1n)); }
  subtract(ctx: ExecutionContext, a: MultivariatePolynomial<E>, b: MultivariatePolynomial<E>) { return this.add(ctx, a, this.negate(ctx, b)); }
  multiply(ctx: ExecutionContext, a: MultivariatePolynomial<E>, b: MultivariatePolynomial<E>) {
    this.assert(ctx, a); this.assert(ctx, b);
    ctx.allocate(a.terms.length * b.terms.length * (this.arity + 3));
    const terms: MultivariateTerm<E>[] = [];
    for (const s of a.terms) for (const t of b.terms) {
      ctx.tick(this.arity + 1);
      const powers = s.powers.map((n, i) => { const power = n + t.powers[i]; ctx.degree(power); return power; });
      terms.push({powers, coefficient: this.field.multiply(ctx, s.coefficient, t.coefficient)});
    }
    return this.make(ctx, terms);
  }
  monic(ctx: ExecutionContext, a: MultivariatePolynomial<E>) {
    this.assert(ctx, a);
    return a.terms.length ? this.scale(ctx, a, this.field.inverse(ctx, a.terms[0].coefficient)) : a;
  }
  exactDivide(ctx: ExecutionContext, a: MultivariatePolynomial<E>, b: MultivariatePolynomial<E>) {
    this.assert(ctx, a); this.assert(ctx, b); demand(b.terms.length !== 0, 'division-by-zero', 'multivariate divisor');
    let remainder = a, quotient = this.zero(ctx);
    while (remainder.terms.length) {
      ctx.tick(); const lead = remainder.terms[0], divisor = b.terms[0]; ctx.allocate(this.arity + 2);
      const powers = lead.powers.map((n, i) => n - divisor.powers[i]);
      demand(powers.every(n => n >= 0), 'nonexact-division', 'multivariate leading monomial');
      const term = this.make(ctx, [{powers, coefficient: this.field.exactDivide(ctx, lead.coefficient, divisor.coefficient)}]);
      quotient = this.add(ctx, quotient, term); remainder = this.subtract(ctx, remainder, this.multiply(ctx, term, b));
    }
    demand(this.equal(ctx, this.multiply(ctx, quotient, b), a), 'verification-failed', 'multivariate division identity');
    return quotient;
  }
  coefficients(ctx: ExecutionContext, a: MultivariatePolynomial<E>): readonly MultivariatePolynomial<E>[] {
    this.assert(ctx, a); demand(this.lower !== undefined, 'domain-mismatch', 'no outer variable');
    const size = a.terms.length ? a.terms[0].powers[0] + 1 : 0;
    ctx.allocate(size + a.terms.length * (this.arity + 2));
    const buckets: MultivariateTerm<E>[][] = Array.from({length: size}, () => []);
    for (const t of a.terms) { ctx.tick(); buckets[t.powers[0]].push({powers: t.powers.slice(1), coefficient: t.coefficient}); }
    return Object.freeze(buckets.map(ts => this.lower!.make(ctx, ts)));
  }
  lift(ctx: ExecutionContext, a: MultivariatePolynomial<E>, power = 0) {
    demand(this.lower !== undefined, 'domain-mismatch', 'no coefficient ring'); this.lower.assert(ctx, a); ctx.degree(power);
    ctx.allocate(a.terms.length * (this.arity + 2));
    return this.make(ctx, a.terms.map(t => ({powers: [power, ...t.powers], coefficient: t.coefficient})));
  }
  outerDegree(ctx: ExecutionContext, a: MultivariatePolynomial<E>): number {
    this.assert(ctx, a); demand(this.arity > 0, 'domain-mismatch', 'no outer variable');
    return a.terms.length ? a.terms[0].powers[0] : -1;
  }
  outerLeading(ctx: ExecutionContext, a: MultivariatePolynomial<E>) {
    const cs = this.coefficients(ctx, a); demand(cs.length > 0, 'invalid-input', 'zero leading coefficient'); return cs[cs.length - 1];
  }
}
