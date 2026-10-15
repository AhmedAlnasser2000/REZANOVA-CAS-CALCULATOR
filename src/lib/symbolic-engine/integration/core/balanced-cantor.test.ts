import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {rationalField as Q} from './field';
import {rational, type Rational} from './rational';
import {PolynomialRing} from './polynomial';
import {ExecutionContext} from './execution';
import {constructAlgebraicExtension} from './algebraic-field';
import {cantorPolynomialArithmetic} from './hyperelliptic-cantor';
import {constructBalancedDomain, constructBalancedMumford, multiplyBalancedMumford, verifyBalancedMumfordMultiple,
  verifyBalancedMumfordNormalizationWithin, addBalancedMumfordWithin, verifyBalancedDomainWithin, type BalancedMumfordDivisor} from './hyperelliptic-balanced';
import {equalBalancedDivisors, neutralBalancedDivisor, balancedMultipleFunctions} from './balanced-cantor-arithmetic';
import * as arithmetic from './balanced-cantor-arithmetic';
import * as producer from './hyperelliptic-balanced';
import * as gcd from './polynomial-division';

function model(h: readonly bigint[]) {
  const ctx = fresh(), r = new PolynomialRing(Q, 'X'), p = (c: readonly bigint[]) => r.make(ctx, c.map(n => rational(ctx, n)));
  const domain = constructBalancedDomain(ctx, r, p(h), rational(ctx, 1n), bounds), a = cantorPolynomialArithmetic(r);
  const divisor = (u: readonly bigint[], v: readonly bigint[], n: bigint) => constructBalancedMumford(fresh(), domain, p(u), p(v), n, bounds).result;
  const equal = (x: BalancedMumfordDivisor<Rational>, y: BalancedMumfordDivisor<Rational>) => equalBalancedDivisors(ctx, a, x, y);
  return {ctx, r, p, domain, a, divisor, equal, neutral: neutralBalancedDivisor(ctx, a, domain)};
}
describe('split even-degree balanced Cantor arithmetic', () => {
  it('distinguishes both infinite places and checks independent quartic order-two classes', () => {
    const b = model([1n, 0n, 0n, 0n, 1n]), delta = b.divisor([1n], [], 0n), point = b.divisor([0n, 1n], [1n], 0n);
    expect(b.equal(delta, b.neutral)).toBe(false); expect(b.equal(point, delta)).toBe(false);
    expect(b.equal(multiplyBalancedMumford(fresh(), b.domain, delta, 2n, bounds).result, b.neutral)).toBe(true);
    expect(b.equal(multiplyBalancedMumford(fresh(), b.domain, point, 2n, bounds).result, b.neutral)).toBe(true);
    // div(y-x^2)=2(infinity+ - infinity-), div(y+x^2-1)=2(P-infinity+).
    expect(b.equal(addBalancedMumfordWithin(b.ctx, b.domain, point, b.neutral, bounds).result, point)).toBe(true);
  });
  it('checks the complete order-29 infinity class without a trial-order search', () => {
    const b = model([0n, -16n, 33n, -12n, 6n, 4n, 1n]), delta = b.divisor([1n], [], 2n);
    expect(b.equal(delta, b.neutral)).toBe(false);
    const full = multiplyBalancedMumford(fresh(), b.domain, delta, 29n, bounds);
    expect(b.equal(full.result, b.neutral)).toBe(true);
    for (const n of [1n, 2n, 7n, -1n]) expect(b.equal(multiplyBalancedMumford(fresh(), b.domain, delta, n, bounds).result, b.neutral)).toBe(false);
    verifyBalancedMumfordMultiple(fresh(), b.domain, delta, 29n, full, bounds);
    expect(balancedMultipleFunctions(b.ctx, full).every(f => Object.isFrozen(f) && f.exponent !== 0n)).toBe(true);
  });
  it('retains ordinary and infinity flips and verifies signed families in both genus parities', () => {
    for (const h of [[1n, 0n, 0n, 0n, 0n, 0n, 1n], [1n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 1n]]) {
      const b = model(h), p = b.divisor([0n, 1n], [1n], 0n), left = multiplyBalancedMumford(fresh(), b.domain, p, 7n, bounds), right = multiplyBalancedMumford(fresh(), b.domain, p, -7n, bounds);
      expect(b.equal(addBalancedMumfordWithin(b.ctx, b.domain, left.result, right.result, bounds).result, b.neutral)).toBe(true);
      const four = multiplyBalancedMumford(fresh(), b.domain, p, 4n, bounds), three = multiplyBalancedMumford(fresh(), b.domain, p, 3n, bounds);
      expect(b.equal(addBalancedMumfordWithin(b.ctx, b.domain, four.result, three.result, bounds).result, left.result)).toBe(true);
      const flips = left.steps.flatMap(s => [s.double, ...(s.add ? [s.add] : [])]).flatMap(s => [...s.normalization.ordinary, ...s.normalization.infinity]);
      expect(flips.length).toBeGreaterThan(0);
    }
  });
  it('supports nonmonic split leading coefficients and exact number-field constants', () => {
    const ctx = fresh(), ar = new PolynomialRing(Q, 'a'), c = constructAlgebraicExtension(ctx, ar, ar.make(ctx, [-2n, 0n, 1n].map(n => rational(ctx, n))), bounds);
    const zero = c.fromInteger(ctx, 0n), one = c.fromInteger(ctx, 1n), r = new PolynomialRing(c, 'X'), h = r.make(ctx, [c.fromInteger(ctx, 2n), zero, zero, zero, c.fromInteger(ctx, 2n)]);
    const domain = constructBalancedDomain(ctx, r, h, c.generator(ctx), bounds), p = constructBalancedMumford(ctx, domain, r.make(ctx, [zero, one]), r.constant(ctx, c.generator(ctx)), 0n, bounds).result;
    const twice = multiplyBalancedMumford(fresh(), domain, p, 2n, bounds);
    expect(equalBalancedDivisors(ctx, cantorPolynomialArithmetic(r), twice.result, neutralBalancedDivisor(ctx, cantorPolynomialArithmetic(r), domain))).toBe(true);
    expect(() => constructBalancedDomain(fresh(), r, h, one, bounds)).toThrow('invalid-input');
  });
  it('checks complete norm cancellation against actual degree limits', () => {
    const b = model([1n, 0n, 0n, 0n, 0n, 0n, 1n]), limited = new ExecutionContext({...fresh().limits, degree: 6});
    const proof = constructBalancedMumford(limited, b.domain, b.p([1n]), b.p([]), 8n, bounds);
    expect(proof.infinity.length).toBeGreaterThan(0);
    expect(proof.infinity.every(s => b.r.degree(b.ctx, s.normQuotient) <= 2)).toBe(true);
    verifyBalancedMumfordNormalizationWithin(new ExecutionContext({...fresh().limits, degree: 6}), b.domain, b.p([1n]), b.p([]), 8n, proof, bounds);
  });
  it('rejects changed weights, missing flips, signed coverage and producers during verification', () => {
    const b = model([0n, -16n, 33n, -12n, 6n, 4n, 1n]), delta = b.divisor([1n], [], 2n), proof = multiplyBalancedMumford(fresh(), b.domain, delta, -29n, bounds);
    const spies = [vi.spyOn(gcd, 'extendedGcd'), vi.spyOn(producer, 'constructBalancedDomain'), vi.spyOn(producer, 'multiplyBalancedMumfordWithin'),
      vi.spyOn(arithmetic, 'normalizeBalancedDivisor'), vi.spyOn(arithmetic, 'addBalancedDivisors'), vi.spyOn(arithmetic, 'inverseBalancedDivisor')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {verifyBalancedMumfordMultiple(fresh(), b.domain, delta, -29n, proof, bounds);} finally {for (const spy of spies) spy.mockRestore();}
    for (const mutation of [{...proof, coefficient: 29n}, {...proof, steps: proof.steps.slice(1)}, {...proof, inverse: null}, {...proof, result: delta}])
      expect(() => verifyBalancedMumfordMultiple(fresh(), b.domain, delta, -29n, mutation, bounds)).toThrow('verification-failed');
    const normalized = constructBalancedMumford(fresh(), b.domain, b.p([1n]), b.p([]), 3n, bounds);
    for (const mutation of [{...normalized, infinity: []}, {...normalized, result: {...normalized.result, n: 1n}},
      {...normalized, infinity: [{...normalized.infinity[0], plus: normalized.infinity[0].plus + 1n}]}])
      expect(() => verifyBalancedMumfordNormalizationWithin(fresh(), b.domain, b.p([1n]), b.p([]), 3n, mutation, bounds)).toThrow('verification-failed');
  });
  it('keeps ownership, immutability, fresh scopes and exhaustion distinct', () => {
    const b = model([1n, 0n, 0n, 0n, 1n]), p = b.divisor([1n], [], 0n), proof = multiplyBalancedMumford(fresh(), b.domain, p, 3n, bounds), ctx = fresh();
    verifyBalancedMumfordMultiple(ctx, b.domain, p, 3n, proof, bounds); const work = ctx.usage.work;
    verifyBalancedMumfordMultiple(ctx, b.domain, p, 3n, proof, bounds); expect(ctx.usage.work).toBe(work * 2);
    expect(Object.isFrozen(proof) && Object.isFrozen(proof.steps) && Object.isFrozen(proof.result)).toBe(true);
    expect(() => verifyBalancedDomainWithin(fresh(), {...b.domain}, bounds)).toThrow('domain-mismatch');
    const foreign = new PolynomialRing(Q, 'X'); expect(() => constructBalancedMumford(fresh(), b.domain, foreign.one(b.ctx), b.p([]), 0n, bounds)).toThrow('domain-mismatch');
    expect(() => constructBalancedDomain(fresh(), b.r, b.p([0n, 0n, 0n, 0n, 1n]), rational(b.ctx, 1n), bounds)).toThrow('invalid-input');
    const stopped = new ExecutionContext({...fresh().limits, work: 1}); expect(() => multiplyBalancedMumford(stopped, b.domain, p, 29n, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
  });
});
