import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {ExecutionContext} from './execution';
import {rationalField as Q} from './field';
import {rational} from './rational';
import {PolynomialRing} from './polynomial';
import {constructAlgebraicExtension} from './algebraic-field';
import {constructCantorDomain, constructMumfordPair, addMumfordPairs, verifyMumfordAddition, verifyMumfordPair,
  multiplyMumfordPair, verifyMumfordMultiple, equalMumfordPairs} from './hyperelliptic-cantor';
import {constructCantorPair, reduceCantorPair, verifyCantorReduction} from './cantor-arithmetic';
import {cantorPolynomialArithmetic} from './hyperelliptic-cantor';
import * as gcd from './polynomial-division';
import * as producer from './hyperelliptic-cantor';

function rationalModel(h: readonly bigint[]) {
  const ctx = fresh(), r = new PolynomialRing(Q, 'X'), p = (c: readonly bigint[]) => r.make(ctx, c.map(n => rational(ctx, n)));
  const domain = constructCantorDomain(ctx, r, p(h), bounds);
  const point = (x: bigint, y: bigint) => constructMumfordPair(ctx, domain, p([-x, 1n]), p([y]), bounds);
  return {ctx, r, p, domain, point};
}
describe('checked Cantor arithmetic over actual rational/number-field constants', () => {
  it('matches independent elliptic doubles, orders and signed multiples', () => {
    const b = rationalModel([1n, 0n, 0n, 1n]), p = b.point(0n, 1n), double = addMumfordPairs(fresh(), b.domain, p, p, bounds);
    expect(b.r.equal(b.ctx, double.result.u, b.p([0n, 1n]))).toBe(true); expect(b.r.equal(b.ctx, double.result.v, b.p([-1n]))).toBe(true);
    const triple = multiplyMumfordPair(fresh(), b.domain, p, 3n, bounds), negative = multiplyMumfordPair(fresh(), b.domain, p, -1n, bounds);
    expect(b.r.degree(b.ctx, triple.result.u)).toBe(0); expect(equalMumfordPairs(b.ctx, b.domain, negative.result, double.result)).toBe(true);
    const branch = b.point(-1n, 0n); expect(b.r.degree(b.ctx, addMumfordPairs(fresh(), b.domain, branch, branch, bounds).result.u)).toBe(0);
  });
  it('checks the sourced genus-two nonrational reduced divisor with full norm coverage', () => {
    const b = rationalModel([1n, 40n, 10n, -8n, 2n, 1n]), input = constructCantorPair(b.ctx, cantorPolynomialArithmetic(b.r), b.domain.polynomial, b.p([0n, 8n, 6n, 1n]), b.p([1n, -4n, -1n]));
    const proof = reduceCantorPair(b.ctx, cantorPolynomialArithmetic(b.r), b.domain.polynomial, 2, input);
    expect(b.r.equal(b.ctx, proof.result.u, b.p([6n, -5n, 1n]))).toBe(true);
    expect(b.r.equal(b.ctx, proof.result.v, b.p([-7n, 9n]))).toBe(true);
    verifyCantorReduction(fresh(), cantorPolynomialArithmetic(b.r), b.domain.polynomial, 2, input, proof);
  });
  it('supports exact number-field coefficients, conjugates and the neutral class', () => {
    const ctx = fresh(), ar = new PolynomialRing(Q, 'a'), c = constructAlgebraicExtension(ctx, ar, ar.make(ctx, [-2n, 0n, 1n].map(n => rational(ctx, n))), bounds);
    const r = new PolynomialRing<ReturnType<typeof c.generator>>(c, 'X'), alpha = c.generator(ctx), h = r.make(ctx, [c.fromInteger(ctx, 2n), c.fromInteger(ctx, 1n), c.fromInteger(ctx, 0n), c.fromInteger(ctx, 1n)]), domain = constructCantorDomain(ctx, r, h, bounds);
    const p = constructMumfordPair(ctx, domain, r.make(ctx, [c.fromInteger(ctx, 0n), c.fromInteger(ctx, 1n)]), r.constant(ctx, alpha), bounds);
    const negative = multiplyMumfordPair(fresh(), domain, p, -1n, bounds), sum = addMumfordPairs(fresh(), domain, p, negative.result, bounds);
    expect(r.degree(ctx, sum.result.u)).toBe(0); verifyMumfordAddition(fresh(), domain, p, negative.result, sum, bounds);
  });
  it('streams a norm whose virtual degree exceeds the actual polynomial profile', () => {
    const b = rationalModel([1n, 0n, 0n, 0n, 0n, 2n, 0n, 1n]), r = b.r, v = b.p([1n, 0n, 0n, 0n, 0n, 1n]), u = b.p([0n, 0n, 0n, 0n, 0n, 0n, 1n]);
    const limited = new ExecutionContext({...fresh().limits, degree: 7}), pair = constructMumfordPair(limited, b.domain, u, v, bounds);
    expect(r.degree(b.ctx, pair.normQuotient)).toBe(4); verifyMumfordPair(new ExecutionContext({...fresh().limits, degree: 7}), b.domain, pair, bounds);
    // The composition creates degree six, then verifies v^2 of virtual degree
    // ten without instantiating it; no artificial degree budget is introduced.
    const h = [1n, 0n, 0n, 0n, 0n, 0n, 0n, 1n], higher = rationalModel(h), a = higher.point(0n, 1n);
    const m = multiplyMumfordPair(new ExecutionContext({...fresh().limits, degree: 7}), higher.domain, a, 5n, bounds);
    verifyMumfordMultiple(new ExecutionContext({...fresh().limits, degree: 7}), higher.domain, a, 5n, m, bounds);
  });
  it('rejects altered GCDs, cancellations, norms, branch coverage and mappings without producers', () => {
    const b = rationalModel([1n, 0n, 0n, 1n]), p = b.point(0n, 1n), proof = addMumfordPairs(fresh(), b.domain, p, p, bounds);
    const multiple = multiplyMumfordPair(fresh(), b.domain, p, -5n, bounds);
    const spies = [vi.spyOn(gcd, 'extendedGcd'), vi.spyOn(producer, 'constructCantorDomain'), vi.spyOn(producer, 'constructMumfordPairWithin'),
      vi.spyOn(producer, 'addMumfordPairsWithin'), vi.spyOn(producer, 'multiplyMumfordPairWithin')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {verifyMumfordAddition(fresh(), b.domain, p, p, proof, bounds); verifyMumfordMultiple(fresh(), b.domain, p, -5n, multiple, bounds);} finally {for (const spy of spies) spy.mockRestore();}
    const changed = {...proof.composition, opposite: {...proof.composition.opposite, gcd: b.r.zero(b.ctx)}};
    for (const mutation of [{...proof, composition: changed}, {...proof, reductions: []}, {...proof, result: p},
      {...proof, composition: {...proof.composition, result: {...proof.composition.result, normQuotient: b.r.one(b.ctx)}}}])
      expect(() => verifyMumfordAddition(fresh(), b.domain, p, p, mutation, bounds)).toThrow('verification-failed');
    for (const mutation of [{...multiple, steps: multiple.steps.slice(1)}, {...multiple, coefficient: 5n}, {...multiple, base: p}])
      expect(() => verifyMumfordMultiple(fresh(), b.domain, p, -5n, mutation, bounds)).toThrow('verification-failed');
  });
  it('preserves immutable ownership, fresh checks and sticky exhaustion', () => {
    const b = rationalModel([1n, 0n, 0n, 1n]), p = b.point(0n, 1n), ctx = fresh(); verifyMumfordPair(ctx, b.domain, p, bounds); const first = ctx.usage.work;
    verifyMumfordPair(ctx, b.domain, p, bounds); expect(ctx.usage.work).toBe(2 * first);
    const foreign = new PolynomialRing(Q, 'X'); expect(() => constructMumfordPair(fresh(), b.domain, foreign.one(b.ctx), foreign.zero(b.ctx), bounds)).toThrow('domain-mismatch');
    expect(() => constructMumfordPair(fresh(), {...b.domain}, p.u, p.v, bounds)).toThrow('domain-mismatch');
    expect(Object.isFrozen(p) && Object.isFrozen(p.u.coefficients)).toBe(true);
    const stopped = new ExecutionContext({...fresh().limits, work: 1}); expect(() => addMumfordPairs(stopped, b.domain, p, p, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
    const repeated = b.r.make(b.ctx, [rational(b.ctx, 0n), rational(b.ctx, 0n), rational(b.ctx, 0n), rational(b.ctx, 1n)]);
    expect(() => constructCantorDomain(fresh(), b.r, repeated, bounds)).toThrow('invalid-input');
  });
});
