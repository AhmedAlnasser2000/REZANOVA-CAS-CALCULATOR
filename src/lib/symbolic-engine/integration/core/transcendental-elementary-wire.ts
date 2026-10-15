/** Distinct version-two positives; version-one complete decisions stay intact. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialElement as E, DifferentialBounds} from './differential-field';
import type {CertifiedTowerView} from './recursive-certified-tower';
import {TranscendentalDomain} from './transcendental-domain';
import {firstLevelPrimitiveCodecs} from './first-level-rational-primitive-codecs';
import {compactTranscendentalEnvelope, compactTranscendentalArtifactBody} from './transcendental-artifact';
import {compactTranscendentalElementaryRule, verifyCompactTranscendentalElementaryWithin, type CompactTranscendentalElementary} from './transcendental-elementary-evidence';
import * as w from './decision-wire-algebra';

export function encodeCompactTranscendentalElementaryWithin(ctx: ExecutionContext, view: CertifiedTowerView, input: E, proof: CompactTranscendentalElementary, bounds: DifferentialBounds): unknown {
  verifyCompactTranscendentalElementaryWithin(ctx, view, input, proof, bounds); const c = firstLevelPrimitiveCodecs(ctx, proof.domain); ctx.allocate(6);
  const evidence = Object.freeze({kind: proof.kind, rule: proof.rule, input: c.e.encode(input), primitive: c.primitive.encode(proof.primitive), derivative: c.proof.encode(proof.derivative), conditions: c.conditions.encode(proof.conditions)});
  return compactTranscendentalEnvelope(ctx, view, 'transcendental-decision', evidence, bounds);
}
export function decodeCompactTranscendentalElementaryWithin(ctx: ExecutionContext, view: CertifiedTowerView, input: E, data: unknown, bounds: DifferentialBounds): CompactTranscendentalElementary {
  const body = compactTranscendentalArtifactBody(ctx, view, 'transcendental-decision', data, bounds), raw = w.record(ctx, body, ['kind', 'rule', 'input', 'primitive', 'derivative', 'conditions']);
  demand(raw.kind === 'elementary' && raw.rule === compactTranscendentalElementaryRule, 'invalid-input', 'compact recursive positive kind/rule');
  const d = new TranscendentalDomain(ctx, view, bounds), c = firstLevelPrimitiveCodecs(ctx, d);
  demand(d.field.equal(ctx, input, c.e.decode(raw.input)), 'verification-failed', 'compact recursive explicit expected input'); ctx.allocate(7);
  const proof = Object.freeze({kind: 'elementary' as const, rule: compactTranscendentalElementaryRule, domain: d, input,
    primitive: c.primitive.decode(raw.primitive), derivative: c.proof.decode(raw.derivative), conditions: c.conditions.decode(raw.conditions)});
  verifyCompactTranscendentalElementaryWithin(ctx, view, input, proof, bounds); return proof;
}
export function encodeCompactTranscendentalElementary(ctx: ExecutionContext, view: CertifiedTowerView, input: E, proof: CompactTranscendentalElementary, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => encodeCompactTranscendentalElementaryWithin(ctx, view, input, proof, bounds));
}
export function decodeCompactTranscendentalElementary(ctx: ExecutionContext, view: CertifiedTowerView, input: E, data: unknown, bounds: DifferentialBounds): CompactTranscendentalElementary {
  return ctx.operation(() => decodeCompactTranscendentalElementaryWithin(ctx, view, input, data, bounds));
}
