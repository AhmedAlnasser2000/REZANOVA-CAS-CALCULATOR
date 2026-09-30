import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { bounds, setup } from './differential-test-support';
import { ExecutionContext, demand } from './execution';
import { DifferentialField as DF } from './differential-field';
import { OwnedValidation } from './owned-validation';
import { PolynomialRing } from './polynomial';
import { rational, type Rational } from './rational';
import { rationalField } from './field';
import { RationalFunctionField } from './rational-function';
import { exactDivide, polynomialGcd } from './polynomial-division';
import { context, poly, rationalRing } from './test-support';
import * as hyper from './hyperexponential-decision';
import * as admission from './differential-admission';
import * as derivative from './differential-derivative';
import * as rde from './rational-rde';
import { decodeHyperexponentialDecision, encodeHyperexponentialDecision } from './hyperexponential-wire';

describe('checked monomial fraction normalization', () => {
  it.each([
    [[0, 0, 6, 3], [0, 0, -3], [-2, -1], [1]],
    [[0, 6], [0, 0, 0, 3], [2], [0, 0, 1]],
    [[1, 0, 2], [0, -2], [-1, 0, -2], [0, 2]],
    [[], [0, 0, 3], [], [1]],
    [[2], [-2], [-1], [1]],
  ])('normalizes %j / %j exactly', (ns, ds, en, ed) => {
    const c = context(), ring = rationalRing(), f = new RationalFunctionField(ring);
    const n = poly(c, ring, ns), d = poly(c, ring, ds), value = f.make(c, n, d);
    expect(f.equal(c, value, f.make(c, poly(c, ring, en), poly(c, ring, ed)))).toBe(true);
    expect(ring.equal(c, ring.multiply(c, value.numerator, d), ring.multiply(c, n, value.denominator))).toBe(true);
    expect(ring.equal(c, polynomialGcd(c, ring, value.numerator, value.denominator), ring.one(c))).toBe(true);
    expect(n.coefficients.map(v => v.numerator)).toEqual(ns.map(BigInt));
    expect(Object.isFrozen(value)).toBe(true); expect(Object.isFrozen(value.numerator.coefficients)).toBe(true);
  });
  it('matches general Euclidean normalization and seeded addition/multiplication identities', () => {
    const c = context({ work: 20_000_000_000, allocation: 1_000_000_000_000 }), ring = rationalRing(), f = new RationalFunctionField(ring);
    let seed = 914;
    const next = () => { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed; };
    for (let i = 0; i < 20; i++) {
      const n = poly(c, ring, [next()%5-2,next()%5-2,next()%5+1]);
      const d = poly(c, ring, [...Array(next()%4+1).fill(0), next()%5+1]);
      const a = f.make(c, n, d), g = polynomialGcd(c, ring, n, d);
      const gn = exactDivide(c, ring, n, g), gd = exactDivide(c, ring, d, g), scale = rationalField.inverse(c, ring.leading(c, gd));
      expect(ring.equal(c, a.numerator, ring.scale(c, gn, scale))).toBe(true);
      expect(ring.equal(c, a.denominator, ring.scale(c, gd, scale))).toBe(true);
      const b = f.make(c, poly(c, ring, [next()%5+1, 1]), poly(c, ring, i%2 ? [0,0,1] : [1,1]));
      const sum = f.add(c, a, b), product = f.multiply(c, a, b);
      const common = ring.multiply(c, a.denominator, b.denominator);
      expect(ring.equal(c, ring.multiply(c, sum.numerator, common), ring.multiply(c, sum.denominator,
        ring.add(c, ring.multiply(c, a.numerator, b.denominator), ring.multiply(c, b.numerator, a.denominator))))).toBe(true);
      expect(ring.equal(c, ring.multiply(c, product.numerator, common),
        ring.multiply(c, product.denominator, ring.multiply(c, a.numerator, b.numerator)))).toBe(true);
    }
  });
  it('handles unequal powers, cancellation, zero divisors and incompatible rings', () => {
    const s = setup(), { ctx: c, f, p } = s;
    expect(f.equal(c, f.add(c, p([1],[0,1]), p([-1],[0,1])), p([]))).toBe(true);
    expect(f.equal(c, f.add(c, p([1],[0,1]), p([1],[0,0,1])), p([1,1],[0,0,1]))).toBe(true);
    expect(f.equal(c, f.multiply(c, p([0,0,1]), p([1],[0,0,1])), p([1]))).toBe(true);
    expect(() => f.inverse(c, p([]))).toThrow('division-by-zero');
    expect(() => f.multiply(c, p([1]), setup().x)).toThrow('domain-mismatch');
  });
  it('works over nested fields and verifies inverse-power derivatives independently', () => {
    const s = setup(), { ctx: c, f, p, x } = s;
    const built = admission.buildExponential(c, f, 't', [x], bounds);
    if (built.status !== 'supported') throw new Error('fixture');
    const t = built.field, zero = p([]), input = t.make(c, [x], [zero, zero, p([1])]);
    const expected = t.make(c, [p([1,-2])], [zero, zero, p([1])]);
    const proof = derivative.differentiate(c, t, input);
    expect(t.equal(c, proof.derivative, expected)).toBe(true);
    derivative.verifyDerivative(c, t, input, { input, derivative: expected });
    const nested = DF.formal(c, t, 'u', [t.fromInteger(c, 1n)], bounds);
    const a = nested.make(c, [input], [t.fromInteger(c, 0n), t.fromInteger(c, 1n)]);
    const da = nested.make(c, [t.negate(c, input), expected], [t.fromInteger(c, 0n), t.fromInteger(c, 0n), t.fromInteger(c, 1n)]);
    derivative.verifyDerivative(c, nested, a, { input: a, derivative: da });
    expect(() => derivative.verifyDerivative(c, nested, a, { input: a, derivative: nested.fromInteger(c, 0n) })).toThrow('verification-failed');
  });
  it('cancels before a product would exceed the degree budget', () => {
    const c = context({ degree: 4 }), ring = rationalRing(), f = new RationalFunctionField(ring);
    const p = (xs: number[]) => poly(c, ring, xs);
    // Build in a larger context because normalization's identity check itself
    // multiplies polynomials. The operation under test has the stricter profile.
    const setup = context(), n = p([1,0,0,0,1]), d = p([0,0,0,0,1]);
    const a = f.make(setup, d, ring.one(setup)), b = f.make(setup, n, d);
    const result = f.multiply(c, a, b);
    expect(ring.equal(c, result.numerator, n)).toBe(true);
    expect(ring.equal(c, result.denominator, ring.one(c))).toBe(true);
  });
});

describe('recursive owned validation lifetime', () => {
  it('reuses successful owned checks within a scope but rechecks fresh scopes and stricter limits', () => {
    const s = setup(), value = s.p([9007199254740993n, 0n, 1n], [0,1]);
    const usage: number[] = [];
    for (let i = 0; i < 2; i++) s.ctx.operation(() => {
      const start = s.ctx.usage.work; s.f.assert(s.ctx, value); usage.push(s.ctx.usage.work-start);
      const again = s.ctx.usage.work; s.f.assert(s.ctx, value); expect(s.ctx.usage.work-again).toBeLessThan(usage.at(-1)!);
    });
    expect(usage[0]).toBe(usage[1]);
    for (const limits of [{ integerBits: 32 }, { degree: 1 }]) {
      const c = new ExecutionContext({ ...s.ctx.limits, ...limits });
      expect(() => c.operation(() => s.f.assert(c, value))).toThrow('resource-limit');
    }
    expect(() => s.ctx.operation(() => s.f.assert(s.ctx, { ...value }))).toThrow('domain-mismatch');
  });
  it('keeps custom mutable coefficient domains uncached', () => {
    let valid = true;
    const domain = Object.freeze({ ...rationalField, identity: Symbol('custom'), assert(c: ExecutionContext, value: Rational) {
      demand(valid, 'invalid-input', 'changed coefficient state'); rationalField.assert(c, value);
    } });
    const c = context(), ring = new PolynomialRing(domain, 't'), p = ring.make(c, [rational(c, 1n)]);
    c.operation(() => { ring.assert(c, p); valid = false; expect(() => ring.assert(c, p)).toThrow('changed coefficient state'); });
  });
  it('evicts without imposing a mathematical cap and never retains failed checks', () => {
    const c = context(), cache = new OwnedValidation(), values = Array.from({ length: 4097 }, () => Object.freeze({}));
    let checks = 0;
    c.operation(() => {
      for (const value of values) cache.check(c, value, () => { checks++; });
      cache.check(c, values[0], () => { checks++; }); expect(checks).toBe(4098);
      const bad = Object.freeze({});
      expect(() => cache.check(c, bad, () => { throw new Error('bad'); })).toThrow('bad');
      cache.check(c, bad, () => { checks++; }); expect(checks).toBe(4099);
    });
    expect(c.operationToken).toBeUndefined();
  });
  it.each(['work','allocation'] as const)('rejects cached values after %s exhaustion', resource => {
    const s = setup(), c = new ExecutionContext(s.ctx.limits), value = s.p([1],[0,1]);
    expect(() => c.operation(() => {
      s.f.assert(c, value);
      if (resource === 'work') c.tick(c.limits.work-c.usage.work);
      else { c.allocate(c.limits.allocation-c.usage.allocation); expect(() => c.allocate(1)).toThrow('resource-limit'); }
      s.f.assert(c, value);
    })).toThrow('resource-limit');
    expect(c.operationToken).toBeUndefined();
  });
  it('bounds shifted scratch before allocation and exhausts final derivative checking', () => {
    const s = setup(), a = s.p([0,0,1]), b = s.p([1],[0,0,1]);
    const low = new ExecutionContext({ ...s.ctx.limits, degree: 2 });
    expect(() => s.f.add(low, a, b)).toThrow('resource-limit: degree');
    const proof = derivative.differentiate(s.ctx, s.f, b), measured = new ExecutionContext(s.ctx.limits);
    derivative.verifyDerivative(measured, s.f, b, proof);
    const stopped = new ExecutionContext({ ...s.ctx.limits, work: measured.usage.work-1 });
    expect(() => derivative.verifyDerivative(stopped, s.f, b, proof)).toThrow('resource-limit');
  });
});

describe('baseline hyperexponential artifacts', () => {
  it.each(['negative-alias', 'nonelementary'])('replays %s unchanged with producers disabled', name => {
    const wire = JSON.parse(readFileSync(new URL(`./__tests__/fixtures/hyperexponential-${name}-v1-b4517300.json`, import.meta.url), 'utf8'));
    const s = setup(), b = s.p([1]), r = s.p(name === 'negative-alias' ? [0,-1] : [0,0,1]);
    const forbidden = () => { throw new Error('producer invoked'); };
    const spies = [vi.spyOn(hyper,'integrateHyperexponential'), vi.spyOn(admission,'buildExponential'),
      vi.spyOn(derivative,'differentiate'), vi.spyOn(rde,'solveRationalRde')];
    for (const spy of spies) spy.mockImplementation(forbidden);
    try {
      const costs: number[] = [];
      for (let i = 0; i < 2; i++) {
        const before = s.ctx.usage.work, d = decodeHyperexponentialDecision(s.ctx, s.f, b, r, wire, bounds);
        costs.push(s.ctx.usage.work-before);
        expect(encodeHyperexponentialDecision(s.ctx, s.f, b, r, d, bounds)).toEqual(wire);
        expect(() => hyper.verifyHyperexponentialDecision(s.ctx, s.f, b, s.f.add(s.ctx, r, b), d)).toThrow('verification-failed');
      }
      expect(costs[0]).toBe(costs[1]);
    } finally { vi.restoreAllMocks(); }
  });
});
