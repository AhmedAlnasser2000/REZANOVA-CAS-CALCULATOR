import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds, DifferentialField, DifferentialElement as E } from './differential-field';
import { inspectExactArtifact } from './artifact-bounds';
import { decodeDifferentialArtifactInOwner, encodeDifferentialArtifact } from './differential-wire';
import { ExponentialRationalDomain, requireExponentialField } from './exponential-rational-domain';
import { exponentialConditions, verifyExponentialConditions, type ExponentialCondition } from './exponential-rational-conditions';
import { verifyExponentialPrimitive, type ExponentialPrimitive, type ExponentialPrimitiveDerivative } from './exponential-rational-primitive';
import * as w from './decision-wire-algebra';
import { firstLevelPrimitiveCodecs } from './first-level-rational-primitive-codecs';
export { differentialValueCodec } from './first-level-rational-primitive-codecs';
export function exponentialPrimitiveCodecs(ctx: ExecutionContext, d: ExponentialRationalDomain) { return firstLevelPrimitiveCodecs(ctx, d); }

export interface ExponentialPrimitiveReplay {
  readonly primitive: ExponentialPrimitive;
  readonly derivative: ExponentialPrimitiveDerivative;
  readonly conditions: readonly ExponentialCondition[];
}
export function encodeExponentialRationalPrimitive(ctx: ExecutionContext, expected: DifferentialField, target: E,
  saved: ExponentialPrimitiveReplay, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    requireExponentialField(ctx, expected, bounds); demand(saved.primitive.domain.field === expected, 'domain-mismatch', 'primitive field');
    const d = saved.primitive.domain; verifyExponentialPrimitive(ctx, saved.primitive, target, saved.derivative, bounds);
    verifyExponentialConditions(ctx, d, exponentialConditions(ctx, d, target, saved.primitive), saved.conditions);
    const c = exponentialPrimitiveCodecs(ctx, d);
    const data = Object.freeze({ tag: 'exponential-rational-primitive', version: 1,
      construction: encodeDifferentialArtifact(ctx, expected, { elements: [target], derivatives: [] }, bounds),
      primitive: c.primitive.encode(saved.primitive), derivative: c.proof.encode(saved.derivative), conditions: c.conditions.encode(saved.conditions) });
    inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeExponentialRationalPrimitive(ctx: ExecutionContext, expected: DifferentialField, target: E,
  data: unknown, bounds: DifferentialBounds): ExponentialPrimitiveReplay {
  return ctx.operation(() => {
    requireExponentialField(ctx, expected, bounds); expected.assert(ctx, target); inspectExactArtifact(ctx, bounds, data);
    const raw = w.record(ctx, data, ['tag', 'version', 'construction', 'primitive', 'derivative', 'conditions']);
    demand(raw.tag === 'exponential-rational-primitive' && raw.version === 1, 'invalid-input', 'exponential primitive tag');
    const replay = decodeDifferentialArtifactInOwner(ctx, expected, raw.construction, bounds);
    demand(replay.owner === expected && replay.elements.length === 1 && replay.derivatives.length === 0
      && expected.equal(ctx, replay.elements[0], target), 'verification-failed', 'exponential primitive target');
    const d = new ExponentialRationalDomain(ctx, expected, bounds), c = exponentialPrimitiveCodecs(ctx, d);
    const primitive = c.primitive.decode(raw.primitive), derivative = c.proof.decode(raw.derivative), conditions = c.conditions.decode(raw.conditions);
    verifyExponentialPrimitive(ctx, primitive, target, derivative, bounds);
    verifyExponentialConditions(ctx, d, exponentialConditions(ctx, d, target, primitive), conditions);
    return Object.freeze({ primitive, derivative, conditions });
  });
}
