import { demand, type ExecutionContext } from './execution';
import type { ExactRing } from './field';
import type { Polynomial, PolynomialRing } from './polynomial';

export interface MonicDivision<E, D extends ExactRing<E>> {
  readonly quotient: Polynomial<E, D>;
  readonly remainder: Polynomial<E, D>;
}
export function verifyMonicDivision<E, D extends ExactRing<E>>(ctx: ExecutionContext, ring: PolynomialRing<E, D>,
  a: Polynomial<E, D>, b: Polynomial<E, D>, proof: MonicDivision<E, D>): void {
  ring.assert(ctx, a); ring.assert(ctx, b);
  demand(!ring.isZero(ctx, b), 'division-by-zero', 'monic divisor');
  demand(ring.domain.equal(ctx, ring.leading(ctx, b), ring.domain.fromInteger(ctx, 1n)), 'invalid-input', 'monic divisor required');
  demand(ring.degree(ctx, proof.remainder) < ring.degree(ctx, b), 'verification-failed', 'monic remainder degree');
  demand(ring.equal(ctx, a, ring.add(ctx, ring.multiply(ctx, proof.quotient, b), proof.remainder)), 'verification-failed', 'monic division identity');
}
/** Division by a monic polynomial needs ring arithmetic, not field inversion. */
export function monicDivide<E, D extends ExactRing<E>>(ctx: ExecutionContext, ring: PolynomialRing<E, D>,
  a: Polynomial<E, D>, b: Polynomial<E, D>): MonicDivision<E, D> {
  ring.assert(ctx, a); ring.assert(ctx, b);
  demand(!ring.isZero(ctx, b), 'division-by-zero', 'monic divisor');
  demand(ring.domain.equal(ctx, ring.leading(ctx, b), ring.domain.fromInteger(ctx, 1n)), 'invalid-input', 'monic divisor required');
  let quotient = ring.zero(ctx), remainder = a;
  while (!ring.isZero(ctx, remainder) && ring.degree(ctx, remainder) >= ring.degree(ctx, b)) {
    ctx.tick(); const offset = ring.degree(ctx, remainder) - ring.degree(ctx, b); ctx.allocate(offset + 1);
    const coefficients = Array<E>(offset).fill(ring.domain.fromInteger(ctx, 0n)); coefficients.push(ring.leading(ctx, remainder));
    const term = ring.make(ctx, coefficients);
    quotient = ring.add(ctx, quotient, term); remainder = ring.subtract(ctx, remainder, ring.multiply(ctx, term, b));
  }
  ctx.allocate(2); const proof = Object.freeze({ quotient, remainder });
  verifyMonicDivision(ctx, ring, a, b, proof); return proof;
}
