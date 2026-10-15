/** Complete exactness through a checked rational presentation; no elementary-negative authority. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyAlgebraicCurveWithin, type AlgebraicCurveView} from './algebraic-curve';
import type {CurveScalar} from './algebraic-curve-coordinates';
import {reduceConstantRationalHermite, verifyConstantRationalHermite, type ConstantHermiteCertificate} from './constant-rational-hermite';
import {tryRationalCurveParametrizationWithin, verifyRationalCurveParametrizationWithin, rationalCurveForwardWithin, rationalCurveBackwardWithin,
  type RationalCurveParametrization} from './rational-curve-parametrization';
import type {CurveConstant} from './algebraic-curve-coordinates';
import {differentiateAlgebraicWithin, verifyAlgebraicDerivativeWithin, type AlgebraicDerivative} from './algebraic-derivative';
import {algebraicConditions, verifyAlgebraicConditions, type AlgebraicCondition} from './algebraic-conditions';
import {algebraicIntegrationConditionSources} from './algebraic-differential';

interface Common<E> {
  readonly rule: 'rational-curve-exact-differential-v1';
  readonly input: E;
  readonly parametrization: RationalCurveParametrization<E>;
  readonly transformed: CurveScalar;
  readonly hermite: ConstantHermiteCertificate<CurveConstant>;
  readonly conditions: readonly AlgebraicCondition<E>[];
}
/** Distinct native certificate; it does not imitate the legacy Riemann–Roch format. */
export type RationalCurveExactDifferential<E> = Readonly<Common<E> & (
  | {kind: 'primitive'; primitive: E; derivative: AlgebraicDerivative<E>}
  | {kind: 'no-field-primitive'}
)>;
export function verifyRationalCurveExactDifferentialWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E,
  proof: RationalCurveExactDifferential<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); const owner = curve.owner;
  demand(proof.rule === 'rational-curve-exact-differential-v1' && owner.equal(ctx, input, proof.input), 'verification-failed', 'rational curve exactness explicit request');
  const p = proof.parametrization, f = p.field;
  verifyRationalCurveParametrizationWithin(ctx, curve, p, bounds);
  const image = rationalCurveForwardWithin(ctx, curve, p, input);
  demand(owner.equal(ctx, rationalCurveBackwardWithin(ctx, curve, p, image), input)
    && f.equal(ctx, proof.transformed, f.multiply(ctx, image, f.derivative(ctx, p.xImage))),
    'verification-failed', 'exact differential complete forward/inverse input mapping');
  verifyConstantRationalHermite(ctx, {x: f.ring, fractions: f}, proof.transformed, proof.hermite);
  const exact = f.isZero(ctx, proof.hermite.residual);
  if (proof.kind === 'primitive') {
    demand(exact && owner.equal(ctx, proof.primitive, rationalCurveBackwardWithin(ctx, curve, p, proof.hermite.rationalPart)),
      'verification-failed', 'rational curve primitive mapping and constant projection');
    verifyAlgebraicDerivativeWithin(ctx, owner, proof.primitive, proof.derivative, bounds);
    demand(owner.equal(ctx, proof.derivative.derivative, input), 'verification-failed', 'rational curve independent final derivative');
  } else demand(proof.kind === 'no-field-primitive' && !exact, 'verification-failed', 'complete rational residual exactness obstruction');
  // Verified full constants of the native curve give exactly the additive freedom C.
  // The Hermite polynomial-part constant is zero; no point evaluation is used.
  verifyAlgebraicConditions(ctx, owner, algebraicIntegrationConditionSources(ctx, curve, input,
    proof.kind === 'primitive' ? [proof.primitive] : []), proof.conditions, bounds);
}
export function trySolveRationalCurveExactDifferentialWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E,
  bounds: DifferentialBounds): RationalCurveExactDifferential<E> | null {
  curve.owner.assert(ctx, input); const p = tryRationalCurveParametrizationWithin(ctx, curve, bounds);
  if (p === null) return null;
  const f = p.field, transformed = f.multiply(ctx, rationalCurveForwardWithin(ctx, curve, p, input), f.derivative(ctx, p.xImage));
  const hermite = reduceConstantRationalHermite(ctx, {x: f.ring, fractions: f}, transformed), common = {
    rule: 'rational-curve-exact-differential-v1' as const, input, parametrization: p, transformed, hermite};
  let proof: RationalCurveExactDifferential<E>; ctx.allocate(8);
  if (f.isZero(ctx, hermite.residual)) {
    const primitive = rationalCurveBackwardWithin(ctx, curve, p, hermite.rationalPart), derivative = differentiateAlgebraicWithin(ctx, curve.owner, primitive, bounds);
    proof = Object.freeze({...common, kind: 'primitive', primitive, derivative,
      conditions: algebraicConditions(ctx, curve.owner, algebraicIntegrationConditionSources(ctx, curve, input, [primitive]), bounds)});
  } else proof = Object.freeze({...common, kind: 'no-field-primitive',
    conditions: algebraicConditions(ctx, curve.owner, algebraicIntegrationConditionSources(ctx, curve, input), bounds)});
  verifyRationalCurveExactDifferentialWithin(ctx, curve, input, proof, bounds); return proof;
}
export function trySolveRationalCurveExactDifferential<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds) {
  return ctx.operation(() => trySolveRationalCurveExactDifferentialWithin(ctx, curve, input, bounds));
}
export function verifyRationalCurveExactDifferential<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E,
  proof: RationalCurveExactDifferential<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyRationalCurveExactDifferentialWithin(ctx, curve, input, proof, bounds));
}
