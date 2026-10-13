import { demand, type ExecutionContext } from './execution';
import type { ExactField } from './field';
/** Exponents remain exact. Limits apply to actual constructed values. */
export function algebraicFunctionPower<E>(ctx: ExecutionContext, owner: ExactField<E>, value: E, exponent: bigint): E {
  owner.assert(ctx, value); ctx.integer(exponent); demand(exponent >= 0n, 'invalid-input', 'negative algebraic function power');
  let out = owner.fromInteger(ctx, 1n), base = value, n = exponent;
  while (n > 0n) { ctx.tick(); if (n % 2n) out = owner.multiply(ctx, out, base); n = ctx.quotient(n, 2n); if (n) base = owner.multiply(ctx, base, base); }
  return out;
}
