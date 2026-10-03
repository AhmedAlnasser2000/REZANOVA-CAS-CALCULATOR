import type { ExecutionContext } from '../execution';
import { iadd, imul } from '../algebra/integer';

/** Q(x + t) for an integer t, by repeated synthetic division (O(n²)). */
export function taylorShift(ctx: ExecutionContext, coefficients: readonly bigint[], t: bigint): bigint[] {
  const a = [...coefficients], n = a.length;
  ctx.allocate(n);
  for (let i = 0; i < n - 1; i++) for (let j = n - 2; j >= i; j--) a[j] = iadd(ctx, a[j], imul(ctx, t, a[j + 1]));
  return a;
}
