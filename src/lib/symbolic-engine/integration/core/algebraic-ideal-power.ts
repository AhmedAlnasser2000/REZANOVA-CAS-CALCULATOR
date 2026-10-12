import { demand, type ExecutionContext } from './execution';
import type { AlgebraicCurveView } from './algebraic-curve';
import { assertCurveIdeal, equalCurveIdeals, unitCurveIdeal, invertCurveIdeal, verifyCurveIdealInverse, multiplyCurveIdeals, verifyCurveIdealProduct,
  type CurveFractionalIdeal, type CurveIdealInverse, type CurveIdealProduct } from './algebraic-fractional-ideal';
import { verifyUnitCurveIdeal } from './algebraic-valuation';

export interface CurveIdealPowerStep<E> {
  readonly multiply: CurveIdealProduct<E> | null;
  readonly square: CurveIdealProduct<E> | null;
}
export interface CurveIdealPower<E> {
  readonly input: CurveFractionalIdeal<E>;
  readonly exponent: bigint;
  readonly unit: CurveFractionalIdeal<E>;
  readonly inverse: CurveIdealInverse<E> | null;
  readonly steps: readonly CurveIdealPowerStep<E>[];
  readonly result: CurveFractionalIdeal<E>;
}
export function powerCurveIdeal<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: CurveFractionalIdeal<E>, exponent: bigint): CurveIdealPower<E> {
  assertCurveIdeal(ctx, curve, input); ctx.integer(exponent);
  const unit = unitCurveIdeal(ctx, curve, input.order.infinity), inverse = exponent < 0n ? invertCurveIdeal(ctx, curve, input) : null;
  let base = inverse?.result ?? input, value = unit, n = exponent < 0n ? -exponent : exponent; ctx.integer(n);
  const steps: CurveIdealPowerStep<E>[] = [];
  while (n > 0n) {
    const multiply = n % 2n ? multiplyCurveIdeals(ctx, curve, value, base) : null;
    if (multiply) value = multiply.result;
    n = ctx.quotient(n, 2n); const square = n ? multiplyCurveIdeals(ctx, curve, base, base) : null;
    if (square) base = square.result; ctx.allocate(3); steps.push(Object.freeze({multiply, square}));
  }
  const proof = Object.freeze({input, exponent, unit, inverse, steps: Object.freeze(steps), result: value});
  verifyCurveIdealPower(ctx, curve, input, exponent, proof); return proof;
}
export function verifyCurveIdealPower<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: CurveFractionalIdeal<E>, exponent: bigint, proof: CurveIdealPower<E>): void {
  assertCurveIdeal(ctx, curve, input); ctx.integer(exponent);
  demand(equalCurveIdeals(ctx, curve, proof.input, input) && proof.exponent === exponent && (proof.inverse !== null) === (exponent < 0n), 'verification-failed', 'ideal power exact request/sign');
  verifyUnitCurveIdeal(ctx, curve, proof.unit);
  if (proof.inverse) verifyCurveIdealInverse(ctx, curve, input, proof.inverse);
  let base = proof.inverse?.result ?? input, value = proof.unit, n = exponent < 0n ? -exponent : exponent, index = 0; ctx.integer(n);
  while (n > 0n) {
    demand(index < proof.steps.length, 'verification-failed', 'ideal power bit coverage'); const step = proof.steps[index++];
    demand((step.multiply !== null) === (n % 2n === 1n), 'verification-failed', 'ideal power multiply bit');
    if (step.multiply) { verifyCurveIdealProduct(ctx, curve, value, base, step.multiply); value = step.multiply.result; }
    n = ctx.quotient(n, 2n); demand((step.square !== null) === (n > 0n), 'verification-failed', 'ideal power square coverage');
    if (step.square) { verifyCurveIdealProduct(ctx, curve, base, base, step.square); base = step.square.result; }
  }
  demand(index === proof.steps.length && value === proof.result, 'verification-failed', 'ideal power complete result');
}
