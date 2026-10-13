import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { reduceAlgebraicDifferentialWithin, verifyAlgebraicDifferentialReductionWithin, type AlgebraicDifferentialReduction } from './algebraic-differential-reduction';
import { splitAlgebraicResiduesWithin } from './algebraic-residue-splitting';
import { combineAlgebraicResiduesWithin, type AlgebraicResidueRelations } from './algebraic-residue-relations';
import { constructAlgebraicLogarithmsWithin, verifyAlgebraicLogarithmicConstructionWithin, type AlgebraicLogarithmicConstruction } from './algebraic-logarithmic-construction';
import { solveAlgebraicExactDifferentialWithin, verifyAlgebraicExactDifferentialWithin, type AlgebraicExactDifferential } from './algebraic-exact-differential';
import { assembleAlgebraicPrimitiveWithin, differentiateAlgebraicPrimitiveWithin, verifyAlgebraicPrimitiveWithin, withAlgebraicPrimitiveArithmeticWithin, type AlgebraicPrimitive, type AlgebraicPrimitiveDerivative } from './algebraic-primitive';
import { algebraicConditions, verifyAlgebraicConditions, type AlgebraicCondition } from './algebraic-conditions';
import { algebraicIntegrationConditionSources } from './algebraic-differential';
import { recordRationalGcdEvidence, replayRationalGcdEvidence, type RationalGcdEvidence } from './rational-gcd-evidence';
import { verifyGoodReductionClaim } from './algebraic-reduction-errors';

export const algebraicIntegrationRule = 'algebraic-liouville-trager-v1' as const;
interface Common<E> {
  readonly arithmetic?: RationalGcdEvidence;
  readonly rule: typeof algebraicIntegrationRule;
  readonly input: E;
  readonly reduction: AlgebraicDifferentialReduction<E>;
  readonly conditions: readonly AlgebraicCondition<E>[];
}
interface Logarithmic<E> { readonly relations: AlgebraicResidueRelations<E>; readonly logarithms: AlgebraicLogarithmicConstruction<E> }
interface Remaining<E> extends Logarithmic<E> { readonly remainder: E; readonly exact: AlgebraicExactDifferential<E> }
export type AlgebraicDecision<E> = Readonly<Common<E> & (
  {kind: 'non-elementary'; reason: 'infinity-principal-part-obstruction'; later: 'unperformed'} |
  (Logarithmic<E> & {kind: 'non-elementary'; reason: 'non-torsion-residue-divisor'; later: 'unperformed'}) |
  (Remaining<E> & {kind: 'non-elementary'; reason: 'nonzero-holomorphic-remainder'; later: 'complete'}) |
  (Remaining<E> & {kind: 'elementary'; primitive: AlgebraicPrimitive<E>; derivative: AlgebraicPrimitiveDerivative<E>})
)>;
function returned<E>(proof: AlgebraicDecision<E>): readonly E[] {
  if (proof.kind === 'elementary') return [proof.primitive.fieldPart];
  return [proof.reduction.kind === 'simple-poles' ? proof.reduction.fieldPart : proof.reduction.hermite.fieldPart];
}
export function verifyAlgebraicDecisionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicDecision<E>, bounds: DifferentialBounds): void {
  const f = curve.owner; f.assert(ctx, input); demand(proof.rule === algebraicIntegrationRule && f.equal(ctx, input, proof.input), 'verification-failed', 'algebraic integration complete expected request/rule');
  verifyAlgebraicDifferentialReductionWithin(ctx, curve, input, proof.reduction, bounds);
  if (proof.kind === 'non-elementary' && proof.reason === 'infinity-principal-part-obstruction') demand(proof.reduction.kind === 'infinity-unsolved' && proof.later === 'unperformed', 'verification-failed', 'complete infinity Liouville obstruction');
  else {
    demand(proof.reduction.kind === 'simple-poles' && proof.relations.splitting.original === proof.reduction.residues && proof.relations.splitting.source === curve, 'domain-mismatch', 'integration exact reduction/residue/constant binding');
    verifyAlgebraicLogarithmicConstructionWithin(ctx, curve, proof.relations, proof.logarithms, bounds);
    if (proof.kind === 'non-elementary' && proof.reason === 'non-torsion-residue-divisor') demand(proof.logarithms.kind === 'non-torsion' && proof.later === 'unperformed', 'verification-failed', 'complete combined residue-divisor obstruction');
    else {
      demand(proof.logarithms.kind === 'complete' && f.equal(ctx, proof.remainder, f.subtract(ctx, proof.reduction.remainder, proof.logarithms.nativeDerivative)), 'verification-failed', 'complete native post-logarithmic differential');
      verifyAlgebraicExactDifferentialWithin(ctx, curve, proof.remainder, proof.exact, bounds);
      demand((proof.exact.differential.divisor?.entries ?? []).every(p => p.coefficient >= 0n) && proof.exact.bound.entries.length === 0, 'verification-failed', 'complete absence of finite/infinity remainder poles');
      if (proof.kind === 'elementary') {
        const logTerms = proof.logarithms.primitive.terms;
        demand(f.isZero(ctx, proof.remainder) && proof.exact.kind === 'primitive' && f.equal(ctx, proof.primitive.fieldPart, f.add(ctx, proof.reduction.fieldPart, proof.exact.primitive))
          && proof.primitive.terms.length === logTerms.length && proof.primitive.terms.every((t, i) => t === logTerms[i]), 'verification-failed', 'complete assembled elementary primitive mapping');
        verifyAlgebraicPrimitiveWithin(ctx, curve, proof.primitive, input, proof.derivative, bounds);
      } else demand(proof.kind === 'non-elementary' && proof.reason === 'nonzero-holomorphic-remainder' && proof.later === 'complete' && !f.isZero(ctx, proof.remainder)
        && proof.exact.kind === 'no-field-primitive', 'verification-failed', 'nonzero holomorphic Liouville obstruction and complete exactness');
    }
  }
  verifyAlgebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input, returned(proof)), proof.conditions, bounds);
}
export function integrateAlgebraicWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds): AlgebraicDecision<E> {
  curve.owner.assert(ctx, input); const f = curve.owner, reduction = reduceAlgebraicDifferentialWithin(ctx, curve, input, bounds), common = {rule: algebraicIntegrationRule, input, reduction}; let decision: AlgebraicDecision<E>;
  if (reduction.kind === 'infinity-unsolved') decision = Object.freeze({...common, kind: 'non-elementary', reason: 'infinity-principal-part-obstruction', later: 'unperformed', conditions: algebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input, [reduction.hermite.fieldPart]), bounds)});
  else {
    const splitting = splitAlgebraicResiduesWithin(ctx, curve, reduction.remainder, reduction.residues, bounds), relations = combineAlgebraicResiduesWithin(ctx, splitting, bounds), logarithms = constructAlgebraicLogarithmsWithin(ctx, curve, relations, bounds);
    if (logarithms.kind === 'non-torsion') decision = Object.freeze({...common, relations, logarithms, kind: 'non-elementary', reason: 'non-torsion-residue-divisor', later: 'unperformed', conditions: algebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input, [reduction.fieldPart]), bounds)});
    else {
      const remainder = f.subtract(ctx, reduction.remainder, logarithms.nativeDerivative), exact = solveAlgebraicExactDifferentialWithin(ctx, curve, remainder, bounds);
      demand((exact.differential.divisor?.entries ?? []).every(p => p.coefficient >= 0n), 'verification-failed', 'logarithmic subtraction leaves a holomorphic differential');
      if (f.isZero(ctx, remainder)) {
        demand(exact.kind === 'primitive', 'verification-failed', 'zero remainder exactness'); const fieldPart = f.add(ctx, reduction.fieldPart, exact.primitive), primitive = assembleAlgebraicPrimitiveWithin(ctx, curve, fieldPart, logarithms.primitive.terms, bounds), derivative = differentiateAlgebraicPrimitiveWithin(ctx, curve, primitive, bounds);
        decision = Object.freeze({...common, relations, logarithms, remainder, exact, kind: 'elementary', primitive, derivative, conditions: algebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input, [fieldPart]), bounds)});
      } else {
        demand(exact.kind === 'no-field-primitive', 'verification-failed', 'proper-curve holomorphic exactness'); decision = Object.freeze({...common, relations, logarithms, remainder, exact, kind: 'non-elementary', reason: 'nonzero-holomorphic-remainder', later: 'complete', conditions: algebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input, [reduction.fieldPart]), bounds)});
      }
    }
  }
  verifyAlgebraicDecisionWithin(ctx, curve, input, decision, bounds); return decision;
}
export function integrateAlgebraic<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds): AlgebraicDecision<E> {
  return ctx.operation(() => verifyGoodReductionClaim(() => { const p = recordRationalGcdEvidence(ctx, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return integrateAlgebraicWithin(ctx, curve, input, bounds); });
    return p.value.kind === 'elementary' ? Object.freeze({...p.value, primitive: withAlgebraicPrimitiveArithmeticWithin(ctx, p.value.primitive, p.evidence), derivative: Object.freeze({...p.value.derivative, arithmetic: p.evidence}), arithmetic: p.evidence}) : Object.freeze({...p.value, arithmetic: p.evidence}); }));
}
export function verifyAlgebraicDecision<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicDecision<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyGoodReductionClaim(() => { demand(proof.arithmetic !== undefined, 'verification-failed', 'algebraic integration full arithmetic coverage'); replayRationalGcdEvidence(ctx, proof.arithmetic, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicDecisionWithin(ctx, curve, input, proof, bounds); }); }));
}
