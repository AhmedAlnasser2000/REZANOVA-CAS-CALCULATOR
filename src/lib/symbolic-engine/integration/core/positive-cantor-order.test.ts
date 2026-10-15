import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {ExecutionContext} from './execution';
import {PositivePrimeField} from './positive-field';
import {PositivePolynomialRing} from './positive-polynomial';
import {PositiveFiniteExtension, finiteIrreducibility} from './positive-extension';
import {constructPositiveCantorDomain, constructPositiveMumfordPair, multiplyPositiveMumfordPair} from './positive-cantor';
import {decidePositiveCantorOrder, verifyPositiveCantorOrder} from './positive-cantor-order';
import {encodePositiveCantorOrder, decodePositiveCantorOrder} from './positive-cantor-order-wire';
import {cantorMultipleFunctions} from './cantor-arithmetic';
import {factorPositiveInteger} from './reduced-divisor-order';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import * as group from './positive-cantor';
import * as order from './positive-cantor-order';
import * as arithmetic from './cantor-arithmetic';
import * as polynomial from './positive-polynomial';
import * as extension from './positive-extension';
import * as factor from './positive-factorization';
import * as integers from './reduced-divisor-order';

function elliptic() {
  const ctx = fresh(), field = new PositivePrimeField(ctx, 5n), r = new PositivePolynomialRing(field, 'x'), p = (v: readonly bigint[]) => r.make(ctx, v.map(n => field.fromInteger(ctx, n))), domain = constructPositiveCantorDomain(ctx, field, r, p([1n, 0n, 0n, 1n]), bounds);
  const point = constructPositiveMumfordPair(ctx, domain, p([0n, 1n]), p([1n]), bounds), branch = constructPositiveMumfordPair(ctx, domain, p([1n, 1n]), r.zero(ctx), bounds), zero = constructPositiveMumfordPair(ctx, domain, r.one(ctx), r.zero(ctx), bounds);
  return {ctx, field, r, domain, point, branch, zero};
}
describe('complete finite Cantor class orders', () => {
  it('proves exact orders one, two and three with principal function and every prime exclusion', () => {
    const b = elliptic();
    for (const [input, expected] of [[b.zero, 1n], [b.branch, 2n], [b.point, 3n]] as const) {
      const proof = decidePositiveCantorOrder(fresh(), b.domain, input, bounds); expect(proof.order).toBe(expected); verifyPositiveCantorOrder(fresh(), b.domain, input, proof, bounds);
      expect(proof.exclusions).toHaveLength(expected === 1n ? 0 : 1); expect(b.r.degree(b.ctx, proof.multiple.result.u)).toBe(0);
      expect(Object.isFrozen(proof.functions)).toBe(true);
    }
  });
  it('agrees with independent genus-two point counts giving a prime Jacobian order seventeen', () => {
    const ctx = fresh(), field = new PositivePrimeField(ctx, 3n), r = new PositivePolynomialRing(field, 'x'), h = r.make(ctx, [1n, 0n, 0n, 0n, 2n, 1n].map(n => field.fromInteger(ctx, n))), domain = constructPositiveCantorDomain(ctx, field, r, h, bounds), point = constructPositiveMumfordPair(ctx, domain, r.x(ctx), r.one(ctx), bounds);
    // Independent F3/F9 enumeration uses only coefficient arithmetic, without
    // class addition, order search or Riemann--Roch.
    const a = new PositivePolynomialRing(field, 'a'), modulus = a.make(ctx, [1n, 0n, 1n].map(n => field.fromInteger(ctx, n))), f9 = new PositiveFiniteExtension(ctx, field, a, modulus, finiteIrreducibility(ctx, a, modulus, field.size));
    const add = (a: readonly number[], b: readonly number[]) => [(a[0] + b[0]) % 3, (a[1] + b[1]) % 3];
    const mul = (a: readonly number[], b: readonly number[]) => [(a[0] * b[0] + 2 * a[1] * b[1]) % 3, (a[0] * b[1] + a[1] * b[0]) % 3];
    const count = (extension: boolean) => {
      const values = extension ? Array.from({length: 9}, (_, i) => [i % 3, Math.floor(i / 3)]) : [[0, 0], [1, 0], [2, 0]]; let count = 1;
      for (const x of values) {let value = [0, 0]; for (const c of [1, 2, 0, 0, 0, 1]) value = add(mul(value, x), [c, 0]);
        for (const y of values) {const square = mul(y, y); if (square[0] === value[0] && square[1] === value[1]) count++;}}
      return count;
    };
    const n1 = count(false), n2 = count(true); expect(n1).toBe(5); expect(n2).toBe(15); expect(f9.size).toBe(9n);
    const s1 = 4 - n1, s2 = 10 - n2, cardinality = 1 - s1 + (s1 * s1 - s2) / 2 - 3 * s1 + 9;
    expect(cardinality).toBe(17); const proof = decidePositiveCantorOrder(fresh(), domain, point, bounds); expect(proof.order).toBe(17n); verifyPositiveCantorOrder(fresh(), domain, point, proof, bounds);
    const wire = encodePositiveCantorOrder(fresh(), domain, point, proof, bounds); expect(decodePositiveCantorOrder(fresh(), domain, point, wire, bounds).order).toBe(17n);
  });
  it('replays an exact prime-field order with search producers disabled', () => {
    const b = elliptic(), proof = decidePositiveCantorOrder(fresh(), b.domain, b.point, bounds), wire = JSON.parse(JSON.stringify(encodePositiveCantorOrder(fresh(), b.domain, b.point, proof, bounds)));
    const spies = [vi.spyOn(group, 'constructPositiveCantorDomain'), vi.spyOn(group, 'multiplyPositiveMumfordPairWithin'), vi.spyOn(group, 'addPositiveMumfordPairsWithin'),
      vi.spyOn(arithmetic, 'multiplyCantorPair'), vi.spyOn(arithmetic, 'addCantorPairs'), vi.spyOn(arithmetic, 'constructCantorPair'), vi.spyOn(polynomial, 'positiveBezout'),
      vi.spyOn(order, 'decidePositiveCantorOrderWithin'), vi.spyOn(extension, 'finiteIrreducibility'), vi.spyOn(factor, 'factorPositivePolynomial'), vi.spyOn(integers, 'factorPositiveInteger')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {verifyPositiveCantorOrder(fresh(), b.domain, b.point, proof, bounds); expect(decodePositiveCantorOrder(fresh(), b.domain, b.point, wire, bounds).order).toBe(3n);}
    finally {for (const spy of spies) spy.mockRestore();}
  });
  it('retains the full extension-field construction in order-four replay', () => {
    const ctx = fresh(), prime = new PositivePrimeField(ctx, 3n), a = new PositivePolynomialRing(prime, 'a'), modulus = a.make(ctx, [1n, 0n, 1n].map(n => prime.fromInteger(ctx, n))),
      field = new PositiveFiniteExtension(ctx, prime, a, modulus, finiteIrreducibility(ctx, a, modulus, prime.size)), r = new PositivePolynomialRing(field, 'x'),
      h = r.make(ctx, [2n, 1n, 0n, 1n].map(n => field.fromInteger(ctx, n))), domain = constructPositiveCantorDomain(ctx, field, r, h, bounds), point = constructPositiveMumfordPair(ctx, domain, r.x(ctx), r.constant(ctx, field.generator(ctx)), bounds);
    const proof = decidePositiveCantorOrder(fresh(), domain, point, bounds); expect(proof.order).toBe(4n); const wire = JSON.parse(JSON.stringify(encodePositiveCantorOrder(fresh(), domain, point, proof, bounds)));
    const spies = [vi.spyOn(extension, 'finiteIrreducibility'), vi.spyOn(order, 'decidePositiveCantorOrderWithin'), vi.spyOn(group, 'multiplyPositiveMumfordPairWithin'),
      vi.spyOn(arithmetic, 'multiplyCantorPair'), vi.spyOn(polynomial, 'positiveBezout'), vi.spyOn(integers, 'factorPositiveInteger')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {expect(decodePositiveCantorOrder(fresh(), domain, point, wire, bounds).order).toBe(4n);} finally {for (const spy of spies) spy.mockRestore();}
  });
  it('rejects an annihilating nonminimal order and incomplete bounds, functions and coverage', () => {
    const b = elliptic(), proof = decidePositiveCantorOrder(fresh(), b.domain, b.point, bounds), six = multiplyPositiveMumfordPair(fresh(), b.domain, b.point, 6n, bounds);
    const nonminimal = {...proof, order: 6n, multiple: six, functions: cantorMultipleFunctions(b.ctx, six), factors: factorPositiveInteger(b.ctx, 6n), exclusions: [
      {prime: 2n, multiple: multiplyPositiveMumfordPair(fresh(), b.domain, b.point, 3n, bounds)}, {prime: 3n, multiple: multiplyPositiveMumfordPair(fresh(), b.domain, b.point, 2n, bounds)}]};
    expect(() => verifyPositiveCantorOrder(fresh(), b.domain, b.point, nonminimal, bounds)).toThrow('verification-failed');
    for (const changed of [{...proof, exclusions: []}, {...proof, functions: []}, {...proof, factors: []}, {...proof, bound: {...proof.bound, upper: 2n}}, {...proof, input: b.branch}])
      expect(() => verifyPositiveCantorOrder(fresh(), b.domain, b.point, changed, bounds)).toThrow('verification-failed');
    const wire = encodePositiveCantorOrder(fresh(), b.domain, b.point, proof, bounds) as {tag: string; version: number; payload: unknown};
    for (const changed of [
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).exclusions = [];},
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).order = '6';},
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).verified = true;}
    ]) {const body = structuredClone(unpackAlgebraicArtifactData(fresh(), wire.payload, bounds)) as Record<string, unknown>; changed(body);
      expect(() => decodePositiveCantorOrder(fresh(), b.domain, b.point, {...wire, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();}
  });
  it('checks immutable owned requests and sticky fresh-scope limits', () => {
    const b = elliptic(), proof = decidePositiveCantorOrder(fresh(), b.domain, b.point, bounds), data = encodePositiveCantorOrder(fresh(), b.domain, b.point, proof, bounds), ctx = fresh();
    verifyPositiveCantorOrder(ctx, b.domain, b.point, proof, bounds); const first = ctx.usage.work;
    verifyPositiveCantorOrder(ctx, b.domain, b.point, proof, bounds); expect(ctx.usage.work).toBe(2 * first);
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodePositiveCantorOrder(fresh(), b.domain, b.point, data, {...bounds, ...patch})).toThrow('resource-limit');
    const stopped = new ExecutionContext({...fresh().limits, allocation: 1}); expect(() => decidePositiveCantorOrder(stopped, b.domain, b.point, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
    expect(() => verifyPositiveCantorOrder(fresh(), {...b.domain}, b.point, proof, bounds)).toThrow('domain-mismatch');
  });
});
