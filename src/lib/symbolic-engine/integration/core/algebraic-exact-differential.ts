import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { certifyAlgebraicDifferentialWithin, verifyAlgebraicDifferentialWithin, differentialPrimitiveBoundEntries, algebraicIntegrationConditionSources, type AlgebraicDifferential } from './algebraic-differential';
import { constructAlgebraicDivisorWithin, verifyAlgebraicDivisorWithin, type AlgebraicDivisor } from './algebraic-divisor';
import { solveAlgebraicRiemannRochWithin, verifyAlgebraicRiemannRochWithin, type AlgebraicRiemannRoch } from './algebraic-riemann-roch';
import { differentiateAlgebraicWithin, verifyAlgebraicDerivativeWithin, type AlgebraicDerivative } from './algebraic-derivative';
import { constructAlgebraicCoefficientSystem, verifyAlgebraicCoefficientSystem, type AlgebraicCoefficientSystem } from './algebraic-coefficient-system';
import { normalizeAlgebraicPrimitiveCoordinates, verifyAlgebraicConstantProjection } from './algebraic-rr-constant-projection';
import { solveLinearSystem, verifyLinearSolution, type LinearSolution } from './linear-system';
import { algebraicConditions, verifyAlgebraicConditions, type AlgebraicCondition } from './algebraic-conditions';
import type { CurveConstant } from './algebraic-curve-coordinates';
import { recordRationalGcdEvidence, replayRationalGcdEvidence, type RationalGcdEvidence } from './rational-gcd-evidence';

export const algebraicExactDifferentialRule = 'algebraic-exact-differential-riemann-roch-v1' as const;
interface Common<E> {
  readonly arithmetic?: RationalGcdEvidence;
  readonly rule: typeof algebraicExactDifferentialRule;
  readonly input: E;
  readonly differential: AlgebraicDifferential<E>;
  readonly bound: AlgebraicDivisor<E>;
  readonly space: AlgebraicRiemannRoch<E>;
  readonly derivatives: readonly AlgebraicDerivative<E>[];
  readonly matrix: AlgebraicCoefficientSystem;
  readonly elimination: LinearSolution<CurveConstant>;
  readonly conditions: readonly AlgebraicCondition<E>[];
}
export type AlgebraicExactDifferential<E> = Readonly<Common<E> & ({kind: 'no-field-primitive'} | {
  kind: 'primitive'; primitive: E; coordinates: readonly CurveConstant[]; constantCoordinates: readonly CurveConstant[];
  projectionIndex: number; derivative: AlgebraicDerivative<E>;
})>;
export function verifyAlgebraicExactDifferentialWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicExactDifferential<E>, bounds: DifferentialBounds): void {
  const f = curve.owner, c = curve.coordinates.constantOwner;
  demand(proof.rule === algebraicExactDifferentialRule && f.equal(ctx, input, proof.input), 'verification-failed', 'exact differential complete request/rule');
  verifyAlgebraicDifferentialWithin(ctx, curve, input, proof.differential, bounds);
  verifyAlgebraicDivisorWithin(ctx, curve, differentialPrimitiveBoundEntries(ctx, proof.differential), proof.bound);
  verifyAlgebraicRiemannRochWithin(ctx, curve, proof.bound, proof.space, bounds);
  demand(proof.derivatives.length === proof.space.dimension, 'verification-failed', 'exact differential derivative coverage');
  for (let i = 0; i < proof.derivatives.length; i++) verifyAlgebraicDerivativeWithin(ctx, f, proof.space.basis[i], proof.derivatives[i], bounds);
  verifyAlgebraicCoefficientSystem(ctx, curve, input, proof.derivatives.map(d => d.derivative), proof.matrix);
  verifyLinearSolution(ctx, c, proof.matrix.system, proof.elimination);
  if (proof.kind === 'no-field-primitive') demand(proof.elimination.kind === 'inconsistent', 'verification-failed', 'exact differential complete inconsistency');
  else {
    demand(proof.kind === 'primitive' && proof.elimination.kind === 'consistent' && proof.elimination.nullspace.length === 1, 'verification-failed', 'exact differential full constant freedom');
    verifyAlgebraicConstantProjection(ctx, curve, proof.space, proof.elimination.particular, proof);
    verifyAlgebraicDerivativeWithin(ctx, f, proof.primitive, proof.derivative, bounds);
    demand(f.equal(ctx, proof.derivative.derivative, input), 'verification-failed', 'exact differential independent explicit target');
  }
  verifyAlgebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input, proof.kind === 'primitive' ? [proof.primitive] : []), proof.conditions, bounds);
}
export function solveAlgebraicExactDifferentialWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds): AlgebraicExactDifferential<E> {
  const f = curve.owner, c = curve.coordinates.constantOwner, differential = certifyAlgebraicDifferentialWithin(ctx, curve, input, bounds);
  const bound = constructAlgebraicDivisorWithin(ctx, curve, differentialPrimitiveBoundEntries(ctx, differential)), space = solveAlgebraicRiemannRochWithin(ctx, curve, bound, bounds);
  ctx.allocate(space.dimension); const derivatives = Object.freeze(space.basis.map(v => differentiateAlgebraicWithin(ctx, f, v, bounds)));
  const matrix = constructAlgebraicCoefficientSystem(ctx, curve, input, derivatives.map(d => d.derivative)), elimination = solveLinearSystem(ctx, c, matrix.system);
  const common = {rule: algebraicExactDifferentialRule, input, differential, bound, space, derivatives, matrix, elimination}; let result: AlgebraicExactDifferential<E>;
  if (elimination.kind === 'inconsistent') result = Object.freeze({...common, kind: 'no-field-primitive', conditions: algebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input), bounds)});
  else {
    const projection = normalizeAlgebraicPrimitiveCoordinates(ctx, curve, space, elimination.particular), derivative = differentiateAlgebraicWithin(ctx, f, projection.primitive, bounds);
    result = Object.freeze({...common, ...projection, kind: 'primitive', derivative, conditions: algebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input, [projection.primitive]), bounds)});
  }
  verifyAlgebraicExactDifferentialWithin(ctx, curve, input, result, bounds); return result;
}
export function solveAlgebraicExactDifferential<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds) {
  return ctx.operation(() => { const recorded = recordRationalGcdEvidence(ctx, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return solveAlgebraicExactDifferentialWithin(ctx, curve, input, bounds); });
    return Object.freeze({...recorded.value, arithmetic: recorded.evidence}); });
}
export function verifyAlgebraicExactDifferential<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicExactDifferential<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { demand(proof.arithmetic !== undefined, 'verification-failed', 'exact differential native arithmetic coverage');
    replayRationalGcdEvidence(ctx, proof.arithmetic, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicExactDifferentialWithin(ctx, curve, input, proof, bounds); }); });
}
