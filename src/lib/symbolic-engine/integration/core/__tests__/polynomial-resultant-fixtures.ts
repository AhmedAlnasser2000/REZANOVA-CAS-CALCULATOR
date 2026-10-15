import type {ExecutionContext} from '../execution';
import {rationalField as Q} from '../field';
import {PolynomialRing} from '../polynomial';
import {PolynomialDomain} from '../polynomial-domain';
import {constructAlgebraicExtensionWithin} from '../algebraic-field';
import {bounds} from './algebraic-support';

export function rationalPolynomialResultantFixture(ctx: ExecutionContext) {
  const inner = new PolynomialRing(Q, 'x'), ring = new PolynomialRing(new PolynomialDomain(inner), 'y');
  const p = (cs: readonly bigint[]) => inner.make(ctx, cs.map(n => Q.fromInteger(ctx, n)));
  const a = ring.make(ctx, [p([5n, -1n, 3n]), p([2n, 7n]), p([1n])]), b = ring.make(ctx, [p([3n, 1n]), p([-2n, 5n])]);
  ctx.allocate(3); return {ring, a, b};
}
export function nestedPolynomialNormFixture(ctx: ExecutionContext) {
  return ctx.operation(() => {
    const ar = new PolynomialRing(Q, 'a'), a = constructAlgebraicExtensionWithin(ctx, ar, ar.make(ctx, [-2n, 0n, 1n].map(n => Q.fromInteger(ctx, n))), bounds), br = new PolynomialRing(a, 'b'), owner = constructAlgebraicExtensionWithin(ctx, br, br.make(ctx, [-3n, 0n, 1n].map(n => a.fromInteger(ctx, n))), bounds);
    const ring = new PolynomialRing(owner, 'x'), alpha = owner.embed(ctx, a.generator(ctx)), beta = owner.generator(ctx), input = ring.make(ctx, [owner.add(ctx, alpha, beta), owner.exactDivide(ctx, beta, owner.fromInteger(ctx, 35n)), owner.fromInteger(ctx, 1n)]);
    ctx.allocate(3); return {owner, ring, input};
  });
}
