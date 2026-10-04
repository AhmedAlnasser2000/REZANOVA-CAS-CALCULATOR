import { demand, type ExecutionContext } from '../execution';
import { iabs, iadd, iexact, igcd, imul, isub } from './integer';

/** Canonical reduced rational: positive denominator, gcd 1, zero is 0/1. */
export interface Rational { readonly numerator: bigint; readonly denominator: bigint }
export type IntegerInput = bigint | string | number;

/**
 * Rationals built by this module are instances of a private class: the brand
 * (checked by `instanceof`) replaces a global WeakSet registry, which cost a
 * hash insertion per value. Instances are frozen like before.
 */
class RationalValue implements Rational {
  readonly numerator: bigint;
  readonly denominator: bigint;
  constructor(n: bigint, d: bigint) { this.numerator = n; this.denominator = d; Object.freeze(this); }
}

function make(n: bigint, d: bigint): Rational { return new RationalValue(n, d); }

export function integerInput(ctx: ExecutionContext, input: IntegerInput): bigint {
  ctx.tick();
  if (typeof input === 'bigint') return input;
  if (typeof input === 'number') {
    demand(Number.isSafeInteger(input), 'invalid-input', 'expected a safe integer number');
    return BigInt(input);
  }
  demand(typeof input === 'string', 'invalid-input', 'expected an integer');
  ctx.charge(input.length / 16, input.length / 16);
  demand(/^-?(0|[1-9][0-9]*)$/.test(input) && input !== '-0', 'invalid-input', 'invalid integer text');
  return BigInt(input);
}

export function rational(ctx: ExecutionContext, numerator: IntegerInput, denominator: IntegerInput = 1n): Rational {
  let n = integerInput(ctx, numerator), d = integerInput(ctx, denominator);
  demand(d !== 0n, 'division-by-zero', 'rational denominator');
  if (d < 0n) { n = -n; d = -d; }
  const g = igcd(ctx, n, d);
  if (g > 1n) { n = iexact(ctx, n, g); d = iexact(ctx, d, g); }
  ctx.allocate(2);
  return make(n, d);
}

/**
 * n/2^k in lowest terms (k ≥ 0) without a general gcd: only factors of two can
 * cancel, so trailing zero bits of n are stripped (32 at a time, then single).
 */
export function rDyadic(ctx: ExecutionContext, numerator: bigint, k: number): Rational {
  ctx.tick();
  demand(Number.isSafeInteger(k) && k >= 0, 'invalid-input', 'dyadic exponent');
  let n = numerator, t = 0;
  if (n === 0n) return make(0n, 1n);
  while (k - t >= 32 && (n & 0xffffffffn) === 0n) { n >>= 32n; t += 32; }
  while (t < k && (n & 1n) === 0n) { n >>= 1n; t++; }
  ctx.allocate(2);
  return make(n, 1n << BigInt(k - t));
}

export function isRational(value: unknown): value is Rational {
  return value instanceof RationalValue;
}

export function assertRational(ctx: ExecutionContext, value: Rational): void {
  ctx.tick();
  demand(isRational(value), 'domain-mismatch', 'unowned rational');
}

export function rationalZero(ctx: ExecutionContext) { return rational(ctx, 0n); }
export function rationalOne(ctx: ExecutionContext) { return rational(ctx, 1n); }

export function rIsZero(ctx: ExecutionContext, a: Rational): boolean { assertRational(ctx, a); return a.numerator === 0n; }
export function rIsInteger(ctx: ExecutionContext, a: Rational): boolean { assertRational(ctx, a); return a.denominator === 1n; }
export function rSign(ctx: ExecutionContext, a: Rational): -1 | 0 | 1 {
  assertRational(ctx, a); return a.numerator === 0n ? 0 : a.numerator < 0n ? -1 : 1;
}

export function rEqual(ctx: ExecutionContext, a: Rational, b: Rational): boolean {
  assertRational(ctx, a); assertRational(ctx, b);
  return a.numerator === b.numerator && a.denominator === b.denominator;
}

export function rNegate(ctx: ExecutionContext, a: Rational): Rational {
  assertRational(ctx, a); ctx.allocate(2); return make(-a.numerator, a.denominator);
}

export function rAdd(ctx: ExecutionContext, a: Rational, b: Rational): Rational {
  assertRational(ctx, a); assertRational(ctx, b);
  if (a.denominator === b.denominator) return rational(ctx, iadd(ctx, a.numerator, b.numerator), a.denominator);
  const n = iadd(ctx, imul(ctx, a.numerator, b.denominator), imul(ctx, b.numerator, a.denominator));
  return rational(ctx, n, imul(ctx, a.denominator, b.denominator));
}

export function rSubtract(ctx: ExecutionContext, a: Rational, b: Rational): Rational { return rAdd(ctx, a, rNegate(ctx, b)); }

export function rMultiply(ctx: ExecutionContext, a: Rational, b: Rational): Rational {
  assertRational(ctx, a); assertRational(ctx, b);
  if (a.numerator === 0n || b.numerator === 0n) return rationalZero(ctx);
  // Cross-cancel before multiplying to keep intermediates small.
  const g1 = igcd(ctx, a.numerator, b.denominator), g2 = igcd(ctx, b.numerator, a.denominator);
  const n = imul(ctx, iexact(ctx, a.numerator, g1), iexact(ctx, b.numerator, g2));
  const d = imul(ctx, iexact(ctx, a.denominator, g2), iexact(ctx, b.denominator, g1));
  ctx.allocate(2);
  return make(n, d);
}

export function rInverse(ctx: ExecutionContext, a: Rational): Rational {
  assertRational(ctx, a);
  demand(a.numerator !== 0n, 'division-by-zero', 'rational inverse');
  ctx.allocate(2);
  return a.numerator < 0n ? make(-a.denominator, -a.numerator) : make(a.denominator, a.numerator);
}

export function rDivide(ctx: ExecutionContext, a: Rational, b: Rational): Rational { return rMultiply(ctx, a, rInverse(ctx, b)); }

export function rCompare(ctx: ExecutionContext, a: Rational, b: Rational): -1 | 0 | 1 {
  assertRational(ctx, a); assertRational(ctx, b);
  const d = isub(ctx, imul(ctx, a.numerator, b.denominator), imul(ctx, b.numerator, a.denominator));
  return d === 0n ? 0 : d < 0n ? -1 : 1;
}

export function rAbs(ctx: ExecutionContext, a: Rational): Rational {
  assertRational(ctx, a); return a.numerator < 0n ? rNegate(ctx, a) : a;
}

export function rFromInteger(ctx: ExecutionContext, n: bigint): Rational { ctx.allocate(2); return make(n, 1n); }

/** Height of a rational: max(|numerator|, denominator). */
export function rHeight(a: Rational): bigint { const n = iabs(a.numerator); return n > a.denominator ? n : a.denominator; }
