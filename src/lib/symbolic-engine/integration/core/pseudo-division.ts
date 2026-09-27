import { demand, type ExecutionContext } from './execution';
import { ringPower, type ExactRing } from './field';
import type { Polynomial, PolynomialRing } from './polynomial';

export interface PseudoDivision<E, D extends ExactRing<E>> {
  readonly exponent: number;
  readonly multiplier: E;
  readonly quotient: Polynomial<E, D>;
  readonly remainder: Polynomial<E, D>;
}
export function verifyPseudoDivision<E, D extends ExactRing<E>>(ctx: ExecutionContext,
  ring: PolynomialRing<E, D>, a: Polynomial<E, D>, b: Polynomial<E, D>, proof: PseudoDivision<E, D>): void {
  ring.assert(ctx, a); ring.assert(ctx, b);
  demand(!ring.isZero(ctx, b), 'division-by-zero', 'pseudo divisor');
  const exponent = Math.max(ring.degree(ctx, a) - ring.degree(ctx, b) + 1, 0);
  demand(proof.exponent === exponent && ring.domain.equal(ctx, proof.multiplier,
    ringPower(ctx, ring.domain, ring.leading(ctx, b), exponent)), 'verification-failed', 'pseudo scaling');
  demand(ring.degree(ctx, proof.remainder) < ring.degree(ctx, b), 'verification-failed', 'pseudo remainder degree');
  demand(ring.equal(ctx, ring.scale(ctx, a, proof.multiplier),
    ring.add(ctx, ring.multiply(ctx, proof.quotient, b), proof.remainder)), 'verification-failed', 'pseudo identity');
}
export function pseudoDivide<E, D extends ExactRing<E>>(ctx: ExecutionContext,
  ring: PolynomialRing<E, D>, a: Polynomial<E, D>, b: Polynomial<E, D>): PseudoDivision<E, D> {
  ring.assert(ctx, a); ring.assert(ctx, b);
  demand(!ring.isZero(ctx, b), 'division-by-zero', 'pseudo divisor');
  const exponent = Math.max(ring.degree(ctx, a) - ring.degree(ctx, b) + 1, 0), lc = ring.leading(ctx, b);
  let left = exponent, remainder = a, quotient = ring.zero(ctx);
  while (!ring.isZero(ctx, remainder) && ring.degree(ctx, remainder) >= ring.degree(ctx, b)) {
    ctx.tick();
    const offset = ring.degree(ctx, remainder) - ring.degree(ctx, b);
    ctx.allocate(offset + 1);
    const coefficients = Array<E>(offset).fill(ring.domain.fromInteger(ctx, 0n));
    coefficients.push(ring.leading(ctx, remainder));
    const term = ring.make(ctx, coefficients);
    quotient = ring.add(ctx, ring.scale(ctx, quotient, lc), term);
    remainder = ring.subtract(ctx, ring.scale(ctx, remainder, lc), ring.multiply(ctx, term, b));
    left--;
  }
  const remaining = ringPower(ctx, ring.domain, lc, left);
  ctx.allocate(4);
  const proof = Object.freeze({ exponent, multiplier: ringPower(ctx, ring.domain, lc, exponent),
    quotient: ring.scale(ctx, quotient, remaining), remainder: ring.scale(ctx, remainder, remaining) });
  verifyPseudoDivision(ctx, ring, a, b, proof); return proof;
}
