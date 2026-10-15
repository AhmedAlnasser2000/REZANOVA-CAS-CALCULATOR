/** Positive integration authority needs the exact primitive, not search history. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyAlgebraicCurveWithin, type AlgebraicCurveView} from './algebraic-curve';
import {differentiateAlgebraicPrimitiveWithin, verifyAlgebraicPrimitiveWithin, type AlgebraicPrimitive, type AlgebraicPrimitiveDerivative} from './algebraic-primitive';
import {algebraicConditions, verifyAlgebraicConditions, type AlgebraicCondition} from './algebraic-conditions';
import {algebraicIntegrationConditionSources} from './algebraic-differential';

export const algebraicElementaryRule = 'algebraic-elementary-derivative-v2' as const;
export interface CompactAlgebraicElementaryCandidate<E> {
  readonly kind: 'elementary';
  readonly input: E;
  readonly primitive: AlgebraicPrimitive<E>;
  readonly conditions: readonly AlgebraicCondition<E>[];
}
export interface CompactAlgebraicElementary<E> extends CompactAlgebraicElementaryCandidate<E> {
  readonly rule: typeof algebraicElementaryRule;
  readonly derivative: AlgebraicPrimitiveDerivative<E>;
}
export function verifyCompactAlgebraicElementaryWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: CompactAlgebraicElementary<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); const f = curve.owner; f.assert(ctx, input);
  demand(proof.rule === algebraicElementaryRule && proof.kind === 'elementary' && f.equal(ctx, input, proof.input), 'verification-failed', 'compact elementary complete explicit request');
  verifyAlgebraicPrimitiveWithin(ctx, curve, proof.primitive, input, proof.derivative, bounds);
  verifyAlgebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input, [proof.primitive.fieldPart]), proof.conditions, bounds);
}
export function constructCompactAlgebraicCandidateWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, primitive: AlgebraicPrimitive<E>, bounds: DifferentialBounds): CompactAlgebraicElementaryCandidate<E> {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); curve.owner.assert(ctx, input);
  demand(primitive.curve === curve, 'domain-mismatch', 'compact candidate native primitive owner');
  ctx.allocate(4); return Object.freeze({kind: 'elementary', input, primitive, conditions: algebraicConditions(ctx, curve.owner, algebraicIntegrationConditionSources(ctx, curve, input, [primitive.fieldPart]), bounds)});
}
export function checkCompactAlgebraicCandidateWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, candidate: CompactAlgebraicElementaryCandidate<E>, bounds: DifferentialBounds): CompactAlgebraicElementary<E> {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); curve.owner.assert(ctx, input);
  demand(candidate.kind === 'elementary' && curve.owner.equal(ctx, input, candidate.input), 'verification-failed', 'compact candidate explicit input');
  const derivative = differentiateAlgebraicPrimitiveWithin(ctx, curve, candidate.primitive, bounds);
  ctx.allocate(6); const proof = Object.freeze({...candidate, rule: algebraicElementaryRule, derivative}); verifyCompactAlgebraicElementaryWithin(ctx, curve, input, proof, bounds); return proof;
}
export function checkCompactAlgebraicCandidate<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, candidate: CompactAlgebraicElementaryCandidate<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => checkCompactAlgebraicCandidateWithin(ctx, curve, input, candidate, bounds));
}
export function verifyCompactAlgebraicElementary<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: CompactAlgebraicElementary<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyCompactAlgebraicElementaryWithin(ctx, curve, input, proof, bounds));
}
