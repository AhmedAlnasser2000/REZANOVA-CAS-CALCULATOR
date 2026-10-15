/** Checked owned quotient evaluation when coordinate denominators are units
 * modulo the base prime. This is distinct from a complete local expansion. */
import {demand, type ExecutionContext} from './execution';
import type {AlgebraicCurveView} from './algebraic-curve';
import {curveOrderCoordinates} from './algebraic-curve';
import {assertAlgebraicPlace, type AlgebraicPlace} from './algebraic-place';
import {residueCurvePolynomial, curveResiduePowerCoordinates, type CurveBaseResidue, type CurvePlaceResidue} from './algebraic-residue-algebra';
import {polynomialDivide, extendedGcd, verifyBezout, type Bezout} from './polynomial-division';
import type {CurveConstant, CurveScalar} from './algebraic-curve-coordinates';

export interface AlgebraicIntegralResidue<E> {
  readonly input: E; readonly coordinates: readonly CurveScalar[];
  readonly units: readonly Bezout<CurveConstant>[];
  readonly numerators: readonly CurveBaseResidue[];
  readonly inverses: readonly CurveBaseResidue[];
  readonly value: CurvePlaceResidue;
}
export function verifyAlgebraicIntegralResidueWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, input: E, proof: AlgebraicIntegralResidue<E>): void {
  assertAlgebraicPlace(ctx, curve, place); const f = curve.owner, scalar = place.order.lattice.scalar, r = scalar.ring, base = place.algebra.base;
  f.assert(ctx, input); demand(f.equal(ctx, input, proof.input), 'verification-failed', 'integral residue explicit expected input');
  const coordinates = curveOrderCoordinates(ctx, curve.coordinates, place.order, input), n = coordinates.length; ctx.allocate(n);
  demand(proof.coordinates.length === n && proof.units.length === n && proof.numerators.length === n && proof.inverses.length === n, 'verification-failed', 'integral residue full coordinate/unit coverage');
  const reduced = coordinates.map((coefficient, i) => {
    demand(scalar.equal(ctx, coefficient, proof.coordinates[i]), 'verification-failed', 'integral residue coordinate correspondence');
    verifyBezout(ctx, r, coefficient.denominator, place.prime, proof.units[i]); demand(r.equal(ctx, proof.units[i].gcd, r.one(ctx)), 'verification-failed', 'integral residue denominator unit');
    const numerator = residueCurvePolynomial(ctx, base, coefficient.numerator), denominator = residueCurvePolynomial(ctx, base, coefficient.denominator), inverse = proof.inverses[i];
    demand(base.equal(ctx, numerator, proof.numerators[i]) && base.equal(ctx, base.multiply(ctx, denominator, inverse), base.fromInteger(ctx, 1n)), 'verification-failed', 'integral residue numerator/unit reconstruction');
    return base.multiply(ctx, numerator, inverse);
  });
  const expected = place.residue.make(ctx, place.residue.ring.make(ctx, curveResiduePowerCoordinates(ctx, place.algebra, reduced)));
  demand(place.residue.equal(ctx, proof.value, expected), 'verification-failed', 'integral residue complete owned quotient map');
}
export function tryAlgebraicIntegralResidueWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, input: E): AlgebraicIntegralResidue<E> | null {
  assertAlgebraicPlace(ctx, curve, place); curve.owner.assert(ctx, input); const coordinates = curveOrderCoordinates(ctx, curve.coordinates, place.order, input), r = place.order.lattice.scalar.ring;
  // The base prime is irreducible by the complete owned place construction.
  // A zero reduction makes this method inapplicable before unit production.
  for (const coefficient of coordinates) if (r.isZero(ctx, polynomialDivide(ctx, r, coefficient.denominator, place.prime).remainder)) return null;
  const base = place.algebra.base; ctx.allocate(4 * coordinates.length + 6);
  const units = Object.freeze(coordinates.map(c => extendedGcd(ctx, r, c.denominator, place.prime))), numerators = Object.freeze(coordinates.map(c => residueCurvePolynomial(ctx, base, c.numerator))), inverses = Object.freeze(coordinates.map(c => base.inverse(ctx, residueCurvePolynomial(ctx, base, c.denominator))));
  const reduced = coordinates.map((_, i) => base.multiply(ctx, numerators[i], inverses[i])), value = place.residue.make(ctx, place.residue.ring.make(ctx, curveResiduePowerCoordinates(ctx, place.algebra, reduced)));
  const proof = Object.freeze({input, coordinates, units, numerators, inverses, value}); verifyAlgebraicIntegralResidueWithin(ctx, curve, place, input, proof); return proof;
}
