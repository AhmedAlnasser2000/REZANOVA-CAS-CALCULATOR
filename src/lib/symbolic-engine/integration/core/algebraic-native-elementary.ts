/** Untrusted answer-first candidates and compact positive native authority. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyAlgebraicCurveWithin, type AlgebraicCurveView} from './algebraic-curve';
import {algebraicConditions, verifyAlgebraicConditions, type AlgebraicCondition} from './algebraic-conditions';
import {algebraicIntegrationConditionSources} from './algebraic-differential';
import {differentiateNativeAlgebraicPrimitiveWithin, verifyNativeAlgebraicPrimitiveWithin, type NativeAlgebraicPrimitive, type NativeAlgebraicPrimitiveDerivative} from './algebraic-native-primitive';

export const nativeAlgebraicElementaryRule = 'algebraic-native-elementary-derivative-v3' as const;
export interface NativeAlgebraicElementaryCandidate<E> {
  readonly kind: 'elementary'; readonly input: E; readonly primitive: NativeAlgebraicPrimitive<E>;
  readonly conditions: readonly AlgebraicCondition<E>[];
}
export interface NativeAlgebraicElementary<E> extends NativeAlgebraicElementaryCandidate<E> {
  readonly rule: typeof nativeAlgebraicElementaryRule; readonly derivative: NativeAlgebraicPrimitiveDerivative<E>;
}
export function constructNativeAlgebraicCandidateWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, primitive: NativeAlgebraicPrimitive<E>, bounds: DifferentialBounds): NativeAlgebraicElementaryCandidate<E> {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); curve.owner.assert(ctx, input);
  demand(primitive.base.curve === curve, 'domain-mismatch', 'native candidate curve binding');
  ctx.allocate(4); return Object.freeze({kind: 'elementary', input, primitive,
    conditions: algebraicConditions(ctx, curve.owner, algebraicIntegrationConditionSources(ctx, curve, input, [primitive.base.fieldPart]), bounds)});
}
export function verifyNativeAlgebraicElementaryWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: NativeAlgebraicElementary<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); curve.owner.assert(ctx, input);
  demand(proof.kind === 'elementary' && proof.rule === nativeAlgebraicElementaryRule && curve.owner.equal(ctx, input, proof.input), 'verification-failed', 'native elementary explicit request');
  verifyNativeAlgebraicPrimitiveWithin(ctx, curve, proof.primitive, input, proof.derivative, bounds);
  verifyAlgebraicConditions(ctx, curve.owner, algebraicIntegrationConditionSources(ctx, curve, input, [proof.primitive.base.fieldPart]), proof.conditions, bounds);
}
export function checkNativeAlgebraicCandidateWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, candidate: NativeAlgebraicElementaryCandidate<E>, bounds: DifferentialBounds): NativeAlgebraicElementary<E> {
  demand(candidate.kind === 'elementary' && curve.owner.equal(ctx, input, candidate.input), 'verification-failed', 'native candidate explicit input');
  const derivative = differentiateNativeAlgebraicPrimitiveWithin(ctx, curve, candidate.primitive, bounds);
  ctx.allocate(6); const proof = Object.freeze({...candidate, rule: nativeAlgebraicElementaryRule, derivative});
  verifyNativeAlgebraicElementaryWithin(ctx, curve, input, proof, bounds); return proof;
}
export function checkNativeAlgebraicCandidate<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, candidate: NativeAlgebraicElementaryCandidate<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => checkNativeAlgebraicCandidateWithin(ctx, curve, input, candidate, bounds));
}
export function verifyNativeAlgebraicElementary<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: NativeAlgebraicElementary<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyNativeAlgebraicElementaryWithin(ctx, curve, input, proof, bounds));
}
