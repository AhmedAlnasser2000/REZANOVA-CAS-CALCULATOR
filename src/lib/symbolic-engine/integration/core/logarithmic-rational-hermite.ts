import type { ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import { type LogarithmicRationalDomain, assertLogarithmicRationalDomain, type EP } from './logarithmic-rational-domain';
import { firstLevelFraction, firstLevelDenominatorPower, firstLevelHermite, verifyFirstLevelHermite, type DifferentialHermite } from './first-level-rational-hermite';
export { type DifferentialHermite, type DifferentialHermiteBlock, type DifferentialHermiteStep } from './first-level-rational-hermite';
export function logarithmicFraction(ctx: ExecutionContext, d: LogarithmicRationalDomain, n: EP, den: EP): E {
  assertLogarithmicRationalDomain(ctx, d); return firstLevelFraction(ctx, d, n, den);
}
export function logarithmicDenominatorPower(ctx: ExecutionContext, d: LogarithmicRationalDomain, den: EP): number {
  assertLogarithmicRationalDomain(ctx, d); return firstLevelDenominatorPower(ctx, d, den);
}
export function logarithmicHermite(ctx: ExecutionContext, d: LogarithmicRationalDomain, input: E): DifferentialHermite {
  assertLogarithmicRationalDomain(ctx, d); return firstLevelHermite(ctx, d, input);
}
export function verifyLogarithmicHermite(ctx: ExecutionContext, d: LogarithmicRationalDomain, input: E, proof: DifferentialHermite): void {
  assertLogarithmicRationalDomain(ctx, d); verifyFirstLevelHermite(ctx, d, input, proof);
}
