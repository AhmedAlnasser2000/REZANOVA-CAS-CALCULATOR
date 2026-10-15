/** Uniformizers for covered residues. Complete place decomposition proves
 * v_P(p)=e_P; at an unramified place the base prime itself has order one.
 * The general ideal-basis uniformizer is retained when e_P is larger. */
import {demand, type ExecutionContext} from './execution';
import type {AlgebraicCurveView} from './algebraic-curve';
import {assertAlgebraicPlace, type AlgebraicPlace} from './algebraic-place';
import {reciprocalCurveScalar} from './algebraic-curve-coordinates';
import {algebraicLocalParameterWithin, verifyAlgebraicLocalParameterWithin, type AlgebraicLocalParameter} from './algebraic-local';

export type AlgebraicCoveredUniformizer<E> = Readonly<
  {method: 'base-prime'; value: E} |
  {method: 'ideal-basis'; value: E; evidence: AlgebraicLocalParameter<E>}
>;
function basePrimeValue<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>): E {
  const scalar = place.order.lattice.scalar, value = scalar.make(ctx, place.prime, scalar.ring.one(ctx));
  return curve.coordinates.scalarNative(ctx, place.order.infinity ? reciprocalCurveScalar(ctx, curve.coordinates.scalar, value) : value);
}
/** The enclosing residue verifier first verifies complete pole/place coverage.
 * Registered place identity binds this check to that verified decomposition. */
export function verifyAlgebraicCoveredUniformizerWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, proof: AlgebraicCoveredUniformizer<E>): void {
  assertAlgebraicPlace(ctx, curve, place); curve.owner.assert(ctx, proof.value);
  if (proof.method === 'base-prime') {
    demand(place.ramification === 1n && curve.owner.equal(ctx, proof.value, basePrimeValue(ctx, curve, place)), 'verification-failed', 'covered unramified base-prime uniformizer');
  } else {
    demand(proof.method === 'ideal-basis' && curve.owner.equal(ctx, proof.value, proof.evidence.value), 'verification-failed', 'covered ideal uniformizer binding');
    verifyAlgebraicLocalParameterWithin(ctx, curve, place, proof.evidence);
  }
}
export function constructAlgebraicCoveredUniformizerWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>): AlgebraicCoveredUniformizer<E> {
  assertAlgebraicPlace(ctx, curve, place); ctx.allocate(4);
  if (place.ramification === 1n) return Object.freeze({method: 'base-prime', value: basePrimeValue(ctx, curve, place)});
  const evidence = algebraicLocalParameterWithin(ctx, curve, place);
  return Object.freeze({method: 'ideal-basis', value: evidence.value, evidence});
}
