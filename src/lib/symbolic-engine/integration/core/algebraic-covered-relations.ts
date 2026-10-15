/** Separate complete pole-coverage authority; shared splitting, rational
 * relations and logarithm mechanics retain their original exact checks. */
import type {ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {constructAlgebraicCoveredResiduesWithin, verifyAlgebraicCoveredResiduesWithin, type AlgebraicCoveredResidues} from './algebraic-covered-residues';
import {splitAlgebraicResidueDataWithin, verifyAlgebraicResidueSplittingDataWithin, type AlgebraicResidueSplittingData} from './algebraic-residue-splitting';
import {combineAlgebraicResidueDataWithin, verifyAlgebraicResidueRelationsDataWithin, type AlgebraicResidueRelationsData} from './algebraic-residue-relations';
import {constructGeometricAlgebraicLogarithmDataWithin, verifyGeometricAlgebraicLogarithmDataWithin, type GeometricAlgebraicLogarithms} from './algebraic-geometric-logarithms';

export type AlgebraicCoveredSplitting<E> = AlgebraicResidueSplittingData<E, AlgebraicCoveredResidues<E>, AlgebraicCoveredResidues<unknown>>;
export type AlgebraicCoveredRelations<E> = AlgebraicResidueRelationsData<E, AlgebraicCoveredSplitting<E>>;
export type AlgebraicCoveredLogarithms<E> = GeometricAlgebraicLogarithms<E, AlgebraicCoveredRelations<E>>;
export function verifyAlgebraicCoveredSplittingWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, original: AlgebraicCoveredResidues<E>, proof: AlgebraicCoveredSplitting<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicResidueSplittingDataWithin(ctx, curve, original.input, original, proof, bounds,
    () => verifyAlgebraicCoveredResiduesWithin(ctx, curve, original.input, original, bounds),
    () => verifyAlgebraicCoveredResiduesWithin(ctx, proof.curve, proof.residues.input, proof.residues, bounds));
}
export function splitAlgebraicCoveredResiduesWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, original: AlgebraicCoveredResidues<E>, bounds: DifferentialBounds): AlgebraicCoveredSplitting<E> {
  return splitAlgebraicResidueDataWithin(ctx, curve, original.input, original, bounds,
    () => verifyAlgebraicCoveredResiduesWithin(ctx, curve, original.input, original, bounds),
    (active, value) => constructAlgebraicCoveredResiduesWithin(ctx, active, value, bounds),
    (active, value, proof) => verifyAlgebraicCoveredResiduesWithin(ctx, active, value, proof, bounds));
}
export function verifyAlgebraicCoveredRelationsWithin<E>(ctx: ExecutionContext, proof: AlgebraicCoveredRelations<E>, bounds: DifferentialBounds): void {
  const split = proof.splitting; verifyAlgebraicResidueRelationsDataWithin(ctx, split, proof, bounds, () => verifyAlgebraicCoveredSplittingWithin(ctx, split.source, split.original, split, bounds));
}
export function combineAlgebraicCoveredResiduesWithin<E>(ctx: ExecutionContext, split: AlgebraicCoveredSplitting<E>, bounds: DifferentialBounds): AlgebraicCoveredRelations<E> {
  return combineAlgebraicResidueDataWithin(ctx, split, bounds, () => verifyAlgebraicCoveredSplittingWithin(ctx, split.source, split.original, split, bounds));
}
export function verifyAlgebraicCoveredLogarithmsWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, relations: AlgebraicCoveredRelations<E>, proof: AlgebraicCoveredLogarithms<E>, bounds: DifferentialBounds): void {
  verifyGeometricAlgebraicLogarithmDataWithin(ctx, curve, relations, proof, bounds, () => verifyAlgebraicCoveredRelationsWithin(ctx, relations, bounds));
}
export function constructAlgebraicCoveredLogarithmsWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, relations: AlgebraicCoveredRelations<E>, bounds: DifferentialBounds): AlgebraicCoveredLogarithms<E> {
  return constructGeometricAlgebraicLogarithmDataWithin(ctx, curve, relations, bounds, () => verifyAlgebraicCoveredRelationsWithin(ctx, relations, bounds));
}
