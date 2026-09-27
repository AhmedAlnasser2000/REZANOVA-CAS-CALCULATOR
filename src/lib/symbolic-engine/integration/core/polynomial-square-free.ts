import { demand, type ExecutionContext } from './execution';
import { requireField } from './field';
import type { Polynomial, PolynomialRing } from './polynomial';
import { exactDivide, polynomialGcd } from './polynomial-division';

export interface SquareFreeFactor<E> { readonly factor: Polynomial<E>; readonly multiplicity: number }
export interface SquareFreeDecomposition<E> { readonly scalar: E; readonly factors: readonly SquareFreeFactor<E>[] }

export function verifySquareFree<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, input: Polynomial<E>, result: SquareFreeDecomposition<E>): void {
  requireField(ring.domain);
  demand(!ring.isZero(ctx, input), 'invalid-input', 'square-free decomposition of zero');
  ring.domain.assert(ctx, result.scalar);
  demand(!ring.domain.isZero(ctx, result.scalar), 'verification-failed', 'zero leading scalar');
  ctx.allocate(result.factors.length);
  let product = ring.constant(ctx, result.scalar), previous = 0;
  const one = ring.one(ctx);
  for (let i = 0; i < result.factors.length; i++) {
    const { factor, multiplicity } = result.factors[i];
    demand(Number.isSafeInteger(multiplicity) && multiplicity > previous, 'verification-failed', 'multiplicity order');
    demand(ring.degree(ctx, factor) > 0, 'verification-failed', 'constant square-free factor');
    demand(ring.domain.equal(ctx, ring.leading(ctx, factor), ring.domain.fromInteger(ctx, 1n)), 'verification-failed', 'nonmonic factor');
    demand(ring.equal(ctx, polynomialGcd(ctx, ring, factor, ring.derivative(ctx, factor)), one), 'verification-failed', 'repeated factor');
    for (let j = 0; j < i; j++) demand(ring.equal(ctx, polynomialGcd(ctx, ring, factor, result.factors[j].factor), one),
      'verification-failed', 'factors not coprime');
    product = ring.multiply(ctx, product, ring.power(ctx, factor, multiplicity)); previous = multiplicity;
  }
  demand(ring.equal(ctx, product, input), 'verification-failed', 'square-free reconstruction');
}

export function squareFree<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, input: Polynomial<E>): SquareFreeDecomposition<E> {
  requireField(ring.domain);
  demand(!ring.isZero(ctx, input), 'invalid-input', 'square-free decomposition of zero');
  const scalar = ring.leading(ctx, input);
  const monic = ring.scale(ctx, input, ring.domain.inverse(ctx, scalar));
  const one = ring.one(ctx);
  let c = polynomialGcd(ctx, ring, monic, ring.derivative(ctx, monic));
  let w = exactDivide(ctx, ring, monic, c), multiplicity = 1;
  const factors: SquareFreeFactor<E>[] = [];
  while (!ring.equal(ctx, w, one)) {
    ctx.tick();
    const y = polynomialGcd(ctx, ring, w, c), factor = exactDivide(ctx, ring, w, y);
    if (!ring.equal(ctx, factor, one)) { ctx.allocate(2); factors.push(Object.freeze({ factor, multiplicity })); }
    w = y; c = exactDivide(ctx, ring, c, y); multiplicity++;
  }
  ctx.allocate(2);
  const result = Object.freeze({ scalar, factors: Object.freeze(factors) });
  verifySquareFree(ctx, ring, input, result); return result;
}
