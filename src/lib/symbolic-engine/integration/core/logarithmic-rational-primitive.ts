import type { ExecutionContext } from './execution';
import type { DifferentialBounds, DifferentialElement as E } from './differential-field';
import type { QPolynomial } from './formal-primitive';
import { type LogarithmicRationalDomain, assertLogarithmicRationalDomain, requireLogarithmicField, type EP } from './logarithmic-rational-domain';
import { firstLevelLogTerm, firstLevelPrimitive, differentiateFirstLevelPrimitive, verifyFirstLevelPrimitive, verifyFirstLevelLogTerm,
  type FirstLevelLogTerm, type FirstLevelPrimitive, type FirstLevelLogDerivative, type FirstLevelPrimitiveDerivative } from './first-level-rational-primitive';
export type LogarithmicLogTerm = FirstLevelLogTerm<LogarithmicRationalDomain>;
export type LogarithmicPrimitive = FirstLevelPrimitive<LogarithmicRationalDomain>;
export type LogarithmicLogDerivative = FirstLevelLogDerivative;
export type LogarithmicPrimitiveDerivative = FirstLevelPrimitiveDerivative;
export function verifyLogarithmicLogTerm(ctx: ExecutionContext, d: LogarithmicRationalDomain, term: LogarithmicLogTerm): void {
  assertLogarithmicRationalDomain(ctx, d); verifyFirstLevelLogTerm(ctx, d, term);
}
export function logarithmicLogTerm(ctx: ExecutionContext, d: LogarithmicRationalDomain, modulus: QPolynomial, weight: QPolynomial, argument: EP): LogarithmicLogTerm {
  return ctx.operation(() => { assertLogarithmicRationalDomain(ctx, d); return firstLevelLogTerm(ctx, d, modulus, weight, argument); });
}
export function logarithmicPrimitive(ctx: ExecutionContext, d: LogarithmicRationalDomain, fieldPart: E, terms: readonly LogarithmicLogTerm[]): LogarithmicPrimitive {
  return ctx.operation(() => { assertLogarithmicRationalDomain(ctx, d); return firstLevelPrimitive(ctx, d, fieldPart, terms); });
}
export function differentiateLogarithmicPrimitive(ctx: ExecutionContext, p: LogarithmicPrimitive, bounds: DifferentialBounds): LogarithmicPrimitiveDerivative {
  return ctx.operation(() => { assertLogarithmicRationalDomain(ctx, p.domain); requireLogarithmicField(ctx, p.domain.field, bounds);
    return differentiateFirstLevelPrimitive(ctx, p, bounds); });
}
export function verifyLogarithmicPrimitive(ctx: ExecutionContext, p: LogarithmicPrimitive, target: E, proof: LogarithmicPrimitiveDerivative, bounds: DifferentialBounds): void {
  ctx.operation(() => { assertLogarithmicRationalDomain(ctx, p.domain); requireLogarithmicField(ctx, p.domain.field, bounds);
    verifyFirstLevelPrimitive(ctx, p, target, proof, bounds); });
}
