import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { reduceAlgebraicHermiteWithin, verifyAlgebraicHermiteWithin, type AlgebraicHermite } from './algebraic-hermite';
import { reduceAlgebraicInfinityWithin, verifyAlgebraicInfinityReductionWithin, type AlgebraicInfinityReduction } from './algebraic-infinity-reduction';
import { algebraicDifferentialResiduesWithin, verifyAlgebraicDifferentialResiduesWithin, type AlgebraicDifferentialResidues } from './algebraic-differential-residues';
import { differentiateAlgebraicWithin, verifyAlgebraicDerivativeWithin, type AlgebraicDerivative } from './algebraic-derivative';
import { algebraicConditions, verifyAlgebraicConditions, type AlgebraicCondition } from './algebraic-conditions';
import { algebraicIntegrationConditionSources } from './algebraic-differential';
import { recordRationalGcdEvidence, replayRationalGcdEvidence, type RationalGcdEvidence } from './rational-gcd-evidence';

interface Common<E> {
  readonly arithmetic?: RationalGcdEvidence;
  readonly input: E;
  readonly hermite: AlgebraicHermite<E>;
  readonly infinity: AlgebraicInfinityReduction<E>;
  readonly conditions: readonly AlgebraicCondition<E>[];
}
export type AlgebraicDifferentialReduction<E> = Readonly<Common<E> & (
  {kind: 'infinity-unsolved'; residues: null} |
  {kind: 'simple-poles'; fieldPart: E; derivative: AlgebraicDerivative<E>; remainder: E; residues: AlgebraicDifferentialResidues<E>}
)>;
export function verifyAlgebraicDifferentialReductionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicDifferentialReduction<E>, bounds: DifferentialBounds): void {
  const f = curve.owner; demand(f.equal(ctx, input, proof.input), 'verification-failed', 'algebraic reduction complete expected input');
  verifyAlgebraicHermiteWithin(ctx, curve, input, proof.hermite, bounds);
  verifyAlgebraicInfinityReductionWithin(ctx, curve, proof.hermite.remainder, proof.infinity, bounds);
  if (proof.kind === 'infinity-unsolved') demand(proof.infinity.kind === 'no-simple-pole-reduction' && proof.residues === null, 'verification-failed', 'algebraic reduction unsolved-stage coverage');
  else {
    demand(proof.kind === 'simple-poles' && proof.infinity.kind === 'reduced' && f.equal(ctx, proof.fieldPart, f.add(ctx, proof.hermite.fieldPart, proof.infinity.primitive))
      && f.equal(ctx, proof.remainder, proof.infinity.remainder), 'verification-failed', 'algebraic reduction exact correction/remainder');
    verifyAlgebraicDerivativeWithin(ctx, f, proof.fieldPart, proof.derivative, bounds);
    demand(f.equal(ctx, input, f.add(ctx, proof.derivative.derivative, proof.remainder)), 'verification-failed', 'algebraic reduction independent derivative reconstruction');
    verifyAlgebraicDifferentialResiduesWithin(ctx, curve, proof.remainder, proof.residues, bounds);
  }
  verifyAlgebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input, proof.kind === 'simple-poles' ? [proof.fieldPart] : [proof.hermite.fieldPart]), proof.conditions, bounds);
}
export function reduceAlgebraicDifferentialWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds): AlgebraicDifferentialReduction<E> {
  const f = curve.owner, hermite = reduceAlgebraicHermiteWithin(ctx, curve, input, bounds), infinity = reduceAlgebraicInfinityWithin(ctx, curve, hermite.remainder, bounds); let result: AlgebraicDifferentialReduction<E>;
  if (infinity.kind === 'no-simple-pole-reduction') result = Object.freeze({input, hermite, infinity, kind: 'infinity-unsolved', residues: null,
    conditions: algebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input, [hermite.fieldPart]), bounds)});
  else {
    const fieldPart = f.add(ctx, hermite.fieldPart, infinity.primitive), derivative = differentiateAlgebraicWithin(ctx, f, fieldPart, bounds), remainder = infinity.remainder, residues = algebraicDifferentialResiduesWithin(ctx, curve, remainder, bounds);
    result = Object.freeze({input, hermite, infinity, kind: 'simple-poles', fieldPart, derivative, remainder, residues,
      conditions: algebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input, [fieldPart]), bounds)});
  }
  verifyAlgebraicDifferentialReductionWithin(ctx, curve, input, result, bounds); return result;
}
export function reduceAlgebraicDifferential<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds) {
  return ctx.operation(() => { const p = recordRationalGcdEvidence(ctx, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return reduceAlgebraicDifferentialWithin(ctx, curve, input, bounds); }); return Object.freeze({...p.value, arithmetic: p.evidence}); });
}
export function verifyAlgebraicDifferentialReduction<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicDifferentialReduction<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { demand(proof.arithmetic !== undefined, 'verification-failed', 'algebraic reduction arithmetic coverage'); replayRationalGcdEvidence(ctx, proof.arithmetic, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicDifferentialReductionWithin(ctx, curve, input, proof, bounds); }); });
}
