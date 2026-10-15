/** The complete algebraic reduction with geometric principal-multiple
 * subsidiaries and a compact positive boundary. Legacy decisions are intact. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyAlgebraicCurveWithin, type AlgebraicCurveView} from './algebraic-curve';
import {reduceAlgebraicDifferentialWithin, verifyAlgebraicDifferentialReductionWithin, type AlgebraicDifferentialReduction} from './algebraic-differential-reduction';
import {splitAlgebraicResiduesWithin} from './algebraic-residue-splitting';
import {combineAlgebraicResiduesWithin, type AlgebraicResidueRelations} from './algebraic-residue-relations';
import {constructGeometricAlgebraicLogarithmsWithin, verifyGeometricAlgebraicLogarithmsWithin, type GeometricAlgebraicLogarithms} from './algebraic-geometric-logarithms';
import {solveAlgebraicExactDifferentialWithin, verifyAlgebraicExactDifferentialWithin, type AlgebraicExactDifferential} from './algebraic-exact-differential';
import {assembleAlgebraicPrimitiveWithin} from './algebraic-primitive';
import {assembleNativeAlgebraicPrimitiveWithin} from './algebraic-native-primitive';
import {constructNativeAlgebraicCandidateWithin, checkNativeAlgebraicCandidateWithin, verifyNativeAlgebraicElementaryWithin, type NativeAlgebraicElementaryCandidate, type NativeAlgebraicElementary} from './algebraic-native-elementary';
import {algebraicConditions, verifyAlgebraicConditions, type AlgebraicCondition} from './algebraic-conditions';
import {algebraicIntegrationConditionSources} from './algebraic-differential';
import {recordRationalGcdEvidence, replayRationalGcdEvidence, type RationalGcdEvidence} from './rational-gcd-evidence';
import {verifyGoodReductionClaim} from './algebraic-reduction-errors';

interface Common<E> {
  readonly rule: 'algebraic-liouville-trager-v1'; readonly input: E; readonly reduction: AlgebraicDifferentialReduction<E>;
  readonly kind: 'non-elementary'; readonly conditions: readonly AlgebraicCondition<E>[]; readonly arithmetic?: RationalGcdEvidence;
}
export type GeometricAlgebraicNegative<E> = Readonly<Common<E> & (
  {reason: 'infinity-principal-part-obstruction'; later: 'unperformed'} |
  {reason: 'non-torsion-residue-divisor'; later: 'unperformed'; relations: AlgebraicResidueRelations<E>; logarithms: GeometricAlgebraicLogarithms<E>} |
  {reason: 'nonzero-holomorphic-remainder'; later: 'complete'; relations: AlgebraicResidueRelations<E>; logarithms: GeometricAlgebraicLogarithms<E>; remainder: E; exact: AlgebraicExactDifferential<E>}
)>;
export type GeometricAlgebraicCandidate<E> = NativeAlgebraicElementaryCandidate<E> | GeometricAlgebraicNegative<E>;
export type GeometricAlgebraicDecision<E> = NativeAlgebraicElementary<E> | GeometricAlgebraicNegative<E>;
function returned<E>(proof: GeometricAlgebraicNegative<E>): readonly E[] {
  return [proof.reduction.kind === 'simple-poles' ? proof.reduction.fieldPart : proof.reduction.hermite.fieldPart];
}
export function verifyGeometricAlgebraicDecisionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: GeometricAlgebraicDecision<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); const f = curve.owner; f.assert(ctx, input);
  if (proof.kind === 'elementary') {verifyNativeAlgebraicElementaryWithin(ctx, curve, input, proof, bounds); return;}
  demand(proof.rule === 'algebraic-liouville-trager-v1' && f.equal(ctx, input, proof.input), 'verification-failed', 'geometric negative exact original request/rule');
  verifyAlgebraicDifferentialReductionWithin(ctx, curve, input, proof.reduction, bounds);
  if (proof.reason === 'infinity-principal-part-obstruction') demand(proof.reduction.kind === 'infinity-unsolved' && proof.later === 'unperformed', 'verification-failed', 'geometric complete infinity obstruction');
  else {
    demand(proof.reduction.kind === 'simple-poles' && proof.relations.splitting.original === proof.reduction.residues, 'domain-mismatch', 'geometric complete residue reduction binding');
    verifyGeometricAlgebraicLogarithmsWithin(ctx, curve, proof.relations, proof.logarithms, bounds);
    if (proof.reason === 'non-torsion-residue-divisor') demand(proof.logarithms.kind === 'non-torsion' && proof.later === 'unperformed', 'verification-failed', 'geometric complete residue-divisor obstruction');
    else {
      demand(proof.reason === 'nonzero-holomorphic-remainder' && proof.later === 'complete' && proof.logarithms.kind === 'complete'
        && f.equal(ctx, proof.remainder, f.subtract(ctx, proof.reduction.remainder, proof.logarithms.nativeDerivative)) && !f.isZero(ctx, proof.remainder), 'verification-failed', 'geometric exact nonzero remaining differential');
      verifyAlgebraicExactDifferentialWithin(ctx, curve, proof.remainder, proof.exact, bounds);
      demand(proof.exact.kind === 'no-field-primitive' && proof.exact.bound.entries.length === 0 && (proof.exact.differential.divisor?.entries ?? []).every(p => p.coefficient >= 0n), 'verification-failed', 'geometric complete nonzero holomorphic obstruction');
    }
  }
  verifyAlgebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input, returned(proof)), proof.conditions, bounds);
}
export function produceGeometricAlgebraicCandidateWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds): GeometricAlgebraicCandidate<E> {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); const f = curve.owner; f.assert(ctx, input);
  const reduction = reduceAlgebraicDifferentialWithin(ctx, curve, input, bounds), common = {rule: 'algebraic-liouville-trager-v1' as const, input, reduction, kind: 'non-elementary' as const};
  if (reduction.kind === 'infinity-unsolved') {ctx.allocate(8); return Object.freeze({...common, reason: 'infinity-principal-part-obstruction' as const, later: 'unperformed' as const,
    conditions: algebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input, [reduction.hermite.fieldPart]), bounds)});}
  const splitting = splitAlgebraicResiduesWithin(ctx, curve, reduction.remainder, reduction.residues, bounds), relations = combineAlgebraicResiduesWithin(ctx, splitting, bounds), logarithms = constructGeometricAlgebraicLogarithmsWithin(ctx, curve, relations, bounds);
  if (logarithms.kind === 'non-torsion') {ctx.allocate(10); return Object.freeze({...common, reason: 'non-torsion-residue-divisor' as const, later: 'unperformed' as const, relations, logarithms,
    conditions: algebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input, [reduction.fieldPart]), bounds)});}
  const remainder = f.subtract(ctx, reduction.remainder, logarithms.nativeDerivative);
  if (f.isZero(ctx, remainder)) {
    const base = assembleAlgebraicPrimitiveWithin(ctx, curve, reduction.fieldPart, logarithms.primitive.base.terms, bounds), primitive = assembleNativeAlgebraicPrimitiveWithin(ctx, curve, base, logarithms.primitive.terms, bounds);
    return constructNativeAlgebraicCandidateWithin(ctx, curve, input, primitive, bounds);
  }
  const exact = solveAlgebraicExactDifferentialWithin(ctx, curve, remainder, bounds);
  demand(exact.kind === 'no-field-primitive' && exact.bound.entries.length === 0 && (exact.differential.divisor?.entries ?? []).every(p => p.coefficient >= 0n), 'verification-failed', 'geometric remaining differential holomorphic necessity');
  ctx.allocate(12); return Object.freeze({...common, reason: 'nonzero-holomorphic-remainder' as const, later: 'complete' as const, relations, logarithms, remainder, exact,
    conditions: algebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input, [reduction.fieldPart]), bounds)});
}
export function checkGeometricAlgebraicCandidateWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, candidate: GeometricAlgebraicCandidate<E>, bounds: DifferentialBounds): GeometricAlgebraicDecision<E> {
  if (candidate.kind === 'elementary') return checkNativeAlgebraicCandidateWithin(ctx, curve, input, candidate, bounds);
  verifyGeometricAlgebraicDecisionWithin(ctx, curve, input, candidate, bounds); return candidate;
}
export function produceGeometricAlgebraicCandidate<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds) {
  return ctx.operation(() => verifyGoodReductionClaim(() => {const p = recordRationalGcdEvidence(ctx, () => produceGeometricAlgebraicCandidateWithin(ctx, curve, input, bounds));
    if (p.value.kind === 'elementary') return p.value;
    ctx.allocate(2); return Object.freeze({...p.value, arithmetic: p.evidence});}));
}
export function checkGeometricAlgebraicCandidate<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, candidate: GeometricAlgebraicCandidate<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => verifyGoodReductionClaim(() => checkGeometricAlgebraicCandidateWithin(ctx, curve, input, candidate, bounds)));
}
export function verifyGeometricAlgebraicDecision<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: GeometricAlgebraicDecision<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyGoodReductionClaim(() => {
    if (proof.kind === 'elementary') verifyGeometricAlgebraicDecisionWithin(ctx, curve, input, proof, bounds);
    else {demand(proof.arithmetic !== undefined, 'verification-failed', 'geometric negative arithmetic coverage'); replayRationalGcdEvidence(ctx, proof.arithmetic, () => verifyGeometricAlgebraicDecisionWithin(ctx, curve, input, proof, bounds));}
  }));
}
