/** Full local maps for a derived Weierstrass presentation, at either chart. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyAlgebraicPlaceWithin, equalAlgebraicPlaces, type AlgebraicPlace} from './algebraic-place';
import {tryAlgebraicIntegralResidueWithin, verifyAlgebraicIntegralResidueWithin, type AlgebraicIntegralResidue} from './algebraic-integral-residue';
import {expandAlgebraicPlaceWithin, verifyAlgebraicLocalExpansionWithin, type AlgebraicLocalExpansion} from './algebraic-local';
import {rationalPlaceConstantWithin} from './elliptic-place';
import {ellipticInfinity, ellipticPoint, assertEllipticPoint, type EllipticPoint} from './elliptic-group';
import {assertGenusOneCoordinates, type GenusOneCoordinates} from './genus-one-coordinates';
import type {CurvePlaceResidue} from './algebraic-residue-algebra';

export type GenusOneLocalValue<E> = Readonly<{method: 'quotient-map'; evidence: AlgebraicIntegralResidue<E>}> | Readonly<{method: 'local-lift'; evidence: AlgebraicLocalExpansion<E>}>;
export interface GenusOnePlaceTransport<E> {
  readonly place: AlgebraicPlace<E>; readonly point: EllipticPoint<E, GenusOneCoordinates<E>>;
  readonly x: GenusOneLocalValue<E>|null; readonly y: GenusOneLocalValue<E>|null;
}
function localValue<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>, place: AlgebraicPlace<E>, input: E): GenusOneLocalValue<E> {
  const direct = tryAlgebraicIntegralResidueWithin(ctx, model.curve, place, input); ctx.allocate(2);
  return direct === null ? Object.freeze({method: 'local-lift', evidence: expandAlgebraicPlaceWithin(ctx, model.curve, place, input, 1n)}) : Object.freeze({method: 'quotient-map', evidence: direct});
}
export function verifyGenusOneLocalValueWithin<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>, place: AlgebraicPlace<E>, input: E, proof: GenusOneLocalValue<E>): CurvePlaceResidue {
  if (proof.method === 'quotient-map') {verifyAlgebraicIntegralResidueWithin(ctx, model.curve, place, input, proof.evidence); return proof.evidence.value;}
  demand(proof.method === 'local-lift', 'verification-failed', 'genus-one local evaluation method'); verifyAlgebraicLocalExpansionWithin(ctx, model.curve, place, input, 1n, proof.evidence); return proof.evidence.digits[0];
}
export function verifyGenusOnePlaceTransportWithin<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>, place: AlgebraicPlace<E>, proof: GenusOnePlaceTransport<E>, bounds: DifferentialBounds): void {
  assertGenusOneCoordinates(ctx, model.presentation, model); verifyAlgebraicPlaceWithin(ctx, model.curve, place, bounds); assertEllipticPoint(ctx, model, proof.point);
  demand(proof.place === place && place.degree === 1n, 'verification-failed', 'genus-one complete degree-one place mapping');
  if (equalAlgebraicPlaces(ctx, model.curve, model.presentation.origin, place)) {
    demand(proof.point.kind === 'infinity' && proof.x === null && proof.y === null, 'verification-failed', 'unique derived Weierstrass origin'); return;
  }
  demand(proof.point.kind === 'affine' && proof.x !== null && proof.y !== null, 'verification-failed', 'complete affine Weierstrass mapping');
  const c = model.curve.coordinates.constantOwner, x = verifyGenusOneLocalValueWithin(ctx, model, place, model.x, proof.x), y = verifyGenusOneLocalValueWithin(ctx, model, place, model.y, proof.y);
  demand(c.equal(ctx, proof.point.x, rationalPlaceConstantWithin(ctx, model.curve, place, x)) && c.equal(ctx, proof.point.y, rationalPlaceConstantWithin(ctx, model.curve, place, y)), 'verification-failed', 'native Weierstrass residue correspondence');
}
export function transportGenusOnePlaceWithin<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>, place: AlgebraicPlace<E>, bounds: DifferentialBounds): GenusOnePlaceTransport<E> {
  assertGenusOneCoordinates(ctx, model.presentation, model); verifyAlgebraicPlaceWithin(ctx, model.curve, place, bounds); demand(place.degree === 1n, 'invalid-input', 'genus-one rational place required');
  const origin = equalAlgebraicPlaces(ctx, model.curve, model.presentation.origin, place), x = origin ? null : localValue(ctx, model, place, model.x), y = origin ? null : localValue(ctx, model, place, model.y);
  const point = origin ? ellipticInfinity(ctx, model) : ellipticPoint(ctx, model,
    rationalPlaceConstantWithin(ctx, model.curve, place, verifyGenusOneLocalValueWithin(ctx, model, place, model.x, x!)), rationalPlaceConstantWithin(ctx, model.curve, place, verifyGenusOneLocalValueWithin(ctx, model, place, model.y, y!)));
  ctx.allocate(4); const proof = Object.freeze({place, point, x, y}); verifyGenusOnePlaceTransportWithin(ctx, model, place, proof, bounds); return proof;
}
