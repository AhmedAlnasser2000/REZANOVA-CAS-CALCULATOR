/** The identical finite/infinity different mechanics, separate from the
 * choice of complete global-function-space certificate. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyAlgebraicCurveWithin, type AlgebraicCurveView} from './algebraic-curve';
import {factorAlgebraicPolynomialWithin, verifyAlgebraicFactorizationWithin, type AlgebraicFactorization} from './algebraic-factorization';
import {decomposeAlgebraicPlacesWithin, verifyAlgebraicPlaceDecompositionWithin, type AlgebraicPlaceDecomposition} from './algebraic-place';
import {constructAlgebraicDivisorWithin, verifyAlgebraicDivisorWithin, type AlgebraicDivisor} from './algebraic-divisor';
import type {CurveConstant} from './algebraic-curve-coordinates';
import {ScopedProof} from './scoped-proof';
const produced = new WeakSet<object>(), checks = new ScopedProof();

export interface AlgebraicCanonicalGeometry<E> {
  readonly finiteFactors: AlgebraicFactorization<CurveConstant>;
  readonly finite: readonly AlgebraicPlaceDecomposition<E>[];
  readonly infinity: AlgebraicPlaceDecomposition<E>;
  readonly canonical: AlgebraicDivisor<E>;
  readonly genus: bigint;
}
function canonicalEntries<E>(ctx: ExecutionContext, finite: readonly AlgebraicPlaceDecomposition<E>[], infinity: AlgebraicPlaceDecomposition<E>) {
  ctx.allocate(finite.reduce((size, d) => size + d.places.length, infinity.places.length));
  return [...finite.flatMap(d => d.places.map(place => ({place, coefficient: ctx.add(place.ramification, -1n)}))),
    ...infinity.places.map(place => ({place, coefficient: ctx.add(-place.ramification, -1n)}))];
}
export function constructAlgebraicCanonicalGeometryWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds): AlgebraicCanonicalGeometry<E> {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds);
  const r = curve.finite.lattice.scalar.ring, finiteFactors = factorAlgebraicPolynomialWithin(ctx, r, curve.finite.discriminant, bounds);
  demand(finiteFactors.kind === 'factorization', 'verification-failed', 'nonzero maximal-order discriminant');
  const finite = Object.freeze(finiteFactors.factors.map(f => decomposeAlgebraicPlacesWithin(ctx, curve, f.polynomial, false, bounds)));
  const ur = curve.infinity.lattice.scalar.ring, infinity = decomposeAlgebraicPlacesWithin(ctx, curve, ur.make(ctx, [ur.domain.fromInteger(ctx, 0n), ur.domain.fromInteger(ctx, 1n)]), true, bounds);
  const canonical = constructAlgebraicDivisorWithin(ctx, curve, canonicalEntries(ctx, finite, infinity)), twiceGenus = ctx.add(canonical.degree, 2n);
  demand(twiceGenus >= 0n && twiceGenus % 2n === 0n, 'verification-failed', 'canonical degree/genus parity');
  ctx.allocate(5); const proof = Object.freeze({finiteFactors, finite, infinity, canonical, genus: ctx.quotient(twiceGenus, 2n)});
  // All retained parts come from closed immutable producers. Eligibility is
  // separate from successful verification and grants no cross-operation proof.
  ctx.allocate(1); produced.add(proof); verifyAlgebraicCanonicalGeometryWithin(ctx, curve, proof, bounds); return proof;
}
export function verifyAlgebraicCanonicalGeometryWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, proof: AlgebraicCanonicalGeometry<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds);
  if (produced.has(proof)) checks.check(ctx, [proof, bounds], () => verifyCanonical(ctx, curve, proof, bounds), [curve, proof]);
  else verifyCanonical(ctx, curve, proof, bounds);
}
function verifyCanonical<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, proof: AlgebraicCanonicalGeometry<E>, bounds: DifferentialBounds): void {
  const r = curve.finite.lattice.scalar.ring; verifyAlgebraicFactorizationWithin(ctx, r, curve.finite.discriminant, proof.finiteFactors, bounds);
  demand(proof.finiteFactors.kind === 'factorization' && proof.finiteFactors.factors.length === proof.finite.length, 'verification-failed', 'canonical full finite ramification coverage');
  for (let i = 0; i < proof.finite.length; i++) verifyAlgebraicPlaceDecompositionWithin(ctx, curve, proof.finiteFactors.factors[i].polynomial, false, proof.finite[i], bounds);
  const ur = curve.infinity.lattice.scalar.ring, u = ur.make(ctx, [ur.domain.fromInteger(ctx, 0n), ur.domain.fromInteger(ctx, 1n)]);
  verifyAlgebraicPlaceDecompositionWithin(ctx, curve, u, true, proof.infinity, bounds);
  verifyAlgebraicDivisorWithin(ctx, curve, canonicalEntries(ctx, proof.finite, proof.infinity), proof.canonical); ctx.integer(proof.genus);
  demand(proof.genus >= 0n && ctx.add(ctx.multiply(2n, proof.genus), -2n) === proof.canonical.degree, 'verification-failed', 'complete canonical degree/genus');
  // Complete maximal orders and discriminant coverage give the tame different
  // e-1 in characteristic zero. At infinity dx=-u^-2 du gives -e-1.
}
