import { ExecutionContext } from '../execution';
import { rationalField as Q } from '../field';
import { rational, type Rational } from '../rational';
import { PolynomialRing } from '../polynomial';
import { RationalFunctionField } from '../rational-function';
import { constructAlgebraicExtension } from '../algebraic-field';
export const bounds = Object.freeze({towerHeight: 8, artifactDepth: 64, artifactNodes: 100_000, artifactBytes: 16 * 1024 * 1024});
export const fresh = () => new ExecutionContext({work: 20_000_000_000, allocation: 1_000_000_000_000, integerBits: 2048, degree: 256});
export function base(variable = 'x', ctx = fresh()) {
  const ring = new PolynomialRing(Q, variable), field = new RationalFunctionField(ring);
  const x = field.make(ctx, ring.make(ctx, [rational(ctx, 0n), rational(ctx, 1n)]), ring.one(ctx));
  return {ctx, ring, field, x, q: (n: bigint, d = 1n) => rational(ctx, n, d)};
}
export function quadratic(polynomial: readonly bigint[] = [0n, 1n], ctx?: ExecutionContext) {
  const b = base('x', ctx), r = new PolynomialRing(b.field, 'a'), p = b.field.make(b.ctx, b.ring.make(b.ctx, polynomial.map(n => b.q(n))), b.ring.one(b.ctx));
  const relation = r.make(b.ctx, [b.field.negate(b.ctx, p), b.field.fromInteger(b.ctx, 0n), b.field.fromInteger(b.ctx, 1n)]);
  const owner = constructAlgebraicExtension(b.ctx, r, relation, bounds), a = owner.generator(b.ctx);
  return {...b, owner, a, relation};
}
export type QCoefficient = Rational;
