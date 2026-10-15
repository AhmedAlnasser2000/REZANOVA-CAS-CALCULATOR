/** Closed-place correspondence through the supplied complete residue maps. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyAlgebraicPlaceWithin, evaluateAlgebraicPlaceIntegral, type AlgebraicPlace} from './algebraic-place';
import type {CurvePlaceResidue} from './algebraic-residue-algebra';
import {verifyRamifiedHyperellipticModelWithin, ramifiedNativePolynomial, type RamifiedHyperellipticModel} from './ramified-hyperelliptic-model';
import {constructMumfordPairWithin, verifyMumfordPairWithin, equalMumfordPairs, cantorPolynomialArithmetic, type MumfordPair} from './hyperelliptic-cantor';
import {reduceCantorPair, verifyCantorReduction, type CantorReduction} from './cantor-arithmetic';
import type {CurveConstant} from './algebraic-curve-coordinates';
import type {Polynomial} from './polynomial';

export interface CantorPlaceTransport<E> {
  readonly place: AlgebraicPlace<E>;
  readonly kind: 'infinity' | 'inert' | 'split';
  readonly yResidue: CurvePlaceResidue | null;
  readonly initial: MumfordPair<CurveConstant>;
  readonly reductions: readonly CantorReduction<Polynomial<CurveConstant>>[];
  readonly pair: MumfordPair<CurveConstant>;
  readonly principalFactor: E | null;
}
function neutral<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>): MumfordPair<CurveConstant> {
  const r = model.domain.ring; ctx.allocate(3); return Object.freeze({u: r.one(ctx), v: r.zero(ctx), normQuotient: model.polynomial});
}
function residuePolynomial<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>, place: AlgebraicPlace<E>, value: CurvePlaceResidue): Polynomial<CurveConstant> {
  const k = model.curve.coordinates.constantOwner, b = place.algebra.base, f = place.residue;
  demand(b.parent === k && f.parent === b && f.ring.degree(ctx, f.modulus) === 1, 'verification-failed', 'closed place relative residue degree one');
  f.assert(ctx, value); demand(value.representative.coefficients.length <= 1, 'verification-failed', 'complete residue coordinate coverage');
  const coefficient = value.representative.coefficients[0] ?? b.fromInteger(ctx, 0n); b.assert(ctx, coefficient);
  demand(f.equal(ctx, value, f.embed(ctx, coefficient)), 'verification-failed', 'residue inverse reconstruction');
  const v = model.domain.ring.make(ctx, coefficient.representative.coefficients);
  demand(b.equal(ctx, b.make(ctx, b.ring.make(ctx, v.coefficients)), coefficient), 'verification-failed', 'closed-place polynomial conversion'); return v;
}
export function verifyCantorPlaceTransportWithin<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>, place: AlgebraicPlace<E>, proof: CantorPlaceTransport<E>, bounds: DifferentialBounds): void {
  const curve = model.curve, r = model.domain.ring; verifyRamifiedHyperellipticModelWithin(ctx, curve, model, bounds); verifyAlgebraicPlaceWithin(ctx, curve, place, bounds);
  demand(proof.place === place, 'verification-failed', 'exact owned Cantor place request'); const unit = neutral(ctx, model);
  if (place.order.infinity) {
    const p = place.prime.ring;
    demand(proof.kind === 'infinity' && proof.yResidue === null && proof.principalFactor === null && proof.reductions.length === 0
      && place.ramification === 2n && place.residueDegree === 1n && place.degree === 1n
      && p.equal(ctx, place.prime, p.make(ctx, [p.domain.fromInteger(ctx, 0n), p.domain.fromInteger(ctx, 1n)]))
      && equalMumfordPairs(ctx, model.domain, unit, proof.initial) && equalMumfordPairs(ctx, model.domain, unit, proof.pair), 'verification-failed', 'complete unique ramified infinity transport'); return;
  }
  demand(place.prime.ring === r, 'domain-mismatch', 'closed place original x chart');
  const y = evaluateAlgebraicPlaceIntegral(ctx, curve, place, model.y);
  if (place.residueDegree === 2n) {
    demand(proof.kind === 'inert' && place.ramification === 1n && place.degree === BigInt(2 * r.degree(ctx, place.prime))
      && proof.yResidue === null && proof.reductions.length === 0 && proof.principalFactor !== null
      && curve.owner.equal(ctx, proof.principalFactor, ramifiedNativePolynomial(ctx, model, place.prime))
      && equalMumfordPairs(ctx, model.domain, unit, proof.initial) && equalMumfordPairs(ctx, model.domain, unit, proof.pair), 'verification-failed', 'complete inert closed-place principal transport');
    // pO is contained in this maximal ideal. Both quotients have C-dimension
    // 2deg(p), so the inclusion is equality. Full map/kernel checks above prove
    // that dimension and the quadratic order proves the pO norm.
    const residue = evaluateAlgebraicPlaceIntegral(ctx, curve, place, proof.principalFactor);
    demand(place.residue.isZero(ctx, residue), 'verification-failed', 'inert base prime vanishes'); return;
  }
  demand(place.residueDegree === 1n && (place.ramification === 1n || place.ramification === 2n) && proof.kind === 'split'
    && proof.yResidue !== null && proof.principalFactor === null && place.residue.equal(ctx, y, proof.yResidue), 'verification-failed', 'complete finite Cantor residue branch');
  verifyMumfordPairWithin(ctx, model.domain, proof.initial, bounds);
  demand(r.equal(ctx, proof.initial.u, place.prime) && r.equal(ctx, proof.initial.v, residuePolynomial(ctx, model, place, y)), 'verification-failed', 'closed-place ideal/coordinate binding');
  // (p,y-v) lies in the verified maximal ideal and has quotient C[x]/p.
  // Equality follows from the same complete residue degree, including e=2.
  let previous = proof.initial; const arithmetic = cantorPolynomialArithmetic(r); ctx.allocate(14);
  for (const step of proof.reductions) {verifyCantorReduction(ctx, arithmetic, model.polynomial, model.domain.genus, previous, step); previous = step.result;}
  demand(r.degree(ctx, previous.u) <= model.domain.genus && equalMumfordPairs(ctx, model.domain, previous, proof.pair), 'verification-failed', 'complete closed-place reduction coverage');
}
export function transportCantorPlaceWithin<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>, place: AlgebraicPlace<E>, bounds: DifferentialBounds): CantorPlaceTransport<E> {
  verifyRamifiedHyperellipticModelWithin(ctx, model.curve, model, bounds); verifyAlgebraicPlaceWithin(ctx, model.curve, place, bounds);
  const r = model.domain.ring, unit = neutral(ctx, model); let proof: CantorPlaceTransport<E>;
  if (place.order.infinity) proof = Object.freeze({place, kind: 'infinity' as const, yResidue: null, initial: unit, reductions: Object.freeze([]), pair: unit, principalFactor: null});
  else if (place.residueDegree === 2n) proof = Object.freeze({place, kind: 'inert' as const, yResidue: null, initial: unit, reductions: Object.freeze([]), pair: unit, principalFactor: ramifiedNativePolynomial(ctx, model, place.prime)});
  else {
    const yResidue = evaluateAlgebraicPlaceIntegral(ctx, model.curve, place, model.y), v = residuePolynomial(ctx, model, place, yResidue);
    const initial = constructMumfordPairWithin(ctx, model.domain, place.prime, v, bounds), reductions: CantorReduction<Polynomial<CurveConstant>>[] = [];
    let pair = initial; const arithmetic = cantorPolynomialArithmetic(r); ctx.allocate(14);
    while (r.degree(ctx, pair.u) > model.domain.genus) {ctx.tick(); const step = reduceCantorPair(ctx, arithmetic, model.polynomial, model.domain.genus, pair); ctx.allocate(1); reductions.push(step); pair = step.result;}
    proof = Object.freeze({place, kind: 'split' as const, yResidue, initial, reductions: Object.freeze(reductions), pair, principalFactor: null});
  }
  ctx.allocate(7); verifyCantorPlaceTransportWithin(ctx, model, place, proof, bounds); return proof;
}
