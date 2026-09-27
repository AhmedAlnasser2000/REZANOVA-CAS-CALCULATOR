import { demand, type ExecutionContext } from './execution';
import { requireIntegralDomain, type ExactField, type ExactIntegralDomain } from './field';
import { PolynomialRing, type Polynomial } from './polynomial';
import { polynomialGcd, exactDivide } from './polynomial-division';

/** A polynomial domain is not a field, even when its coefficients are a field. */
export class PolynomialDomain<E, D extends ExactIntegralDomain<E> = ExactField<E>>
implements ExactIntegralDomain<Polynomial<E, D>> {
  readonly capability = 'integral-domain' as const;
  readonly characteristic = 0 as const;
  readonly identity = Symbol('polynomial-domain');
  readonly ring: PolynomialRing<E, D>;
  constructor(ring: PolynomialRing<E, D>) { requireIntegralDomain(ring.domain); this.ring = ring; Object.freeze(this); }
  assert(ctx: ExecutionContext, a: Polynomial<E, D>) { this.ring.assert(ctx, a); }
  fromInteger(ctx: ExecutionContext, n: bigint) { return this.ring.constant(ctx, this.ring.domain.fromInteger(ctx, n)); }
  add(ctx: ExecutionContext, a: Polynomial<E, D>, b: Polynomial<E, D>) { return this.ring.add(ctx, a, b); }
  subtract(ctx: ExecutionContext, a: Polynomial<E, D>, b: Polynomial<E, D>) { return this.ring.subtract(ctx, a, b); }
  negate(ctx: ExecutionContext, a: Polynomial<E, D>) { return this.ring.negate(ctx, a); }
  multiply(ctx: ExecutionContext, a: Polynomial<E, D>, b: Polynomial<E, D>) { return this.ring.multiply(ctx, a, b); }
  equal(ctx: ExecutionContext, a: Polynomial<E, D>, b: Polynomial<E, D>) { return this.ring.equal(ctx, a, b); }
  isZero(ctx: ExecutionContext, a: Polynomial<E, D>) { return this.ring.isZero(ctx, a); }
  exactDivide(ctx: ExecutionContext, a: Polynomial<E, D>, b: Polynomial<E, D>) {
    const r = this.ring; r.assert(ctx, a); r.assert(ctx, b);
    demand(!r.isZero(ctx, b), 'division-by-zero', 'polynomial domain divisor');
    let remainder = a, quotient = r.zero(ctx);
    while (!r.isZero(ctx, remainder) && r.degree(ctx, remainder) >= r.degree(ctx, b)) {
      ctx.tick();
      const offset = r.degree(ctx, remainder) - r.degree(ctx, b);
      ctx.allocate(offset + 1);
      const coeff = Array<E>(offset).fill(r.domain.fromInteger(ctx, 0n));
      coeff.push(r.domain.exactDivide(ctx, r.leading(ctx, remainder), r.leading(ctx, b)));
      const term = r.make(ctx, coeff);
      quotient = r.add(ctx, quotient, term);
      remainder = r.subtract(ctx, remainder, r.multiply(ctx, term, b));
    }
    demand(r.isZero(ctx, remainder), 'nonexact-division', 'polynomial domain remainder');
    demand(r.equal(ctx, r.multiply(ctx, quotient, b), a), 'verification-failed', 'domain division reconstruction');
    return quotient;
  }
}

export interface PrimitivePart<E> {
  readonly content: Polynomial<E>;
  readonly primitive: Polynomial<Polynomial<E>, PolynomialDomain<E>>;
}
export function coefficientContent<E>(ctx: ExecutionContext,
  ring: PolynomialRing<Polynomial<E>, PolynomialDomain<E>>,
  a: Polynomial<Polynomial<E>, PolynomialDomain<E>>): PrimitivePart<E> {
  ring.assert(ctx, a); const inner = ring.domain.ring;
  let content = inner.zero(ctx);
  for (const c of a.coefficients) content = polynomialGcd(ctx, inner, content, c);
  ctx.allocate(a.coefficients.length + 2);
  const primitive = inner.isZero(ctx, content) ? ring.zero(ctx)
    : ring.make(ctx, a.coefficients.map(c => exactDivide(ctx, inner, c, content)));
  const result = Object.freeze({ content, primitive });
  verifyPrimitivePart(ctx, ring, a, result); return result;
}
export function verifyPrimitivePart<E>(ctx: ExecutionContext,
  ring: PolynomialRing<Polynomial<E>, PolynomialDomain<E>>,
  a: Polynomial<Polynomial<E>, PolynomialDomain<E>>, result: PrimitivePart<E>): void {
  const inner = ring.domain.ring;
  demand(ring.equal(ctx, ring.scale(ctx, result.primitive, result.content), a), 'verification-failed', 'content reconstruction');
  if (ring.isZero(ctx, a)) {
    demand(inner.isZero(ctx, result.content) && ring.isZero(ctx, result.primitive), 'verification-failed', 'zero content');
    return;
  }
  demand(inner.domain.equal(ctx, inner.leading(ctx, result.content), inner.domain.fromInteger(ctx, 1n)),
    'verification-failed', 'content not monic');
  let gcd = inner.zero(ctx);
  for (const c of result.primitive.coefficients) gcd = polynomialGcd(ctx, inner, gcd, c);
  demand(inner.equal(ctx, gcd, inner.one(ctx)), 'verification-failed', 'nonprimitive coefficients');
}
