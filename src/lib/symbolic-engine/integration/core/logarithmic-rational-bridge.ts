import type { ExecutionContext } from './execution';
import type { FormalPrimitive } from './formal-primitive';
import { type LogarithmicRationalDomain, assertLogarithmicRationalDomain } from './logarithmic-rational-domain';
import type { LogarithmicPrimitive } from './logarithmic-rational-primitive';
import { embedRationalPrimitive as embed, verifyRationalPrimitiveEmbedding as verify } from './first-level-rational-bridge';
export function embedRationalPrimitive(ctx: ExecutionContext, d: LogarithmicRationalDomain, source: FormalPrimitive): LogarithmicPrimitive {
  assertLogarithmicRationalDomain(ctx, d); return embed(ctx, d, source);
}
export function verifyRationalPrimitiveEmbedding(ctx: ExecutionContext, d: LogarithmicRationalDomain, source: FormalPrimitive, target: LogarithmicPrimitive): void {
  assertLogarithmicRationalDomain(ctx, d); verify(ctx, d, source, target);
}
