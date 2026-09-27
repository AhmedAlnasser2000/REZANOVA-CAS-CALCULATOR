import { demand, type ExecutionContext } from './execution';
import { assertRational, rational, rationalAdd, rationalEqual, rationalInverse,
  rationalMultiply, rationalNegate, type Rational } from './rational';

/** Canonical, owned values with decidable equality; no symbolic unknowns. */
export interface ExactRing<E> {
  readonly capability: 'ring' | 'integral-domain' | 'field';
  readonly identity: symbol;
  readonly characteristic: 0;
  assert(ctx: ExecutionContext, a: E): void;
  fromInteger(ctx: ExecutionContext, n: bigint): E;
  add(ctx: ExecutionContext, a: E, b: E): E;
  subtract(ctx: ExecutionContext, a: E, b: E): E;
  negate(ctx: ExecutionContext, a: E): E;
  multiply(ctx: ExecutionContext, a: E, b: E): E;
  equal(ctx: ExecutionContext, a: E, b: E): boolean;
  isZero(ctx: ExecutionContext, a: E): boolean;
}

export interface ExactIntegralDomain<E> extends ExactRing<E> {
  readonly capability: 'integral-domain' | 'field';
  exactDivide(ctx: ExecutionContext, a: E, b: E): E;
}
export interface ExactField<E> extends ExactIntegralDomain<E> {
  readonly capability: 'field';
  inverse(ctx: ExecutionContext, a: E): E;
}
export function requireField<E>(domain: ExactRing<E>): asserts domain is ExactField<E> {
  requireIntegralDomain(domain);
  demand(domain.capability === 'field' && typeof (domain as ExactField<E>).inverse === 'function',
    'domain-mismatch', 'field capability required');
}
export function requireIntegralDomain<E>(domain: ExactRing<E>): asserts domain is ExactIntegralDomain<E> {
  demand((domain.capability === 'integral-domain' || domain.capability === 'field')
    && typeof (domain as ExactIntegralDomain<E>).exactDivide === 'function', 'domain-mismatch', 'integral-domain capability required');
}
export function ringPower<E>(ctx: ExecutionContext, domain: ExactRing<E>, a: E, exponent: number): E {
  domain.assert(ctx, a);
  demand(Number.isSafeInteger(exponent) && exponent >= 0, 'invalid-input', 'ring exponent');
  let out = domain.fromInteger(ctx, 1n), base = a, n = exponent;
  while (n) {
    ctx.tick();
    if (n % 2) out = domain.multiply(ctx, out, base);
    n = Math.floor(n / 2);
    if (n) base = domain.multiply(ctx, base, base);
  }
  return out;
}

export const rationalField: ExactField<Rational> = Object.freeze({
  capability: 'field' as const, identity: Symbol('Q'), characteristic: 0 as const,
  assert: assertRational, fromInteger: (ctx: ExecutionContext, n: bigint) => rational(ctx, n),
  add: rationalAdd, negate: rationalNegate, multiply: rationalMultiply, inverse: rationalInverse,
  exactDivide(ctx: ExecutionContext, a: Rational, b: Rational) {
    const q = rationalMultiply(ctx, a, rationalInverse(ctx, b));
    demand(rationalEqual(ctx, rationalMultiply(ctx, q, b), a), 'verification-failed', 'rational exact division');
    return q;
  },
  subtract(ctx: ExecutionContext, a: Rational, b: Rational) { return rationalAdd(ctx, a, rationalNegate(ctx, b)); },
  equal: rationalEqual,
  isZero(ctx: ExecutionContext, a: Rational) { assertRational(ctx, a); return a.numerator === 0n; },
});

export function subtract<E>(ctx: ExecutionContext, field: ExactRing<E>, a: E, b: E): E {
  return field.subtract(ctx, a, b);
}
export function divide<E>(ctx: ExecutionContext, field: ExactField<E>, a: E, b: E): E {
  requireField(field);
  return field.exactDivide(ctx, a, b);
}
