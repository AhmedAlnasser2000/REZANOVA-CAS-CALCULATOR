/** Identical group arithmetic on separately registered presentation authorities. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import type {CurveConstant} from './algebraic-curve-coordinates';
import type {Polynomial} from './polynomial';
import {assertEllipticModel, verifyEllipticCurveModelWithin, ellipticNativeConstantInCurveWithin, type EllipticCurveModel} from './elliptic-curve-model';
import {isGenusOneCoordinates, assertGenusOneCoordinates, verifyGenusOneCoordinatesWithin} from './genus-one-coordinates';

export interface EllipticArithmeticModel<E> {
  readonly curve: AlgebraicCurveView<E>; readonly polynomial: Polynomial<CurveConstant>; readonly x: E; readonly y: E;
}
export function assertEllipticArithmeticModel<E>(ctx: ExecutionContext, model: EllipticArithmeticModel<E>): void {
  demand(model !== null && typeof model === 'object', 'domain-mismatch', 'owned elliptic arithmetic model');
  if (isGenusOneCoordinates(model)) assertGenusOneCoordinates(ctx, model.presentation, model);
  else assertEllipticModel(ctx, model.curve, model as EllipticCurveModel<E>);
}
export function verifyEllipticArithmeticModelWithin<E>(ctx: ExecutionContext, model: EllipticArithmeticModel<E>, bounds: DifferentialBounds): void {
  assertEllipticArithmeticModel(ctx, model);
  if (isGenusOneCoordinates(model)) verifyGenusOneCoordinatesWithin(ctx, model.presentation, model, bounds);
  else verifyEllipticCurveModelWithin(ctx, model.curve, model as EllipticCurveModel<E>, bounds);
}
export function ellipticArithmeticNativeConstant<E>(ctx: ExecutionContext, model: EllipticArithmeticModel<E>, value: CurveConstant): E {
  assertEllipticArithmeticModel(ctx, model); return ellipticNativeConstantInCurveWithin(ctx, model.curve, value);
}
