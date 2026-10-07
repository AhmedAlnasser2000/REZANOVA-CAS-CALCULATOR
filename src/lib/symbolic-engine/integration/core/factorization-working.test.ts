import { describe, expect, it } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { ExecutionContext, demand } from './execution';
import { rationalField as Q, type ExactField } from './field';
import { rational, type Rational } from './rational';
import { PolynomialRing } from './polynomial';
import { RationalFunctionField } from './rational-function';
import { FactorModularRing, FactorPrimeField } from './factorization-modular';
import { FactorLocalRing, factorLocalIndices } from './factorization-local';
import { factorFinitePolynomial, verifyFiniteDecomposition } from './factorization-finite';
import { factorRecursivePolynomial as factor } from './recursive-polynomial-factorization';

describe('factorization working domains and unit reuse', () => {
  it.each([3n, 5n, 7n, 11n])('independently checks finite factorization over F%s', prime => {
    const {ctx} = setup(), f = new FactorPrimeField(ctx, prime), p = f.make(ctx, [1n, 0n, 0n, 0n, 1n]);
    const result = factorFinitePolynomial(ctx, f, p); verifyFiniteDecomposition(ctx, f, p, result);
    expect(() => f.assert(ctx, new FactorPrimeField(ctx, prime).make(ctx, [1n]))).toThrow('domain-mismatch');
    expect(() => f.bind(ctx, [prime])).toThrow('verification-failed');
  });
  it('keeps prime powers and truncations as rings with checked unit inverses', () => {
    const {ctx} = setup(), r = new FactorModularRing(ctx, 9n), local = new FactorLocalRing(ctx, 9n, [2, 1]);
    expect(r.inverse(ctx, 2n)).toBe(5n); expect(() => r.inverse(ctx, 3n)).toThrow();
    expect('capability' in local).toBe(false); expect('capability' in r).toBe(false);
    const a = local.make(ctx, [{powers: [0, 0, 0], coefficient: 2n}, {powers: [0, 1, 0], coefficient: 1n}]);
    expect(local.equal(ctx, local.multiply(ctx, a, local.inverseCoefficient(ctx, a)), local.one(ctx))).toBe(true);
    expect([...factorLocalIndices(ctx, [2, 1])]).toHaveLength(5);
    const y = local.make(ctx, [{powers: [0, 2, 0], coefficient: 1n}]); expect(local.multiply(ctx, y, y).terms).toHaveLength(0);
    expect(() => local.make(ctx, [{powers: [0, 3, 0], coefficient: 1n}])).toThrow('invalid-input');
  });
  it('reuses only checked native zero/one inside one fresh scope', () => {
    const {ctx} = setup(), ring = new PolynomialRing(Q, 'x'), owner = new RationalFunctionField(ring);
    const a = ctx.operation(() => {
      const one = owner.fromInteger(ctx, 1n); expect(owner.fromInteger(ctx, 1n)).toBe(one); expect(owner.inverse(ctx, one)).toBe(one);
      const zero = owner.fromInteger(ctx, 0n); expect(owner.fromInteger(ctx, 0n)).toBe(zero); expect(() => owner.inverse(ctx, zero)).toThrow('division-by-zero'); return one;
    });
    const b = ctx.operation(() => owner.fromInteger(ctx, 1n)); expect(b).not.toBe(a);
    expect(() => owner.inverse(new ExecutionContext({...ctx.limits, work: 0}), a)).toThrow('resource-limit');
  });
  it('rejects unsupported custom owners and does not cache mutable coefficients', () => {
    const {ctx} = setup(); type Box = {value: Rational}; const owned = new WeakSet<object>();
    const box = (v: Rational): Box => {ctx.allocate(1); const b = {value: v}; owned.add(b); return b;};
    const custom: ExactField<Box> = {capability: 'field', characteristic: 0, identity: Symbol('mutable'),
      assert(c, v) { demand(owned.has(v), 'domain-mismatch', 'box'); Q.assert(c, v.value); },
      fromInteger(c, n) {return box(rational(c, n));}, add(c, a, b) {return box(Q.add(c, a.value, b.value));},
      subtract(c, a, b) {return box(Q.subtract(c, a.value, b.value));},
      negate(c, a) {return box(Q.negate(c, a.value));}, multiply(c, a, b) {return box(Q.multiply(c, a.value, b.value));},
      inverse(c, a) {return box(Q.inverse(c, a.value));}, exactDivide(c, a, b) {return box(Q.multiply(c, a.value, Q.inverse(c, b.value)));},
      equal(c, a, b) {return Q.equal(c, a.value, b.value);}, isZero(c, a) {return Q.isZero(c, a.value);} };
    const r = new PolynomialRing(custom, 'x'), f = new RationalFunctionField(r);
    ctx.operation(() => {
      const a = f.fromInteger(ctx, 1n), b = f.fromInteger(ctx, 1n); expect(a).not.toBe(b);
      expect(() => factor(ctx, r, r.one(ctx), bounds)).toThrow('unsupported factorization coefficient domain');
      a.numerator.coefficients[0].value = rational(ctx, 0n); a.denominator.coefficients[0].value = rational(ctx, 0n);
      expect(() => f.inverse(ctx, a)).toThrow('division-by-zero');
    });
  });
});
