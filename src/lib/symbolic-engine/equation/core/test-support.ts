// Test fixtures only; no product defaults or production imports.
import { ExecutionContext, type ExecutionBudget } from './execution';

export const TEST_BUDGET: ExecutionBudget = Object.freeze({ work: 50_000_000_000, allocation: 50_000_000_000 });

export function context(overrides: Partial<ExecutionBudget> = {}, shouldCancel?: () => boolean) {
  return new ExecutionContext({ ...TEST_BUDGET, ...overrides }, shouldCancel ? { shouldCancel } : {});
}

/** Deterministic 32-bit generator (mulberry32) for seeded law tests. */
export function seeded(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  /** Signed bigint with up to `bits` bits. */
  const big = (bits: number) => {
    let v = 0n;
    for (let i = 0; i < bits; i += 16) v = (v << 16n) | BigInt(int(0, 0xffff));
    v &= (1n << BigInt(bits)) - 1n;
    return next() < 0.5 ? -v : v;
  };
  return { next, int, big };
}
