/** Complete finite two-infinity class orders, not general divisor reduction. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {PositivePolynomial} from './positive-polynomial';
import type {PositiveFraction} from './positive-fraction';
import type {FiniteExtensionValue} from './positive-extension';
import {verifyReducedCurveModel, type ReducedCurveModel} from './reduced-model';
import {type ReducedCurveView, type ReducedCurveValue} from './reduced-curve';
import {assertReducedDivisor, verifyReducedDivisor, type ReducedDivisor} from './reduced-divisor';
import {verifyReducedPlace, equalReducedPlaces, evaluateReducedPlaceIntegral, type ReducedPlace} from './reduced-place';
import {finiteJacobianBound, verifyFiniteJacobianBound, factorPositiveInteger, verifyPositiveIntegerFactors, type FiniteJacobianBound, type IntegerPrimeFactor} from './reduced-divisor-order';
import {solvePositivePellWithin, verifyPositivePellWithin, type PositivePellDecision} from './positive-pell';
import {integerGcd} from './rational';

export interface ReducedInfinityPellOrder<E> {
  readonly rule: 'finite-infinity-pell-order-v1'; readonly divisor: ReducedDivisor<E>;
  readonly model: ReducedCurveModel<E>; readonly b: PositiveFraction<E>; readonly c: PositiveFraction<E>;
  readonly polynomial: PositivePolynomial<E>; readonly halfDegree: number;
  readonly positive: ReducedPlace<E>; readonly negative: ReducedPlace<E>; readonly scaledY: ReducedCurveValue<E>;
  readonly positiveResidue: FiniteExtensionValue<FiniteExtensionValue<E>>; readonly negativeResidue: FiniteExtensionValue<FiniteExtensionValue<E>>;
  readonly coefficient: bigint; readonly bound: FiniteJacobianBound; readonly pell: PositivePellDecision<E>;
  readonly argument: ReducedCurveValue<E>; readonly order: bigint; readonly factors: readonly IntegerPrimeFactor[];
  readonly exclusions: readonly Readonly<{prime: bigint; quotient: bigint; remainder: bigint}>[];
  readonly exponent: bigint;
}
function presentation<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, model: ReducedCurveModel<E>) {
  verifyReducedCurveModel(ctx, curve.algebra, model); demand(curve.finite === model.finite && curve.infinity === model.infinity && curve.genus === model.genus && curve.field.algebra === curve.algebra, 'verification-failed', 'finite Pell proper curve correspondence');
  const a = curve.algebra, f = a.scalar, r = f.ring, field = a.constants;
  demand(a.dimension === 2 && a.relation.coefficients.length === 3 && field.characteristic > 2n, 'domain-mismatch', 'finite quadratic odd-characteristic Pell presentation');
  const b = a.relation.coefficients[1], c = a.relation.coefficients[0], square = f.subtract(ctx, f.exactDivide(ctx, f.multiply(ctx, b, b), f.fromInteger(ctx, 4n)), c), degree = r.degree(ctx, square.numerator);
  demand(r.degree(ctx, square.denominator) === 0 && degree >= 2 && degree % 2 === 0 && field.equal(ctx, r.leading(ctx, square.numerator), field.fromInteger(ctx, 1n)) && curve.genus === BigInt(degree / 2 - 1), 'verification-failed', 'split finite Pell model and complete genus');
  const y = a.add(ctx, a.generator(ctx), a.fromScalar(ctx, f.exactDivide(ctx, b, f.fromInteger(ctx, 2n))));
  const xPower = Array<E>(degree / 2 + 1).fill(field.fromInteger(ctx, 0n)); ctx.allocate(xPower.length); xPower[degree / 2] = field.fromInteger(ctx, 1n);
  const scale = f.make(ctx, r.one(ctx), r.make(ctx, xPower)), scaledY = a.make(ctx, y.coefficients.map(value => f.multiply(ctx, value, scale)));
  return {b, c, polynomial: square.numerator, halfDegree: degree / 2, y, scaledY};
}
export function verifyReducedInfinityPellOrderWithin<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, model: ReducedCurveModel<E>, divisor: ReducedDivisor<E>, proof: ReducedInfinityPellOrder<E>, bounds: DifferentialBounds): void {
  assertReducedDivisor(ctx, curve, divisor); verifyReducedDivisor(ctx, curve, divisor.input, divisor); const p = presentation(ctx, curve, model), a = curve.algebra, f = a.scalar, r = f.ring;
  demand(proof.rule === 'finite-infinity-pell-order-v1' && proof.divisor === divisor && proof.model === model && divisor.degree === 0n && divisor.entries.length === 2
    && f.equal(ctx, proof.b, p.b) && f.equal(ctx, proof.c, p.c) && r.equal(ctx, proof.polynomial, p.polynomial) && proof.halfDegree === p.halfDegree && a.equal(ctx, proof.scaledY, p.scaledY), 'verification-failed', 'complete finite Pell order request/model');
  for (const place of [proof.positive, proof.negative]) {
    verifyReducedPlace(ctx, curve, place); const pr = place.prime.ring;
    demand(place.order === curve.infinity && place.ramification === 1n && place.residueDegree === 1n && place.degree === 1n && pr.equal(ctx, place.prime, pr.x(ctx)), 'verification-failed', 'split complete reduced infinity place');
  }
  demand(!equalReducedPlaces(ctx, curve, proof.positive, proof.negative), 'verification-failed', 'finite two-place coverage');
  const positive = evaluateReducedPlaceIntegral(ctx, curve, proof.positive, p.scaledY), negative = evaluateReducedPlaceIntegral(ctx, curve, proof.negative, p.scaledY);
  demand(proof.positive.residue.equal(ctx, positive, proof.positiveResidue) && proof.positive.residue.equal(ctx, positive, proof.positive.residue.fromInteger(ctx, 1n))
    && proof.negative.residue.equal(ctx, negative, proof.negativeResidue) && proof.negative.residue.equal(ctx, negative, proof.negative.residue.fromInteger(ctx, -1n)), 'verification-failed', 'finite infinity residue orientation');
  ctx.integer(proof.coefficient); demand(proof.coefficient !== 0n, 'verification-failed', 'finite nonzero class coefficient');
  for (const e of divisor.entries) {
    const plus = equalReducedPlaces(ctx, curve, e.place, proof.positive), minus = equalReducedPlaces(ctx, curve, e.place, proof.negative);
    demand(plus !== minus && e.coefficient === (plus ? proof.coefficient : -proof.coefficient), 'verification-failed', 'finite signed divisor coverage');
  }
  verifyFiniteJacobianBound(ctx, a.constants.size, curve.genus, proof.bound); verifyPositivePellWithin(ctx, a.constants, r, p.polynomial, proof.bound.upper, proof.pell, bounds);
  const unit = proof.pell; demand(unit.kind === 'unit' && unit.numerator !== null && unit.denominator !== null && unit.leastDegree !== null && unit.leastDegree > 0n, 'verification-failed', 'finite group complete infinity unit');
  const argument = a.add(ctx, a.fromScalar(ctx, f.make(ctx, unit.numerator, r.one(ctx))), a.multiply(ctx, a.fromScalar(ctx, f.make(ctx, unit.denominator, r.one(ctx))), p.y));
  const gcd = integerGcd(ctx, unit.leastDegree, proof.coefficient), order = ctx.quotient(unit.leastDegree, gcd), exponent = ctx.quotient(ctx.multiply(-proof.coefficient, order), unit.leastDegree);
  demand(a.equal(ctx, proof.argument, argument) && proof.order === order && proof.exponent === exponent, 'verification-failed', 'finite fundamental unit/order/function correspondence');
  verifyPositiveIntegerFactors(ctx, order, proof.factors); demand(proof.exclusions.length === proof.factors.length, 'verification-failed', 'finite complete prime exclusions');
  for (let i = 0; i < proof.factors.length; i++) {
    const e = proof.exclusions[i], prime = proof.factors[i].prime, quotient = ctx.quotient(order, prime), remainder = ctx.remainder(ctx.multiply(proof.coefficient, quotient), unit.leastDegree);
    demand(e.prime === prime && e.quotient === quotient && e.remainder === remainder && remainder !== 0n, 'verification-failed', 'finite exact least-order exclusion');
  }
}
export function decideReducedInfinityPellOrderWithin<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, model: ReducedCurveModel<E>, divisor: ReducedDivisor<E>, bounds: DifferentialBounds): ReducedInfinityPellOrder<E> {
  assertReducedDivisor(ctx, curve, divisor); demand(divisor.degree === 0n && divisor.entries.length === 2 && divisor.entries.every(e => e.place.order.infinity), 'invalid-input', 'finite two-infinity divisor request');
  const p = presentation(ctx, curve, model), a = curve.algebra, f = a.scalar, r = f.ring;
  let positive: typeof divisor.entries[number] | null = null, negative: typeof divisor.entries[number] | null = null;
  for (const e of divisor.entries) {
    const residue = evaluateReducedPlaceIntegral(ctx, curve, e.place, p.scaledY);
    if (e.place.residue.equal(ctx, residue, e.place.residue.fromInteger(ctx, 1n))) positive = e;
    else if (e.place.residue.equal(ctx, residue, e.place.residue.fromInteger(ctx, -1n))) negative = e;
  }
  demand(positive !== null && negative !== null && positive.coefficient === -negative.coefficient, 'verification-failed', 'complete finite infinity class signs');
  const bound = finiteJacobianBound(ctx, a.constants.size, curve.genus), pell = solvePositivePellWithin(ctx, a.constants, r, p.polynomial, bound.upper, bounds);
  demand(pell.kind === 'unit' && pell.numerator !== null && pell.denominator !== null && pell.leastDegree !== null, 'verification-failed', 'finite complete Jacobian-bound unit existence');
  const argument = a.add(ctx, a.fromScalar(ctx, f.make(ctx, pell.numerator, r.one(ctx))), a.multiply(ctx, a.fromScalar(ctx, f.make(ctx, pell.denominator, r.one(ctx))), p.y)), coefficient = positive.coefficient;
  const order = ctx.quotient(pell.leastDegree, integerGcd(ctx, pell.leastDegree, coefficient)), factors = factorPositiveInteger(ctx, order);
  ctx.allocate(18 + factors.length * 3); const proof = Object.freeze({rule: 'finite-infinity-pell-order-v1' as const, divisor, model, b: p.b, c: p.c, polynomial: p.polynomial, halfDegree: p.halfDegree,
    positive: positive.place, negative: negative.place, scaledY: p.scaledY, positiveResidue: evaluateReducedPlaceIntegral(ctx, curve, positive.place, p.scaledY), negativeResidue: evaluateReducedPlaceIntegral(ctx, curve, negative.place, p.scaledY),
    coefficient, bound, pell, argument, order, factors, exclusions: Object.freeze(factors.map(f => {const quotient = ctx.quotient(order, f.prime); return Object.freeze({prime: f.prime, quotient, remainder: ctx.remainder(ctx.multiply(coefficient, quotient), pell.leastDegree!)});})),
    exponent: ctx.quotient(ctx.multiply(-coefficient, order), pell.leastDegree)});
  verifyReducedInfinityPellOrderWithin(ctx, curve, model, divisor, proof, bounds); return proof;
}
