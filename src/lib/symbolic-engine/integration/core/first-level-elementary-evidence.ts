/** Compact positive evidence; exponential/logarithmic admissions stay separate. */
import {demand, type ExecutionContext} from './execution';
import {requireImmutableFirstLevelPrimitive} from './primitive-immutability';
import type {DifferentialField, DifferentialElement as E, DifferentialBounds} from './differential-field';
import type {FirstLevelRationalDomain} from './first-level-rational-domain';
import {assertExponentialRationalDomain, requireExponentialField, type ExponentialRationalDomain} from './exponential-rational-domain';
import {assertLogarithmicRationalDomain, requireLogarithmicField, type LogarithmicRationalDomain} from './logarithmic-rational-domain';
import {firstLevelConditions, verifyFirstLevelConditions, type FirstLevelCondition} from './first-level-rational-conditions';
import {differentiateFirstLevelPrimitiveWithin, verifyFirstLevelPrimitiveWithin, type FirstLevelPrimitive, type FirstLevelPrimitiveDerivative} from './first-level-rational-primitive';
import {produceExponentialRationalCandidateWithin, checkExponentialRationalCandidateWithin, type ExponentialRationalCandidate, type ExponentialRationalDecision} from './exponential-rational-decision';
import {produceLogarithmicRationalCandidateWithin, checkLogarithmicRationalCandidateWithin, type LogarithmicRationalCandidate, type LogarithmicRationalDecision} from './logarithmic-rational-decision';

export const compactFirstLevelElementaryRule = 'first-level-primitive-derivative-v2' as const;
export interface CompactFirstLevelCandidate<D extends FirstLevelRationalDomain> {
  readonly kind: 'elementary'; readonly domain: D; readonly input: E;
  readonly primitive: FirstLevelPrimitive<D>; readonly conditions: readonly FirstLevelCondition[];
}
export interface CompactFirstLevelElementary<D extends FirstLevelRationalDomain> extends CompactFirstLevelCandidate<D> {
  readonly rule: typeof compactFirstLevelElementaryRule; readonly derivative: FirstLevelPrimitiveDerivative;
}
export type CompactExponentialElementary = CompactFirstLevelElementary<ExponentialRationalDomain>;
export type CompactLogarithmicElementary = CompactFirstLevelElementary<LogarithmicRationalDomain>;
export type CompactExponentialCandidate = CompactFirstLevelCandidate<ExponentialRationalDomain> | Extract<ExponentialRationalCandidate, {kind: 'non-elementary'}>;
export type CompactLogarithmicCandidate = CompactFirstLevelCandidate<LogarithmicRationalDomain> | Extract<LogarithmicRationalCandidate, {kind: 'non-elementary'}>;
export type CompactExponentialDecision = CompactExponentialElementary | Extract<ExponentialRationalDecision, {kind: 'non-elementary'}>;
export type CompactLogarithmicDecision = CompactLogarithmicElementary | Extract<LogarithmicRationalDecision, {kind: 'non-elementary'}>;

function retain<D extends FirstLevelRationalDomain>(ctx: ExecutionContext, value: CompactFirstLevelCandidate<D>): CompactFirstLevelCandidate<D> {
  ctx.allocate(5); return Object.freeze({kind: 'elementary', domain: value.domain, input: value.input, primitive: value.primitive, conditions: value.conditions});
}
function candidate<D extends FirstLevelRationalDomain>(ctx: ExecutionContext, owner: DifferentialField, input: E, value: CompactFirstLevelCandidate<D>): void {
  const d = value.domain; owner.assert(ctx, input);
  demand(d.field === owner && value.primitive.domain === d, 'domain-mismatch', 'compact first-level candidate owner');
  demand(value.kind === 'elementary' && owner.equal(ctx, input, value.input), 'verification-failed', 'compact first-level exact candidate');
  owner.assert(ctx, value.primitive.fieldPart);
  verifyFirstLevelConditions(ctx, d, firstLevelConditions(ctx, d, input, value.primitive), value.conditions);
}
function verify<D extends FirstLevelRationalDomain>(ctx: ExecutionContext, owner: DifferentialField, input: E, proof: CompactFirstLevelElementary<D>, bounds: DifferentialBounds): void {
  candidate(ctx, owner, input, proof); demand(proof.rule === compactFirstLevelElementaryRule, 'verification-failed', 'compact first-level derivative rule');
  verifyFirstLevelPrimitiveWithin(ctx, proof.primitive, input, proof.derivative, bounds);
}
function check<D extends FirstLevelRationalDomain>(ctx: ExecutionContext, owner: DifferentialField, input: E, value: CompactFirstLevelCandidate<D>, bounds: DifferentialBounds): CompactFirstLevelElementary<D> {
  candidate(ctx, owner, input, value); const derivative = differentiateFirstLevelPrimitiveWithin(ctx, value.primitive, bounds); ctx.allocate(7);
  requireImmutableFirstLevelPrimitive(ctx, value.primitive);
  const conditions = firstLevelConditions(ctx, value.domain, input, value.primitive);
  const proof = Object.freeze({kind: 'elementary' as const, rule: compactFirstLevelElementaryRule, domain: value.domain, input, primitive: value.primitive, conditions, derivative});
  verify(ctx, owner, input, proof, bounds); return proof;
}
export function produceCompactExponentialCandidateWithin(ctx: ExecutionContext, owner: DifferentialField, input: E, bounds: DifferentialBounds): CompactExponentialCandidate {
  const value = produceExponentialRationalCandidateWithin(ctx, owner, input, bounds); return value.kind === 'elementary' ? retain(ctx, value) : value;
}
export function produceCompactLogarithmicCandidateWithin(ctx: ExecutionContext, owner: DifferentialField, input: E, bounds: DifferentialBounds): CompactLogarithmicCandidate {
  const value = produceLogarithmicRationalCandidateWithin(ctx, owner, input, bounds); return value.kind === 'elementary' ? retain(ctx, value) : value;
}
export function checkCompactExponentialCandidateWithin(ctx: ExecutionContext, owner: DifferentialField, input: E, value: CompactExponentialCandidate, bounds: DifferentialBounds): CompactExponentialDecision {
  requireExponentialField(ctx, owner, bounds); assertExponentialRationalDomain(ctx, value.domain);
  if (value.kind === 'elementary') return check(ctx, owner, input, value, bounds);
  const negative = checkExponentialRationalCandidateWithin(ctx, owner, input, value, bounds);
  demand(negative.kind === 'non-elementary', 'verification-failed', 'negative exponential kind'); return negative;
}
export function checkCompactLogarithmicCandidateWithin(ctx: ExecutionContext, owner: DifferentialField, input: E, value: CompactLogarithmicCandidate, bounds: DifferentialBounds): CompactLogarithmicDecision {
  requireLogarithmicField(ctx, owner, bounds); assertLogarithmicRationalDomain(ctx, value.domain);
  if (value.kind === 'elementary') return check(ctx, owner, input, value, bounds);
  const negative = checkLogarithmicRationalCandidateWithin(ctx, owner, input, value, bounds);
  demand(negative.kind === 'non-elementary', 'verification-failed', 'negative logarithmic kind'); return negative;
}
export function verifyCompactExponentialElementaryWithin(ctx: ExecutionContext, owner: DifferentialField, input: E, proof: CompactExponentialElementary, bounds: DifferentialBounds): void {
  requireExponentialField(ctx, owner, bounds); assertExponentialRationalDomain(ctx, proof.domain); verify(ctx, owner, input, proof, bounds);
}
export function verifyCompactLogarithmicElementaryWithin(ctx: ExecutionContext, owner: DifferentialField, input: E, proof: CompactLogarithmicElementary, bounds: DifferentialBounds): void {
  requireLogarithmicField(ctx, owner, bounds); assertLogarithmicRationalDomain(ctx, proof.domain); verify(ctx, owner, input, proof, bounds);
}
export function produceCompactExponentialCandidate(ctx: ExecutionContext, owner: DifferentialField, input: E, bounds: DifferentialBounds): CompactExponentialCandidate {
  return ctx.operation(() => produceCompactExponentialCandidateWithin(ctx, owner, input, bounds));
}
export function produceCompactLogarithmicCandidate(ctx: ExecutionContext, owner: DifferentialField, input: E, bounds: DifferentialBounds): CompactLogarithmicCandidate {
  return ctx.operation(() => produceCompactLogarithmicCandidateWithin(ctx, owner, input, bounds));
}
export function checkCompactExponentialCandidate(ctx: ExecutionContext, owner: DifferentialField, input: E, value: CompactExponentialCandidate, bounds: DifferentialBounds): CompactExponentialDecision {
  return ctx.operation(() => checkCompactExponentialCandidateWithin(ctx, owner, input, value, bounds));
}
export function checkCompactLogarithmicCandidate(ctx: ExecutionContext, owner: DifferentialField, input: E, value: CompactLogarithmicCandidate, bounds: DifferentialBounds): CompactLogarithmicDecision {
  return ctx.operation(() => checkCompactLogarithmicCandidateWithin(ctx, owner, input, value, bounds));
}
export function verifyCompactExponentialElementary(ctx: ExecutionContext, owner: DifferentialField, input: E, proof: CompactExponentialElementary, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyCompactExponentialElementaryWithin(ctx, owner, input, proof, bounds));
}
export function verifyCompactLogarithmicElementary(ctx: ExecutionContext, owner: DifferentialField, input: E, proof: CompactLogarithmicElementary, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyCompactLogarithmicElementaryWithin(ctx, owner, input, proof, bounds));
}
