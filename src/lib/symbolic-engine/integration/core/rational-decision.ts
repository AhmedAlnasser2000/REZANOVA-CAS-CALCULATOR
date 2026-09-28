import type { ExecutionContext } from './execution';
import type { FormalPrimitiveDomain, QRationalFunction } from './formal-primitive';
import { integrateRationalWithin, verifyRationalDecisionWithin, type RationalDecision } from './rational-decision-internal';
export type { DecisionConditions, RationalDecision } from './rational-decision-internal';

export function integrateRational(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction): RationalDecision {
  return ctx.operation(() => integrateRationalWithin(ctx, owner, input));
}

export function verifyRationalDecision(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction, decision: RationalDecision): void {
  return ctx.operation(() => verifyRationalDecisionWithin(ctx, owner, input, decision));
}
