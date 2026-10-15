/** Complete Picard transport by a quotient of two Riemann–Roch spaces. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {assertAlgebraicDivisor, constructAlgebraicDivisorWithin, verifyAlgebraicDivisorWithin, type AlgebraicDivisor} from './algebraic-divisor';
import {solveAlgebraicRiemannRochWithin, verifyAlgebraicRiemannRochWithin, type AlgebraicRiemannRoch} from './algebraic-riemann-roch';
import {assertGenusOneCoordinates, verifyGenusOneCoordinatesWithin, verifyGenusOneNativeCoordinateWithin, type GenusOneCoordinates, type GenusOneCoordinate} from './genus-one-coordinates';
import {convertGenusOneNativeWithin} from './genus-one-coordinate-arithmetic';
import {ellipticInfinity, ellipticPoint, assertEllipticPoint, type EllipticPoint} from './elliptic-group';
import {algebraicConditions, verifyAlgebraicConditions, algebraicConstructionSources, type AlgebraicCondition} from './algebraic-conditions';
import type {CurveConstant} from './algebraic-curve-coordinates';
import type {ExactField} from './field';
import {requireImmutableExactEvidence} from './owned-validation';
import {reuseAlgebraicVerification} from './algebraic-proof-reuse';

export interface GenusOneDivisorClass<E> {
  readonly model: GenusOneCoordinates<E>; readonly divisor: AlgebraicDivisor<E>;
  readonly space: AlgebraicRiemannRoch<E>; readonly extended: AlgebraicRiemannRoch<E>; readonly index: number;
  readonly ratio: E; readonly coordinates: GenusOneCoordinate; readonly point: EllipticPoint<E, GenusOneCoordinates<E>>;
  /** D = [point]-[origin] - div(space.basis[0]), including every place. */
  readonly conditions: readonly AlgebraicCondition<E>[];
}
function request<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>, divisor: AlgebraicDivisor<E>, order: bigint) {
  ctx.allocate(divisor.entries.length + 1); return [...divisor.entries, {place: model.presentation.origin, coefficient: order}];
}
function sources<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>, value: E) {
  const original = algebraicConstructionSources(ctx, model.curve.owner); ctx.allocate(original.length + 1);
  return [...original, {field: model.curve.owner as ExactField<unknown>, value, nonzero: true, path: 'genus-one.class.correction'}];
}
/** Exact quotient shape identifies the complete effective degree-one divisor.
 * No zero factorization, root choice or local lift is used. */
function pointCoordinates<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>, image: GenusOneCoordinate): readonly [CurveConstant, CurveConstant]|null {
  const r = model.field.ring, f = model.field, c = model.curve.coordinates.constantOwner; model.ring.assert(ctx, image);
  demand(image.coefficients.length <= 2, 'verification-failed', 'reduced genus-one class ratio');
  const a = image.coefficients[0] ?? f.fromInteger(ctx, 0n), b = image.coefficients[1] ?? f.fromInteger(ctx, 0n);
  if (f.isZero(ctx, b)) {
    demand(r.degree(ctx, a.numerator) === 1 && r.degree(ctx, a.denominator) === 0, 'verification-failed', 'nonconstant complete L(2O) quotient'); return null;
  }
  demand(r.degree(ctx, b.numerator) === 0 && r.degree(ctx, b.denominator) === 1, 'verification-failed', 'simple Q+O quotient shape');
  const x = c.negate(ctx, c.exactDivide(ctx, b.denominator.coefficients[0] ?? c.fromInteger(ctx, 0n), b.denominator.coefficients[1])),
    leading = c.exactDivide(ctx, b.numerator.coefficients[0], b.denominator.coefficients[1]), linear = r.make(ctx, [c.negate(ctx, x), c.fromInteger(ctx, 1n)]),
    cleared = f.multiply(ctx, a, f.make(ctx, linear, r.one(ctx)));
  demand(r.degree(ctx, cleared.numerator) <= 1 && r.degree(ctx, cleared.denominator) === 0, 'verification-failed', 'complete finite quotient numerator');
  const constant = c.exactDivide(ctx, cleared.numerator.coefficients[0] ?? c.fromInteger(ctx, 0n), cleared.denominator.coefficients[0]),
    slope = c.exactDivide(ctx, cleared.numerator.coefficients[1] ?? c.fromInteger(ctx, 0n), cleared.denominator.coefficients[0]), y = c.exactDivide(ctx, c.add(ctx, constant, c.multiply(ctx, slope, x)), leading);
  ctx.allocate(2); return [x, y];
}
function verifyClass<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>, divisor: AlgebraicDivisor<E>, proof: GenusOneDivisorClass<E>, bounds: DifferentialBounds): void {
  assertGenusOneCoordinates(ctx, model.presentation, model); verifyGenusOneCoordinatesWithin(ctx, model.presentation, model, bounds); assertAlgebraicDivisor(ctx, model.curve, divisor); verifyAlgebraicDivisorWithin(ctx, model.curve, divisor.input, divisor);
  demand(proof.model === model && proof.divisor === divisor, 'domain-mismatch', 'genus-one class owned request'); demand(divisor.degree === 0n, 'verification-failed', 'degree-zero genus-one class');
  for (const [space, order] of [[proof.space, 1n], [proof.extended, 2n]] as const) {
    verifyAlgebraicDivisorWithin(ctx, model.curve, request(ctx, model, divisor, order), space.divisor); verifyAlgebraicRiemannRochWithin(ctx, model.curve, space.divisor, space, bounds);
    demand(BigInt(space.dimension) === order, 'verification-failed', 'complete genus-one quotient-space dimensions');
  }
  demand(Number.isSafeInteger(proof.index) && proof.index >= 0 && proof.index < proof.extended.dimension, 'verification-failed', 'complete quotient section index');
  const f = model.curve.owner; demand(!f.isZero(ctx, proof.space.basis[0]) && f.equal(ctx, f.multiply(ctx, proof.space.basis[0], proof.ratio), proof.extended.basis[proof.index]), 'verification-failed', 'exact native Riemann–Roch quotient');
  verifyGenusOneNativeCoordinateWithin(ctx, model, proof.ratio, proof.coordinates); assertEllipticPoint(ctx, model, proof.point);
  const expected = pointCoordinates(ctx, model, proof.coordinates), c = model.curve.coordinates.constantOwner;
  if (expected === null) demand(proof.point.kind === 'infinity', 'verification-failed', 'complete principal class representative');
  else demand(proof.point.kind === 'affine' && c.equal(ctx, expected[0], proof.point.x) && c.equal(ctx, expected[1], proof.point.y), 'verification-failed', 'complete Picard point correspondence');
  verifyAlgebraicConditions(ctx, f, sources(ctx, model, proof.space.basis[0]), proof.conditions, bounds); requireImmutableExactEvidence(ctx, proof, [model.curve]);
}
export function verifyGenusOneDivisorClassWithin<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>, divisor: AlgebraicDivisor<E>, proof: GenusOneDivisorClass<E>, bounds: DifferentialBounds): void {
  assertGenusOneCoordinates(ctx, model.presentation, model); demand(proof.model === model && proof.divisor === divisor, 'domain-mismatch', 'genus-one exact immutable request binding');
  reuseAlgebraicVerification(ctx, 'genus-one-class', model, proof, bounds, () => verifyClass(ctx, model, divisor, proof, bounds));
}
export function reduceGenusOneDivisorWithin<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds): GenusOneDivisorClass<E> {
  assertGenusOneCoordinates(ctx, model.presentation, model); verifyGenusOneCoordinatesWithin(ctx, model.presentation, model, bounds); assertAlgebraicDivisor(ctx, model.curve, divisor); demand(divisor.degree === 0n, 'invalid-input', 'degree-zero genus-one class required');
  const space = solveAlgebraicRiemannRochWithin(ctx, model.curve, constructAlgebraicDivisorWithin(ctx, model.curve, request(ctx, model, divisor, 1n)), bounds),
    extended = solveAlgebraicRiemannRochWithin(ctx, model.curve, constructAlgebraicDivisorWithin(ctx, model.curve, request(ctx, model, divisor, 2n)), bounds);
  demand(space.dimension === 1 && extended.dimension === 2, 'verification-failed', 'genus-one complete degree-one/two spaces');
  for (let index = 0; index < extended.basis.length; index++) {
    const ratio = model.curve.owner.exactDivide(ctx, extended.basis[index], space.basis[0]), coordinates = convertGenusOneNativeWithin(ctx, model, ratio), a = coordinates.coefficients[0];
    if (coordinates.coefficients.length <= 1 && (a === undefined || model.field.ring.degree(ctx, a.numerator) <= 0 && model.field.ring.degree(ctx, a.denominator) <= 0)) continue;
    const xy = pointCoordinates(ctx, model, coordinates), point = xy === null ? ellipticInfinity(ctx, model) : ellipticPoint(ctx, model, xy[0], xy[1]), conditions = algebraicConditions(ctx, model.curve.owner, sources(ctx, model, space.basis[0]), bounds);
    ctx.allocate(10); const proof = Object.freeze({model, divisor, space, extended, index, ratio, coordinates, point, conditions}); verifyGenusOneDivisorClassWithin(ctx, model, divisor, proof, bounds); return proof;
  }
  demand(false, 'verification-failed', 'complete genus-one quotient space contains no independent section');
}
export function reduceGenusOneDivisor<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds): GenusOneDivisorClass<E> {
  return ctx.operation(() => reduceGenusOneDivisorWithin(ctx, model, divisor, bounds));
}
export function verifyGenusOneDivisorClass<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>, divisor: AlgebraicDivisor<E>, proof: GenusOneDivisorClass<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyGenusOneDivisorClassWithin(ctx, model, divisor, proof, bounds));
}
