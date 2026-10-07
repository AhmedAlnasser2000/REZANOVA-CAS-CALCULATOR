import type { ExecutionContext } from './execution';
import type { FormalPrimitive } from './formal-primitive';
import { type ExponentialRationalDomain, assertExponentialRationalDomain } from './exponential-rational-domain';
import type { ExponentialPrimitive } from './exponential-rational-primitive';
import { embedRationalPrimitive as embed, verifyRationalPrimitiveEmbedding as verify } from './first-level-rational-bridge';
export function embedRationalPrimitive(ctx: ExecutionContext, d: ExponentialRationalDomain, source: FormalPrimitive): ExponentialPrimitive {
  assertExponentialRationalDomain(ctx, d); return embed(ctx, d, source);
}
export function verifyRationalPrimitiveEmbedding(ctx: ExecutionContext, d: ExponentialRationalDomain, source: FormalPrimitive, target: ExponentialPrimitive): void {
  assertExponentialRationalDomain(ctx, d); verify(ctx, d, source, target);
}
