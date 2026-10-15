import {it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {rationalField as Q} from './field';
import {rational} from './rational';
import {PolynomialRing} from './polynomial';
import {constructAlgebraicExtension, type AlgebraicField} from './algebraic-field';
import {produceNumberFieldModularResultant, verifyNumberFieldModularResultant} from './number-field-modular-resultant';
import {encodeNumberFieldModularResultant, decodeNumberFieldModularResultant} from './number-field-resultant-wire';
import {subresultants} from './subresultant';
import {ExecutionContext} from './execution';
import * as producer from './number-field-modular-resultant';
import * as matrix from './modular-coefficient-matrix';
import * as gcd from './number-field-modular-gcd';
import * as primes from './rational-gcd-evidence';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';
import {FactorPrimeField} from './factorization-modular';
import {numberFieldModularDescriptor, numberFieldModularImage} from './number-field-modular-image';
import * as reconstruction from './modular-rational-reconstruction';
import * as brown from './subresultant';

function nested(radicand = 2n) {
  const ctx = fresh(), ar = new PolynomialRing(Q, 'a'), a = constructAlgebraicExtension(ctx, ar, ar.make(ctx, [-radicand, 0n, 1n].map(n => Q.fromInteger(ctx, n))), bounds), br = new PolynomialRing(a, 'b'), b = constructAlgebraicExtension(ctx, br, br.make(ctx, [-3n, 0n, 1n].map(n => a.fromInteger(ctx, n))), bounds);
  return {ctx, a, b, r: new PolynomialRing<ReturnType<typeof b.generator>>(b, 'z')};
}
it('preserves Brown ordered, nonmonic, zero, constant and defective-degree scalars', () => {
  const ctx = fresh(), r = new PolynomialRing(Q, 'z'), make = (values: readonly bigint[]) => r.make(ctx, values.map(n => Q.fromInteger(ctx, n)));
  const fixtures = [[[], []], [[], [2n]], [[2n], [3n]], [[2n], [1n, 0n, 0n, 3n]], [[1n, 0n, 1n], [-1n, 0n, 1n]], [[-1n, 0n, 1n], [-1n, 1n]], [[2n, 3n, 4n], [-7n, 5n]], [[0n, 1n, 0n, 1n], [2n, 0n, 3n]]] as const;
  for (const [aa, bb] of fixtures) {
    const a = make(aa), b = make(bb), proof = produceNumberFieldModularResultant(fresh(), r, a, b, bounds), swapped = produceNumberFieldModularResultant(fresh(), r, b, a, bounds);
    expect(Q.equal(ctx, proof.resultant, subresultants(ctx, r, a, b).resultant)).toBe(true); expect(Q.equal(ctx, swapped.resultant, subresultants(ctx, r, b, a).resultant)).toBe(true);
    verifyNumberFieldModularResultant(fresh(), r, a, b, proof, bounds); expect(Object.isFrozen(proof)).toBe(true);
  }
  let seed = 3n;
  for (let k = 0; k < 12; k++) {
    const coefficients = (n: number) => Array.from({length: n}, () => {seed = (seed * 17n + 5n) % 31n; return rational(ctx, seed - 15n, seed % 7n + 1n);});
    const a = r.make(ctx, [...coefficients(1 + k % 3), Q.fromInteger(ctx, 2n)]), b = r.make(ctx, [...coefficients(1 + (k + 1) % 3), Q.fromInteger(ctx, -3n)]), proof = produceNumberFieldModularResultant(fresh(), r, a, b, bounds);
    expect(Q.equal(ctx, proof.resultant, subresultants(ctx, r, a, b).resultant)).toBe(true);
  }
});
it('reconstructs ordered nested number-field values and preserves large exact coefficients', () => {
  const {ctx, a: parent, b: f, r} = nested(), alpha = f.embed(ctx, parent.generator(ctx)), beta = f.generator(ctx), a = r.make(ctx, [f.fromInteger(ctx, 1n), f.exactDivide(ctx, beta, f.fromInteger(ctx, 35n)), alpha]), b = r.make(ctx, [f.exactDivide(ctx, alpha, f.fromInteger(ctx, 7n)), beta]);
  for (const [aa, bb] of [[a, b], [b, a]] as const) {
    const proof = produceNumberFieldModularResultant(fresh(), r, aa, bb, bounds); expect(proof.method).toBe('modular-lu'); expect(f.equal(ctx, proof.resultant, subresultants(ctx, r, aa, bb).resultant)).toBe(true); verifyNumberFieldModularResultant(fresh(), r, aa, bb, proof, bounds);
  }
  const q = new PolynomialRing(Q, 'Z'), big = 1n << 120n, aa = q.make(ctx, [Q.fromInteger(ctx, big), Q.fromInteger(ctx, 2n)]), bb = q.make(ctx, [Q.fromInteger(ctx, 3n), Q.fromInteger(ctx, big + 1n)]), proof = produceNumberFieldModularResultant(fresh(), q, aa, bb, bounds);
  expect(Q.equal(ctx, proof.resultant, subresultants(ctx, q, aa, bb).resultant)).toBe(true);
});
it('rejects changed permutations, triangular factors, units, inputs and zero witnesses', () => {
  const ctx = fresh(), r = new PolynomialRing(Q, 'z'), a = r.make(ctx, [2n, 3n, 4n].map(n => Q.fromInteger(ctx, n))), b = r.make(ctx, [-7n, 5n].map(n => Q.fromInteger(ctx, n))), p = produceNumberFieldModularResultant(fresh(), r, a, b, bounds);
  if (p.method !== 'modular-lu') throw Error('known coprime resultant');
  const zero = Q.fromInteger(ctx, 0n);
  for (const proof of [{...p, permutation: []}, {...p, permutation: p.permutation.map(() => 0)}, {...p, lower: []}, {...p, upper: p.upper.map(row => row.map(() => zero))}, {...p, inverses: p.inverses.map(() => zero)}, {...p, resultant: zero}, {...p, method: 'boundary' as const}]) expect(() => verifyNumberFieldModularResultant(fresh(), r, a, b, proof, bounds)).toThrow('verification-failed');
  expect(() => verifyNumberFieldModularResultant(fresh(), r, b, a, p, bounds)).toThrow('verification-failed');
  const negative = produceNumberFieldModularResultant(fresh(), r, a, r.multiply(ctx, a, b), bounds); if (negative.method !== 'common-factor') throw Error('known common factor');
  expect(() => verifyNumberFieldModularResultant(fresh(), r, a, r.multiply(ctx, a, b), {...negative, factor: r.one(ctx)}, bounds)).toThrow('verification-failed');
  expect(() => verifyNumberFieldModularResultant(fresh(), r, a, r.multiply(ctx, a, b), {...negative, quotientA: r.one(ctx)}, bounds)).toThrow('verification-failed');
});
it('replays exact nonzero/zero scalar evidence without modular, field, GCD or PRS producers', () => {
  const {ctx, b: f, r} = nested(), a = r.make(ctx, [f.generator(ctx), f.fromInteger(ctx, 2n)]), b = r.make(ctx, [f.fromInteger(ctx, -1n), f.fromInteger(ctx, 3n)]);
  for (const inputB of [b, r.multiply(ctx, a, b)]) {
    const proof = produceNumberFieldModularResultant(fresh(), r, a, inputB, bounds), data = JSON.parse(JSON.stringify(encodeNumberFieldModularResultant(fresh(), r, a, inputB, proof, bounds))) as {evidence: Record<string, unknown>};
    const restore = disableAlgebraicIntegrationProducers(), spies = [vi.spyOn(producer, 'produceNumberFieldModularResultantWithin'), vi.spyOn(matrix, 'modularCoefficientLuWithin'), vi.spyOn(gcd, 'produceNumberFieldModularGcdWithin'), vi.spyOn(primes, 'rationalGcdPrimeFields')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('resultant producer disabled');});
    try {expect(f.equal(ctx, decodeNumberFieldModularResultant(fresh(), r, a, inputB, data, bounds).resultant, proof.resultant)).toBe(true);} finally {for (const spy of spies) spy.mockRestore(); restore();}
    expect(() => decodeNumberFieldModularResultant(fresh(), r, b, inputB, data, bounds)).toThrow('verification-failed');
    expect(() => decodeNumberFieldModularResultant(fresh(), r, a, inputB, {...data, evidence: {...data.evidence, verified: true}}, bounds)).toThrow('invalid-input');
    for (const patch of [{artifactNodes: 1}, {artifactDepth: 1}, {artifactBytes: 1}]) expect(() => decodeNumberFieldModularResultant(fresh(), r, a, inputB, data, {...bounds, ...patch})).toThrow('resource-limit');
  }
});
it('keeps owned operands immutable, composition scopes fresh and resource failure sticky', () => {
  const ctx = fresh(), r = new PolynomialRing(Q, 'z'), a = r.make(ctx, [1n, 2n].map(n => Q.fromInteger(ctx, n))), b = r.make(ctx, [3n, 4n].map(n => Q.fromInteger(ctx, n))), before = [...a.coefficients];
  const start = ctx.usage.work, proof = produceNumberFieldModularResultant(ctx, r, a, b, bounds), work = ctx.usage.work - start; produceNumberFieldModularResultant(ctx, r, a, b, bounds); expect(ctx.usage.work).toBe(start + 2 * work); expect(a.coefficients).toEqual(before);
  const foreign = new PolynomialRing(Q, 'z'); expect(() => produceNumberFieldModularResultant(fresh(), r, a, foreign.one(ctx), bounds)).toThrow('domain-mismatch'); expect(() => produceNumberFieldModularResultant(fresh(), r, {...a}, b, bounds)).toThrow('domain-mismatch');
  for (const patch of [{work: 1}, {allocation: 1}, {degree: 0}]) {const limited = new ExecutionContext({...fresh().limits, ...patch}); expect(() => produceNumberFieldModularResultant(limited, r, a, b, bounds)).toThrow('resource-limit'); expect(() => limited.tick()).toThrow('resource-limit');}
  expect(() => verifyNumberFieldModularResultant(fresh(), r, a, b, proof, {...bounds, towerHeight: 0})).toThrow('invalid-input');
});
it('checks unit pivots in reducible/nonreduced quotient rings and preserves the selected permutation', () => {
  const {ctx, a: f} = nested(), descriptor = numberFieldModularDescriptor(ctx, f);
  for (const p of [7n, 2n]) {
    const prime = new FactorPrimeField(ctx, p), image = numberFieldModularImage(ctx, descriptor, prime)!;
    const convert = (value: ReturnType<typeof f.generator>) => image.fromCoordinates(ctx, descriptor.coordinates(ctx, value));
    const alpha = f.generator(ctx), one = convert(f.fromInteger(ctx, 1n)), bad = convert(p === 7n ? f.subtract(ctx, alpha, f.fromInteger(ctx, 3n)) : alpha);
    expect(image.coefficients.inverse(ctx, bad)).toBeNull();
    const input = [[bad, one], [one, image.coefficients.zero(ctx)]], proof = matrix.modularCoefficientLuWithin(ctx, image, input);
    expect(proof?.permutation).toEqual([1, 0]); expect(matrix.modularCoefficientLuWithin(ctx, image, input, [0, 1])).toBeNull();
    expect(matrix.modularCoefficientLuWithin(ctx, image, input, proof!.permutation)).not.toBeNull();
    if ('capability' in image.coefficients) expect(image.coefficients.capability).toBe('ring');
  }
});
it('keeps polynomial degree limits on actual values and replays a height-eight coefficient tower', () => {
  const ctx = fresh(), r = new PolynomialRing(Q, 'z'), a = r.make(ctx, [Q.fromInteger(ctx, 1n), Q.fromInteger(ctx, 2n)]), b = r.make(ctx, [Q.fromInteger(ctx, 3n), Q.fromInteger(ctx, 4n)]);
  expect(produceNumberFieldModularResultant(new ExecutionContext({...fresh().limits, degree: 1}), r, a, b, bounds).method).toBe('modular-lu');
  const ar = new PolynomialRing(Q, 'alpha'), initial = constructAlgebraicExtension(ctx, ar, ar.make(ctx, [-2n, 0n, 1n].map(n => Q.fromInteger(ctx, n))), bounds);
  function visit<E>(owner: AlgebraicField<E>, remaining: number): void {
    if (remaining > 0) {const relation = new PolynomialRing(owner, 'copy'), next = constructAlgebraicExtension(ctx, relation, relation.make(ctx, [owner.negate(ctx, owner.generator(ctx)), owner.fromInteger(ctx, 1n)]), bounds); visit(next, remaining - 1); return;}
    expect(owner.height).toBe(8); const ring = new PolynomialRing<ReturnType<typeof owner.generator>>(owner, 'z'), inputA = ring.make(ctx, [owner.generator(ctx), owner.fromInteger(ctx, 2n)]), inputB = ring.make(ctx, [owner.fromInteger(ctx, -1n), owner.fromInteger(ctx, 3n)]);
    const proof = produceNumberFieldModularResultant(fresh(), ring, inputA, inputB, bounds), data = encodeNumberFieldModularResultant(fresh(), ring, inputA, inputB, proof, bounds), restore = disableAlgebraicIntegrationProducers();
    try {decodeNumberFieldModularResultant(fresh(), ring, inputA, inputB, data, bounds);} finally {restore();}
    expect(() => verifyNumberFieldModularResultant(fresh(), ring, inputA, inputB, proof, {...bounds, towerHeight: 7})).toThrow('resource-limit');
  }
  visit(initial, 7);
});
it('propagates modular, reconstruction and decoding exhaustion without a Brown fallback', () => {
  const ctx = fresh(), r = new PolynomialRing(Q, 'z'), a = r.make(ctx, [2n, 3n, 4n].map(n => Q.fromInteger(ctx, n))), b = r.make(ctx, [-7n, 5n].map(n => Q.fromInteger(ctx, n)));
  const stop = vi.spyOn(brown, 'subresultants').mockImplementation(() => {throw Error('unrequested Brown fallback');});
  try {
    for (const stage of ['modular', 'reconstruction'] as const) {
      const limited = fresh(), spy = stage === 'modular' ? vi.spyOn(matrix, 'modularCoefficientLuWithin').mockImplementation(c => c.exhaust('test-modular-stage')) : vi.spyOn(reconstruction, 'modularRationalReconstruction').mockImplementation(c => c.exhaust('test-reconstruction-stage'));
      try {expect(() => produceNumberFieldModularResultant(limited, r, a, b, bounds)).toThrow('resource-limit'); expect(() => limited.tick()).toThrow('resource-limit'); expect(limited.operationToken).toBeUndefined(); expect(spy).toHaveBeenCalledTimes(1);} finally {spy.mockRestore();}
    }
    expect(stop).not.toHaveBeenCalled();
  } finally {stop.mockRestore();}
  const proof = produceNumberFieldModularResultant(fresh(), r, a, b, bounds), data = encodeNumberFieldModularResultant(fresh(), r, a, b, proof, bounds), limited = new ExecutionContext({...fresh().limits, allocation: 1});
  expect(() => decodeNumberFieldModularResultant(limited, r, a, b, data, bounds)).toThrow('resource-limit'); expect(() => limited.tick()).toThrow('resource-limit');
});
it('binds complete original coefficient constructions despite matching printed names', () => {
  const first = nested(), second = nested(5n), a = first.r.make(first.ctx, [first.b.generator(first.ctx), first.b.fromInteger(first.ctx, 2n)]), b = first.r.make(first.ctx, [first.b.fromInteger(first.ctx, -1n), first.b.fromInteger(first.ctx, 3n)]);
  const proof = produceNumberFieldModularResultant(fresh(), first.r, a, b, bounds), data = encodeNumberFieldModularResultant(fresh(), first.r, a, b, proof, bounds);
  const otherA = second.r.make(second.ctx, [second.b.generator(second.ctx), second.b.fromInteger(second.ctx, 2n)]), otherB = second.r.make(second.ctx, [second.b.fromInteger(second.ctx, -1n), second.b.fromInteger(second.ctx, 3n)]);
  expect(() => decodeNumberFieldModularResultant(fresh(), second.r, otherA, otherB, data, bounds)).toThrow('verification-failed');
});
