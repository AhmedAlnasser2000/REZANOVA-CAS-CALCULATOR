import { demand, type ExecutionContext } from '../execution';
import { QQ } from './domain';
import { PolynomialRing, type Polynomial } from './polynomial';
import { exactQuotient, monic } from './polynomial-division';
import { gcdQ } from './polynomial-gcd';
import type { Rational } from './rational';

export interface SquareFreeFactor { readonly factor: Polynomial<Rational>; readonly multiplicity: number }
export interface SquareFreeDecomposition { readonly unit: Rational; readonly factors: readonly SquareFreeFactor[] }

/**
 * Yun's square-free decomposition over ℚ (characteristic zero):
 * a = unit · ∏ factorᵢ^mᵢ with monic, square-free, pairwise coprime factors and
 * strictly increasing multiplicities. Every property is checked before return.
 */
export function squareFree(ctx: ExecutionContext, ring: PolynomialRing<Rational>, a: Polynomial<Rational>): SquareFreeDecomposition {
  demand(ring.domain === QQ, 'domain-mismatch', 'square-free decomposition needs Q[x]');
  demand(!ring.isZero(ctx, a), 'invalid-input', 'square-free decomposition of zero');
  const unit = ring.leading(ctx, a);
  const factors: SquareFreeFactor[] = [];
  if (ring.degree(ctx, a) > 0) {
    const f = monic(ctx, ring, a);
    const df = ring.derivative(ctx, f);
    const g = gcdQ(ctx, ring, f, df);
    let b = exactQuotient(ctx, ring, f, g);
    let c = exactQuotient(ctx, ring, df, g);
    let d = ring.subtract(ctx, c, ring.derivative(ctx, b));
    for (let i = 1; ring.degree(ctx, b) > 0; i++) {
      ctx.tick();
      const h = gcdQ(ctx, ring, b, d);
      b = exactQuotient(ctx, ring, b, h);
      c = exactQuotient(ctx, ring, d, h);
      d = ring.subtract(ctx, c, ring.derivative(ctx, b));
      if (ring.degree(ctx, h) > 0) factors.push(Object.freeze({ factor: h, multiplicity: i }));
    }
  }
  const result = Object.freeze({ unit, factors: Object.freeze(factors) });
  verifySquareFree(ctx, ring, a, result);
  return result;
}

export function verifySquareFree(ctx: ExecutionContext, ring: PolynomialRing<Rational>, a: Polynomial<Rational>, r: SquareFreeDecomposition): void {
  let product = ring.constant(ctx, r.unit);
  let last = 0;
  for (const { factor, multiplicity } of r.factors) {
    demand(multiplicity > last, 'verification-failed', 'multiplicities not increasing');
    last = multiplicity;
    demand(ring.degree(ctx, factor) > 0 && QQ.equal(ctx, ring.leading(ctx, factor), QQ.fromInteger(ctx, 1n)), 'verification-failed', 'factor not monic and nonconstant');
    demand(ring.degree(ctx, gcdQ(ctx, ring, factor, ring.derivative(ctx, factor))) === 0, 'verification-failed', 'factor not square-free');
    product = ring.multiply(ctx, product, ring.power(ctx, factor, multiplicity));
  }
  for (let i = 0; i < r.factors.length; i++) for (let j = i + 1; j < r.factors.length; j++) {
    demand(ring.degree(ctx, gcdQ(ctx, ring, r.factors[i].factor, r.factors[j].factor)) === 0, 'verification-failed', 'factors not coprime');
  }
  demand(ring.equal(ctx, product, a), 'verification-failed', 'square-free reconstruction');
}
