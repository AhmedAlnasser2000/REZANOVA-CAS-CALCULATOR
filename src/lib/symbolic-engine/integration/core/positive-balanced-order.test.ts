import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {ExecutionContext} from './execution';
import {PositivePrimeField} from './positive-field';
import {PositivePolynomialRing} from './positive-polynomial';
import {PositiveFiniteExtension, finiteIrreducibility} from './positive-extension';
import {constructPositiveBalancedDomain, constructPositiveBalancedDivisor} from './positive-balanced-cantor';
import {decidePositiveBalancedOrder, verifyPositiveBalancedOrder} from './positive-balanced-order';
import {encodePositiveBalancedOrder, decodePositiveBalancedOrder} from './positive-balanced-order-wire';
import * as order from './positive-balanced-order';
import * as search from './finite-class-order-search';
import * as arithmetic from './balanced-cantor-arithmetic';
import * as group from './positive-balanced-cantor';
import * as polynomial from './positive-polynomial';
import * as integer from './reduced-divisor-order';
import * as extension from './positive-extension';

function prepared(prime = 7n) {
  const ctx = fresh(), field = new PositivePrimeField(ctx, prime), r = new PositivePolynomialRing(field, 'X'), p = (values: readonly bigint[]) => r.make(ctx, values.map(n => field.fromInteger(ctx, n)));
  const domain = constructPositiveBalancedDomain(ctx, field, r, p([0n, -16n, 33n, -12n, 6n, 4n, 1n]), field.fromInteger(ctx, 1n), bounds), input = constructPositiveBalancedDivisor(ctx, domain, r.one(ctx), r.zero(ctx), 2n, bounds);
  return {ctx, field, r, domain, input};
}
describe('complete finite balanced least-order decisions', () => {
  it.each([7n, 11n])('proves order 29 in characteristic %s without stored BSGS history', prime => {
    const b = prepared(prime), proof = decidePositiveBalancedOrder(fresh(), b.domain, b.input, bounds); expect(proof.order).toBe(29n);
    expect(proof.factors.map(f => f.prime)).toEqual([29n]); expect(proof.exclusions).toHaveLength(1);
    const data = JSON.parse(JSON.stringify(encodePositiveBalancedOrder(fresh(), b.domain, b.input, proof, bounds)));
    const spies = [vi.spyOn(order, 'decidePositiveBalancedOrderWithin'), vi.spyOn(search, 'findFiniteClassOrderMultiple'), vi.spyOn(arithmetic, 'normalizeBalancedDivisor'), vi.spyOn(arithmetic, 'addBalancedDivisors'),
      vi.spyOn(arithmetic, 'multiplyBalancedDivisor'), vi.spyOn(group, 'constructPositiveBalancedDomain'), vi.spyOn(polynomial, 'positiveBezout'), vi.spyOn(integer, 'factorPositiveInteger'), vi.spyOn(extension, 'finiteIrreducibility')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {verifyPositiveBalancedOrder(fresh(), b.domain, b.input, proof, bounds); expect(decodePositiveBalancedOrder(fresh(), b.domain, b.input, data, bounds).order).toBe(29n);} finally {for (const spy of spies) spy.mockRestore();}
  });
  it('agrees with an independently counted genus-one group and retains distinct infinities', () => {
    const ctx = fresh(), field = new PositivePrimeField(ctx, 5n), r = new PositivePolynomialRing(field, 'X'), h = r.make(ctx, [1n, 0n, 0n, 0n, 1n].map(n => field.fromInteger(ctx, n))), domain = constructPositiveBalancedDomain(ctx, field, r, h, field.fromInteger(ctx, 1n), bounds);
    let points = 2; for (let x = 0n; x < 5n; x++) for (let y = 0n; y < 5n; y++) if ((y * y - x ** 4n - 1n) % 5n === 0n) points++;
    expect(points).toBe(4);
    const zero = constructPositiveBalancedDivisor(ctx, domain, r.one(ctx), r.zero(ctx), 1n, bounds), infinity = constructPositiveBalancedDivisor(ctx, domain, r.one(ctx), r.zero(ctx), 0n, bounds), finite = constructPositiveBalancedDivisor(ctx, domain, r.x(ctx), r.one(ctx), 0n, bounds);
    expect(decidePositiveBalancedOrder(fresh(), domain, zero, bounds).order).toBe(1n);
    expect(decidePositiveBalancedOrder(fresh(), domain, infinity, bounds).order).toBe(2n);
    expect(decidePositiveBalancedOrder(fresh(), domain, finite, bounds).order).toBe(2n);
  });
  it('supports extension finite fields and complete squarefree split hypotheses', () => {
    const ctx = fresh(), prime = new PositivePrimeField(ctx, 3n), ar = new PositivePolynomialRing(prime, 'a'), modulus = ar.make(ctx, [1n, 0n, 1n].map(n => prime.fromInteger(ctx, n)));
    const field = new PositiveFiniteExtension(ctx, prime, ar, modulus, finiteIrreducibility(ctx, ar, modulus, prime.size)), r = new PositivePolynomialRing(field, 'X'), h = r.make(ctx, [2n, 0n, 0n, 0n, 2n].map(n => field.fromInteger(ctx, n)));
    const domain = constructPositiveBalancedDomain(ctx, field, r, h, field.generator(ctx), bounds), input = constructPositiveBalancedDivisor(ctx, domain, r.x(ctx), r.constant(ctx, field.generator(ctx)), 0n, bounds), proof = decidePositiveBalancedOrder(fresh(), domain, input, bounds);
    expect(proof.order).toBe(2n); expect(decodePositiveBalancedOrder(fresh(), domain, input, encodePositiveBalancedOrder(fresh(), domain, input, proof, bounds), bounds).order).toBe(2n);
  });
  it('rejects altered annihilators, all prime coverage, factors and bounds', () => {
    const b = prepared(), proof = decidePositiveBalancedOrder(fresh(), b.domain, b.input, bounds);
    for (const changed of [{...proof, order: 58n}, {...proof, exclusions: []}, {...proof, factors: []}, {...proof, functions: []},
      {...proof, bound: {...proof.bound, upper: 1n}}, {...proof, exclusions: [{prime: 29n, multiple: proof.multiple}]}])
      expect(() => verifyPositiveBalancedOrder(fresh(), b.domain, b.input, changed, bounds)).toThrow('verification-failed');
    const zero = constructPositiveBalancedDivisor(b.ctx, b.domain, b.r.one(b.ctx), b.r.zero(b.ctx), 1n, bounds), data = encodePositiveBalancedOrder(fresh(), b.domain, b.input, proof, bounds);
    expect(() => decodePositiveBalancedOrder(fresh(), b.domain, zero, data, bounds)).toThrow('verification-failed');
    expect(() => decidePositiveBalancedOrder(fresh(), {...b.domain}, b.input, bounds)).toThrow('domain-mismatch');
  });
  it('starts fresh proof state and preserves strict whole-artifact limits and sticky search exhaustion', () => {
    const b = prepared(), proof = decidePositiveBalancedOrder(fresh(), b.domain, b.input, bounds), data = encodePositiveBalancedOrder(fresh(), b.domain, b.input, proof, bounds), ctx = fresh();
    decodePositiveBalancedOrder(ctx, b.domain, b.input, data, bounds); const first = ctx.usage.work; decodePositiveBalancedOrder(ctx, b.domain, b.input, data, bounds); expect(ctx.usage.work).toBe(first * 2);
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodePositiveBalancedOrder(fresh(), b.domain, b.input, data, {...bounds, ...patch})).toThrow('resource-limit');
    const solved = fresh(); decidePositiveBalancedOrder(solved, b.domain, b.input, bounds); const stopped = new ExecutionContext({...fresh().limits, work: solved.usage.work - 1});
    expect(() => decidePositiveBalancedOrder(stopped, b.domain, b.input, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
    expect(Object.isFrozen(proof.functions) && Object.isFrozen(proof.exclusions)).toBe(true);
  });
});
