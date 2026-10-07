import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds, DifferentialField, DifferentialElement as E } from './differential-field';
import { inspectExactArtifact } from './artifact-bounds';
import { decodeDifferentialArtifactInOwner, encodeDifferentialArtifact } from './differential-wire';
import { LogarithmicRationalDomain, requireLogarithmicField } from './logarithmic-rational-domain';
import { logarithmicConditions, verifyLogarithmicConditions, type LogarithmicCondition } from './logarithmic-rational-conditions';
import { verifyLogarithmicPrimitive, type LogarithmicPrimitive, type LogarithmicPrimitiveDerivative } from './logarithmic-rational-primitive';
import * as w from './decision-wire-algebra';
import { firstLevelPrimitiveCodecs } from './first-level-rational-primitive-codecs';
export { differentialValueCodec } from './first-level-rational-primitive-codecs';
export function logarithmicPrimitiveCodecs(ctx: ExecutionContext, d: LogarithmicRationalDomain) { return firstLevelPrimitiveCodecs(ctx, d); }

export interface LogarithmicPrimitiveReplay {
  readonly primitive: LogarithmicPrimitive;
  readonly derivative: LogarithmicPrimitiveDerivative;
  readonly conditions: readonly LogarithmicCondition[];
}
export function encodeLogarithmicRationalPrimitive(ctx: ExecutionContext, expected: DifferentialField, target: E,
  saved: LogarithmicPrimitiveReplay, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    requireLogarithmicField(ctx, expected, bounds); demand(saved.primitive.domain.field === expected, 'domain-mismatch', 'primitive field');
    const d = saved.primitive.domain; verifyLogarithmicPrimitive(ctx, saved.primitive, target, saved.derivative, bounds);
    verifyLogarithmicConditions(ctx, d, logarithmicConditions(ctx, d, target, saved.primitive), saved.conditions);
    const c = logarithmicPrimitiveCodecs(ctx, d);
    const data = Object.freeze({ tag: 'logarithmic-rational-primitive', version: 1,
      construction: encodeDifferentialArtifact(ctx, expected, { elements: [target], derivatives: [] }, bounds),
      primitive: c.primitive.encode(saved.primitive), derivative: c.proof.encode(saved.derivative), conditions: c.conditions.encode(saved.conditions) });
    inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeLogarithmicRationalPrimitive(ctx: ExecutionContext, expected: DifferentialField, target: E,
  data: unknown, bounds: DifferentialBounds): LogarithmicPrimitiveReplay {
  return ctx.operation(() => {
    requireLogarithmicField(ctx, expected, bounds); expected.assert(ctx, target); inspectExactArtifact(ctx, bounds, data);
    const raw = w.record(ctx, data, ['tag', 'version', 'construction', 'primitive', 'derivative', 'conditions']);
    demand(raw.tag === 'logarithmic-rational-primitive' && raw.version === 1, 'invalid-input', 'logarithmic primitive tag');
    const replay = decodeDifferentialArtifactInOwner(ctx, expected, raw.construction, bounds);
    demand(replay.owner === expected && replay.elements.length === 1 && replay.derivatives.length === 0
      && expected.equal(ctx, replay.elements[0], target), 'verification-failed', 'logarithmic primitive target');
    const d = new LogarithmicRationalDomain(ctx, expected, bounds), c = logarithmicPrimitiveCodecs(ctx, d);
    const primitive = c.primitive.decode(raw.primitive), derivative = c.proof.decode(raw.derivative), conditions = c.conditions.decode(raw.conditions);
    verifyLogarithmicPrimitive(ctx, primitive, target, derivative, bounds);
    verifyLogarithmicConditions(ctx, d, logarithmicConditions(ctx, d, target, primitive), conditions);
    return Object.freeze({ primitive, derivative, conditions });
  });
}
