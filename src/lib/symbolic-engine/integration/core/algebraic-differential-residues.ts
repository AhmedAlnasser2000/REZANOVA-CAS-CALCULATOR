import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { PolynomialRing, type Polynomial } from './polynomial';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { certifyAlgebraicDifferentialWithin, verifyAlgebraicDifferentialWithin, type AlgebraicDifferential } from './algebraic-differential';
import { equalAlgebraicPlaces, type AlgebraicPlace } from './algebraic-place';
import { algebraicLocalParameterWithin, verifyAlgebraicLocalParameterWithin, expandAlgebraicPlaceWithin, verifyAlgebraicLocalExpansionWithin, type AlgebraicLocalParameter, type AlgebraicLocalExpansion } from './algebraic-local';
import { differentiateAlgebraicWithin, verifyAlgebraicDerivativeWithin, type AlgebraicDerivative } from './algebraic-derivative';
import { constantMinimalPolynomialWithin, verifyConstantMinimalPolynomialWithin, type ConstantMinimalPolynomial } from './constant-minimal-polynomial';
import { curveDenominators, verifyCurveDenominators, type CurveDenominators } from './algebraic-curve-lattice';
import { extendedGcd, verifyBezout, type Bezout } from './polynomial-division';
import type { CurveConstant } from './algebraic-curve-coordinates';
import type { CurvePlaceResidue } from './algebraic-residue-algebra';
import { recordRationalGcdEvidence, replayRationalGcdEvidence, type RationalGcdEvidence } from './rational-gcd-evidence';

export interface AlgebraicDifferentialResidue<E> {
  readonly place: AlgebraicPlace<E>;
  readonly order: bigint | null;
  readonly value: CurvePlaceResidue;
  readonly parameter: AlgebraicLocalParameter<E> | null;
  readonly derivative: AlgebraicDerivative<E> | null;
  readonly expansion: AlgebraicLocalExpansion<E> | null;
  readonly minimal: ConstantMinimalPolynomial<CurvePlaceResidue> | null;
}
export interface AlgebraicDifferentialResidues<E> {
  readonly arithmetic?: RationalGcdEvidence;
  readonly input: E;
  readonly differential: AlgebraicDifferential<E>;
  readonly entries: readonly AlgebraicDifferentialResidue<E>[];
  readonly polynomials: readonly Polynomial<CurveConstant>[];
  readonly lcm: CurveDenominators;
  readonly squareFree: Bezout<CurveConstant>;
  readonly totalResidue: CurveConstant;
}
function totalResidue<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, entries: readonly AlgebraicDifferentialResidue<E>[]) {
  const c = curve.coordinates.constantOwner; let sum = c.fromInteger(ctx, 0n);
  for (const p of entries) if (p.minimal) {
    const m = p.minimal.polynomial.ring.degree(ctx, p.minimal.polynomial), degree = BigInt(m);
    demand(ctx.remainder(p.place.degree, degree) === 0n, 'verification-failed', 'residue minimal-polynomial extension degree');
    const trace = c.multiply(ctx, c.negate(ctx, p.minimal.polynomial.coefficients[m - 1] ?? c.fromInteger(ctx, 0n)), c.fromInteger(ctx, ctx.quotient(p.place.degree, degree)));
    sum = c.add(ctx, sum, trace);
  }
  return sum;
}
function candidates<E>(ctx: ExecutionContext, proof: AlgebraicDifferential<E>) {
  const curve = proof.geometry.infinity.curve, all = [...(proof.principal?.finite.flatMap(p => p.places) ?? []), ...proof.geometry.finite.flatMap(p => p.places), ...proof.geometry.infinity.places], out: AlgebraicPlace<E>[] = [];
  ctx.allocate(all.length); for (const p of all) if (!out.some(q => equalAlgebraicPlaces(ctx, curve, p, q))) out.push(p); return out;
}
function order<E>(ctx: ExecutionContext, proof: AlgebraicDifferential<E>, place: AlgebraicPlace<E>) {
  if (proof.divisor === null) return null; return proof.divisor.entries.find(e => equalAlgebraicPlaces(ctx, place.curve, e.place, place))?.coefficient ?? 0n;
}
export function verifyAlgebraicDifferentialResiduesWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicDifferentialResidues<E>, bounds: DifferentialBounds): void {
  const f = curve.owner, c = curve.coordinates.constantOwner; demand(f.equal(ctx, input, proof.input), 'verification-failed', 'residues complete expected input');
  verifyAlgebraicDifferentialWithin(ctx, curve, input, proof.differential, bounds);
  demand((proof.differential.divisor?.entries ?? []).every(e => e.coefficient >= -1n), 'invalid-input', 'residue extraction requires complete simple-pole reduction');
  const all = candidates(ctx, proof.differential); demand(proof.entries.length === all.length && proof.polynomials.length === all.length, 'verification-failed', 'complete finite/infinity/zero residue coverage');
  const ring = proof.lcm.common.ring; demand(ring.domain === c, 'domain-mismatch', 'residue polynomial actual constant owner');
  for (let i = 0; i < all.length; i++) {
    const p = proof.entries[i], expectedOrder = order(ctx, proof.differential, all[i]);
    demand(equalAlgebraicPlaces(ctx, curve, p.place, all[i]) && p.order === expectedOrder, 'verification-failed', 'residue exact ordered place/order correspondence');
    p.place.residue.assert(ctx, p.value);
    if (expectedOrder !== -1n) {
      demand(p.place.residue.isZero(ctx, p.value) && p.parameter === null && p.derivative === null && p.expansion === null && p.minimal === null && ring.equal(ctx, proof.polynomials[i], ring.one(ctx)), 'verification-failed', 'complete explicit zero residue'); continue;
    }
    demand(p.parameter !== null && p.derivative !== null && p.expansion !== null && p.minimal !== null, 'verification-failed', 'simple-pole residue evidence coverage');
    verifyAlgebraicLocalParameterWithin(ctx, curve, p.place, p.parameter); verifyAlgebraicDerivativeWithin(ctx, f, p.parameter.value, p.derivative, bounds);
    demand(!f.isZero(ctx, p.derivative.derivative), 'verification-failed', 'residue nonconstant uniformizer');
    const regular = f.exactDivide(ctx, f.multiply(ctx, p.parameter.value, input), p.derivative.derivative);
    demand(equalAlgebraicPlaces(ctx, curve, p.expansion.place, p.place), 'verification-failed', 'residue local quotient binding');
    verifyAlgebraicLocalExpansionWithin(ctx, curve, p.place, regular, 1n, p.expansion);
    demand(p.expansion.digits.length === 1 && p.place.residue.equal(ctx, p.value, p.expansion.digits[0]) && !p.place.residue.isZero(ctx, p.value), 'verification-failed', 'residue independent uniformizer ratio');
    verifyConstantMinimalPolynomialWithin(ctx, c, p.place.residue, p.value, p.minimal, bounds);
    demand(ring.equal(ctx, proof.polynomials[i], ring.make(ctx, p.minimal.polynomial.coefficients)), 'verification-failed', 'residue complete polynomial mapping');
  }
  verifyCurveDenominators(ctx, ring, proof.polynomials, proof.lcm); verifyBezout(ctx, ring, proof.lcm.common, ring.derivative(ctx, proof.lcm.common), proof.squareFree);
  demand(ring.equal(ctx, proof.squareFree.gcd, ring.one(ctx)), 'verification-failed', 'complete square-free residue value polynomial');
  demand(c.equal(ctx, proof.totalResidue, totalResidue(ctx, curve, proof.entries)) && c.isZero(ctx, proof.totalResidue), 'verification-failed', 'complete global residue trace identity');
}
export function algebraicDifferentialResiduesWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds): AlgebraicDifferentialResidues<E> {
  const f = curve.owner, c = curve.coordinates.constantOwner, differential = certifyAlgebraicDifferentialWithin(ctx, curve, input, bounds);
  demand((differential.divisor?.entries ?? []).every(e => e.coefficient >= -1n), 'invalid-input', 'residue extraction requires simple poles');
  const entries = Object.freeze(candidates(ctx, differential).map(place => {
    const at = order(ctx, differential, place);
    if (at !== -1n) return Object.freeze({place, order: at, value: place.residue.fromInteger(ctx, 0n), parameter: null, derivative: null, expansion: null, minimal: null});
    const parameter = algebraicLocalParameterWithin(ctx, curve, place), derivative = differentiateAlgebraicWithin(ctx, f, parameter.value, bounds), regular = f.exactDivide(ctx, f.multiply(ctx, parameter.value, input), derivative.derivative), expansion = expandAlgebraicPlaceWithin(ctx, curve, place, regular, 1n), value = expansion.digits[0];
    const minimal = constantMinimalPolynomialWithin(ctx, c, place.residue, value, bounds); return Object.freeze({place, order: at, value, parameter, derivative, expansion, minimal});
  }));
  const ring = new PolynomialRing(c, 'residue'), polynomials = Object.freeze(entries.map(p => p.minimal ? ring.make(ctx, p.minimal.polynomial.coefficients) : ring.one(ctx))), lcm = curveDenominators(ctx, ring, polynomials), squareFree = extendedGcd(ctx, ring, lcm.common, ring.derivative(ctx, lcm.common));
  const proof = Object.freeze({input, differential, entries, polynomials, lcm, squareFree, totalResidue: totalResidue(ctx, curve, entries)}); verifyAlgebraicDifferentialResiduesWithin(ctx, curve, input, proof, bounds); return proof;
}
export function algebraicDifferentialResidues<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds) {
  return ctx.operation(() => { const recorded = recordRationalGcdEvidence(ctx, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return algebraicDifferentialResiduesWithin(ctx, curve, input, bounds); }); return Object.freeze({...recorded.value, arithmetic: recorded.evidence}); });
}
export function verifyAlgebraicDifferentialResidues<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicDifferentialResidues<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { demand(proof.arithmetic !== undefined, 'verification-failed', 'residue arithmetic coverage'); replayRationalGcdEvidence(ctx, proof.arithmetic, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicDifferentialResiduesWithin(ctx, curve, input, proof, bounds); }); });
}
