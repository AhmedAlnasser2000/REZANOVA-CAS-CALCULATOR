/** Checked split-even correspondence for a complete reduced proper curve. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyReducedCurveModel, type ReducedCurveModel} from './reduced-model';
import {isReducedCurveField, type ReducedCurveView, type ReducedCurveValue} from './reduced-curve';
import {verifyReducedPlace, evaluateReducedPlaceIntegral, type ReducedPlace} from './reduced-place';
import type {FiniteExtensionValue} from './positive-extension';
import {positiveBezout, type PositivePolynomial, type PositiveBezout} from './positive-polynomial';
import type {PositiveFraction} from './positive-fraction';
import {positivePower} from './positive-field';
import {constructBalancedInfinity, type BalancedInfinity} from './balanced-cantor-model';
import {constructBalancedPair, normalizeBalancedDivisor, verifyBalancedNormalization, equalBalancedDivisors, type BalancedNormalization} from './balanced-cantor-arithmetic';
import {positiveCantorArithmetic} from './positive-cantor';
import {reconstructPositiveBalancedDomainWithin, verifyPositiveBalancedDomainWithin, type PositiveBalancedDomain, type PositiveBalancedDivisor} from './positive-balanced-cantor';
import {ScopedProof} from './scoped-proof';

export interface ReducedBalancedModel<E> extends BalancedInfinity<PositivePolynomial<E>> {
  readonly curve: ReducedCurveView<E>; readonly original: ReducedCurveModel<E>;
  readonly b: PositiveFraction<E>; readonly c: PositiveFraction<E>; readonly polynomial: PositivePolynomial<E>;
  readonly squareFree: PositiveBezout<E>; readonly y: ReducedCurveValue<E>; readonly domain: PositiveBalancedDomain<E>;
}
const models = new WeakSet<object>(), checks = new ScopedProof();
function equation<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, original: ReducedCurveModel<E>) {
  verifyReducedCurveModel(ctx, curve.algebra, original); const a = curve.algebra, f = a.scalar, r = f.ring;
  demand(isReducedCurveField(curve.field) && curve.field.algebra === a && curve.finite === original.finite && curve.infinity === original.infinity && curve.genus === original.genus,
    'verification-failed', 'complete reduced balanced proper curve');
  demand(a.dimension === 2 && a.relation.coefficients.length === 3 && f.equal(ctx, a.relation.coefficients[2], f.fromInteger(ctx, 1n)), 'domain-mismatch', 'reduced balanced quadratic original basis');
  const b = a.relation.coefficients[1], c = a.relation.coefficients[0], square = f.subtract(ctx, f.exactDivide(ctx, f.multiply(ctx, b, b), f.fromInteger(ctx, 4n)), c), degree = r.degree(ctx, square.numerator);
  demand(r.degree(ctx, square.denominator) === 0 && degree >= 2 && degree % 2 === 0 && curve.genus === BigInt(degree / 2 - 1)
    && a.constants.equal(ctx, r.leading(ctx, square.numerator), a.constants.fromInteger(ctx, 1n)), 'verification-failed', 'complete monic reduced split-even genus');
  const y = a.add(ctx, a.generator(ctx), a.fromScalar(ctx, f.exactDivide(ctx, b, f.fromInteger(ctx, 2n))));
  demand(a.equal(ctx, a.multiply(ctx, y, y), a.fromScalar(ctx, square)), 'verification-failed', 'reduced balanced native root'); ctx.allocate(4); return {b, c, polynomial: square.numerator, y};
}
function verifyModel<E>(ctx: ExecutionContext, model: ReducedBalancedModel<E>, bounds: DifferentialBounds): void {
  const p = equation(ctx, model.curve, model.original), a = model.curve.algebra, f = a.scalar;
  verifyPositiveBalancedDomainWithin(ctx, model.domain, bounds);
  demand(f.equal(ctx, p.b, model.b) && f.equal(ctx, p.c, model.c) && f.ring.equal(ctx, p.polynomial, model.polynomial) && a.equal(ctx, p.y, model.y)
    && model.domain.ring === f.ring && model.domain.field === a.constants && f.ring.equal(ctx, model.domain.polynomial, model.polynomial)
    && f.ring.equal(ctx, model.domain.plus, model.plus) && f.ring.equal(ctx, model.domain.minus, model.minus) && f.ring.equal(ctx, model.domain.infinityRemainder, model.infinityRemainder)
    && a.constants.equal(ctx, f.ring.leading(ctx, model.plus), a.constants.fromInteger(ctx, 1n)), 'verification-failed', 'complete reduced balanced presentation and infinity binding');
}
export function verifyReducedBalancedModelWithin<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, original: ReducedCurveModel<E>, model: ReducedBalancedModel<E>, bounds: DifferentialBounds): void {
  ctx.tick(); demand(model !== null && typeof model === 'object' && models.has(model) && model.curve === curve && model.original === original, 'domain-mismatch', 'owned reduced balanced model');
  checks.check(ctx, [model, bounds], () => verifyModel(ctx, model, bounds), [model, curve]);
}
export function reconstructReducedBalancedModelWithin<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, original: ReducedCurveModel<E>, evidence: Omit<ReducedBalancedModel<E>, 'curve' | 'original' | 'domain'>, bounds: DifferentialBounds): ReducedBalancedModel<E> {
  ctx.allocate(3); const infinity = Object.freeze({plus: evidence.plus, minus: evidence.minus, infinityRemainder: evidence.infinityRemainder});
  const domain = reconstructPositiveBalancedDomainWithin(ctx, curve.algebra.constants, curve.algebra.scalar.ring, evidence.polynomial, evidence.squareFree, infinity, bounds);
  ctx.allocate(11); const model = Object.freeze({curve, original, ...evidence, domain}); verifyModel(ctx, model, bounds); models.add(model); return model;
}
export function constructReducedBalancedModelWithin<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, original: ReducedCurveModel<E>, bounds: DifferentialBounds): ReducedBalancedModel<E> {
  const p = equation(ctx, curve, original), r = curve.algebra.scalar.ring, squareFree = positiveBezout(ctx, r, p.polynomial, r.derivative(ctx, p.polynomial)); ctx.allocate(14);
  const infinity = constructBalancedInfinity(ctx, positiveCantorArithmetic(r), p.polynomial, r.field.fromInteger(ctx, 1n));
  return reconstructReducedBalancedModelWithin(ctx, curve, original, {...p, squareFree, ...infinity}, bounds);
}
export interface ReducedBalancedTransport<E> {
  readonly place: ReducedPlace<E>; readonly kind: 'infinity-plus' | 'infinity-minus' | 'inert' | 'split';
  readonly yResidue: FiniteExtensionValue<FiniteExtensionValue<E>> | null;
  readonly normalization: BalancedNormalization<PositivePolynomial<E>>; readonly result: PositiveBalancedDivisor<E>;
}
function residuePolynomial<E>(ctx: ExecutionContext, model: ReducedBalancedModel<E>, place: ReducedPlace<E>, value: FiniteExtensionValue<FiniteExtensionValue<E>>): PositivePolynomial<E> {
  const b = place.algebra.base, field = place.residue, r = model.domain.ring;
  demand(b.parent === model.domain.field && field.parent === b && field.ring.degree(ctx, field.modulus) === 1, 'verification-failed', 'reduced balanced residue degree-one chain'); field.assert(ctx, value);
  demand(value.polynomial.coefficients.length <= 1, 'verification-failed', 'reduced balanced residue coverage'); const coefficient = value.polynomial.coefficients[0] ?? b.fromInteger(ctx, 0n);
  demand(field.equal(ctx, value, field.embed(ctx, coefficient)), 'verification-failed', 'reduced balanced residue inverse reconstruction'); return r.make(ctx, coefficient.polynomial.coefficients);
}
function initialWeight(ctx: ExecutionContext, genus: number, degree: number): bigint {return ctx.add(BigInt(Math.ceil(genus / 2)), -BigInt(degree));}
function infinityResidue<E>(ctx: ExecutionContext, model: ReducedBalancedModel<E>, place: ReducedPlace<E>) {
  const curve = model.curve, a = curve.algebra, f = a.scalar, r = f.ring, x = f.make(ctx, r.x(ctx), r.one(ctx)), power = positivePower(ctx, f, x, BigInt(model.domain.genus + 1));
  ctx.allocate(model.y.coefficients.length); const scaled = a.make(ctx, model.y.coefficients.map(c => f.exactDivide(ctx, c, power)));
  demand(a.equal(ctx, a.multiply(ctx, scaled, a.fromScalar(ctx, power)), model.y), 'verification-failed', 'reduced balanced infinity inverse reconstruction');
  return evaluateReducedPlaceIntegral(ctx, curve, place, scaled);
}
export function verifyReducedBalancedTransportWithin<E>(ctx: ExecutionContext, model: ReducedBalancedModel<E>, place: ReducedPlace<E>, proof: ReducedBalancedTransport<E>, bounds: DifferentialBounds): void {
  verifyReducedBalancedModelWithin(ctx, model.curve, model.original, model, bounds); const curve = model.curve, r = model.domain.ring; verifyReducedPlace(ctx, curve, place); demand(proof.place === place, 'verification-failed', 'reduced balanced owned place');
  let u: PositivePolynomial<E>, v: PositivePolynomial<E>, n: bigint;
  if (place.order.infinity) {
    const residue = infinityResidue(ctx, model, place), positive = place.residue.equal(ctx, residue, place.residue.fromInteger(ctx, 1n)), negative = place.residue.equal(ctx, residue, place.residue.fromInteger(ctx, -1n));
    demand(positive !== negative && proof.kind === (positive ? 'infinity-plus' : 'infinity-minus') && place.ramification === 1n && place.residueDegree === 1n && place.degree === 1n
      && proof.yResidue !== null && place.residue.equal(ctx, residue, proof.yResidue) && place.prime.ring.equal(ctx, place.prime, place.prime.ring.x(ctx)), 'verification-failed', 'complete reduced balanced split infinity');
    u = r.one(ctx); v = r.zero(ctx); n = ctx.add(BigInt(Math.ceil(model.domain.genus / 2)), positive ? 0n : -1n);
  } else {
    demand(place.prime.ring === r, 'domain-mismatch', 'reduced balanced finite chart');
    if (place.residueDegree === 2n) {
      demand(proof.kind === 'inert' && place.ramification === 1n && place.degree === BigInt(2 * r.degree(ctx, place.prime)) && proof.yResidue === null, 'verification-failed', 'complete reduced balanced inert ideal dimension');
      u = r.one(ctx); v = r.zero(ctx); n = initialWeight(ctx, model.domain.genus, r.degree(ctx, place.prime));
    } else {
      const residue = evaluateReducedPlaceIntegral(ctx, curve, place, model.y);
      demand(place.residueDegree === 1n && (place.ramification === 1n || place.ramification === 2n) && proof.kind === 'split' && proof.yResidue !== null
        && place.residue.equal(ctx, residue, proof.yResidue), 'verification-failed', 'complete reduced balanced finite branch');
      u = place.prime; v = residuePolynomial(ctx, model, place, residue); n = initialWeight(ctx, model.domain.genus, r.degree(ctx, u));
    }
  }
  ctx.allocate(14); const arithmetic = positiveCantorArithmetic(r);
  demand(r.equal(ctx, u, proof.normalization.input.u) && r.equal(ctx, v, proof.normalization.input.v), 'verification-failed', 'reduced balanced exact initial coordinates');
  verifyBalancedNormalization(ctx, arithmetic, model.domain, proof.normalization.input, n, proof.normalization);
  demand(equalBalancedDivisors(ctx, arithmetic, proof.result, proof.normalization.result), 'verification-failed', 'complete reduced balanced place class');
}
export function transportReducedBalancedPlaceWithin<E>(ctx: ExecutionContext, model: ReducedBalancedModel<E>, place: ReducedPlace<E>, bounds: DifferentialBounds): ReducedBalancedTransport<E> {
  verifyReducedBalancedModelWithin(ctx, model.curve, model.original, model, bounds); verifyReducedPlace(ctx, model.curve, place); const r = model.domain.ring;
  let kind: ReducedBalancedTransport<E>['kind'], yResidue: ReducedBalancedTransport<E>['yResidue'] = null, u: PositivePolynomial<E>, v: PositivePolynomial<E>, n: bigint;
  if (place.order.infinity) {
    yResidue = infinityResidue(ctx, model, place); const positive = place.residue.equal(ctx, yResidue, place.residue.fromInteger(ctx, 1n));
    demand(positive || place.residue.equal(ctx, yResidue, place.residue.fromInteger(ctx, -1n)), 'verification-failed', 'reduced balanced infinity split');
    kind = positive ? 'infinity-plus' : 'infinity-minus'; u = r.one(ctx); v = r.zero(ctx); n = ctx.add(BigInt(Math.ceil(model.domain.genus / 2)), positive ? 0n : -1n);
  } else if (place.residueDegree === 2n) {kind = 'inert'; u = r.one(ctx); v = r.zero(ctx); n = initialWeight(ctx, model.domain.genus, r.degree(ctx, place.prime));}
  else {kind = 'split'; yResidue = evaluateReducedPlaceIntegral(ctx, model.curve, place, model.y); u = place.prime; v = residuePolynomial(ctx, model, place, yResidue); n = initialWeight(ctx, model.domain.genus, r.degree(ctx, u));}
  ctx.allocate(14); const arithmetic = positiveCantorArithmetic(r), normalization = normalizeBalancedDivisor(ctx, arithmetic, model.domain, constructBalancedPair(ctx, arithmetic, model.domain, u, v), n);
  ctx.allocate(5); const proof = Object.freeze({place, kind, yResidue, normalization, result: normalization.result}); verifyReducedBalancedTransportWithin(ctx, model, place, proof, bounds); return proof;
}
