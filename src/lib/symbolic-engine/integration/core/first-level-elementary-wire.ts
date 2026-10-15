/** Version-two positive formats; original reduction formats are unchanged. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialField, DifferentialElement as E, DifferentialBounds} from './differential-field';
import type {FirstLevelRationalDomain} from './first-level-rational-domain';
import {ExponentialRationalDomain} from './exponential-rational-domain';
import {LogarithmicRationalDomain} from './logarithmic-rational-domain';
import {checkArtifactBounds, inspectExactArtifact} from './artifact-bounds';
import {encodeDifferentialArtifact, decodeDifferentialArtifactInOwner} from './differential-wire';
import {packRecursiveArtifactGraph, unpackRecursiveArtifactGraph} from './recursive-artifact-graph';
import {firstLevelPrimitiveCodecs} from './first-level-rational-primitive-codecs';
import {compactFirstLevelElementaryRule, verifyCompactExponentialElementaryWithin, verifyCompactLogarithmicElementaryWithin,
  type CompactFirstLevelElementary, type CompactExponentialElementary, type CompactLogarithmicElementary} from './first-level-elementary-evidence';
import * as w from './decision-wire-algebra';

function encode<D extends FirstLevelRationalDomain>(ctx: ExecutionContext, owner: DifferentialField, input: E, proof: CompactFirstLevelElementary<D>, tag: string, bounds: DifferentialBounds): unknown {
  const c = firstLevelPrimitiveCodecs(ctx, proof.domain); ctx.allocate(5);
  const payload = packRecursiveArtifactGraph(ctx, Object.freeze({kind: 'elementary', rule: proof.rule, primitive: c.primitive.encode(proof.primitive), derivative: c.proof.encode(proof.derivative), conditions: c.conditions.encode(proof.conditions)}), bounds);
  const data = Object.freeze({tag, version: 2, construction: encodeDifferentialArtifact(ctx, owner, {elements: [input], derivatives: []}, bounds), payload});
  inspectExactArtifact(ctx, bounds, data); return data;
}
function decode<D extends FirstLevelRationalDomain>(ctx: ExecutionContext, owner: DifferentialField, input: E, data: unknown, tag: string, makeDomain: () => D, bounds: DifferentialBounds): CompactFirstLevelElementary<D> {
  checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data);
  const raw = w.record(ctx, data, ['tag', 'version', 'construction', 'payload']);
  demand(raw.tag === tag && raw.version === 2, 'invalid-input', 'compact first-level tag/version');
  const bound = decodeDifferentialArtifactInOwner(ctx, owner, raw.construction, bounds);
  demand(bound.owner === owner && bound.elements.length === 1 && bound.derivatives.length === 0 && owner.equal(ctx, input, bound.elements[0]), 'verification-failed', 'compact first-level explicit input');
  const body = w.record(ctx, unpackRecursiveArtifactGraph(ctx, raw.payload, bounds), ['kind', 'rule', 'primitive', 'derivative', 'conditions']);
  demand(body.kind === 'elementary' && body.rule === compactFirstLevelElementaryRule, 'invalid-input', 'compact first-level positive rule');
  const domain = makeDomain(), c = firstLevelPrimitiveCodecs(ctx, domain); ctx.allocate(7);
  return Object.freeze({kind: 'elementary', rule: compactFirstLevelElementaryRule, domain, input,
    primitive: c.primitive.decode(body.primitive), derivative: c.proof.decode(body.derivative), conditions: c.conditions.decode(body.conditions)});
}
export function encodeCompactExponentialElementaryWithin(ctx: ExecutionContext, owner: DifferentialField, input: E, proof: CompactExponentialElementary, bounds: DifferentialBounds): unknown {
  checkArtifactBounds(ctx, bounds); verifyCompactExponentialElementaryWithin(ctx, owner, input, proof, bounds);
  return encode(ctx, owner, input, proof, 'exponential-rational-decision', bounds);
}
export function encodeCompactLogarithmicElementaryWithin(ctx: ExecutionContext, owner: DifferentialField, input: E, proof: CompactLogarithmicElementary, bounds: DifferentialBounds): unknown {
  checkArtifactBounds(ctx, bounds); verifyCompactLogarithmicElementaryWithin(ctx, owner, input, proof, bounds);
  return encode(ctx, owner, input, proof, 'logarithmic-rational-decision', bounds);
}
export function decodeCompactExponentialElementaryWithin(ctx: ExecutionContext, owner: DifferentialField, input: E, data: unknown, bounds: DifferentialBounds): CompactExponentialElementary {
  const proof = decode(ctx, owner, input, data, 'exponential-rational-decision', () => new ExponentialRationalDomain(ctx, owner, bounds), bounds);
  verifyCompactExponentialElementaryWithin(ctx, owner, input, proof, bounds); return proof;
}
export function decodeCompactLogarithmicElementaryWithin(ctx: ExecutionContext, owner: DifferentialField, input: E, data: unknown, bounds: DifferentialBounds): CompactLogarithmicElementary {
  const proof = decode(ctx, owner, input, data, 'logarithmic-rational-decision', () => new LogarithmicRationalDomain(ctx, owner, bounds), bounds);
  verifyCompactLogarithmicElementaryWithin(ctx, owner, input, proof, bounds); return proof;
}
export function encodeCompactExponentialElementary(ctx: ExecutionContext, owner: DifferentialField, input: E, proof: CompactExponentialElementary, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => encodeCompactExponentialElementaryWithin(ctx, owner, input, proof, bounds));
}
export function encodeCompactLogarithmicElementary(ctx: ExecutionContext, owner: DifferentialField, input: E, proof: CompactLogarithmicElementary, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => encodeCompactLogarithmicElementaryWithin(ctx, owner, input, proof, bounds));
}
export function decodeCompactExponentialElementary(ctx: ExecutionContext, owner: DifferentialField, input: E, data: unknown, bounds: DifferentialBounds): CompactExponentialElementary {
  return ctx.operation(() => decodeCompactExponentialElementaryWithin(ctx, owner, input, data, bounds));
}
export function decodeCompactLogarithmicElementary(ctx: ExecutionContext, owner: DifferentialField, input: E, data: unknown, bounds: DifferentialBounds): CompactLogarithmicElementary {
  return ctx.operation(() => decodeCompactLogarithmicElementaryWithin(ctx, owner, input, data, bounds));
}
