/** A distinct complete residue certificate with integral-coordinate pole
 * coverage. It does not impersonate a full principal-divisor certificate. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {certifyAlgebraicPoleCoverageWithin, verifyAlgebraicPoleCoverageWithin, isImmutableProducedPoleCoverage, type AlgebraicPoleCoverage} from './algebraic-pole-coverage';
import {assembleAlgebraicResidueDataWithin, verifyAlgebraicResidueDataWithin, verifyAlgebraicLocalResidueWithin, type AlgebraicResidueData, type AlgebraicDifferentialResidue, type AlgebraicResidueRecord} from './algebraic-residue-data';
import {verifyAlgebraicCurveWithin} from './algebraic-curve';
import {ScopedProof} from './scoped-proof';
import {algebraicLocalParameterWithin, expandAlgebraicPlaceWithin} from './algebraic-local';
import {constructAlgebraicCoveredUniformizerWithin, verifyAlgebraicCoveredUniformizerWithin, type AlgebraicCoveredUniformizer} from './algebraic-covered-uniformizer';
import {differentiateAlgebraicWithin, verifyAlgebraicDerivativeWithin, type AlgebraicDerivative} from './algebraic-derivative';
import {constantMinimalPolynomialWithin} from './constant-minimal-polynomial';
import {tryAlgebraicIntegralResidueWithin, verifyAlgebraicIntegralResidueWithin, type AlgebraicIntegralResidue} from './algebraic-integral-residue';
import {recordRationalGcdEvidence, type RationalGcdEvidence} from './rational-gcd-evidence';
const produced = new WeakSet<object>(), checks = new ScopedProof();

export type AlgebraicCoveredResidue<E> = Readonly<
  ({method: 'zero' | 'local-lift'} & AlgebraicDifferentialResidue<E>) |
  ({method: 'quotient-map'; parameter: AlgebraicCoveredUniformizer<E>; derivative: AlgebraicDerivative<E>; evaluation: AlgebraicIntegralResidue<E>} & AlgebraicResidueRecord<E>)
>;
export interface AlgebraicCoveredResidues<E> extends AlgebraicResidueData<E, AlgebraicCoveredResidue<E>> {
  readonly arithmetic?: RationalGcdEvidence;
  readonly coverage: AlgebraicPoleCoverage<E>;
}
export function constructAlgebraicCoveredResidues<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds): AlgebraicCoveredResidues<E> {
  return ctx.operation(() => {const p = recordRationalGcdEvidence(ctx, () => constructAlgebraicCoveredResiduesWithin(ctx, curve, input, bounds)); ctx.allocate(2); return Object.freeze({...p.value, arithmetic: p.evidence});});
}
export function verifyAlgebraicCoveredResiduesWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicCoveredResidues<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); curve.owner.assert(ctx, input);
  const verify = () => {verifyAlgebraicPoleCoverageWithin(ctx, curve, input, proof.coverage, bounds); verifyAlgebraicResidueDataWithin(ctx, curve, input, proof.coverage.entries, proof, bounds, p => verifyAlgebraicCoveredResidueWithin(ctx, curve, input, p, bounds));};
  if (produced.has(proof)) checks.check(ctx, [input as object, proof, bounds], verify, [curve, proof, input as object]); else verify();
}
export function constructAlgebraicCoveredResiduesWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds, coverage?: AlgebraicPoleCoverage<E>): AlgebraicCoveredResidues<E> {
  const complete = coverage ?? certifyAlgebraicPoleCoverageWithin(ctx, curve, input, bounds);
  verifyAlgebraicPoleCoverageWithin(ctx, curve, input, complete, bounds);
  const f = curve.owner; ctx.allocate(complete.entries.length);
  const entries = Object.freeze(complete.entries.map(({place, order}): AlgebraicCoveredResidue<E> => {
    if (order !== -1n) return Object.freeze({method: 'zero', place, order, value: place.residue.fromInteger(ctx, 0n), parameter: null, derivative: null, expansion: null, minimal: null});
    const parameter = constructAlgebraicCoveredUniformizerWithin(ctx, curve, place), derivative = differentiateAlgebraicWithin(ctx, f, parameter.value, bounds), regular = f.exactDivide(ctx, f.multiply(ctx, parameter.value, input), derivative.derivative);
    const evaluation = tryAlgebraicIntegralResidueWithin(ctx, curve, place, regular);
    if (evaluation !== null) {
      const value = evaluation.value, minimal = constantMinimalPolynomialWithin(ctx, curve.coordinates.constantOwner, place.residue, value, bounds);
      return Object.freeze({method: 'quotient-map', place, order, value, parameter, derivative, evaluation, minimal});
    }
    const localParameter = parameter.method === 'ideal-basis' ? parameter.evidence : algebraicLocalParameterWithin(ctx, curve, place);
    const localDerivative = parameter.method === 'ideal-basis' ? derivative : differentiateAlgebraicWithin(ctx, f, localParameter.value, bounds);
    const localRegular = f.exactDivide(ctx, f.multiply(ctx, localParameter.value, input), localDerivative.derivative);
    const expansion = expandAlgebraicPlaceWithin(ctx, curve, place, localRegular, 1n), value = expansion.digits[0], minimal = constantMinimalPolynomialWithin(ctx, curve.coordinates.constantOwner, place.residue, value, bounds);
    return Object.freeze({method: 'local-lift', place, order, value, parameter: localParameter, derivative: localDerivative, expansion, minimal});
  }));
  const data = assembleAlgebraicResidueDataWithin(ctx, curve, input, complete.entries, entries, bounds, p => verifyAlgebraicCoveredResidueWithin(ctx, curve, input, p, bounds)); ctx.allocate(8);
  const proof = Object.freeze({...data, coverage: complete});
  // A caller-provided coverage may be mutable. It remains fully verifiable,
  // but only closed-producer evidence qualifies for immutable-root reuse.
  if (isImmutableProducedPoleCoverage(ctx, complete)) {ctx.allocate(1); produced.add(proof);}
  verifyAlgebraicCoveredResiduesWithin(ctx, curve, input, proof, bounds); return proof;
}

export function verifyAlgebraicCoveredResidueWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, p: AlgebraicCoveredResidue<E>, bounds: DifferentialBounds): void {
  if (p.method !== 'quotient-map') {
    demand(p.method === 'zero' ? p.order !== -1n : p.method === 'local-lift' && p.order === -1n, 'verification-failed', 'covered exact residue method');
    verifyAlgebraicLocalResidueWithin(ctx, curve, input, p, bounds); return;
  }
  demand(p.order === -1n && p.parameter !== null && p.derivative !== null && p.minimal !== null, 'verification-failed', 'direct simple-pole residue coverage');
  const f = curve.owner; verifyAlgebraicCoveredUniformizerWithin(ctx, curve, p.place, p.parameter); verifyAlgebraicDerivativeWithin(ctx, f, p.parameter.value, p.derivative, bounds);
  demand(!f.isZero(ctx, p.derivative.derivative), 'verification-failed', 'direct nonconstant uniformizer');
  const regular = f.exactDivide(ctx, f.multiply(ctx, p.parameter.value, input), p.derivative.derivative);
  verifyAlgebraicIntegralResidueWithin(ctx, curve, p.place, regular, p.evaluation);
  demand(p.place.residue.equal(ctx, p.value, p.evaluation.value) && !p.place.residue.isZero(ctx, p.value), 'verification-failed', 'direct exact residue map/nonzero');
}
