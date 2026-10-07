import type { ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import { type ExponentialRationalDomain, assertExponentialRationalDomain, type EP } from './exponential-rational-domain';
import type { SquareFreeDecomposition } from './polynomial-square-free';
import type { Rational } from './rational';
import { selectFirstLevelResidues, verifyFirstLevelSelection, type BivariatePRS, type LrtGroup as Group, type LrtComponent as Component } from './first-level-rational-selection';
export { specializeComponent, type ResidueAlgebra, type ComponentRing, type ComponentPolynomial, type BivariatePRS, type ResiduePartitionNode } from './first-level-rational-selection';
export type LrtComponent = Component<ExponentialRationalDomain>;
export type LrtGroup = Group<ExponentialRationalDomain>;
export function selectExponentialResidues(ctx: ExecutionContext, d: ExponentialRationalDomain, residual: E, dn: EP, prs: BivariatePRS, decomposition: SquareFreeDecomposition<Rational>): readonly LrtGroup[] {
  assertExponentialRationalDomain(ctx, d); return selectFirstLevelResidues(ctx, d, residual, dn, prs, decomposition);
}
export function verifyExponentialSelection(ctx: ExecutionContext, d: ExponentialRationalDomain, residual: E, dn: EP, prs: BivariatePRS, decomposition: SquareFreeDecomposition<Rational>, groups: readonly LrtGroup[]): void {
  assertExponentialRationalDomain(ctx, d); verifyFirstLevelSelection(ctx, d, residual, dn, prs, decomposition, groups);
}
