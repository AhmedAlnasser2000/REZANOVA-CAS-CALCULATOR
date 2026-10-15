/** A Pell unit and its full infinity divisor, transported to the supplied owner. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {CurvePlaceResidue} from './algebraic-residue-algebra';
import {verifyAlgebraicPlaceWithin, equalAlgebraicPlaces, evaluateAlgebraicPlaceIntegral, type AlgebraicPlace} from './algebraic-place';
import {algebraicFunctionPower} from './algebraic-function-power';
import {algebraicConditions, algebraicConstructionSources, verifyAlgebraicConditions, type AlgebraicCondition} from './algebraic-conditions';
import {hyperellipticNativePolynomial, verifySplitHyperellipticModelWithin, type SplitHyperellipticModel} from './hyperelliptic-curve-model';
import {verifyPolynomialPellWithin, type PolynomialPellDecision} from './polynomial-pell';

export interface HyperellipticPellUnit<E> {
  readonly model: SplitHyperellipticModel<E>;
  readonly pell: PolynomialPellDecision<import('./algebraic-curve-coordinates').CurveConstant>;
  readonly argument: E;
  readonly conjugate: E;
  readonly inverse: E;
  readonly norm: E;
  readonly conditions: readonly AlgebraicCondition<E>[];
}
export interface SplitHyperellipticInfinity<E> {
  readonly model: SplitHyperellipticModel<E>;
  readonly positive: AlgebraicPlace<E>;
  readonly negative: AlgebraicPlace<E>;
  readonly scaledY: E;
  readonly positiveResidue: CurvePlaceResidue;
  readonly negativeResidue: CurvePlaceResidue;
}
export interface HyperellipticPellInfinity<E> extends SplitHyperellipticInfinity<E> {readonly unit: HyperellipticPellUnit<E>; readonly poleDegree: bigint}
function sources<E>(ctx: ExecutionContext, model: SplitHyperellipticModel<E>, argument: E, inverse: E) {
  const owner = model.curve.owner;
  return [...algebraicConstructionSources(ctx, owner), {field: owner, value: argument, path: 'pell.argument', nonzero: true}, {field: owner, value: inverse, path: 'pell.inverse'}];
}
export function verifyHyperellipticPellUnitWithin<E>(ctx: ExecutionContext, model: SplitHyperellipticModel<E>, proof: HyperellipticPellUnit<E>, bounds: DifferentialBounds): void {
  verifySplitHyperellipticModelWithin(ctx, model.curve, model, bounds); const owner = model.curve.owner, c = model.curve.coordinates;
  demand(proof.model === model, 'domain-mismatch', 'Pell native model binding');
  const pell = proof.pell, r = model.polynomial.ring;
  verifyPolynomialPellWithin(ctx, r, model.polynomial, pell.maximumDegree, pell, bounds);
  demand(pell.kind === 'unit' && pell.numerator !== null && pell.denominator !== null && pell.norm !== null && pell.leastDegree !== null, 'verification-failed', 'complete positive Pell unit');
  demand(c.constantOwner.equal(ctx, r.leading(ctx, pell.numerator), r.leading(ctx, pell.denominator)), 'verification-failed', 'formal plus-root unit orientation');
  const p = hyperellipticNativePolynomial(ctx, model, pell.numerator), q = hyperellipticNativePolynomial(ctx, model, pell.denominator), qy = owner.multiply(ctx, q, model.y), norm = c.scalarNative(ctx, c.scalar.fromCoefficient(ctx, pell.norm));
  demand(owner.equal(ctx, proof.argument, owner.add(ctx, p, qy)) && owner.equal(ctx, proof.conjugate, owner.subtract(ctx, p, qy))
    && owner.equal(ctx, norm, proof.norm) && !owner.isZero(ctx, norm) && owner.equal(ctx, proof.inverse, owner.exactDivide(ctx, proof.conjugate, norm)), 'verification-failed', 'complete native Pell argument/conjugate/unit map');
  // The checked coefficient norm and full native-basis isomorphism prove the
  // inverse identity without expanding a high-degree native product.
  verifyAlgebraicConditions(ctx, owner, sources(ctx, model, proof.argument, proof.inverse), proof.conditions, bounds);
}
export function constructHyperellipticPellUnitWithin<E>(ctx: ExecutionContext, model: SplitHyperellipticModel<E>, pell: HyperellipticPellUnit<E>['pell'], bounds: DifferentialBounds): HyperellipticPellUnit<E> {
  verifySplitHyperellipticModelWithin(ctx, model.curve, model, bounds);
  verifyPolynomialPellWithin(ctx, model.polynomial.ring, model.polynomial, pell.maximumDegree, pell, bounds);
  demand(pell.kind === 'unit' && pell.numerator !== null && pell.denominator !== null && pell.norm !== null, 'invalid-input', 'positive Pell proof required');
  const owner = model.curve.owner, c = model.curve.coordinates, p = hyperellipticNativePolynomial(ctx, model, pell.numerator), q = hyperellipticNativePolynomial(ctx, model, pell.denominator), qy = owner.multiply(ctx, q, model.y);
  const argument = owner.add(ctx, p, qy), conjugate = owner.subtract(ctx, p, qy), norm = c.scalarNative(ctx, c.scalar.fromCoefficient(ctx, pell.norm)), inverse = owner.exactDivide(ctx, conjugate, norm);
  ctx.allocate(7); const proof = Object.freeze({model, pell, argument, conjugate, norm, inverse, conditions: algebraicConditions(ctx, owner, sources(ctx, model, argument, inverse), bounds)});
  verifyHyperellipticPellUnitWithin(ctx, model, proof, bounds); return proof;
}
export function verifySplitHyperellipticInfinityWithin<E>(ctx: ExecutionContext, model: SplitHyperellipticModel<E>, proof: SplitHyperellipticInfinity<E>, bounds: DifferentialBounds): void {
  verifySplitHyperellipticModelWithin(ctx, model.curve, model, bounds); demand(proof.model === model, 'domain-mismatch', 'split infinity model binding'); const curve = model.curve, owner = curve.owner;
  for (const place of [proof.positive, proof.negative]) {
    verifyAlgebraicPlaceWithin(ctx, curve, place, bounds); const r = place.prime.ring;
    demand(place.order === curve.infinity && place.ramification === 1n && place.residueDegree === 1n && place.degree === 1n
      && r.equal(ctx, place.prime, r.make(ctx, [r.domain.fromInteger(ctx, 0n), r.domain.fromInteger(ctx, 1n)])), 'verification-failed', 'split unramified rational infinity place');
  }
  demand(!equalAlgebraicPlaces(ctx, curve, proof.positive, proof.negative), 'verification-failed', 'two distinct complete infinity places');
  const expected = owner.exactDivide(ctx, model.y, algebraicFunctionPower(ctx, owner, model.x, BigInt(model.halfDegree)));
  demand(owner.equal(ctx, expected, proof.scaledY), 'verification-failed', 'exact infinity root coordinate');
  const positive = evaluateAlgebraicPlaceIntegral(ctx, curve, proof.positive, expected), negative = evaluateAlgebraicPlaceIntegral(ctx, curve, proof.negative, expected);
  demand(proof.positive.residue.equal(ctx, proof.positiveResidue, positive) && proof.positive.residue.equal(ctx, positive, proof.positive.residue.fromInteger(ctx, 1n))
    && proof.negative.residue.equal(ctx, proof.negativeResidue, negative) && proof.negative.residue.equal(ctx, negative, proof.negative.residue.fromInteger(ctx, -1n)), 'verification-failed', 'complete infinity orientation');
}
export function constructSplitHyperellipticInfinityWithin<E>(ctx: ExecutionContext, model: SplitHyperellipticModel<E>, positive: AlgebraicPlace<E>, negative: AlgebraicPlace<E>, bounds: DifferentialBounds): SplitHyperellipticInfinity<E> {
  verifySplitHyperellipticModelWithin(ctx, model.curve, model, bounds); const owner = model.curve.owner;
  const scaledY = owner.exactDivide(ctx, model.y, algebraicFunctionPower(ctx, owner, model.x, BigInt(model.halfDegree)));
  ctx.allocate(6); const proof = Object.freeze({model, positive, negative, scaledY, positiveResidue: evaluateAlgebraicPlaceIntegral(ctx, model.curve, positive, scaledY), negativeResidue: evaluateAlgebraicPlaceIntegral(ctx, model.curve, negative, scaledY)});
  verifySplitHyperellipticInfinityWithin(ctx, model, proof, bounds); return proof;
}
export function verifyHyperellipticPellInfinityWithin<E>(ctx: ExecutionContext, model: SplitHyperellipticModel<E>, proof: HyperellipticPellInfinity<E>, bounds: DifferentialBounds): void {
  verifyHyperellipticPellUnitWithin(ctx, model, proof.unit, bounds); verifySplitHyperellipticInfinityWithin(ctx, model, proof, bounds);
  demand(proof.poleDegree === proof.unit.pell.leastDegree, 'verification-failed', 'full unit pole degree');
  // p,q,Y are integral on the complete affine curve. Its inverse is the
  // conjugate divided by a nonzero constant, so neither has finite support.
  // At + infinity the noncancelling leading coefficient gives pole -N;
  // constant norm and the two-place coverage give valuation +N at - infinity.
}
export function constructHyperellipticPellInfinityWithin<E>(ctx: ExecutionContext, model: SplitHyperellipticModel<E>, unit: HyperellipticPellUnit<E>, positive: AlgebraicPlace<E>, negative: AlgebraicPlace<E>, bounds: DifferentialBounds): HyperellipticPellInfinity<E> {
  verifyHyperellipticPellUnitWithin(ctx, model, unit, bounds); const pair = constructSplitHyperellipticInfinityWithin(ctx, model, positive, negative, bounds);
  ctx.allocate(8); const proof = Object.freeze({...pair, unit, poleDegree: unit.pell.leastDegree!});
  verifyHyperellipticPellInfinityWithin(ctx, model, proof, bounds); return proof;
}
export function constructHyperellipticPellUnit<E>(ctx: ExecutionContext, model: SplitHyperellipticModel<E>, pell: HyperellipticPellUnit<E>['pell'], bounds: DifferentialBounds) {
  return ctx.operation(() => constructHyperellipticPellUnitWithin(ctx, model, pell, bounds));
}
export function verifyHyperellipticPellUnit<E>(ctx: ExecutionContext, model: SplitHyperellipticModel<E>, proof: HyperellipticPellUnit<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyHyperellipticPellUnitWithin(ctx, model, proof, bounds));
}
