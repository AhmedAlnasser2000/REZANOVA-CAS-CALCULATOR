import { demand, type ExecutionContext } from './execution';
import { OwnedValidation } from './owned-validation';

export interface Rational { readonly numerator: bigint; readonly denominator: bigint }
const values = new WeakSet<object>();
const validation = new OwnedValidation();
const smallValues = new WeakMap<object, {zero?: Rational; one?: Rational; minusOne?: Rational}>();
export type IntegerInput = bigint | string | number;

export function integerInput(ctx: ExecutionContext, input: IntegerInput): bigint {
  ctx.tick();
  if (typeof input === 'bigint') { ctx.integer(input); return input; }
  if (typeof input === 'number') {
    demand(Number.isSafeInteger(input), 'invalid-input', 'expected safe integer number');
    const value = BigInt(input); ctx.integer(value); return value;
  }
  demand(typeof input === 'string', 'invalid-input', 'expected integer');
  ctx.integerText(input);
  demand(/^-?(0|[1-9][0-9]*)$/.test(input) && input !== '-0', 'invalid-input', 'invalid integer text');
  const value = BigInt(input); ctx.integer(value); return value;
}

export function integerGcd(ctx: ExecutionContext, a: bigint, b: bigint): bigint {
  const ab = ctx.integer(a), bb = ctx.integer(b);
  if (a < 0n) ctx.allocate(Math.ceil(ab / 64));
  if (b < 0n) ctx.allocate(Math.ceil(bb / 64));
  a = a < 0n ? -a : a; b = b < 0n ? -b : b;
  while (b !== 0n) { const r = ctx.remainder(a, b); a = b; b = r; }
  return a;
}

export function rational(ctx: ExecutionContext, numerator: IntegerInput, denominator: IntegerInput = 1n): Rational {
  let n = integerInput(ctx, numerator), d = integerInput(ctx, denominator);
  demand(d !== 0n, 'division-by-zero', 'rational denominator');
  if (d < 0n) { n = -n; d = -d; }
  const token = ctx.operationToken, name = n === 0n ? 'zero' : n === d ? 'one' : n === -d ? 'minusOne' : null;
  let small = token && name ? smallValues.get(token) : undefined;
  if (small && name && small[name]) {ctx.tick(); return small[name];}
  const g = integerGcd(ctx, n, d);
  ctx.allocate(2);
  const value = Object.freeze({ numerator: ctx.quotient(n, g), denominator: ctx.quotient(d, g) });
  values.add(value);
  if (token && name) {
    if (!small) {ctx.allocate(4); small = {}; smallValues.set(token, small); ctx.onOperationEnd(() => smallValues.delete(token));}
    ctx.allocate(1); small[name] = value;
  }
  return value;
}

export function assertRational(ctx: ExecutionContext, value: Rational): void {
  ctx.tick();
  demand(typeof value === 'object' && value !== null && values.has(value), 'domain-mismatch', 'unowned rational');
  validation.check(ctx, value, () => { ctx.integer(value.numerator); ctx.integer(value.denominator); });
}
export function rationalEqual(ctx: ExecutionContext, a: Rational, b: Rational): boolean {
  assertRational(ctx, a); assertRational(ctx, b);
  return a.numerator === b.numerator && a.denominator === b.denominator;
}
export function rationalNegate(ctx: ExecutionContext, a: Rational): Rational {
  assertRational(ctx, a); return rational(ctx, -a.numerator, a.denominator);
}
export function rationalAdd(ctx: ExecutionContext, a: Rational, b: Rational): Rational {
  assertRational(ctx, a); assertRational(ctx, b);
  const g = integerGcd(ctx, a.denominator, b.denominator);
  const ad = ctx.quotient(a.denominator, g), bd = ctx.quotient(b.denominator, g);
  const n = ctx.add(ctx.multiply(a.numerator, bd), ctx.multiply(b.numerator, ad));
  // Cancel before forming the denominator, including cancellation in a sum.
  const h = integerGcd(ctx, n, g);
  return rational(ctx, ctx.quotient(n, h), ctx.multiply(ad, ctx.quotient(b.denominator, h)));
}
export function rationalMultiply(ctx: ExecutionContext, a: Rational, b: Rational): Rational {
  assertRational(ctx, a); assertRational(ctx, b);
  const g = integerGcd(ctx, a.numerator, b.denominator);
  const h = integerGcd(ctx, b.numerator, a.denominator);
  return rational(ctx,
    ctx.multiply(ctx.quotient(a.numerator, g), ctx.quotient(b.numerator, h)),
    ctx.multiply(ctx.quotient(a.denominator, h), ctx.quotient(b.denominator, g)));
}
export function rationalInverse(ctx: ExecutionContext, a: Rational): Rational {
  assertRational(ctx, a); return rational(ctx, a.denominator, a.numerator);
}
