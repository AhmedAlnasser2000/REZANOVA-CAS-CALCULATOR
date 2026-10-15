/** Only the identical exact BSGS search is shared. A caller must establish its
 * registered group and complete bound; this producer has no replay authority. */
import {demand, type ExecutionContext} from './execution';
import type {FiniteJacobianBound} from './reduced-divisor-order';

export interface FiniteClassSearch<P> {
  neutral(): P; zero(value: P): boolean; equal(a: P, b: P): boolean;
  key(value: P): string; add(a: P, b: P): P;
}
export function findFiniteClassOrderMultiple<P>(ctx: ExecutionContext, group: FiniteClassSearch<P>, input: P, bound: FiniteJacobianBound): bigint {
  if (group.zero(input)) return 1n;
  ctx.allocate(3); const babies = new Map<string, {index: bigint; value: P}>(); let previous = group.neutral();
  for (let j = 0n; j < bound.step; j = ctx.add(j, 1n)) {
    const name = group.key(previous), old = babies.get(name);
    if (old !== undefined) {demand(group.equal(old.value, previous), 'verification-failed', 'exact finite class key collision'); return ctx.add(j, -old.index);}
    ctx.allocate(4); babies.set(name, {index: j, value: previous}); previous = group.add(previous, input);
  }
  const stride = previous; let giant = group.neutral(); const count = ctx.quotient(ctx.add(bound.upper, bound.step - 1n), bound.step);
  for (let k = 1n; k <= count; k = ctx.add(k, 1n)) {
    giant = group.add(giant, stride); const match = babies.get(group.key(giant));
    if (match !== undefined) {
      demand(group.equal(match.value, giant), 'verification-failed', 'exact finite class giant correspondence');
      const candidate = ctx.add(ctx.multiply(k, bound.step), -match.index); if (candidate > 0n && candidate <= bound.upper) return candidate;
    }
  }
  demand(false, 'verification-failed', 'complete finite class-order existence');
}
