/** Positive derivative authority, separate from full Hermite/LRT decisions. */
import {demand, type ExecutionContext} from './execution';
import type {FormalPrimitive, FormalPrimitiveDomain, QRationalFunction} from './formal-primitive';
import {produceRationalCandidateWithin, type DecisionConditions} from './rational-decision-internal';
import {verifyPrimitiveWithin, verifyPrimitiveDerivativeWithin, type PrimitiveDerivativeCertificate} from './primitive-verification-internal';

export const compactRationalElementaryRule = 'rational-primitive-derivative-v2' as const;
export interface CompactRationalCandidate {
  readonly kind: 'elementary'; readonly input: QRationalFunction;
  readonly primitive: FormalPrimitive; readonly conditions: DecisionConditions;
}
export interface CompactRationalElementary extends CompactRationalCandidate {
  readonly rule: typeof compactRationalElementaryRule;
  readonly derivative: PrimitiveDerivativeCertificate;
}
function candidate<E extends CompactRationalCandidate>(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction, value: E): void {
  owner.fractions.assert(ctx, input); owner.assert(ctx, value.primitive);
  demand(value.kind === 'elementary' && owner.fractions.equal(ctx, input, value.input), 'verification-failed', 'compact rational exact candidate input');
  demand(owner.x.equal(ctx, input.denominator, value.conditions.inputDenominator), 'verification-failed', 'compact rational input restriction');
  owner.verifyConditions(ctx, value.primitive, value.conditions);
}
export function produceCompactRationalCandidateWithin(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction): CompactRationalCandidate {
  const full = produceRationalCandidateWithin(ctx, owner, input); ctx.allocate(4);
  return Object.freeze({kind: 'elementary', input, primitive: full.primitive, conditions: full.conditions});
}
export function verifyCompactRationalElementaryWithin(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction, proof: CompactRationalElementary): void {
  candidate(ctx, owner, input, proof); demand(proof.rule === compactRationalElementaryRule, 'verification-failed', 'compact rational derivative rule');
  verifyPrimitiveDerivativeWithin(ctx, proof.primitive, input, proof.derivative);
}
export function checkCompactRationalCandidateWithin(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction, value: CompactRationalCandidate): CompactRationalElementary {
  candidate(ctx, owner, input, value); const derivative = verifyPrimitiveWithin(ctx, value.primitive, input); ctx.allocate(10);
  const conditions = Object.freeze({...value.primitive.conditions, inputDenominator: input.denominator});
  const proof = Object.freeze({kind: 'elementary' as const, rule: compactRationalElementaryRule, input, primitive: value.primitive, conditions, derivative});
  verifyCompactRationalElementaryWithin(ctx, owner, input, proof); return proof;
}
export function produceCompactRationalCandidate(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction): CompactRationalCandidate {
  return ctx.operation(() => produceCompactRationalCandidateWithin(ctx, owner, input));
}
export function checkCompactRationalCandidate(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction, value: CompactRationalCandidate): CompactRationalElementary {
  return ctx.operation(() => checkCompactRationalCandidateWithin(ctx, owner, input, value));
}
export function verifyCompactRationalElementary(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction, proof: CompactRationalElementary): void {
  ctx.operation(() => verifyCompactRationalElementaryWithin(ctx, owner, input, proof));
}
