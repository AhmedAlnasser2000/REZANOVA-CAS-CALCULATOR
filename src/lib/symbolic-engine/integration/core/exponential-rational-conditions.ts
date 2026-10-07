import type { ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import { type ExponentialRationalDomain, assertExponentialRationalDomain } from './exponential-rational-domain';
import type { ExponentialPrimitive } from './exponential-rational-primitive';
import { firstLevelConditions, verifyFirstLevelConditions, type FirstLevelCondition } from './first-level-rational-conditions';
export type ExponentialCondition = FirstLevelCondition;
export function exponentialConditions(ctx: ExecutionContext, d: ExponentialRationalDomain, input: E, primitive?: ExponentialPrimitive): readonly ExponentialCondition[] {
  assertExponentialRationalDomain(ctx, d); return firstLevelConditions(ctx, d, input, primitive);
}
export function verifyExponentialConditions(ctx: ExecutionContext, d: ExponentialRationalDomain, expected: readonly ExponentialCondition[], supplied: readonly ExponentialCondition[]): void {
  assertExponentialRationalDomain(ctx, d); verifyFirstLevelConditions(ctx, d, expected, supplied);
}
