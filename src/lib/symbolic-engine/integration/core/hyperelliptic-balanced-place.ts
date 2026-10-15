/** Complete native place correspondence for a checked split even model. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyAlgebraicPlaceWithin, evaluateAlgebraicPlaceIntegral, type AlgebraicPlace} from './algebraic-place';
import type {CurvePlaceResidue} from './algebraic-residue-algebra';
import {verifySplitHyperellipticModelWithin, hyperellipticNativePolynomial, type SplitHyperellipticModel} from './hyperelliptic-curve-model';
import {verifyBalancedDomainWithin, constructBalancedDomainWithin, constructBalancedMumfordWithin, verifyBalancedMumfordNormalizationWithin,
  type BalancedDomain, type BalancedMumfordNormalization, type BalancedMumfordDivisor} from './hyperelliptic-balanced';
import {equalBalancedDivisors, neutralBalancedDivisor} from './balanced-cantor-arithmetic';
import {cantorPolynomialArithmetic} from './hyperelliptic-cantor';
import {algebraicFunctionPower} from './algebraic-function-power';
import type {CurveConstant} from './algebraic-curve-coordinates';
import type {Polynomial} from './polynomial';

export interface BalancedCurveModel<E> {readonly model: SplitHyperellipticModel<E>; readonly domain: BalancedDomain<CurveConstant>}
export interface BalancedPlaceTransport<E> {
  readonly place: AlgebraicPlace<E>; readonly kind: 'infinity-plus' | 'infinity-minus' | 'inert' | 'split';
  readonly yResidue: CurvePlaceResidue | null; readonly normalization: BalancedMumfordNormalization<CurveConstant>;
  readonly result: BalancedMumfordDivisor<CurveConstant>; readonly principalFactor: E | null;
}
export function verifyBalancedCurveModelWithin<E>(ctx: ExecutionContext, expected: SplitHyperellipticModel<E>, proof: BalancedCurveModel<E>, bounds: DifferentialBounds): void {
  verifySplitHyperellipticModelWithin(ctx, expected.curve, expected, bounds); verifyBalancedDomainWithin(ctx, proof.domain, bounds);
  const r = expected.polynomial.ring;
  demand(proof.model === expected && proof.domain.ring === r && r.equal(ctx, proof.domain.polynomial, expected.polynomial)
    && r.domain.equal(ctx, r.leading(ctx, proof.domain.plus), r.domain.fromInteger(ctx, 1n)), 'verification-failed', 'balanced native curve and infinity correspondence');
}
export function constructBalancedCurveModelWithin<E>(ctx: ExecutionContext, model: SplitHyperellipticModel<E>, bounds: DifferentialBounds): BalancedCurveModel<E> {
  verifySplitHyperellipticModelWithin(ctx, model.curve, model, bounds); const r = model.polynomial.ring;
  const domain = constructBalancedDomainWithin(ctx, r, model.polynomial, r.domain.fromInteger(ctx, 1n), bounds); ctx.allocate(2);
  const proof = Object.freeze({model, domain}); verifyBalancedCurveModelWithin(ctx, model, proof, bounds); return proof;
}
function residuePolynomial<E>(ctx: ExecutionContext, source: BalancedCurveModel<E>, place: AlgebraicPlace<E>, value: CurvePlaceResidue): Polynomial<CurveConstant> {
  const k = source.model.curve.coordinates.constantOwner, b = place.algebra.base, f = place.residue;
  demand(b.parent === k && f.parent === b && f.ring.degree(ctx, f.modulus) === 1, 'verification-failed', 'balanced relative residue degree one');
  f.assert(ctx, value); demand(value.representative.coefficients.length <= 1, 'verification-failed', 'balanced residue coordinate coverage');
  const coefficient = value.representative.coefficients[0] ?? b.fromInteger(ctx, 0n); b.assert(ctx, coefficient);
  demand(f.equal(ctx, value, f.embed(ctx, coefficient)), 'verification-failed', 'balanced residue inverse reconstruction');
  const v = source.domain.ring.make(ctx, coefficient.representative.coefficients);
  demand(b.equal(ctx, b.make(ctx, b.ring.make(ctx, v.coefficients)), coefficient), 'verification-failed', 'balanced residue polynomial conversion'); return v;
}
function initialWeight(ctx: ExecutionContext, genus: number, degree: number): bigint {return ctx.add(BigInt(Math.ceil(genus / 2)), -BigInt(degree));}
export function verifyBalancedPlaceTransportWithin<E>(ctx: ExecutionContext, source: BalancedCurveModel<E>, place: AlgebraicPlace<E>, proof: BalancedPlaceTransport<E>, bounds: DifferentialBounds): void {
  const {model, domain} = source, curve = model.curve, r = domain.ring;
  verifyBalancedCurveModelWithin(ctx, model, source, bounds); verifyAlgebraicPlaceWithin(ctx, curve, place, bounds); demand(proof.place === place, 'verification-failed', 'balanced exact place request');
  let u: Polynomial<CurveConstant>, v: Polynomial<CurveConstant>, n: bigint;
  if (place.order.infinity) {
    const primeRing = place.prime.ring, scaled = curve.owner.exactDivide(ctx, model.y, algebraicFunctionPower(ctx, curve.owner, model.x, BigInt(model.halfDegree)));
    const residue = evaluateAlgebraicPlaceIntegral(ctx, curve, place, scaled), positive = place.residue.equal(ctx, residue, place.residue.fromInteger(ctx, 1n)), negative = place.residue.equal(ctx, residue, place.residue.fromInteger(ctx, -1n));
    demand(positive !== negative && proof.kind === (positive ? 'infinity-plus' : 'infinity-minus') && proof.yResidue !== null && place.residue.equal(ctx, residue, proof.yResidue)
      && place.ramification === 1n && place.residueDegree === 1n && place.degree === 1n && proof.principalFactor === null
      && primeRing.equal(ctx, place.prime, primeRing.make(ctx, [primeRing.domain.fromInteger(ctx, 0n), primeRing.domain.fromInteger(ctx, 1n)])), 'verification-failed', 'complete split infinity place and residue');
    u = r.one(ctx); v = r.zero(ctx); n = ctx.add(BigInt(Math.ceil(domain.genus / 2)), positive ? 0n : -1n);
  } else {
    demand(place.prime.ring === r, 'domain-mismatch', 'balanced original finite chart');
    if (place.residueDegree === 2n) {
      demand(proof.kind === 'inert' && place.ramification === 1n && place.degree === BigInt(2 * r.degree(ctx, place.prime)) && proof.yResidue === null && proof.principalFactor !== null
        && curve.owner.equal(ctx, proof.principalFactor, hyperellipticNativePolynomial(ctx, model, place.prime))
        && place.residue.isZero(ctx, evaluateAlgebraicPlaceIntegral(ctx, curve, place, proof.principalFactor)), 'verification-failed', 'complete inert balanced ideal dimension and factor');
      // The residue dimension and vanishing show pO equals this maximal ideal.
      // div(p)=P-deg(p)(infinity+ + infinity-).
      u = r.one(ctx); v = r.zero(ctx); n = initialWeight(ctx, domain.genus, r.degree(ctx, place.prime));
    } else {
      const residue = evaluateAlgebraicPlaceIntegral(ctx, curve, place, model.y);
      demand(place.residueDegree === 1n && (place.ramification === 1n || place.ramification === 2n) && proof.kind === 'split' && proof.principalFactor === null
        && proof.yResidue !== null && place.residue.equal(ctx, residue, proof.yResidue), 'verification-failed', 'complete balanced finite branch');
      u = place.prime; v = residuePolynomial(ctx, source, place, residue); n = initialWeight(ctx, domain.genus, r.degree(ctx, u));
    }
  }
  verifyBalancedMumfordNormalizationWithin(ctx, domain, u, v, n, proof.normalization, bounds); ctx.allocate(14);
  demand(equalBalancedDivisors(ctx, cantorPolynomialArithmetic(r), proof.result, proof.normalization.result), 'verification-failed', 'balanced place complete normalized class');
}
export function transportBalancedPlaceWithin<E>(ctx: ExecutionContext, source: BalancedCurveModel<E>, place: AlgebraicPlace<E>, bounds: DifferentialBounds): BalancedPlaceTransport<E> {
  const {model, domain} = source, curve = model.curve, r = domain.ring; verifyBalancedCurveModelWithin(ctx, model, source, bounds); verifyAlgebraicPlaceWithin(ctx, curve, place, bounds);
  let kind: BalancedPlaceTransport<E>['kind'], yResidue: CurvePlaceResidue | null = null, principalFactor: E | null = null, u: Polynomial<CurveConstant>, v: Polynomial<CurveConstant>, n: bigint;
  if (place.order.infinity) {
    const scaled = curve.owner.exactDivide(ctx, model.y, algebraicFunctionPower(ctx, curve.owner, model.x, BigInt(model.halfDegree))); yResidue = evaluateAlgebraicPlaceIntegral(ctx, curve, place, scaled);
    const positive = place.residue.equal(ctx, yResidue, place.residue.fromInteger(ctx, 1n));
    demand(positive || place.residue.equal(ctx, yResidue, place.residue.fromInteger(ctx, -1n)), 'verification-failed', 'balanced infinity split residue');
    kind = positive ? 'infinity-plus' : 'infinity-minus'; u = r.one(ctx); v = r.zero(ctx); n = ctx.add(BigInt(Math.ceil(domain.genus / 2)), positive ? 0n : -1n);
  } else if (place.residueDegree === 2n) {
    kind = 'inert'; u = r.one(ctx); v = r.zero(ctx); n = initialWeight(ctx, domain.genus, r.degree(ctx, place.prime)); principalFactor = hyperellipticNativePolynomial(ctx, model, place.prime);
  } else {
    kind = 'split'; yResidue = evaluateAlgebraicPlaceIntegral(ctx, curve, place, model.y); u = place.prime; v = residuePolynomial(ctx, source, place, yResidue); n = initialWeight(ctx, domain.genus, r.degree(ctx, u));
  }
  const normalization = constructBalancedMumfordWithin(ctx, domain, u, v, n, bounds); ctx.allocate(6);
  const proof = Object.freeze({place, kind, yResidue, normalization, result: normalization.result, principalFactor}); verifyBalancedPlaceTransportWithin(ctx, source, place, proof, bounds); return proof;
}
export function neutralBalancedCurveDivisor<E>(ctx: ExecutionContext, source: BalancedCurveModel<E>) {
  ctx.allocate(14); return neutralBalancedDivisor(ctx, cantorPolynomialArithmetic(source.domain.ring), source.domain);
}
