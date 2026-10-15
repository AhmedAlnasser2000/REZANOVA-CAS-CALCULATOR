/** Positive primitive authority is independent of integration search history. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialElement as E, DifferentialBounds} from './differential-field';
import type {CertifiedTowerView} from './recursive-certified-tower';
import {requireArithmeticDomain, type TranscendentalDomain} from './transcendental-domain';
import {produceTranscendentalCandidateWithin, checkTranscendentalCandidateWithin, type TranscendentalCandidate, type TranscendentalDecision} from './transcendental-decision';
import {transcendentalConditions, verifyTranscendentalConditions, type TranscendentalCondition} from './transcendental-conditions';
import {differentiateTranscendentalPrimitiveWithin, verifyTranscendentalPrimitiveWithin, type TranscendentalPrimitive, type TranscendentalPrimitiveDerivative} from './transcendental-primitive';
import {requireImmutableFirstLevelPrimitive} from './primitive-immutability';

export const compactTranscendentalElementaryRule = 'recursive-exp-log-primitive-derivative-v2' as const;
export interface CompactTranscendentalElementaryCandidate {
  readonly kind: 'elementary'; readonly domain: TranscendentalDomain; readonly input: E;
  readonly primitive: TranscendentalPrimitive; readonly conditions: readonly TranscendentalCondition[];
}
export interface CompactTranscendentalElementary extends CompactTranscendentalElementaryCandidate {
  readonly rule: typeof compactTranscendentalElementaryRule; readonly derivative: TranscendentalPrimitiveDerivative;
}
export type CompactTranscendentalCandidate = CompactTranscendentalElementaryCandidate | Readonly<TranscendentalCandidate & {kind: 'non-elementary'}>;
export type CompactTranscendentalDecision = CompactTranscendentalElementary | Readonly<TranscendentalDecision & {kind: 'non-elementary'}>;

function candidate(ctx: ExecutionContext, view: CertifiedTowerView, input: E, value: CompactTranscendentalElementaryCandidate, bounds: DifferentialBounds): void {
  const d = value.domain; requireArithmeticDomain(ctx, d, bounds); view.owner.assert(ctx, input);
  demand(d.view === view && d.field === view.owner && value.primitive.domain === d, 'domain-mismatch', 'compact recursive primitive supplied view');
  demand(value.kind === 'elementary' && d.field.equal(ctx, value.input, input), 'verification-failed', 'compact recursive exact original input');
  verifyTranscendentalConditions(ctx, d, input, value.primitive, value.conditions);
}
export function produceCompactTranscendentalCandidateWithin(ctx: ExecutionContext, view: CertifiedTowerView, input: E, bounds: DifferentialBounds): CompactTranscendentalCandidate {
  const value = produceTranscendentalCandidateWithin(ctx, view, input, bounds);
  if (value.kind === 'non-elementary') return value as Readonly<TranscendentalCandidate & {kind: 'non-elementary'}>;
  demand(value.primitive !== null, 'verification-failed', 'complete recursive positive primitive'); ctx.allocate(5);
  // Preserve all original construction/input and final argument/norm exclusions.
  // Subsidiary denominator clearing is auxiliary work, never a source exclusion.
  const conditions = transcendentalConditions(ctx, value.domain, input, value.primitive);
  return Object.freeze({kind: 'elementary', domain: value.domain, input, primitive: value.primitive, conditions});
}
export function checkCompactTranscendentalCandidateWithin(ctx: ExecutionContext, view: CertifiedTowerView, input: E, value: CompactTranscendentalCandidate, bounds: DifferentialBounds): CompactTranscendentalDecision {
  if (value.kind === 'non-elementary') {
    const result = checkTranscendentalCandidateWithin(ctx, view, input, value, bounds);
    demand(result.kind === 'non-elementary', 'verification-failed', 'complete recursive negative kind'); return result as Readonly<TranscendentalDecision & {kind: 'non-elementary'}>;
  }
  candidate(ctx, view, input, value, bounds);
  const derivative = differentiateTranscendentalPrimitiveWithin(ctx, value.primitive, bounds); requireImmutableFirstLevelPrimitive(ctx, value.primitive);
  const conditions = transcendentalConditions(ctx, value.domain, input, value.primitive); ctx.allocate(7);
  const proof = Object.freeze({kind: 'elementary' as const, rule: compactTranscendentalElementaryRule, domain: value.domain, input, primitive: value.primitive, conditions, derivative});
  verifyCompactTranscendentalElementaryWithin(ctx, view, input, proof, bounds); return proof;
}
export function verifyCompactTranscendentalElementaryWithin(ctx: ExecutionContext, view: CertifiedTowerView, input: E, proof: CompactTranscendentalElementary, bounds: DifferentialBounds): void {
  candidate(ctx, view, input, proof, bounds);
  demand(proof.rule === compactTranscendentalElementaryRule, 'verification-failed', 'compact recursive positive rule');
  verifyTranscendentalPrimitiveWithin(ctx, proof.domain, proof.primitive, input, proof.derivative, bounds);
}
export function produceCompactTranscendentalCandidate(ctx: ExecutionContext, view: CertifiedTowerView, input: E, bounds: DifferentialBounds): CompactTranscendentalCandidate {
  return ctx.operation(() => produceCompactTranscendentalCandidateWithin(ctx, view, input, bounds));
}
export function checkCompactTranscendentalCandidate(ctx: ExecutionContext, view: CertifiedTowerView, input: E, value: CompactTranscendentalCandidate, bounds: DifferentialBounds): CompactTranscendentalDecision {
  return ctx.operation(() => checkCompactTranscendentalCandidateWithin(ctx, view, input, value, bounds));
}
export function verifyCompactTranscendentalElementary(ctx: ExecutionContext, view: CertifiedTowerView, input: E, proof: CompactTranscendentalElementary, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyCompactTranscendentalElementaryWithin(ctx, view, input, proof, bounds));
}
