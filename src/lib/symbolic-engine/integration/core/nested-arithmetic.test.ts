import { describe, expect, it } from 'vitest';
import { ExecutionContext } from './execution';
import { rationalField } from './field';
import { rational, type Rational } from './rational';
import { PolynomialRing } from './polynomial';
import { RationalFunctionField, type RationalFunction } from './rational-function';
import type { DifferentialElement } from './differential-field';
import { extendedGcd, verifyBezout, polynomialDivide } from './polynomial-division';
import { setup } from './differential-test-support';
import { fractionCoefficient } from './fraction-coefficient';
import { primitiveExtendedGcd } from './primitive-euclid';
import { exponentialSetup } from './__tests__/exponential-rational-fixtures';
import { nestedStress } from './__tests__/nested-fixtures';
import { bounds } from './differential-test-support';
import { integrateExponentialRational, verifyExponentialRationalDecision } from './exponential-rational-decision';
import { encodeExponentialRationalDecision, decodeExponentialRationalDecision } from './exponential-rational-wire';

describe('checked nested fraction arithmetic', () => {
  it('preserves the monic gcd and Bezout identity with rational-function coefficients', () => {
    const { ctx } = setup(), x = new PolynomialRing(rationalField, 'x'), k = new RationalFunctionField(x), t = new PolynomialRing<RationalFunction<Rational>>(k, 't');
    const p = (ns: number[]) => x.make(ctx, ns.map(n => rational(ctx, n)));
    const c = (ns: number[], ds = [1]) => k.make(ctx, p(ns), p(ds));
    const common = t.make(ctx, [c([0, 1]), c([1])]);
    const left = t.multiply(ctx, common, t.make(ctx, [c([2], [1, 1]), c([1])]));
    const right = t.multiply(ctx, common, t.make(ctx, [c([3], [2, 1]), c([1])]));
    const result = extendedGcd(ctx, t, left, right);
    expect(t.equal(ctx, result.gcd, common)).toBe(true);
    verifyBezout(ctx, t, left, right, result);
    expect(() => verifyBezout(ctx, t, left, right, { ...result, s: t.zero(ctx) })).toThrow('verification-failed');
    expect(t.isZero(ctx, polynomialDivide(ctx, t, left, result.gcd).remainder)).toBe(true);
    expect(t.equal(ctx, extendedGcd(ctx, t, right, left).gcd, result.gcd)).toBe(true);
  });
  it('handles zero, constant, nonmonic and abnormal-degree inputs in differential wrappers', () => {
    const { ctx, f, x } = setup(), t = new PolynomialRing<DifferentialElement>(f, 't');
    const one = f.fromInteger(ctx, 1n), two = f.fromInteger(ctx, 2n), zero = t.zero(ctx);
    const a = t.make(ctx, [x, one, one, one]), b = t.make(ctx, [two]);
    expect(t.equal(ctx, extendedGcd(ctx, t, a, b).gcd, t.one(ctx))).toBe(true);
    expect(t.equal(ctx, extendedGcd(ctx, t, a, zero).gcd, a)).toBe(true);
    expect(t.equal(ctx, extendedGcd(ctx, t, zero, a).gcd, a)).toBe(true);
    expect(t.isZero(ctx, extendedGcd(ctx, t, zero, zero).gcd)).toBe(true);
    const sameName = new PolynomialRing<DifferentialElement>(f, 't');
    expect(() => extendedGcd(ctx, t, a, sameName.one(ctx))).toThrow('domain-mismatch');
    const limited = new ExecutionContext({ ...ctx.limits, work: 1 });
    expect(() => extendedGcd(limited, t, a, b)).toThrow('resource-limit');
    expect(() => extendedGcd(limited, t, zero, zero)).toThrow('resource-limit');
  });
  it('does not route custom coefficient fields through the native bridge', () => {
    const custom = { ...rationalField, identity: Symbol('custom') };
    const r = new PolynomialRing(custom, 'x'), f = new RationalFunctionField(r);
    expect(fractionCoefficient(custom)).toBeUndefined();
    expect(fractionCoefficient(f)).toBeUndefined();
  });
  it('rechecks stricter bit, allocation and degree limits after successful native arithmetic', () => {
    const { ctx, f, p } = setup(), t = new PolynomialRing<DifferentialElement>(f, 't');
    const a = t.make(ctx, [p([2n ** 70n]), p([1])]), b = t.make(ctx, [p([1]), p([1])]);
    const proof = extendedGcd(ctx, t, a, b);
    for (const change of [{ integerBits: 32 }, { allocation: 0 }, { degree: 0 }]) {
      const strict = new ExecutionContext({ ...ctx.limits, ...change });
      expect(() => verifyBezout(strict, t, a, b, proof)).toThrow('resource-limit');
      expect(() => extendedGcd(strict, t, a, b)).toThrow('resource-limit');
    }
    verifyBezout(new ExecutionContext(ctx.limits), t, a, b, proof);
    const forged = { ...a, coefficients: [...a.coefficients] };
    expect(() => extendedGcd(ctx, t, forged, b)).toThrow('domain-mismatch');
  });
  it('preserves exact values through a second nested fraction field', () => {
    const { ctx } = setup(), x = new PolynomialRing(rationalField, 'x'), k = new RationalFunctionField(x);
    const t = new PolynomialRing<RationalFunction<Rational>>(k, 't'), l = new RationalFunctionField(t), z = new PolynomialRing<RationalFunction<RationalFunction<Rational>>>(l, 'z');
    const xv = k.make(ctx, x.make(ctx, [rational(ctx, 0), rational(ctx, 1)]), x.one(ctx));
    const tv = l.make(ctx, t.make(ctx, [xv, k.fromInteger(ctx, 1n)]), t.make(ctx, [k.fromInteger(ctx, 1n), xv]));
    const common = z.make(ctx, [tv, l.fromInteger(ctx, 1n)]);
    const a = z.multiply(ctx, common, z.make(ctx, [l.fromInteger(ctx, 2n), l.fromInteger(ctx, 1n)]));
    const b = z.multiply(ctx, common, z.make(ctx, [l.fromInteger(ctx, 3n), l.fromInteger(ctx, 1n)]));
    expect(z.equal(ctx, extendedGcd(ctx, z, a, b).gcd, common)).toBe(true);
  });
  it('agrees with ordinary field Euclid on seeded coefficients and checks a forged conversion', () => {
    const { ctx, f, p } = setup();
    const generic = { capability: 'field' as const, characteristic: 0 as const, identity: Symbol('oracle'),
      assert: f.assert.bind(f), fromInteger: f.fromInteger.bind(f), add: f.add.bind(f), subtract: f.subtract.bind(f),
      negate: f.negate.bind(f), multiply: f.multiply.bind(f), exactDivide: f.exactDivide.bind(f),
      inverse: f.inverse.bind(f), equal: f.equal.bind(f), isZero: f.isZero.bind(f) };
    const fast = new PolynomialRing<DifferentialElement>(f, 't'), slow = new PolynomialRing(generic, 't');
    let seed = 783;
    for (let i = 0; i < 5; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const common = fast.make(ctx, [p([seed % 5, 1]), p([1])]);
      const a = fast.multiply(ctx, common, fast.make(ctx, [p([i + 1], [1, 1]), p([1]), p([2])]));
      const b = fast.multiply(ctx, common, fast.make(ctx, [p([i + 2], [2, 1]), p([1])]));
      const expected = extendedGcd(ctx, slow, slow.make(ctx, a.coefficients), slow.make(ctx, b.coefficients));
      const actual = extendedGcd(ctx, fast, a, b);
      expect(fast.equal(ctx, actual.gcd, fast.make(ctx, expected.gcd.coefficients))).toBe(true);
      expect(Object.isFrozen(a.coefficients)).toBe(true);
    }
    const a = fast.make(ctx, [p([1]), p([1])]), b = fast.make(ctx, [p([2]), p([1])]);
    const adapter = fractionCoefficient(f)!;
    expect(() => primitiveExtendedGcd(ctx, fast, { ...adapter, make: c => f.fromInteger(c, 0n) }, a, b)).toThrow('verification-failed');
  });
  it.each([
    { name: 'shifted', ns: [1, 1], ds: [1], rp: [1], rpd: [1] },
    { name: 'quadratic', ns: [0, 0, 1], ds: [1], rp: [0, 2], rpd: [1] },
    { name: 'inverse', ns: [1], ds: [0, 1], rp: [-1], rpd: [0, 0, 1] },
  ])('completes both input paths and the full $name stress decision within unchanged limits', spec => {
    const s = exponentialSetup(spec.ns, spec.ds), fresh = () => new ExecutionContext(s.ctx.limits);
    const rp = s.p(spec.rp, spec.rpd), input = nestedStress(fresh(), s, rp, false), ordinary = nestedStress(fresh(), s, rp, true);
    expect(s.F.equal(fresh(), input, ordinary)).toBe(true);
    const result = integrateExponentialRational(fresh(), s.F, input, bounds);
    expect(result.kind).toBe('elementary'); verifyExponentialRationalDecision(fresh(), s.F, input, result, bounds);
    const wire = encodeExponentialRationalDecision(fresh(), s.F, input, result, bounds);
    const replay = decodeExponentialRationalDecision(fresh(), s.F, input, JSON.parse(JSON.stringify(wire)), bounds);
    verifyExponentialRationalDecision(fresh(), s.F, input, replay, bounds);
  }, 120_000);
});
