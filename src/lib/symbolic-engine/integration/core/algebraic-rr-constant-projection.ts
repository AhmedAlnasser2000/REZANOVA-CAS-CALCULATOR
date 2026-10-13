import { demand, type ExecutionContext } from './execution';
import type { AlgebraicCurveView } from './algebraic-curve';
import type { CurveConstant } from './algebraic-curve-coordinates';
import { algebraicRiemannRochCoordinatesWithin, type AlgebraicRiemannRoch } from './algebraic-riemann-roch';
import { combineAlgebraicConstantColumns } from './algebraic-coefficient-system';

export interface AlgebraicConstantProjection<E> {
  readonly primitive: E;
  readonly coordinates: readonly CurveConstant[];
  readonly constantCoordinates: readonly CurveConstant[];
  readonly projectionIndex: number;
}
/** A linear projection with ell(1)=1. It never evaluates a field element at
 * x=0, and removes only the separately retained actual-constant freedom. */
export function normalizeAlgebraicPrimitiveCoordinates<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, space: AlgebraicRiemannRoch<E>, particular: readonly CurveConstant[]): AlgebraicConstantProjection<E> {
  const c = curve.coordinates.constantOwner, constantCoordinates = algebraicRiemannRochCoordinatesWithin(ctx, curve, space, curve.owner.fromInteger(ctx, 1n)), projectionIndex = constantCoordinates.findIndex(v => !c.isZero(ctx, v));
  demand(particular.length === space.dimension && projectionIndex >= 0, 'verification-failed', 'complete primitive constant projection dimensions');
  const scalar = c.exactDivide(ctx, particular[projectionIndex], constantCoordinates[projectionIndex]); ctx.allocate(particular.length + 4);
  const coordinates = Object.freeze(particular.map((v, i) => c.subtract(ctx, v, c.multiply(ctx, scalar, constantCoordinates[i]))));
  return Object.freeze({coordinates, constantCoordinates, projectionIndex, primitive: combineAlgebraicConstantColumns(ctx, curve, coordinates, space.basis)});
}
export function verifyAlgebraicConstantProjection<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, space: AlgebraicRiemannRoch<E>, particular: readonly CurveConstant[], proof: AlgebraicConstantProjection<E>): void {
  const c = curve.coordinates.constantOwner, expected = normalizeAlgebraicPrimitiveCoordinates(ctx, curve, space, particular);
  demand(proof.projectionIndex === expected.projectionIndex && proof.constantCoordinates.length === expected.constantCoordinates.length
    && proof.constantCoordinates.every((v, i) => c.equal(ctx, v, expected.constantCoordinates[i])) && proof.coordinates.length === expected.coordinates.length
    && proof.coordinates.every((v, i) => c.equal(ctx, v, expected.coordinates[i])) && curve.owner.equal(ctx, proof.primitive, expected.primitive),
  'verification-failed', 'complete canonical primitive constant projection');
}
