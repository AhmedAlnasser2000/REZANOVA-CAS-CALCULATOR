/** Native inverse correspondences in the derived quadratic coordinate algebra.
 * This is a coordinate representation, never a new capability-labelled field. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {PolynomialRing, assertPolynomialRingOwner, type Polynomial} from './polynomial';
import {RationalFunctionField, assertRationalFunctionFieldOwner} from './rational-function';
import type {CurveConstant, CurveScalar} from './algebraic-curve-coordinates';
import {principalAlgebraicDivisorWithin} from './algebraic-divisor';
import {constructAlgebraicCoefficientSystem} from './algebraic-coefficient-system';
import {solveLinearSystem} from './linear-system';
import {assertGenusOnePresentation, verifyGenusOnePresentationWithin, type GenusOnePresentation} from './genus-one-presentation';
import {requireImmutableExactEvidence} from './owned-validation';
import type {AlgebraicCurveView} from './algebraic-curve';
import {reuseAlgebraicVerification} from './algebraic-proof-reuse';

export type GenusOneCoordinate = Polynomial<CurveScalar>;
export interface GenusOneCoordinates<E> {
  readonly presentation: GenusOnePresentation<E>; readonly field: RationalFunctionField<CurveConstant>;
  readonly ring: PolynomialRing<CurveScalar>; readonly baseImage: GenusOneCoordinate; readonly basisImages: readonly GenusOneCoordinate[];
  readonly curve: AlgebraicCurveView<E>; readonly polynomial: Polynomial<CurveConstant>; readonly x: E; readonly y: E;
}
const owners = new WeakSet<object>();
export function isGenusOneCoordinates(proof: unknown): proof is GenusOneCoordinates<unknown> {
  return typeof proof === 'object' && proof !== null && owners.has(proof);
}
function nativePolynomial<E>(ctx: ExecutionContext, p: GenusOnePresentation<E>, polynomial: Polynomial<CurveConstant>): E {
  polynomial.ring.assert(ctx, polynomial); const f = p.curve.owner, c = p.curve.coordinates; let result = f.fromInteger(ctx, 0n);
  for (let i = polynomial.coefficients.length - 1; i >= 0; i--) result = f.add(ctx, f.multiply(ctx, result, p.x), c.scalarNative(ctx, c.scalar.fromCoefficient(ctx, polynomial.coefficients[i])));
  return result;
}
function checkOwners<E>(ctx: ExecutionContext, view: GenusOneCoordinates<E>): void {
  const p = view.presentation; assertGenusOnePresentation(ctx, p.curve, p); assertRationalFunctionFieldOwner(ctx, view.field); assertPolynomialRingOwner(ctx, view.ring);
  demand(view.ring.domain === view.field && view.field.ring === p.polynomial.ring, 'domain-mismatch', 'genus-one exact coordinate owners');
}
/** Cross multiplication verifies conversion without native inverse producers. */
export function verifyGenusOneNativeCoordinateWithin<E>(ctx: ExecutionContext, view: GenusOneCoordinates<E>, value: E, image: GenusOneCoordinate): void {
  checkOwners(ctx, view); view.ring.assert(ctx, image); demand(image.coefficients.length <= 2, 'verification-failed', 'reduced genus-one coordinates');
  const p = view.presentation, f = p.curve.owner, a = image.coefficients[0] ?? view.field.fromInteger(ctx, 0n), b = image.coefficients[1] ?? view.field.fromInteger(ctx, 0n);
  f.assert(ctx, value); const an = nativePolynomial(ctx, p, a.numerator), ad = nativePolynomial(ctx, p, a.denominator), bn = nativePolynomial(ctx, p, b.numerator), bd = nativePolynomial(ctx, p, b.denominator);
  demand(!f.isZero(ctx, ad) && !f.isZero(ctx, bd), 'verification-failed', 'coordinate denominator units under transcendental map');
  demand(f.equal(ctx, f.multiply(ctx, f.multiply(ctx, value, ad), bd), f.add(ctx, f.multiply(ctx, an, bd), f.multiply(ctx, f.multiply(ctx, bn, ad), p.y))), 'verification-failed', 'native inverse coordinate identity');
}
function oldVariable<E>(ctx: ExecutionContext, p: GenusOnePresentation<E>): E {
  const c = p.curve.coordinates, r = c.scalar.ring; return c.scalarNative(ctx, c.scalar.make(ctx, r.make(ctx, [r.domain.fromInteger(ctx, 0n), r.domain.fromInteger(ctx, 1n)]), r.one(ctx)));
}
/** Complete degree bound comes from the native pole divisor, not a trial. */
function recover<E>(ctx: ExecutionContext, p: GenusOnePresentation<E>, field: RationalFunctionField<CurveConstant>, ring: PolynomialRing<CurveScalar>, value: E, bounds: DifferentialBounds): GenusOneCoordinate {
  const divisor = principalAlgebraicDivisorWithin(ctx, p.curve, value, bounds); let degree = 0n;
  for (const e of divisor.divisor.entries) if (e.coefficient < 0n) degree = ctx.add(degree, ctx.multiply(-e.coefficient, e.place.degree));
  const powers = ctx.add(degree, 1n), bCount = degree >= 2n ? ctx.add(degree, -1n) : 0n, width = ctx.add(ctx.multiply(2n, powers), bCount);
  const slots = ctx.add(ctx.multiply(3n, width), powers); if (slots > BigInt(Number.MAX_SAFE_INTEGER)) ctx.exhaust('genus-one coordinate dimensions');
  ctx.allocate(Number(slots)); const d = Number(degree), countB = Number(bCount), f = p.curve.owner, list: E[] = []; let power = f.fromInteger(ctx, 1n);
  for (let i = 0; i <= d; i++) {list.push(power); if (i < d) power = f.multiply(ctx, power, p.x);}
  const columns = [...list, ...list.slice(0, countB).map(v => f.multiply(ctx, p.y, v)), ...list.map(v => f.negate(ctx, f.multiply(ctx, value, v)))];
  const matrix = constructAlgebraicCoefficientSystem(ctx, p.curve, f.fromInteger(ctx, 0n), columns), solved = solveLinearSystem(ctx, p.curve.coordinates.constantOwner, matrix.system);
  demand(solved.kind === 'consistent', 'verification-failed', 'homogeneous genus-one coordinate recovery');
  for (const vector of solved.nullspace) {
    const denominator = field.ring.make(ctx, vector.slice(d + 1 + countB)); if (field.ring.isZero(ctx, denominator)) continue;
    return ring.make(ctx, [field.make(ctx, field.ring.make(ctx, vector.slice(0, d + 1)), denominator), field.make(ctx, field.ring.make(ctx, vector.slice(d + 1, d + 1 + countB)), denominator)]);
  }
  demand(false, 'verification-failed', 'complete coordinate recovery has no nonzero denominator');
}
function verifyCoordinates<E>(ctx: ExecutionContext, p: GenusOnePresentation<E>, proof: GenusOneCoordinates<E>, bounds: DifferentialBounds): void {
  verifyGenusOnePresentationWithin(ctx, p.curve, p.origin, p, bounds); demand(proof.presentation === p && proof.curve === p.curve && proof.polynomial === p.polynomial && proof.x === p.x && proof.y === p.y, 'domain-mismatch', 'genus-one coordinate supplied presentation'); checkOwners(ctx, proof);
  const basis = p.curve.coordinates.basis; demand(proof.basisImages.length === basis.length, 'verification-failed', 'complete native basis correspondence');
  verifyGenusOneNativeCoordinateWithin(ctx, proof, oldVariable(ctx, p), proof.baseImage);
  for (let i = 0; i < basis.length; i++) verifyGenusOneNativeCoordinateWithin(ctx, proof, basis[i], proof.basisImages[i]);
  // The verified pole degrees establish K=C(X,Y), so this exact inverse diagram
  // covers the full field and not merely a collection of correctly mapped values.
}
export function verifyGenusOneCoordinatesWithin<E>(ctx: ExecutionContext, p: GenusOnePresentation<E>, proof: GenusOneCoordinates<E>, bounds: DifferentialBounds): void {
  demand(proof.presentation === p, 'domain-mismatch', 'genus-one exact expected presentation');
  reuseAlgebraicVerification(ctx, 'genus-one-coordinates', p, proof, bounds, () => verifyCoordinates(ctx, p, proof, bounds));
}
export function reconstructGenusOneCoordinatesWithin<E>(ctx: ExecutionContext, p: GenusOnePresentation<E>, field: RationalFunctionField<CurveConstant>, ring: PolynomialRing<CurveScalar>, baseImage: GenusOneCoordinate, basisImages: readonly GenusOneCoordinate[], bounds: DifferentialBounds): GenusOneCoordinates<E> {
  ctx.allocate(9); const proof = Object.freeze({presentation: p, field, ring, baseImage, basisImages, curve: p.curve, polynomial: p.polynomial, x: p.x, y: p.y}); verifyGenusOneCoordinatesWithin(ctx, p, proof, bounds);
  requireImmutableExactEvidence(ctx, proof, [p.curve]); owners.add(proof); return proof;
}
export function constructGenusOneCoordinatesWithin<E>(ctx: ExecutionContext, p: GenusOnePresentation<E>, bounds: DifferentialBounds): GenusOneCoordinates<E> {
  verifyGenusOnePresentationWithin(ctx, p.curve, p.origin, p, bounds); assertGenusOnePresentation(ctx, p.curve, p);
  const field = new RationalFunctionField(p.polynomial.ring), ring = new PolynomialRing(field, 'Y'), baseImage = recover(ctx, p, field, ring, oldVariable(ctx, p), bounds); ctx.allocate(p.curve.coordinates.basis.length);
  const basisImages = Object.freeze(p.curve.coordinates.basis.map(v => recover(ctx, p, field, ring, v, bounds)));
  return reconstructGenusOneCoordinatesWithin(ctx, p, field, ring, baseImage, basisImages, bounds);
}
export function constructGenusOneCoordinates<E>(ctx: ExecutionContext, p: GenusOnePresentation<E>, bounds: DifferentialBounds): GenusOneCoordinates<E> {
  return ctx.operation(() => constructGenusOneCoordinatesWithin(ctx, p, bounds));
}
export function verifyGenusOneCoordinates<E>(ctx: ExecutionContext, p: GenusOnePresentation<E>, proof: GenusOneCoordinates<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyGenusOneCoordinatesWithin(ctx, p, proof, bounds));
}
export function assertGenusOneCoordinates<E>(ctx: ExecutionContext, p: GenusOnePresentation<E>, proof: GenusOneCoordinates<E>): void {
  ctx.tick(); demand(owners.has(proof) && proof.presentation === p, 'domain-mismatch', 'owned complete genus-one correspondence');
}
