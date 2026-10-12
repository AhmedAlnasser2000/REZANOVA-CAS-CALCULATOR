import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import type { Polynomial } from './polynomial';
import { polynomialDivide, extendedGcd, verifyBezout, type Bezout } from './polynomial-division';
import { curveOrderCoordinates, verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { assertAlgebraicPlace, type AlgebraicPlace } from './algebraic-place';
import type { CurveConstant, CurveScalar } from './algebraic-curve-coordinates';
import { curveDenominators, verifyCurveDenominators, type CurveDenominators } from './algebraic-curve-lattice';
import { freezeExactMatrix, invertExactMatrix, verifyExactMatrixInverse, determinantFromInverse, type MatrixInverse } from './algebraic-matrix';
import { unitCurveIdeal, multiplyCurveIdeals, verifyCurveIdealProduct, reconstructCurveIdeal, multiplyCurveOrderVectors, curveIdealContainsVector,
  type CurveFractionalIdeal, type CurveIdealProduct } from './algebraic-fractional-ideal';

export interface CurvePolynomialOrder {
  readonly input: Polynomial<CurveConstant>;
  readonly prime: Polynomial<CurveConstant>;
  readonly quotients: readonly Polynomial<CurveConstant>[];
  readonly final: Polynomial<CurveConstant>;
  readonly coprime: Bezout<CurveConstant>;
}
export function curvePolynomialOrder(ctx: ExecutionContext, input: Polynomial<CurveConstant>, prime: Polynomial<CurveConstant>): CurvePolynomialOrder {
  const r = input.ring; r.assert(ctx, prime); demand(!r.isZero(ctx, input) && r.degree(ctx, prime) > 0, 'invalid-input', 'finite polynomial order');
  const quotients: Polynomial<CurveConstant>[] = []; let current = input;
  for (;;) {
    const division = polynomialDivide(ctx, r, current, prime); if (!r.isZero(ctx, division.remainder)) break;
    demand(r.degree(ctx, division.quotient) < r.degree(ctx, current), 'verification-failed', 'polynomial valuation degree progress');
    ctx.allocate(1); quotients.push(division.quotient); current = division.quotient;
  }
  const coprime = extendedGcd(ctx, r, current, prime), result = Object.freeze({input, prime, quotients: Object.freeze(quotients), final: current, coprime});
  verifyCurvePolynomialOrder(ctx, input, prime, result); return result;
}
export function verifyCurvePolynomialOrder(ctx: ExecutionContext, input: Polynomial<CurveConstant>, prime: Polynomial<CurveConstant>, proof: CurvePolynomialOrder): void {
  const r = input.ring; r.assert(ctx, prime);
  demand(!r.isZero(ctx, input) && r.degree(ctx, prime) > 0 && r.equal(ctx, input, proof.input) && r.equal(ctx, prime, proof.prime),
    'verification-failed', 'polynomial valuation request');
  let current = input;
  for (const q of proof.quotients) {
    demand(!r.isZero(ctx, q) && r.degree(ctx, q) < r.degree(ctx, current) && r.equal(ctx, r.multiply(ctx, q, prime), current),
      'verification-failed', 'valuation quotient reconstruction'); current = q;
  }
  demand(r.equal(ctx, current, proof.final), 'verification-failed', 'valuation final quotient');
  verifyBezout(ctx, r, current, prime, proof.coprime);
  demand(r.equal(ctx, proof.coprime.gcd, r.one(ctx)), 'verification-failed', 'valuation exact terminal coprimality');
}

export interface AlgebraicValuation<E> {
  readonly place: AlgebraicPlace<E>;
  readonly input: E;
  readonly coordinates: readonly CurveScalar[];
  readonly denominators: CurveDenominators;
  readonly integral: readonly CurveScalar[];
  readonly norm: MatrixInverse<CurveScalar>;
  readonly normOrder: CurvePolynomialOrder;
  readonly denominatorOrder: CurvePolynomialOrder;
  readonly unit: CurveFractionalIdeal<E>;
  /** Includes the first failed power, which certifies the exact valuation. */
  readonly powers: readonly CurveIdealProduct<E>[];
  readonly integralOrder: bigint;
  readonly value: bigint;
}
function integralCoordinates<E>(ctx: ExecutionContext, place: AlgebraicPlace<E>, coordinates: readonly CurveScalar[], denominator: Polynomial<CurveConstant>) {
  const f = place.order.lattice.scalar, scale = f.make(ctx, denominator, f.ring.one(ctx)); ctx.allocate(coordinates.length);
  return Object.freeze(coordinates.map(v => f.multiply(ctx, v, scale)));
}
function normMatrix<E>(ctx: ExecutionContext, place: AlgebraicPlace<E>, integral: readonly CurveScalar[]) {
  const order = place.order, n = order.lattice.dimension, f = order.lattice.scalar;
  ctx.allocate(n * n); const columns = Array.from({length: n}, (_, j) => multiplyCurveOrderVectors(ctx, order, integral,
    Array.from({length: n}, (_, i) => f.fromInteger(ctx, i === j ? 1n : 0n))));
  return freezeExactMatrix(ctx, Array.from({length: n}, (_, i) => columns.map(column => column[i])));
}
export function verifyUnitCurveIdeal<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, ideal: CurveFractionalIdeal<E>): void {
  const f = ideal.order.lattice.scalar, n = ideal.lattice.dimension; ctx.allocate(n * n);
  const identity = freezeExactMatrix(ctx, Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => f.fromInteger(ctx, i === j ? 1n : 0n))));
  reconstructCurveIdeal(ctx, curve, ideal.order.infinity, identity, ideal.lattice);
}
export function algebraicValuationWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, input: E): AlgebraicValuation<E> {
  assertAlgebraicPlace(ctx, curve, place); curve.owner.assert(ctx, input); demand(!curve.owner.isZero(ctx, input), 'invalid-input', 'zero has no finite valuation');
  const f = place.order.lattice.scalar, coordinates = curveOrderCoordinates(ctx, curve.coordinates, place.order, input);
  const denominators = curveDenominators(ctx, f.ring, coordinates.map(v => v.denominator)), integral = integralCoordinates(ctx, place, coordinates, denominators.common);
  const norm = invertExactMatrix(ctx, f, normMatrix(ctx, place, integral)); demand(norm !== null, 'verification-failed', 'nonzero function norm');
  const determinant = determinantFromInverse(ctx, f, norm);
  demand(f.ring.degree(ctx, determinant.denominator) === 0, 'verification-failed', 'integral function polynomial norm');
  const normOrder = curvePolynomialOrder(ctx, determinant.numerator, place.prime), denominatorOrder = curvePolynomialOrder(ctx, denominators.common, place.prime);
  const unit = unitCurveIdeal(ctx, curve, place.order.infinity), powers: CurveIdealProduct<E>[] = []; let power = unit, integralOrder = 0n;
  const upper = ctx.quotient(BigInt(normOrder.quotients.length), place.residueDegree);
  for (;;) {
    const step = multiplyCurveIdeals(ctx, curve, power, place.ideal); ctx.allocate(1); powers.push(step); power = step.result;
    if (!curveIdealContainsVector(ctx, power, integral)) break;
    integralOrder = ctx.add(integralOrder, 1n); demand(integralOrder <= upper, 'verification-failed', 'valuation norm bound');
  }
  const value = ctx.add(integralOrder, -ctx.multiply(place.ramification, BigInt(denominatorOrder.quotients.length)));
  const proof = Object.freeze({place, input, coordinates, denominators, integral, norm, normOrder, denominatorOrder, unit, powers: Object.freeze(powers), integralOrder, value});
  verifyAlgebraicValuationWithin(ctx, curve, place, input, proof); return proof;
}
export function verifyAlgebraicValuationWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, input: E, proof: AlgebraicValuation<E>): void {
  assertAlgebraicPlace(ctx, curve, place); curve.owner.assert(ctx, input);
  demand(!curve.owner.isZero(ctx, input) && proof.place === place && curve.owner.equal(ctx, input, proof.input), 'verification-failed', 'valuation exact input/place');
  const f = place.order.lattice.scalar, coordinates = curveOrderCoordinates(ctx, curve.coordinates, place.order, input);
  demand(proof.coordinates.length === coordinates.length && coordinates.every((v, i) => f.equal(ctx, v, proof.coordinates[i])), 'verification-failed', 'valuation coordinate coverage');
  verifyCurveDenominators(ctx, f.ring, coordinates.map(v => v.denominator), proof.denominators);
  const integral = integralCoordinates(ctx, place, coordinates, proof.denominators.common);
  demand(proof.integral.length === integral.length && integral.every((v, i) => f.equal(ctx, v, proof.integral[i]) && f.ring.degree(ctx, v.denominator) === 0),
    'verification-failed', 'valuation integral reconstruction');
  verifyExactMatrixInverse(ctx, f, normMatrix(ctx, place, integral), proof.norm);
  const determinant = determinantFromInverse(ctx, f, proof.norm);
  demand(f.ring.degree(ctx, determinant.denominator) === 0, 'verification-failed', 'valuation integral norm');
  verifyCurvePolynomialOrder(ctx, determinant.numerator, place.prime, proof.normOrder);
  verifyCurvePolynomialOrder(ctx, proof.denominators.common, place.prime, proof.denominatorOrder);
  verifyUnitCurveIdeal(ctx, curve, proof.unit); let power = proof.unit, order = 0n;
  demand(proof.powers.length > 0, 'verification-failed', 'valuation missing failed power');
  for (let i = 0; i < proof.powers.length; i++) {
    verifyCurveIdealProduct(ctx, curve, power, place.ideal, proof.powers[i]); power = proof.powers[i].result;
    const belongs = curveIdealContainsVector(ctx, power, integral);
    demand(belongs === (i < proof.powers.length - 1), 'verification-failed', 'valuation membership/failure coverage');
    if (belongs) order = ctx.add(order, 1n);
  }
  demand(order === proof.integralOrder && ctx.multiply(order, place.residueDegree) <= BigInt(proof.normOrder.quotients.length)
    && proof.value === ctx.add(order, -ctx.multiply(place.ramification, BigInt(proof.denominatorOrder.quotients.length))),
    'verification-failed', 'valuation exact integer mapping');
}
export function algebraicValuation<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, input: E, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return algebraicValuationWithin(ctx, curve, place, input); });
}
export function verifyAlgebraicValuation<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, input: E, proof: AlgebraicValuation<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicValuationWithin(ctx, curve, place, input, proof); });
}
