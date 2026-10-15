/** Certified already-simple reduction. General Hermite/infinity machinery is
 * selected before search whenever complete pole coverage lacks this shape. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyAlgebraicCurveWithin, type AlgebraicCurveView} from './algebraic-curve';
import {certifyAlgebraicPoleCoverageWithin, verifyAlgebraicPoleCoverageWithin, type AlgebraicPoleCoverage} from './algebraic-pole-coverage';
import {constructAlgebraicCoveredResiduesWithin, verifyAlgebraicCoveredResiduesWithin, type AlgebraicCoveredResidues} from './algebraic-covered-residues';
import {splitAlgebraicCoveredResiduesWithin, combineAlgebraicCoveredResiduesWithin, constructAlgebraicCoveredLogarithmsWithin, verifyAlgebraicCoveredLogarithmsWithin, type AlgebraicCoveredRelations, type AlgebraicCoveredLogarithms} from './algebraic-covered-relations';
import {constructAlgebraicGlobalFunctionsWithin, verifyAlgebraicGlobalFunctionsWithin, type AlgebraicGlobalFunctionSpace} from './algebraic-global-functions';
import {constructNativeAlgebraicCandidateWithin, checkNativeAlgebraicCandidateWithin, verifyNativeAlgebraicElementaryWithin, type NativeAlgebraicElementaryCandidate, type NativeAlgebraicElementary} from './algebraic-native-elementary';
import {produceGeometricAlgebraicCandidateWithin, checkGeometricAlgebraicCandidateWithin, verifyGeometricAlgebraicDecisionWithin, type GeometricAlgebraicNegative} from './algebraic-geometric-decision';
import {algebraicConditions, verifyAlgebraicConditions, type AlgebraicCondition} from './algebraic-conditions';
import {algebraicIntegrationConditionSources} from './algebraic-differential';
import {recordRationalGcdEvidence, replayRationalGcdEvidence, type RationalGcdEvidence} from './rational-gcd-evidence';
import {verifyGoodReductionClaim} from './algebraic-reduction-errors';
import {tryProduceGenusZeroCandidateWithin} from './genus-zero-integration';
import {constructNativeAlgebraicPrimitiveWithin} from './algebraic-native-primitive';

interface Common<E> {
  readonly method: 'integral-simple-poles'; readonly rule: 'algebraic-liouville-trager-v1';
  readonly kind: 'non-elementary'; readonly input: E; readonly residues: AlgebraicCoveredResidues<E>;
  readonly relations: AlgebraicCoveredRelations<E>; readonly logarithms: AlgebraicCoveredLogarithms<E>;
  readonly conditions: readonly AlgebraicCondition<E>[]; readonly arithmetic?: RationalGcdEvidence;
}
export type LazyAlgebraicNegative<E> = Readonly<Common<E> & (
  {reason: 'non-torsion-residue-divisor'; later: 'unperformed'} |
  {reason: 'nonzero-holomorphic-remainder'; later: 'complete'; remainder: E; holomorphic: AlgebraicPoleCoverage<E>; globalFunctions: AlgebraicGlobalFunctionSpace<E>}
)>;
export type LazyAlgebraicCandidate<E> = NativeAlgebraicElementaryCandidate<E> | LazyAlgebraicNegative<E> | GeometricAlgebraicNegative<E>;
export type LazyAlgebraicDecision<E> = NativeAlgebraicElementary<E> | LazyAlgebraicNegative<E> | GeometricAlgebraicNegative<E>;

export function verifyLazyAlgebraicNegativeWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: LazyAlgebraicNegative<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); const f = curve.owner;
  demand(proof.method === 'integral-simple-poles' && proof.rule === 'algebraic-liouville-trager-v1' && proof.kind === 'non-elementary' && f.equal(ctx, input, proof.input), 'verification-failed', 'lazy exact original rule/request');
  verifyAlgebraicCoveredResiduesWithin(ctx, curve, input, proof.residues, bounds);
  demand(proof.relations.splitting.original === proof.residues, 'domain-mismatch', 'lazy exact complete residue binding');
  verifyAlgebraicCoveredLogarithmsWithin(ctx, curve, proof.relations, proof.logarithms, bounds);
  if (proof.reason === 'non-torsion-residue-divisor') demand(proof.later === 'unperformed' && proof.logarithms.kind === 'non-torsion', 'verification-failed', 'lazy checked first residue-divisor obstruction');
  else {
    demand(proof.reason === 'nonzero-holomorphic-remainder' && proof.later === 'complete' && proof.logarithms.kind === 'complete'
      && !f.isZero(ctx, proof.remainder) && f.equal(ctx, proof.remainder, f.subtract(ctx, input, proof.logarithms.nativeDerivative)), 'verification-failed', 'lazy exact nonzero holomorphic remainder');
    verifyAlgebraicPoleCoverageWithin(ctx, curve, proof.remainder, proof.holomorphic, bounds);
    demand(proof.holomorphic.entries.every(p => p.order !== null && p.order >= 0n), 'verification-failed', 'lazy complete absence of poles');
    verifyAlgebraicGlobalFunctionsWithin(ctx, curve, proof.globalFunctions, bounds);
  }
  verifyAlgebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input), proof.conditions, bounds);
}
export function produceLazyAlgebraicCandidateWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds): LazyAlgebraicCandidate<E> {
  const coverage = certifyAlgebraicPoleCoverageWithin(ctx, curve, input, bounds);
  if (coverage.geometry.genus === 0n) {
    const positive = tryProduceGenusZeroCandidateWithin(ctx, curve, input, bounds, coverage.geometry);
    demand(positive !== null, 'verification-failed', 'complete genus-zero integration applicability');
    const primitive = constructNativeAlgebraicPrimitiveWithin(ctx, curve, positive.primitive, [], bounds);
    return constructNativeAlgebraicCandidateWithin(ctx, curve, input, primitive, bounds);
  }
  if (coverage.entries.some(p => p.order !== null && p.order < -1n)) return produceGeometricAlgebraicCandidateWithin(ctx, curve, input, bounds);
  const residues = constructAlgebraicCoveredResiduesWithin(ctx, curve, input, bounds, coverage), splitting = splitAlgebraicCoveredResiduesWithin(ctx, curve, residues, bounds);
  const relations = combineAlgebraicCoveredResiduesWithin(ctx, splitting, bounds), logarithms = constructAlgebraicCoveredLogarithmsWithin(ctx, curve, relations, bounds);
  const common = {method: 'integral-simple-poles' as const, rule: 'algebraic-liouville-trager-v1' as const, kind: 'non-elementary' as const, input, residues, relations, logarithms,
    conditions: algebraicConditions(ctx, curve.owner, algebraicIntegrationConditionSources(ctx, curve, input), bounds)};
  if (logarithms.kind === 'non-torsion') {ctx.allocate(11); return Object.freeze({...common, reason: 'non-torsion-residue-divisor' as const, later: 'unperformed' as const});}
  const remainder = curve.owner.subtract(ctx, input, logarithms.nativeDerivative);
  if (curve.owner.isZero(ctx, remainder)) return constructNativeAlgebraicCandidateWithin(ctx, curve, input, logarithms.primitive, bounds);
  const holomorphic = certifyAlgebraicPoleCoverageWithin(ctx, curve, remainder, bounds), globalFunctions = constructAlgebraicGlobalFunctionsWithin(ctx, curve, bounds);
  demand(holomorphic.entries.every(p => p.order !== null && p.order >= 0n), 'verification-failed', 'lazy complete holomorphic remainder'); ctx.allocate(14);
  return Object.freeze({...common, reason: 'nonzero-holomorphic-remainder' as const, later: 'complete' as const, remainder, holomorphic, globalFunctions});
}
export function checkLazyAlgebraicCandidateWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, candidate: LazyAlgebraicCandidate<E>, bounds: DifferentialBounds): LazyAlgebraicDecision<E> {
  if (candidate.kind === 'elementary') return checkNativeAlgebraicCandidateWithin(ctx, curve, input, candidate, bounds);
  if ('method' in candidate) {verifyLazyAlgebraicNegativeWithin(ctx, curve, input, candidate, bounds); return candidate;}
  return checkGeometricAlgebraicCandidateWithin(ctx, curve, input, candidate, bounds);
}
export function produceLazyAlgebraicCandidate<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds): LazyAlgebraicCandidate<E> {
  return ctx.operation(() => verifyGoodReductionClaim(() => {const p = recordRationalGcdEvidence(ctx, () => produceLazyAlgebraicCandidateWithin(ctx, curve, input, bounds));
    if (p.value.kind === 'elementary') return p.value; ctx.allocate(2); return Object.freeze({...p.value, arithmetic: p.evidence});}));
}
export function checkLazyAlgebraicCandidate<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, candidate: LazyAlgebraicCandidate<E>, bounds: DifferentialBounds): LazyAlgebraicDecision<E> {
  return ctx.operation(() => verifyGoodReductionClaim(() => checkLazyAlgebraicCandidateWithin(ctx, curve, input, candidate, bounds)));
}
export function verifyLazyAlgebraicDecision<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: LazyAlgebraicDecision<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyGoodReductionClaim(() => {
    if (proof.kind === 'elementary') verifyNativeAlgebraicElementaryWithin(ctx, curve, input, proof, bounds);
    else {demand(proof.arithmetic !== undefined, 'verification-failed', 'lazy negative arithmetic coverage'); replayRationalGcdEvidence(ctx, proof.arithmetic, () => {
      if ('method' in proof) verifyLazyAlgebraicNegativeWithin(ctx, curve, input, proof, bounds);
      else verifyGeometricAlgebraicDecisionWithin(ctx, curve, input, proof, bounds);
    });}
  }));
}
