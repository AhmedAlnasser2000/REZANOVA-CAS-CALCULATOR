import type { ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import { type LogarithmicRationalDomain, assertLogarithmicRationalDomain } from './logarithmic-rational-domain';
import { firstLevelResidues, verifyFirstLevelResidues, type FirstLevelResidue } from './first-level-rational-residue';
export type LogarithmicResidue = FirstLevelResidue<LogarithmicRationalDomain>;
export function logarithmicResidues(ctx: ExecutionContext, d: LogarithmicRationalDomain, residual: E): LogarithmicResidue {
  assertLogarithmicRationalDomain(ctx, d); return firstLevelResidues(ctx, d, residual);
}
export function verifyLogarithmicResidues(ctx: ExecutionContext, d: LogarithmicRationalDomain, residual: E, proof: LogarithmicResidue): void {
  assertLogarithmicRationalDomain(ctx, d); verifyFirstLevelResidues(ctx, d, residual, proof);
}
