import type { ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import { type LogarithmicRationalDomain, assertLogarithmicRationalDomain } from './logarithmic-rational-domain';
import type { LogarithmicPrimitive } from './logarithmic-rational-primitive';
import { firstLevelConditions, verifyFirstLevelConditions, type FirstLevelCondition } from './first-level-rational-conditions';
export type LogarithmicCondition = FirstLevelCondition;
export function logarithmicConditions(ctx: ExecutionContext, d: LogarithmicRationalDomain, input: E, primitive?: LogarithmicPrimitive): readonly LogarithmicCondition[] {
  assertLogarithmicRationalDomain(ctx, d); return firstLevelConditions(ctx, d, input, primitive);
}
export function verifyLogarithmicConditions(ctx: ExecutionContext, d: LogarithmicRationalDomain, expected: readonly LogarithmicCondition[], supplied: readonly LogarithmicCondition[]): void {
  assertLogarithmicRationalDomain(ctx, d); verifyFirstLevelConditions(ctx, d, expected, supplied);
}
