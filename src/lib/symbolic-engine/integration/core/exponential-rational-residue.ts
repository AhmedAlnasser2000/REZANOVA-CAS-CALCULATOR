import type { ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import { type ExponentialRationalDomain, assertExponentialRationalDomain } from './exponential-rational-domain';
import { firstLevelResidues, verifyFirstLevelResidues, type FirstLevelResidue } from './first-level-rational-residue';
export type ExponentialResidue = FirstLevelResidue<ExponentialRationalDomain>;
export function exponentialResidues(ctx: ExecutionContext, d: ExponentialRationalDomain, residual: E): ExponentialResidue {
  assertExponentialRationalDomain(ctx, d); return firstLevelResidues(ctx, d, residual);
}
export function verifyExponentialResidues(ctx: ExecutionContext, d: ExponentialRationalDomain, residual: E, proof: ExponentialResidue): void {
  assertExponentialRationalDomain(ctx, d); verifyFirstLevelResidues(ctx, d, residual, proof);
}
