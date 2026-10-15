/** Certified applicability precedes every general RR/Miller computation. */
import {type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {rationalField as Q} from './field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {verifyAlgebraicDivisorWithin, type AlgebraicDivisor} from './algebraic-divisor';
import {constructAlgebraicCanonicalGeometryWithin} from './algebraic-canonical-geometry';
import {constructGenusOnePresentationWithin} from './genus-one-presentation';
import {constructGenusOneCoordinatesWithin} from './genus-one-coordinates';
import {decideGenusOneRationalTorsionWithin, type GenusOneRationalTorsion} from './genus-one-torsion';

export function tryDecideGeneralGenusOneTorsionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds): GenusOneRationalTorsion<E>|null {
  verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, divisor); const c = curve.coordinates.constantOwner;
  if (divisor.degree !== 0n || c.parent !== Q || c.modulus.coefficients.length !== 2) return null;
  const geometry = constructAlgebraicCanonicalGeometryWithin(ctx, curve, bounds); if (geometry.genus !== 1n) return null;
  // No point search and no assumption that every genus-one curve has a C-point.
  const origin = geometry.infinity.places.find(p => p.degree === 1n) ?? divisor.entries.find(e => e.place.degree === 1n)?.place;
  if (origin === undefined) return null;
  const p = constructGenusOnePresentationWithin(ctx, curve, origin, bounds), model = constructGenusOneCoordinatesWithin(ctx, p, bounds);
  return decideGenusOneRationalTorsionWithin(ctx, model, divisor, bounds);
}
