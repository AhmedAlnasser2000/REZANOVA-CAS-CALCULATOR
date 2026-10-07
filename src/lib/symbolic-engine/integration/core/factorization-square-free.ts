import { demand, type ExecutionContext } from './execution';
import type { Polynomial, PolynomialRing } from './polynomial';
import { extendedGcd, verifyBezout, type Bezout } from './polynomial-division';
import { squareFree } from './polynomial-square-free';

export interface FactorSquareFree<E> {
  readonly scalar: E;
  readonly components: readonly {
    readonly polynomial: Polynomial<E>;
    readonly multiplicity: bigint;
    readonly derivative: Bezout<E>;
    readonly previous: readonly Bezout<E>[];
  }[];
}
export function checkedFactorSquareFree<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, input: Polynomial<E>): FactorSquareFree<E> {
  const decomposition = squareFree(ctx, ring, input);
  ctx.allocate(decomposition.factors.length * 4 + 2);
  const components = decomposition.factors.map(({factor: polynomial, multiplicity}, i) => {
    ctx.allocate(i);
    return Object.freeze({ polynomial, multiplicity: BigInt(multiplicity),
      derivative: extendedGcd(ctx, ring, polynomial, ring.derivative(ctx, polynomial)),
      previous: Object.freeze(decomposition.factors.slice(0, i).map(c => extendedGcd(ctx, ring, polynomial, c.factor))) });
  });
  const result = Object.freeze({scalar: decomposition.scalar, components: Object.freeze(components)});
  verifyFactorSquareFree(ctx, ring, input, result); return result;
}
export function factorIndex(ctx: ExecutionContext, n: bigint): number {
  ctx.integer(n); demand(n >= 0n, 'verification-failed', 'negative factor index');
  if (n > BigInt(ctx.limits.degree)) ctx.exhaust('degree'); return Number(n);
}
export function verifyFactorSquareFree<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, input: Polynomial<E>, proof: FactorSquareFree<E>): void {
  demand(!ring.isZero(ctx, input), 'verification-failed', 'zero square-free input');
  ring.domain.assert(ctx, proof.scalar); demand(!ring.domain.isZero(ctx, proof.scalar), 'verification-failed', 'zero square-free unit');
  demand(Array.isArray(proof.components), 'verification-failed', 'square-free coverage');
  let out = ring.constant(ctx, proof.scalar), previous = 0n; const one = ring.one(ctx);
  for (let i = 0; i < proof.components.length; i++) {
    const c = proof.components[i]; ctx.integer(c.multiplicity);
    demand(c.multiplicity > previous && ring.degree(ctx, c.polynomial) > 0
      && ring.domain.equal(ctx, ring.leading(ctx, c.polynomial), ring.domain.fromInteger(ctx, 1n)), 'verification-failed', 'square-free normalization');
    verifyBezout(ctx, ring, c.polynomial, ring.derivative(ctx, c.polynomial), c.derivative);
    demand(ring.equal(ctx, c.derivative.gcd, one), 'verification-failed', 'square-free derivative gcd');
    demand(Array.isArray(c.previous) && c.previous.length === i, 'verification-failed', 'square-free pairwise coverage');
    for (let j = 0; j < i; j++) {
      verifyBezout(ctx, ring, c.polynomial, proof.components[j].polynomial, c.previous[j]);
      demand(ring.equal(ctx, c.previous[j].gcd, one), 'verification-failed', 'square-free pairwise gcd');
    }
    out = ring.multiply(ctx, out, ring.power(ctx, c.polynomial, factorIndex(ctx, c.multiplicity))); previous = c.multiplicity;
  }
  demand(ring.equal(ctx, out, input), 'verification-failed', 'square-free full reconstruction');
}
