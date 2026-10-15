/** Exact sum-of-products identities, shared without domain capabilities. */
import {demand, type ExecutionContext} from './execution';
interface Coefficients<E> {
  fromInteger(ctx: ExecutionContext, n: bigint): E;
  add(ctx: ExecutionContext, a: E, b: E): E;
  multiply(ctx: ExecutionContext, a: E, b: E): E;
  equal(ctx: ExecutionContext, a: E, b: E): boolean;
}
export function verifyCoefficientProductSum<E>(ctx: ExecutionContext, c: Coefficients<E>, products: readonly (readonly [readonly E[], readonly E[]])[], target: readonly E[], reason = 'complete polynomial coefficient identity'): void {
  let last = target.length - 1; for (const [left, right] of products) {ctx.tick(); if (left.length && right.length) last = Math.max(last, left.length + right.length - 2);}
  const zero = c.fromInteger(ctx, 0n);
  for (let k = 0; k <= last; k++) {
    let value = zero;
    for (const [left, right] of products) {
      ctx.tick();
      for (let i = Math.max(0, k - right.length + 1); i <= Math.min(k, left.length - 1); i++) {
        ctx.tick(); value = c.add(ctx, value, c.multiply(ctx, left[i], right[k - i]));
      }
    }
    demand(c.equal(ctx, value, target[k] ?? zero), 'verification-failed', reason);
  }
}
