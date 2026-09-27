import { describe, expect, it } from 'vitest';
import { AlgebraError, ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import { assertRational, rational, rationalAdd, rationalInverse, rationalMultiply, rationalNegate, type Rational } from './rational';
import { context } from './test-support';

const pair = (q: Rational) => [q.numerator, q.denominator];
describe('exact rational arithmetic', () => {
  it('retains known integers beyond machine precision', () => {
    const c = context();
    expect(pair(rationalMultiply(c, rational(c, '9007199254740991'), rational(c, 3)))).toEqual([27021597764222973n, 1n]);
    expect(pair(rationalAdd(c, rational(c, '9007199254740992'), rational(c, 1)))).toEqual([9007199254740993n, 1n]);
    expect(pair(rational(c, -42, -63))).toEqual([2n, 3n]);
    expect(pair(rational(c, 0, -99))).toEqual([0n, 1n]);
  });
  it('cross-cancels before large products and denominator formation', () => {
    const c = context({ integerBits: 64 });
    const a = rational(c, 2n ** 62n, 3n), b = rational(c, 3n, 2n ** 62n);
    expect(pair(rationalMultiply(c, a, b))).toEqual([1n, 1n]);
    expect(pair(rationalAdd(c, rational(c, 1n, 2n ** 62n), rational(c, -1n, 2n ** 62n)))).toEqual([0n, 1n]);
    expect(pair(rationalAdd(c, rational(c, 5, 12), rational(c, 7, 18)))).toEqual([29n, 36n]);
  });
  it.each([0.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, '1.0', ' 1', '+1', '01', '-0', '1e3'])('rejects ambiguous ingress %s', value => {
    expect(() => rational(context(), value)).toThrowError(AlgebraError);
  });
  it('rejects zero denominators and forged values', () => {
    const c = context();
    expect(() => rational(c, 1, 0)).toThrowError(/division-by-zero/);
    expect(() => rationalInverse(c, rational(c, 0))).toThrowError(/division-by-zero/);
    expect(() => assertRational(c, { numerator: 1n, denominator: 1n })).toThrowError(/domain-mismatch/);
  });
  it('satisfies seeded arithmetic laws without mutating operands', () => {
    const c = context(); let state = 173;
    const next = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state; };
    for (let i = 0; i < 80; i++) {
      const sample = () => rational(c, BigInt(next() % 201 - 100), BigInt(next() % 31 + 1));
      const a = sample(), b = sample(), d = sample(), original = pair(a);
      expect(Q.equal(c, Q.add(c, Q.add(c, a, b), d), Q.add(c, a, Q.add(c, b, d)))).toBe(true);
      expect(Q.equal(c, Q.multiply(c, a, Q.add(c, b, d)), Q.add(c, Q.multiply(c, a, b), Q.multiply(c, a, d)))).toBe(true);
      expect(Q.isZero(c, Q.add(c, a, rationalNegate(c, a)))).toBe(true);
      if (!Q.isZero(c, a)) expect(pair(Q.multiply(c, a, Q.inverse(c, a)))).toEqual([1n, 1n]);
      expect(pair(a)).toEqual(original); expect(Object.isFrozen(a)).toBe(true);
    }
  });
});
describe('execution limits', () => {
  it('requires explicit finite safe limits', () => {
    expect(() => context({ work: Infinity })).toThrowError(/invalid-input/);
    expect(() => context({ integerBits: 0 })).toThrowError(/invalid-input/);
    expect(() => context({ allocation: -1 })).toThrowError(/invalid-input/);
    expect(() => new ExecutionContext({ work: 0, integerBits: 1, degree: 0, allocation: 0 })).not.toThrow();
  });
  it('fails closed and keeps a stopped budget stopped', () => {
    const c = context({ work: 1 });
    c.tick(); expect(() => c.tick()).toThrowError(/resource-limit: work/);
    expect(() => c.tick(0)).toThrowError(/resource-limit: work/);
    expect(() => rational(context({ integerBits: 3 }), 8)).toThrowError(/integer-bits/);
    expect(() => rational(context({ integerBits: 3 }), '123456789')).toThrowError(/integer-text-size/);
    expect(() => rational(context({ allocation: 0 }), 1)).toThrowError(/allocation/);
  });
  it('checks multiplication before exponential magnitude growth', () => {
    const c = context({ integerBits: 32 });
    expect(() => c.multiply(2n ** 30n, 2n ** 30n)).toThrowError(/integer-product-bits/);
  });
});
