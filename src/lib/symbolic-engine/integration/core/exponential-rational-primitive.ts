import type { ExecutionContext } from './execution';
import type { DifferentialBounds, DifferentialElement as E } from './differential-field';
import type { QPolynomial } from './formal-primitive';
import { type ExponentialRationalDomain, assertExponentialRationalDomain, requireExponentialField, type EP } from './exponential-rational-domain';
import { firstLevelLogTerm, firstLevelPrimitive, differentiateFirstLevelPrimitive, verifyFirstLevelPrimitive, verifyFirstLevelLogTerm,
  type FirstLevelLogTerm, type FirstLevelPrimitive, type FirstLevelLogDerivative, type FirstLevelPrimitiveDerivative } from './first-level-rational-primitive';
export type ExponentialLogTerm = FirstLevelLogTerm<ExponentialRationalDomain>;
export type ExponentialPrimitive = FirstLevelPrimitive<ExponentialRationalDomain>;
export type ExponentialLogDerivative = FirstLevelLogDerivative;
export type ExponentialPrimitiveDerivative = FirstLevelPrimitiveDerivative;
export function verifyExponentialLogTerm(ctx: ExecutionContext, d: ExponentialRationalDomain, term: ExponentialLogTerm): void {
  assertExponentialRationalDomain(ctx, d); verifyFirstLevelLogTerm(ctx, d, term);
}
export function exponentialLogTerm(ctx: ExecutionContext, d: ExponentialRationalDomain, modulus: QPolynomial, weight: QPolynomial, argument: EP): ExponentialLogTerm {
  return ctx.operation(() => { assertExponentialRationalDomain(ctx, d); return firstLevelLogTerm(ctx, d, modulus, weight, argument); });
}
export function exponentialPrimitive(ctx: ExecutionContext, d: ExponentialRationalDomain, fieldPart: E, terms: readonly ExponentialLogTerm[]): ExponentialPrimitive {
  return ctx.operation(() => { assertExponentialRationalDomain(ctx, d); return firstLevelPrimitive(ctx, d, fieldPart, terms); });
}
export function differentiateExponentialPrimitive(ctx: ExecutionContext, p: ExponentialPrimitive, bounds: DifferentialBounds): ExponentialPrimitiveDerivative {
  return ctx.operation(() => { assertExponentialRationalDomain(ctx, p.domain); requireExponentialField(ctx, p.domain.field, bounds);
    return differentiateFirstLevelPrimitive(ctx, p, bounds); });
}
export function verifyExponentialPrimitive(ctx: ExecutionContext, p: ExponentialPrimitive, target: E, proof: ExponentialPrimitiveDerivative, bounds: DifferentialBounds): void {
  ctx.operation(() => { assertExponentialRationalDomain(ctx, p.domain); requireExponentialField(ctx, p.domain.field, bounds);
    verifyFirstLevelPrimitive(ctx, p, target, proof, bounds); });
}
