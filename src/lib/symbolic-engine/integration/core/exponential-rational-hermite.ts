import type { ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import { type ExponentialRationalDomain, assertExponentialRationalDomain, type EP } from './exponential-rational-domain';
import { firstLevelFraction, firstLevelDenominatorPower, firstLevelHermite, verifyFirstLevelHermite, type DifferentialHermite } from './first-level-rational-hermite';
export { type DifferentialHermite, type DifferentialHermiteBlock, type DifferentialHermiteStep } from './first-level-rational-hermite';
export function exponentialFraction(ctx: ExecutionContext, d: ExponentialRationalDomain, n: EP, den: EP): E {
  assertExponentialRationalDomain(ctx, d); return firstLevelFraction(ctx, d, n, den);
}
export function exponentialDenominatorPower(ctx: ExecutionContext, d: ExponentialRationalDomain, den: EP): number {
  assertExponentialRationalDomain(ctx, d); return firstLevelDenominatorPower(ctx, d, den);
}
export function differentialHermite(ctx: ExecutionContext, d: ExponentialRationalDomain, input: E): DifferentialHermite {
  assertExponentialRationalDomain(ctx, d); return firstLevelHermite(ctx, d, input);
}
export function verifyDifferentialHermite(ctx: ExecutionContext, d: ExponentialRationalDomain, input: E, proof: DifferentialHermite): void {
  assertExponentialRationalDomain(ctx, d); verifyFirstLevelHermite(ctx, d, input, proof);
}
