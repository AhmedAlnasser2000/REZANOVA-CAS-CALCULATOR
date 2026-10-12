import { base, bounds, fresh, quadratic } from './algebraic-support';
import { measureOperation } from './algebraic-measurements';
import type { ExactField } from '../field';
import { certifyAlgebraicConstantField } from '../algebraic-constant-field';
import { certifyAlgebraicCurve, verifyAlgebraicCurve } from '../algebraic-curve';
import { principalAlgebraicDivisor, constructAlgebraicDivisor } from '../algebraic-divisor';
import { solveAlgebraicRiemannRoch, verifyAlgebraicRiemannRoch } from '../algebraic-riemann-roch';
import { decideAlgebraicPrincipality, verifyAlgebraicPrincipality } from '../algebraic-principality';
import { encodeAlgebraicPrincipality, decodeAlgebraicPrincipality, encodeAlgebraicRiemannRoch, decodeAlgebraicRiemannRoch } from '../algebraic-divisor-wire';
import { PolynomialRing } from '../polynomial';
import { constructAlgebraicExtension, type AlgebraicField } from '../algebraic-field';

/** Fixture construction and JSON I/O are excluded from the observations.
 * Samples are serial, with a fresh operation and context every time. */
export function algebraicDivisorGateAMeasurements() {
  const q = base(), e = quadratic([1n, 0n, 0n, 1n]), h = quadratic([0n, 0n, 2n]);
  let deep = h.owner as unknown as AlgebraicField<unknown>;
  for (let i = deep.height + 1; i <= 8; i++) { const r = new PolynomialRing(deep, `a${i}`); deep = constructAlgebraicExtension(h.ctx, r,
    r.make(h.ctx, [deep.negate(h.ctx, deep.generator(h.ctx)), deep.fromInteger(h.ctx, 1n)]), bounds) as unknown as AlgebraicField<unknown>; }
  const fixtures: Record<string, {owner: ExactField<unknown>; value: unknown}> = {
    rational: {owner: q.field, value: q.x}, elliptic: {owner: e.owner, value: e.owner.subtract(e.ctx, e.a, e.owner.fromInteger(e.ctx, 1n))}, heightEightHiddenConstants: {owner: deep, value: deep.fromInteger(h.ctx, 1n)},
  };
  const observations: Record<string, unknown> = {};
  for (const [name, {owner, value}] of Object.entries(fixtures)) {
    const constants = certifyAlgebraicConstantField(fresh(), owner, bounds), curve = certifyAlgebraicCurve(fresh(), owner, constants, bounds);
    const divisor = name === 'heightEightHiddenConstants' ? constructAlgebraicDivisor(fresh(), curve, [], bounds) : principalAlgebraicDivisor(fresh(), curve, value, bounds).divisor;
    const space = solveAlgebraicRiemannRoch(fresh(), curve, divisor, bounds), decision = decideAlgebraicPrincipality(fresh(), curve, divisor, bounds);
    const rrWire = JSON.parse(JSON.stringify(encodeAlgebraicRiemannRoch(fresh(), curve, divisor, space, bounds))), wire = JSON.parse(JSON.stringify(encodeAlgebraicPrincipality(fresh(), curve, divisor, decision, bounds)));
    observations[name] = {bytes: Buffer.byteLength(JSON.stringify(wire)), dimension: space.dimension,
      construction: measureOperation(ctx => certifyAlgebraicCurve(ctx, owner, constants, bounds)),
      constructionVerification: measureOperation(ctx => verifyAlgebraicCurve(ctx, owner, curve, bounds)),
      riemannRoch: measureOperation(ctx => solveAlgebraicRiemannRoch(ctx, curve, divisor, bounds)),
      riemannRochVerification: measureOperation(ctx => verifyAlgebraicRiemannRoch(ctx, curve, divisor, space, bounds)),
      principality: measureOperation(ctx => decideAlgebraicPrincipality(ctx, curve, divisor, bounds)),
      verification: measureOperation(ctx => verifyAlgebraicPrincipality(ctx, curve, divisor, decision, bounds)),
      encoding: measureOperation(ctx => encodeAlgebraicPrincipality(ctx, curve, divisor, decision, bounds)),
      decoding: measureOperation(ctx => decodeAlgebraicPrincipality(ctx, curve, divisor, wire, bounds)),
      riemannRochDecoding: measureOperation(ctx => decodeAlgebraicRiemannRoch(ctx, curve, divisor, rrWire, bounds))};
  }
  return {warmups: 2, samples: 5, observations};
}
