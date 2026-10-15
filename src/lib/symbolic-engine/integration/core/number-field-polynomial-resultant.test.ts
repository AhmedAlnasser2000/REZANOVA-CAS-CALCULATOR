import {afterEach, expect, it, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {rationalField as Q} from './field';
import {rational} from './rational';
import {PolynomialRing} from './polynomial';
import {PolynomialDomain} from './polynomial-domain';
import {constructAlgebraicExtension} from './algebraic-field';
import {ExecutionContext} from './execution';
import {produceNumberFieldPolynomialResultant as produce, verifyNumberFieldPolynomialResultant as verify} from './number-field-polynomial-resultant';
import {encodeNumberFieldPolynomialResultant as encode, decodeNumberFieldPolynomialResultant as decode} from './number-field-polynomial-resultant-wire';
import {subresultants} from './subresultant';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';
import * as producers from './number-field-polynomial-resultant';
import * as scalar from './number-field-modular-resultant';
import * as matrix from './modular-coefficient-matrix';
import * as primes from './rational-gcd-evidence';
import * as brown from './subresultant';
afterEach(() => vi.restoreAllMocks());
function base() {
  const ctx = fresh(), inner = new PolynomialRing(Q, 'x'), ring = new PolynomialRing(new PolynomialDomain(inner), 'y');
  const p = (coefficients: readonly bigint[]) => inner.make(ctx, coefficients.map(n => Q.fromInteger(ctx, n))), outer = (coefficients: readonly (readonly bigint[])[]) => ring.make(ctx, coefficients.map(p));
  return {ctx, inner, ring, p, outer};
}
it('checks independently known polynomial resultants, bad points and ordered Brown scaling', () => {
  const s = base(), a = s.outer([[1n], [0n, 1n]]), b = s.outer([[0n, 1n], [1n]]), proof = produce(fresh(), s.ring, a, b, bounds);
  expect(s.inner.equal(s.ctx, proof.resultant, s.p([-1n, 0n, 1n]))).toBe(true); if (proof.method !== 'complete-specialization') throw Error('known specialization');
  expect(proof.points.some(p => p.point === 0n)).toBe(false); expect(proof.points).toHaveLength(3);
  const fixtures = [[a, b], [b, a], [s.outer([[0n, 1n], [], [1n]]), b], [s.ring.zero(s.ctx), b], [s.outer([[2n, 1n]]), b], [s.outer([[2n]]), s.outer([[3n]])], [a, s.ring.multiply(s.ctx, a, b)]] as const;
  for (const [aa, bb] of fixtures) {const value = produce(fresh(), s.ring, aa, bb, bounds); expect(s.inner.equal(s.ctx, value.resultant, subresultants(s.ctx, s.ring, aa, bb).resultant)).toBe(true); verify(fresh(), s.ring, aa, bb, value, bounds);}
});
it('uses actual interpolation degree and supports seeded rational coefficients', () => {
  const s = base(), a = s.outer([[0n, 1n], [], [1n]]), b = s.outer([[0n, 1n], [1n]]), ctx = new ExecutionContext({...fresh().limits, degree: 2}), proof = produce(ctx, s.ring, a, b, bounds);
  expect(proof.method === 'complete-specialization' && proof.bound).toBe(3n); expect(s.inner.equal(s.ctx, proof.resultant, s.p([0n, 1n, 1n]))).toBe(true);
  let seed = 5n;
  for (let index = 0; index < 5; index++) {
    const value = () => {seed = (17n * seed + 3n) % 37n; return rational(s.ctx, seed - 18n, seed % 5n + 1n);};
    const make = () => s.ring.make(s.ctx, [s.inner.make(s.ctx, [value(), value()]), s.p([2n])]), aa = make(), bb = make(), p = produce(fresh(), s.ring, aa, bb, bounds);
    expect(s.inner.equal(s.ctx, p.resultant, subresultants(s.ctx, s.ring, aa, bb).resultant)).toBe(true);
  }
});
it('preserves nested number-field coefficients and fresh producer-disabled replay', () => {
  const ctx = fresh(), ar = new PolynomialRing(Q, 'a'), field = constructAlgebraicExtension(ctx, ar, ar.make(ctx, [-2n, 0n, 1n].map(n => Q.fromInteger(ctx, n))), bounds), x = new PolynomialRing(field, 'x'), ring = new PolynomialRing(new PolynomialDomain(x), 'y'), alpha = field.generator(ctx);
  const a = ring.make(ctx, [x.constant(ctx, alpha), x.make(ctx, [field.fromInteger(ctx, 1n), alpha])]), b = ring.make(ctx, [x.make(ctx, [alpha, field.fromInteger(ctx, 1n)]), x.one(ctx)]), proof = produce(fresh(), ring, a, b, bounds), data = encode(fresh(), ring, a, b, proof, bounds);
  expect(x.equal(ctx, proof.resultant, subresultants(ctx, ring, a, b).resultant)).toBe(true);
  const restore = disableAlgebraicIntegrationProducers(), spies = [vi.spyOn(producers, 'produceNumberFieldPolynomialResultantWithin'), vi.spyOn(scalar, 'produceNumberFieldModularResultantWithin'), vi.spyOn(matrix, 'modularCoefficientLuWithin'), vi.spyOn(primes, 'rationalGcdPrimeFields'), vi.spyOn(brown, 'subresultants')];
  for (const spy of spies) spy.mockImplementation(() => {throw Error('polynomial resultant producer disabled');});
  try {const result = decode(fresh(), ring, a, b, structuredClone(data), bounds); expect(x.equal(ctx, result.resultant, proof.resultant)).toBe(true); expect(result.method === 'complete-specialization' && result.scalarRing).not.toBe(proof.method === 'complete-specialization' && proof.scalarRing);} finally {for (const spy of spies) spy.mockRestore(); restore();}
});
it('rejects missing coverage, duplicated/degree-losing points, changed bounds, values and ordered inputs', () => {
  const s = base(), a = s.outer([[1n], [0n, 1n]]), b = s.outer([[0n, 1n], [1n]]), proof = produce(fresh(), s.ring, a, b, bounds); if (proof.method !== 'complete-specialization') throw Error('known specialization');
  for (const changed of [{...proof, bound: proof.bound + 1n}, {...proof, points: proof.points.slice(1)}, {...proof, points: proof.points.map(() => proof.points[0])},
    {...proof, points: [{...proof.points[0], point: 0n}, ...proof.points.slice(1)]}, {...proof, resultant: s.inner.zero(s.ctx)}, {...proof, points: [{...proof.points[0], proof: {...proof.points[0].proof, resultant: Q.fromInteger(s.ctx, 123n)}}, ...proof.points.slice(1)]}])
    expect(() => verify(fresh(), s.ring, a, b, changed, bounds)).toThrow('verification-failed');
  expect(() => verify(fresh(), s.ring, b, a, proof, bounds)).toThrow('verification-failed');
  const data = encode(fresh(), s.ring, a, b, proof, bounds) as {evidence: Record<string, unknown>}; expect(() => decode(fresh(), s.ring, a, b, {...data, evidence: {...data.evidence, verified: true}}, bounds)).toThrow('invalid-input');
});
it('keeps ring capabilities, rejects foreign/forged callbacks and starts fresh bounded operations', () => {
  const s = base(), a = s.outer([[1n], [0n, 1n]]), b = s.outer([[0n, 1n], [1n]]), proof = produce(fresh(), s.ring, a, b, bounds), data = encode(fresh(), s.ring, a, b, proof, bounds), ctx = fresh();
  decode(ctx, s.ring, a, b, data, bounds); const work = ctx.usage.work; decode(ctx, s.ring, a, b, data, bounds); expect(ctx.usage.work).toBe(work * 2);
  expect(s.ring.domain.capability).toBe('integral-domain'); expect(() => produce(fresh(), s.ring, {...a}, b, bounds)).toThrow('domain-mismatch');
  const foreign = new PolynomialRing(s.ring.domain, 'y'); expect(() => produce(fresh(), s.ring, foreign.one(s.ctx), b, bounds)).toThrow('domain-mismatch');
  const callback = vi.fn(() => {throw Error('foreign polynomial callback');}), forgedDomain = Object.freeze(Object.assign(Object.create(PolynomialDomain.prototype), s.ring.domain, {assert: callback})), forgedRing = new PolynomialRing<typeof a.coefficients[number], typeof s.ring.domain>(forgedDomain, 'y');
  expect(() => produce(fresh(), forgedRing, a, b, bounds)).toThrow('domain-mismatch'); expect(callback).not.toHaveBeenCalled();
  for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decode(fresh(), s.ring, a, b, data, {...bounds, ...patch})).toThrow('resource-limit');
  for (const limit of [{work: 1}, {allocation: 1}, {degree: 0}, {integerBits: 1}]) {const stopped = new ExecutionContext({...fresh().limits, ...limit}); expect(() => produce(stopped, s.ring, a, b, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');}
  expect(Object.isFrozen(proof) && Object.isFrozen(a.coefficients)).toBe(true);
});
