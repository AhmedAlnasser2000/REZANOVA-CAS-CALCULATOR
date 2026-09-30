import { ExecutionContext } from './execution';
import { DifferentialField as DF, type DifferentialBounds } from './differential-field';
import { rational } from './rational';

export const bounds: DifferentialBounds = Object.freeze({ towerHeight: 8, artifactDepth: 64, artifactNodes: 100_000, artifactBytes: 16 * 1024 * 1024 });
export function setup() {
  const ctx = new ExecutionContext({ work: 20_000_000_000, allocation: 1_000_000_000_000, integerBits: 2048, degree: 256 });
  const q = DF.rationals(ctx, bounds), f = DF.rationalFunctions(ctx, q, 'x', bounds);
  const c = (n: bigint | number, d: bigint | number = 1n) => q.scalar(ctx, rational(ctx, n, d));
  const p = (ns: (bigint | number)[], ds?: (bigint | number)[]) => f.make(ctx, ns.map(n => c(n)), ds?.map(n => c(n)));
  return { ctx, q, f, c, p, x: f.generator(ctx) };
}
