import { demand, type ExecutionContext } from './execution';
import type { DifferentialElement as E, DifferentialBounds } from './differential-field';
import type { CertifiedTowerView } from './recursive-certified-tower';
import { TranscendentalDomain } from './transcendental-domain';
import { firstLevelPrimitiveCodecs } from './first-level-rational-primitive-codecs';
import { verifyTranscendentalPrimitiveWithin, type TranscendentalPrimitive, type TranscendentalPrimitiveDerivative } from './transcendental-primitive';
import { verifyTranscendentalConditions, type TranscendentalCondition } from './transcendental-conditions';
import { transcendentalEnvelope, transcendentalArtifactBody } from './transcendental-artifact';
import * as w from './decision-wire-algebra';
export interface TranscendentalPrimitiveReplay { readonly primitive: TranscendentalPrimitive; readonly derivative: TranscendentalPrimitiveDerivative; readonly conditions: readonly TranscendentalCondition[] }
export function encodeTranscendentalPrimitive(ctx: ExecutionContext, view: CertifiedTowerView, target: E, saved: TranscendentalPrimitiveReplay, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    const d = saved.primitive.domain; demand(d.view === view, 'domain-mismatch', 'expected primitive certified view');
    verifyTranscendentalPrimitiveWithin(ctx, d, saved.primitive, target, saved.derivative, bounds);
    verifyTranscendentalConditions(ctx, d, target, saved.primitive, saved.conditions); const c = firstLevelPrimitiveCodecs(ctx, d);
    return transcendentalEnvelope(ctx, view, 'transcendental-primitive', Object.freeze({target: c.e.encode(target), primitive: c.primitive.encode(saved.primitive), derivative: c.proof.encode(saved.derivative), conditions: c.conditions.encode(saved.conditions)}), bounds);
  });
}
export function decodeTranscendentalPrimitive(ctx: ExecutionContext, view: CertifiedTowerView, target: E, data: unknown, bounds: DifferentialBounds): TranscendentalPrimitiveReplay {
  return ctx.operation(() => {
    const body = transcendentalArtifactBody(ctx, view, 'transcendental-primitive', data, bounds), raw = w.record(ctx, body, ['target','primitive','derivative','conditions']);
    const d = new TranscendentalDomain(ctx, view, bounds), c = firstLevelPrimitiveCodecs(ctx, d);
    demand(d.field.equal(ctx, target, c.e.decode(raw.target)), 'verification-failed', 'explicit primitive target');
    const primitive = c.primitive.decode(raw.primitive), derivative = c.proof.decode(raw.derivative), conditions = c.conditions.decode(raw.conditions);
    verifyTranscendentalPrimitiveWithin(ctx, d, primitive, target, derivative, bounds); verifyTranscendentalConditions(ctx, d, target, primitive, conditions);
    return Object.freeze({primitive, derivative, conditions});
  });
}
