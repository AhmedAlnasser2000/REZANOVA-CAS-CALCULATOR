// Test fixtures only; no product defaults or production imports.
import { ExecutionContext, type ExecutionLimits } from './execution';
import { rationalField } from './field';
import { PolynomialRing } from './polynomial';
import { rational } from './rational';
export function context(overrides: Partial<ExecutionLimits> = {}) {
  return new ExecutionContext({ work: 10_000_000, integerBits: 1024, degree: 256, allocation: 100_000_000, ...overrides });
}
export function rationalRing(variable = 'x') { return new PolynomialRing(rationalField, variable); }
export function poly(ctx: ExecutionContext, ring: ReturnType<typeof rationalRing>, coefficients: (bigint | number)[]) {
  return ring.make(ctx, coefficients.map(n => rational(ctx, n)));
}
