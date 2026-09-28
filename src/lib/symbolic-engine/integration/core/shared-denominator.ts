import { demand, type ExecutionContext } from './execution';
import { rationalField } from './field';
import type { Rational } from './rational';
import { PolynomialRing, type Polynomial } from './polynomial';
import { PolynomialDomain } from './polynomial-domain';
import { exactDivide, polynomialGcd } from './polynomial-division';
import { monicDivide } from './monic-division';
import type { QRationalFunction, QPolynomial } from './formal-primitive';
import type { RationalFunctionField } from './rational-function';

type Numerator = Polynomial<QPolynomial, PolynomialDomain<Rational>>;
export interface DenominatorView { readonly numerator: Numerator; readonly denominator: QPolynomial }

/** Operation-local checked Q(x)[z] -> Q[x][z]/Q[x] proof arithmetic.
 * No factor is cancelled out of the primitive's retained conditions. */
export class SharedDenominator {
  readonly field: RationalFunctionField<Rational>;
  readonly ring: PolynomialRing<QPolynomial, PolynomialDomain<Rational>>;
  readonly x: PolynomialRing<Rational>;
  #moduli = new WeakMap<object, Numerator>();
  #sums = new WeakMap<object, readonly DenominatorView[]>();
  #views = new WeakMap<object, DenominatorView>();
  readonly ctx: ExecutionContext;
  readonly source: PolynomialRing<QRationalFunction>;
  constructor(ctx: ExecutionContext, source: PolynomialRing<QRationalFunction>) {
    this.ctx = ctx; this.source = source;
    this.field = source.domain as RationalFunctionField<Rational>;
    this.x = this.field.ring;
    demand(this.x.domain === rationalField, 'domain-mismatch', 'shared denominator requires Q(x)');
    ctx.allocate(5); this.ring = new PolynomialRing(new PolynomialDomain(this.x), source.variable);
  }
  view(p: Polynomial<QRationalFunction>): DenominatorView {
    const c = this.ctx, x = this.x; this.source.assert(c, p);
    const saved = this.#views.get(p); if (saved) return saved;
    let denominator = x.one(c);
    for (const coefficient of p.coefficients) {
      c.tick(); const d = coefficient.denominator;
      if (!x.equal(c, denominator, d)) denominator = x.multiply(c, exactDivide(c, x, denominator, polynomialGcd(c, x, denominator, d)), d);
    }
    c.allocate(p.coefficients.length);
    const numerator = this.ring.make(c, p.coefficients.map(v => x.multiply(c, v.numerator, exactDivide(c, x, denominator, v.denominator))));
    const result = Object.freeze({ numerator, denominator });
    this.verifyView(p, result); c.allocate(3); this.#views.set(p, result); return result;
  }
  verifyView(p: Polynomial<QRationalFunction>, view: DenominatorView): void {
    const c = this.ctx, x = this.x; this.source.assert(c, p); this.ring.assert(c, view.numerator); x.assert(c, view.denominator);
    demand(!x.isZero(c, view.denominator), 'verification-failed', 'zero common denominator');
    demand(view.numerator.coefficients.length === p.coefficients.length, 'verification-failed', 'common denominator degree');
    for (let i = 0; i < p.coefficients.length; i++) {
      c.tick(); const v = p.coefficients[i];
      demand(x.equal(c, x.multiply(c, view.numerator.coefficients[i], v.denominator), x.multiply(c, v.numerator, view.denominator)),
        'verification-failed', 'common denominator coefficient identity');
    }
  }
  scalar(v: QRationalFunction): DenominatorView { return this.view(this.source.constant(this.ctx, v)); }
  integer(n: bigint): DenominatorView { return this.scalar(this.field.fromInteger(this.ctx, n)); }
  add(a: DenominatorView, b: DenominatorView): DenominatorView {
    const c = this.ctx; c.allocate(2);
    if (this.x.equal(c, a.denominator, b.denominator)) return { numerator: this.ring.add(c, a.numerator, b.numerator), denominator: a.denominator };
    const gcd = polynomialGcd(c, this.x, a.denominator, b.denominator);
    const ad = exactDivide(c, this.x, a.denominator, gcd), bd = exactDivide(c, this.x, b.denominator, gcd);
    return { numerator: this.ring.add(c, this.ring.scale(c, a.numerator, bd), this.ring.scale(c, b.numerator, ad)), denominator: this.x.multiply(c, ad, b.denominator) };
  }
  negate(a: DenominatorView): DenominatorView { this.ctx.allocate(2); return { numerator: this.ring.negate(this.ctx, a.numerator), denominator: a.denominator }; }
  subtract(a: DenominatorView, b: DenominatorView) { return this.add(a, this.negate(b)); }
  multiply(a: DenominatorView, b: DenominatorView): DenominatorView {
    const c = this.ctx; c.allocate(2);
    return { numerator: this.ring.multiply(c, a.numerator, b.numerator), denominator: this.x.multiply(c, a.denominator, b.denominator) };
  }
  equal(a: DenominatorView, b: DenominatorView): boolean {
    const c = this.ctx;
    return this.ring.equal(c, this.ring.scale(c, a.numerator, b.denominator), this.ring.scale(c, b.numerator, a.denominator));
  }
  /** q must be monic with coefficients in Q; reduction never inverts Q[x]. */
  modulus(q: Polynomial<QRationalFunction>): Numerator {
    const c = this.ctx; this.source.assert(c, q);
    const saved = this.#moduli.get(q); if (saved) return saved;
    const view = this.view(q);
    demand(this.x.equal(c, view.denominator, this.x.one(c)), 'verification-failed', 'nonconstant modulus denominators');
    demand(this.ring.domain.equal(c, this.ring.leading(c, view.numerator), this.x.one(c)), 'verification-failed', 'nonmonic proof modulus');
    c.allocate(1); this.#moduli.set(q, view.numerator); return view.numerator;
  }
  newtonSums(q: Polynomial<QRationalFunction>): readonly DenominatorView[] {
    const c = this.ctx; this.source.assert(c, q); this.modulus(q);
    const saved = this.#sums.get(q); if (saved) return saved;
    const n = this.source.degree(c, q); c.allocate(n + 1);
    const sums = [this.integer(BigInt(n))];
    for (let k = 1; k < n; k++) {
      c.tick(); let sum = this.multiply(this.integer(BigInt(k)), this.scalar(q.coefficients[n-k]));
      for (let j = 1; j < k; j++) { c.tick(); sum = this.add(sum, this.multiply(this.scalar(q.coefficients[n-j]), sums[k-j])); }
      sums.push(Object.freeze(this.negate(sum)));
    }
    const result = Object.freeze(sums); this.#sums.set(q, result); return result;
  }
  zeroModulo(a: DenominatorView, modulus: Numerator): boolean {
    return this.ring.isZero(this.ctx, monicDivide(this.ctx, this.ring, a.numerator, modulus).remainder);
  }
  shifted(a: DenominatorView, count: number): DenominatorView {
    const c = this.ctx; c.degree(a.numerator.coefficients.length - 1 + count); c.allocate(count + a.numerator.coefficients.length + 2);
    return { numerator: this.ring.make(c, [...Array<QPolynomial>(count).fill(this.x.zero(c)), ...a.numerator.coefficients]), denominator: a.denominator };
  }
}
