import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {assertAlgebraicPlace, verifyAlgebraicPlaceWithin, evaluateAlgebraicPlaceIntegral, type AlgebraicPlace} from './algebraic-place';
import type {CurveConstant} from './algebraic-curve-coordinates';
import type {CurvePlaceResidue} from './algebraic-residue-algebra';
import {assertEllipticModel, type EllipticCurveModel} from './elliptic-curve-model';
import {ellipticInfinity, ellipticPoint, assertEllipticPoint, type EllipticPoint} from './elliptic-group';
import type {AlgebraicCurveView} from './algebraic-curve';

export interface EllipticPlaceTransport<E> {
  readonly place: AlgebraicPlace<E>;
  readonly point: EllipticPoint<E>;
  readonly xResidue: CurvePlaceResidue | null;
  readonly yResidue: CurvePlaceResidue | null;
}
export function isEllipticRationalPlace<E>(ctx: ExecutionContext, model: EllipticCurveModel<E>, place: AlgebraicPlace<E>): boolean {
  assertEllipticModel(ctx, model.curve, model); assertAlgebraicPlace(ctx, model.curve, place); const b = place.algebra.base;
  return place.degree === 1n && place.residueDegree === 1n && place.prime.coefficients.length === 2
    && b.modulus.coefficients.length === 2 && place.residue.modulus.coefficients.length === 2;
}
function constantResidue<E>(ctx: ExecutionContext, model: EllipticCurveModel<E>, place: AlgebraicPlace<E>, value: CurvePlaceResidue): CurveConstant {
  demand(isEllipticRationalPlace(ctx, model, place), 'verification-failed', 'rational elliptic residue degree');
  return rationalPlaceConstantWithin(ctx, model.curve, place, value);
}
/** Identical exact constant descent for every owned degree-one curve place. */
export function rationalPlaceConstantWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, value: CurvePlaceResidue): CurveConstant {
  assertAlgebraicPlace(ctx, curve, place); demand(place.degree === 1n && place.residueDegree === 1n && place.prime.coefficients.length === 2
    && place.algebra.base.modulus.coefficients.length === 2 && place.residue.modulus.coefficients.length === 2, 'verification-failed', 'complete degree-one residue construction');
  const k = curve.coordinates.constantOwner, b = place.algebra.base, r = place.residue; r.assert(ctx, value);
  demand(b.parent === k && r.parent === b && value.representative.coefficients.length <= 1, 'verification-failed', 'elliptic residue constant ownership/coverage');
  const middle = value.representative.coefficients[0] ?? b.fromInteger(ctx, 0n); b.assert(ctx, middle);
  demand(middle.representative.coefficients.length <= 1, 'verification-failed', 'elliptic base residue coordinate coverage');
  const result = middle.representative.coefficients[0] ?? k.fromInteger(ctx, 0n); k.assert(ctx, result);
  demand(r.equal(ctx, value, r.embed(ctx, b.embed(ctx, result))), 'verification-failed', 'complete elliptic constant inverse reconstruction'); return result;
}
export function verifyEllipticPlaceTransport<E>(ctx: ExecutionContext, model: EllipticCurveModel<E>, place: AlgebraicPlace<E>, proof: EllipticPlaceTransport<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicPlaceWithin(ctx, model.curve, place, bounds); assertEllipticPoint(ctx, model, proof.point);
  demand(proof.place === place && isEllipticRationalPlace(ctx, model, place), 'verification-failed', 'elliptic place exact request');
  const k = model.curve.coordinates.constantOwner;
  if (place.order.infinity) {
    const r = place.prime.ring;
    demand(proof.point.kind === 'infinity' && proof.xResidue === null && proof.yResidue === null && place.ramification === 2n
      && r.equal(ctx, place.prime, r.make(ctx, [k.fromInteger(ctx, 0n), k.fromInteger(ctx, 1n)])), 'verification-failed', 'unique elliptic infinity place'); return;
  }
  demand(proof.point.kind === 'affine' && proof.xResidue !== null && proof.yResidue !== null, 'verification-failed', 'complete elliptic finite map');
  const x = evaluateAlgebraicPlaceIntegral(ctx, model.curve, place, model.x), y = evaluateAlgebraicPlaceIntegral(ctx, model.curve, place, model.y);
  demand(place.residue.equal(ctx, x, proof.xResidue) && place.residue.equal(ctx, y, proof.yResidue)
    && k.equal(ctx, proof.point.x, constantResidue(ctx, model, place, x)) && k.equal(ctx, proof.point.y, constantResidue(ctx, model, place, y)), 'verification-failed', 'elliptic residue-map correspondence');
  const originalX = k.negate(ctx, k.exactDivide(ctx, place.prime.coefficients[0] ?? k.fromInteger(ctx, 0n), place.prime.coefficients[1]));
  demand(k.equal(ctx, proof.point.x, k.multiply(ctx, model.leading, originalX)), 'verification-failed', 'elliptic base-prime map');
}
export function transportEllipticPlace<E>(ctx: ExecutionContext, model: EllipticCurveModel<E>, place: AlgebraicPlace<E>, bounds: DifferentialBounds): EllipticPlaceTransport<E> {
  demand(isEllipticRationalPlace(ctx, model, place), 'invalid-input', 'elliptic rational place required');
  const xResidue = place.order.infinity ? null : evaluateAlgebraicPlaceIntegral(ctx, model.curve, place, model.x);
  const yResidue = place.order.infinity ? null : evaluateAlgebraicPlaceIntegral(ctx, model.curve, place, model.y);
  const point = place.order.infinity ? ellipticInfinity(ctx, model) : ellipticPoint(ctx, model, constantResidue(ctx, model, place, xResidue!), constantResidue(ctx, model, place, yResidue!));
  ctx.allocate(4); const proof = Object.freeze({place, point, xResidue, yResidue}); verifyEllipticPlaceTransport(ctx, model, place, proof, bounds); return proof;
}
