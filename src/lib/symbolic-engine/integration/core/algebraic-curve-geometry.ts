import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { factorAlgebraicPolynomialWithin, verifyAlgebraicFactorizationWithin, type AlgebraicFactorization } from './algebraic-factorization';
import { decomposeAlgebraicPlacesWithin, verifyAlgebraicPlaceDecompositionWithin, type AlgebraicPlaceDecomposition } from './algebraic-place';
import { constructAlgebraicDivisorWithin, verifyAlgebraicDivisorWithin, type AlgebraicDivisor } from './algebraic-divisor';
import { solveAlgebraicRiemannRochWithin, verifyAlgebraicRiemannRochWithin, type AlgebraicRiemannRoch } from './algebraic-riemann-roch';
import type { CurveConstant } from './algebraic-curve-coordinates';

export interface AlgebraicCurveGeometry<E> {
  readonly finiteFactors: AlgebraicFactorization<CurveConstant>;
  readonly finite: readonly AlgebraicPlaceDecomposition<E>[];
  readonly infinity: AlgebraicPlaceDecomposition<E>;
  readonly canonical: AlgebraicDivisor<E>;
  readonly genus: bigint;
  readonly zero: AlgebraicDivisor<E>;
  readonly globalFunctions: AlgebraicRiemannRoch<E>;
}
function canonicalEntries<E>(ctx: ExecutionContext, finite: readonly AlgebraicPlaceDecomposition<E>[], infinity: AlgebraicPlaceDecomposition<E>) {
  ctx.allocate(finite.reduce((size, d) => size + d.places.length, infinity.places.length));
  return [...finite.flatMap(d => d.places.map(place => ({place, coefficient: ctx.add(place.ramification, -1n)}))),
    ...infinity.places.map(place => ({place, coefficient: ctx.add(-place.ramification, -1n)}))];
}
export function certifyAlgebraicCurveGeometryWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds): AlgebraicCurveGeometry<E> {
  const r = curve.finite.lattice.scalar.ring, finiteFactors = factorAlgebraicPolynomialWithin(ctx, r, curve.finite.discriminant, bounds);
  demand(finiteFactors.kind === 'factorization', 'verification-failed', 'nonzero maximal-order discriminant');
  const finite = Object.freeze(finiteFactors.factors.map(f => decomposeAlgebraicPlacesWithin(ctx, curve, f.polynomial, false, bounds)));
  const ur = curve.infinity.lattice.scalar.ring, infinity = decomposeAlgebraicPlacesWithin(ctx, curve,
    ur.make(ctx, [ur.domain.fromInteger(ctx, 0n), ur.domain.fromInteger(ctx, 1n)]), true, bounds);
  const canonical = constructAlgebraicDivisorWithin(ctx, curve, canonicalEntries(ctx, finite, infinity)), twiceGenus = ctx.add(canonical.degree, 2n);
  demand(twiceGenus >= 0n && twiceGenus % 2n === 0n, 'verification-failed', 'canonical degree/genus parity');
  const genus = ctx.quotient(twiceGenus, 2n), zero = constructAlgebraicDivisorWithin(ctx, curve, []), globalFunctions = solveAlgebraicRiemannRochWithin(ctx, curve, zero, bounds);
  const proof = Object.freeze({finiteFactors, finite, infinity, canonical, genus, zero, globalFunctions});
  verifyAlgebraicCurveGeometryWithin(ctx, curve, proof, bounds); return proof;
}
export function verifyAlgebraicCurveGeometryWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, proof: AlgebraicCurveGeometry<E>, bounds: DifferentialBounds): void {
  const r = curve.finite.lattice.scalar.ring; verifyAlgebraicFactorizationWithin(ctx, r, curve.finite.discriminant, proof.finiteFactors, bounds);
  demand(proof.finiteFactors.kind === 'factorization' && proof.finiteFactors.factors.length === proof.finite.length, 'verification-failed', 'canonical full finite ramification coverage');
  for (let i = 0; i < proof.finite.length; i++) verifyAlgebraicPlaceDecompositionWithin(ctx, curve, proof.finiteFactors.factors[i].polynomial, false, proof.finite[i], bounds);
  const ur = curve.infinity.lattice.scalar.ring, u = ur.make(ctx, [ur.domain.fromInteger(ctx, 0n), ur.domain.fromInteger(ctx, 1n)]);
  verifyAlgebraicPlaceDecompositionWithin(ctx, curve, u, true, proof.infinity, bounds);
  verifyAlgebraicDivisorWithin(ctx, curve, canonicalEntries(ctx, proof.finite, proof.infinity), proof.canonical); ctx.integer(proof.genus);
  demand(proof.genus >= 0n && ctx.add(ctx.multiply(2n, proof.genus), -2n) === proof.canonical.degree, 'verification-failed', 'complete canonical degree/genus');
  verifyAlgebraicDivisorWithin(ctx, curve, [], proof.zero);
  verifyAlgebraicRiemannRochWithin(ctx, curve, proof.zero, proof.globalFunctions, bounds);
  demand(proof.globalFunctions.dimension === 1, 'verification-failed', 'full global functions equal actual constants');
  // A complete maximal order discriminant covers every finite ramified prime.
  // In characteristic zero the different exponent is e-1. At infinity,
  // dx=-u^{-2}du contributes -2e, giving -e-1. Thus deg(div(dx))=2g-2.
}
export function certifyAlgebraicCurveGeometry<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return certifyAlgebraicCurveGeometryWithin(ctx, curve, bounds); });
}
export function verifyAlgebraicCurveGeometry<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, proof: AlgebraicCurveGeometry<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicCurveGeometryWithin(ctx, curve, proof, bounds); });
}
