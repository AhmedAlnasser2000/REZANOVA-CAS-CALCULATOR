import {it, expect} from 'vitest';
import {ExecutionContext} from './execution';
import {rational, assertRational, rationalInverse} from './rational';
import {fresh} from './__tests__/algebraic-support';

it('owns and normalizes small rational values only in one live operation', () => {
  const ctx = fresh(), one = ctx.operation(() => {
    const zero = rational(ctx, 0n, -7n), one = rational(ctx, 9n, 9n), minus = rational(ctx, -3n, 3n);
    expect(rational(ctx, 0n, 11n)).toBe(zero); expect(rational(ctx, -11n, -11n)).toBe(one); expect(rational(ctx, 5n, -5n)).toBe(minus);
    expect(Object.isFrozen(one)).toBe(true); expect(() => assertRational(ctx, {...one})).toThrow('domain-mismatch');
    expect(() => rational(ctx, 0n, 0n)).toThrow('division-by-zero'); expect(() => rationalInverse(ctx, zero)).toThrow('division-by-zero'); return one;
  });
  expect(ctx.operation(() => rational(ctx, 1n))).not.toBe(one); expect(rational(ctx, 1n)).not.toBe(rational(ctx, 1n)); assertRational(ctx, one);
});
it('checks the original integer sizes and keeps exhaustion sticky even for a cached unit', () => {
  const limits = {...fresh().limits, integerBits: 8}, ctx = new ExecutionContext(limits);
  ctx.operation(() => {
    rational(ctx, 1n); expect(() => rational(ctx, 256n, 256n)).toThrow('resource-limit'); expect(() => rational(ctx, 1n)).toThrow('resource-limit');
  });
  const strict = new ExecutionContext({...fresh().limits, allocation: 1}); expect(() => strict.operation(() => rational(strict, 1n))).toThrow('resource-limit');
});
