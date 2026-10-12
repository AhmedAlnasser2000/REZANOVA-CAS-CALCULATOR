import { demand, type ExecutionContext } from './execution';
import type { DifferentialElement as E, DifferentialBounds } from './differential-field';
import type { QPolynomial } from './formal-primitive';
import { TranscendentalDomain, requireArithmeticDomain } from './transcendental-domain';
import type { EP } from './first-level-rational-domain';
import { firstLevelLogTermWithin, firstLevelPrimitiveWithin, differentiateFirstLevelPrimitiveWithin, verifyFirstLevelPrimitiveWithin,
  type FirstLevelLogTerm, type FirstLevelPrimitive, type FirstLevelPrimitiveDerivative } from './first-level-rational-primitive';
export type TranscendentalLogTerm = FirstLevelLogTerm<TranscendentalDomain>;
export type TranscendentalPrimitive = FirstLevelPrimitive<TranscendentalDomain>;
export type TranscendentalPrimitiveDerivative = FirstLevelPrimitiveDerivative;
export function transcendentalLogTermWithin(ctx: ExecutionContext, d: TranscendentalDomain, modulus: QPolynomial, weight: QPolynomial, argument: EP): TranscendentalLogTerm {
  return firstLevelLogTermWithin(ctx, d, modulus, weight, argument);
}
export function transcendentalPrimitiveWithin(ctx: ExecutionContext, d: TranscendentalDomain, fieldPart: E, terms: readonly TranscendentalLogTerm[]): TranscendentalPrimitive {
  return firstLevelPrimitiveWithin(ctx, d, fieldPart, terms);
}
export function differentiateTranscendentalPrimitiveWithin(ctx: ExecutionContext, p: TranscendentalPrimitive, bounds: DifferentialBounds): TranscendentalPrimitiveDerivative {
  return differentiateFirstLevelPrimitiveWithin(ctx, p, bounds);
}
export function verifyTranscendentalPrimitiveWithin(ctx: ExecutionContext, d: TranscendentalDomain, p: TranscendentalPrimitive, target: E, proof: TranscendentalPrimitiveDerivative, bounds: DifferentialBounds): void {
  requireArithmeticDomain(ctx, d, bounds); demand(d.view !== null && p.domain === d, 'domain-mismatch', 'transcendental primitive explicit owner');
  verifyFirstLevelPrimitiveWithin(ctx, p, target, proof, bounds);
}
export function transcendentalLogTerm(ctx: ExecutionContext, d: TranscendentalDomain, modulus: QPolynomial, weight: QPolynomial, argument: EP, bounds: DifferentialBounds): TranscendentalLogTerm {
  return ctx.operation(() => { requireArithmeticDomain(ctx, d, bounds); return transcendentalLogTermWithin(ctx, d, modulus, weight, argument); });
}
export function transcendentalPrimitive(ctx: ExecutionContext, d: TranscendentalDomain, fieldPart: E, terms: readonly TranscendentalLogTerm[], bounds: DifferentialBounds): TranscendentalPrimitive {
  return ctx.operation(() => { requireArithmeticDomain(ctx, d, bounds); return transcendentalPrimitiveWithin(ctx, d, fieldPart, terms); });
}
export function differentiateTranscendentalPrimitive(ctx: ExecutionContext, p: TranscendentalPrimitive, bounds: DifferentialBounds): TranscendentalPrimitiveDerivative {
  return ctx.operation(() => differentiateTranscendentalPrimitiveWithin(ctx, p, bounds));
}
export function verifyTranscendentalPrimitive(ctx: ExecutionContext, d: TranscendentalDomain, p: TranscendentalPrimitive, target: E, proof: TranscendentalPrimitiveDerivative, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyTranscendentalPrimitiveWithin(ctx, d, p, target, proof, bounds));
}
