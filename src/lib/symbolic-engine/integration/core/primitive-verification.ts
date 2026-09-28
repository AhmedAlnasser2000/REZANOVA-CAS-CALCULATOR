import type { ExecutionContext } from './execution';
import type { FormalPrimitive, FormalPrimitiveDomain, QRationalFunction, RootLogTerm } from './formal-primitive';
import { differentiateRootLogWithin, verifyRootLogDerivativeWithin, differentiatePrimitiveWithin, verifyPrimitiveDerivativeWithin, verifyPrimitiveWithin, type LogDerivativeCertificate, type PrimitiveDerivativeCertificate } from './primitive-verification-internal';
export type { LogDerivativeCertificate, PrimitiveDerivativeCertificate } from './primitive-verification-internal';

// Public calls always begin with fresh state.

export function differentiateRootLog(ctx: ExecutionContext, owner: FormalPrimitiveDomain, term: RootLogTerm): LogDerivativeCertificate {
  return ctx.operation(() => differentiateRootLogWithin(ctx, owner, term));
}

export function verifyRootLogDerivative(ctx: ExecutionContext, owner: FormalPrimitiveDomain, term: RootLogTerm, proof: LogDerivativeCertificate): void {
  return ctx.operation(() => verifyRootLogDerivativeWithin(ctx, owner, term, proof));
}

export function differentiatePrimitive(ctx: ExecutionContext, candidate: FormalPrimitive): PrimitiveDerivativeCertificate {
  return ctx.operation(() => differentiatePrimitiveWithin(ctx, candidate));
}

export function verifyPrimitiveDerivative(ctx: ExecutionContext, candidate: FormalPrimitive,
  target: QRationalFunction, proof: PrimitiveDerivativeCertificate): void {
  return ctx.operation(() => verifyPrimitiveDerivativeWithin(ctx, candidate, target, proof));
}

export function verifyPrimitive(ctx: ExecutionContext, candidate: FormalPrimitive, target: QRationalFunction): PrimitiveDerivativeCertificate {
  return ctx.operation(() => verifyPrimitiveWithin(ctx, candidate, target));
}
