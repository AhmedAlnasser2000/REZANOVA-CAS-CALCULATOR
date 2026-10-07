import type { ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import { type LogarithmicRationalDomain, assertLogarithmicRationalDomain, type EP } from './logarithmic-rational-domain';
import type { SquareFreeDecomposition } from './polynomial-square-free';
import type { Rational } from './rational';
import { selectFirstLevelResidues, verifyFirstLevelSelection, type BivariatePRS, type LrtGroup as Group, type LrtComponent as Component } from './first-level-rational-selection';
export { specializeComponent, type ResidueAlgebra, type ComponentRing, type ComponentPolynomial, type BivariatePRS, type ResiduePartitionNode } from './first-level-rational-selection';
export type LrtComponent = Component<LogarithmicRationalDomain>;
export type LrtGroup = Group<LogarithmicRationalDomain>;
export function selectLogarithmicResidues(ctx: ExecutionContext, d: LogarithmicRationalDomain, residual: E, dn: EP, prs: BivariatePRS, decomposition: SquareFreeDecomposition<Rational>): readonly LrtGroup[] {
  assertLogarithmicRationalDomain(ctx, d); return selectFirstLevelResidues(ctx, d, residual, dn, prs, decomposition);
}
export function verifyLogarithmicSelection(ctx: ExecutionContext, d: LogarithmicRationalDomain, residual: E, dn: EP, prs: BivariatePRS, decomposition: SquareFreeDecomposition<Rational>, groups: readonly LrtGroup[]): void {
  assertLogarithmicRationalDomain(ctx, d); verifyFirstLevelSelection(ctx, d, residual, dn, prs, decomposition, groups);
}
