import type { ExecutionContext } from './execution';
import type { FormalPrimitiveDomain, QRationalFunction } from './formal-primitive';
import { integrateRationalWithin, verifyRationalDecisionWithin, produceRationalCandidateWithin, checkRationalCandidateWithin, type RationalDecision, type RationalCandidate } from './rational-decision-internal';
export type { DecisionConditions, RationalDecision, RationalCandidate } from './rational-decision-internal';

export function produceRationalCandidate(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction): RationalCandidate {
  return ctx.operation(() => produceRationalCandidateWithin(ctx, owner, input));
}
export function checkRationalCandidate(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction, candidate: RationalCandidate): RationalDecision {
  return ctx.operation(() => checkRationalCandidateWithin(ctx, owner, input, candidate));
}

export function integrateRational(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction): RationalDecision {
  return ctx.operation(() => integrateRationalWithin(ctx, owner, input));
}

export function verifyRationalDecision(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction, decision: RationalDecision): void {
  return ctx.operation(() => verifyRationalDecisionWithin(ctx, owner, input, decision));
}
