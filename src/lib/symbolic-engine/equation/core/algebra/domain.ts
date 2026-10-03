import { demand, type ExecutionContext } from '../execution';
import { iadd, iexact, imul, isub } from './integer';
import {
  assertRational, rAdd, rDivide, rEqual, rFromInteger, rInverse, rIsZero, rMultiply, rNegate, rSubtract, type Rational,
} from './rational';

/** Exact coefficient domain of characteristic zero with decidable equality. */
export interface ExactDomain<E> {
  readonly name: 'ZZ' | 'QQ';
  readonly isField: boolean;
  assert(ctx: ExecutionContext, a: E): void;
  fromInteger(ctx: ExecutionContext, n: bigint): E;
  isZero(ctx: ExecutionContext, a: E): boolean;
  equal(ctx: ExecutionContext, a: E, b: E): boolean;
  add(ctx: ExecutionContext, a: E, b: E): E;
  subtract(ctx: ExecutionContext, a: E, b: E): E;
  negate(ctx: ExecutionContext, a: E): E;
  multiply(ctx: ExecutionContext, a: E, b: E): E;
  /** Exact quotient; a non-divisible pair fails with `nonexact-division`. */
  exactDivide(ctx: ExecutionContext, a: E, b: E): E;
}

export interface ExactField<E> extends ExactDomain<E> {
  readonly isField: true;
  inverse(ctx: ExecutionContext, a: E): E;
}

export const ZZ: ExactDomain<bigint> = Object.freeze({
  name: 'ZZ' as const,
  isField: false,
  assert(ctx: ExecutionContext, a: bigint) { ctx.tick(); demand(typeof a === 'bigint', 'domain-mismatch', 'expected an integer'); },
  fromInteger(ctx: ExecutionContext, n: bigint) { ctx.tick(); return n; },
  isZero(ctx: ExecutionContext, a: bigint) { ctx.tick(); return a === 0n; },
  equal(ctx: ExecutionContext, a: bigint, b: bigint) { ctx.tick(); return a === b; },
  add: iadd,
  subtract: isub,
  negate(ctx: ExecutionContext, a: bigint) { ctx.tick(); return -a; },
  multiply: imul,
  exactDivide: iexact,
});

export const QQ: ExactField<Rational> = Object.freeze({
  name: 'QQ' as const,
  isField: true as const,
  assert: assertRational,
  fromInteger: rFromInteger,
  isZero: rIsZero,
  equal: rEqual,
  add: rAdd,
  subtract: rSubtract,
  negate: rNegate,
  multiply: rMultiply,
  exactDivide: rDivide,
  inverse: rInverse,
});

export function isField<E>(domain: ExactDomain<E>): domain is ExactField<E> { return domain.isField; }
