import type { ExecutionContext } from './execution';
import { assertRational, rational, rationalAdd, rationalEqual, rationalInverse,
  rationalMultiply, rationalNegate, type Rational } from './rational';

/** Only concrete characteristic-zero fields with decidable equality implement this. */
export interface ExactField<E> {
  readonly identity: symbol;
  readonly characteristic: 0;
  assert(ctx: ExecutionContext, a: E): void;
  fromInteger(ctx: ExecutionContext, n: bigint): E;
  add(ctx: ExecutionContext, a: E, b: E): E;
  negate(ctx: ExecutionContext, a: E): E;
  multiply(ctx: ExecutionContext, a: E, b: E): E;
  inverse(ctx: ExecutionContext, a: E): E;
  equal(ctx: ExecutionContext, a: E, b: E): boolean;
  isZero(ctx: ExecutionContext, a: E): boolean;
}

export const rationalField: ExactField<Rational> = Object.freeze({
  identity: Symbol('Q'), characteristic: 0 as const,
  assert: assertRational, fromInteger: (ctx: ExecutionContext, n: bigint) => rational(ctx, n),
  add: rationalAdd, negate: rationalNegate, multiply: rationalMultiply, inverse: rationalInverse,
  equal: rationalEqual,
  isZero(ctx: ExecutionContext, a: Rational) { assertRational(ctx, a); return a.numerator === 0n; },
});

export function subtract<E>(ctx: ExecutionContext, field: ExactField<E>, a: E, b: E): E {
  return field.add(ctx, a, field.negate(ctx, b));
}
export function divide<E>(ctx: ExecutionContext, field: ExactField<E>, a: E, b: E): E {
  return field.multiply(ctx, a, field.inverse(ctx, b));
}
