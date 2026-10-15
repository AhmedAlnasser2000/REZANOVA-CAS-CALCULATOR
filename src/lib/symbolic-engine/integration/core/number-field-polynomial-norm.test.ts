import {afterEach, expect, it, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {rationalField as Q} from './field';
import {PolynomialRing} from './polynomial';
import {constructAlgebraicExtension, type AlgebraicField} from './algebraic-field';
import {ExecutionContext} from './execution';
import {produceNumberFieldPolynomialNorm as produce, verifyNumberFieldPolynomialNorm as verify} from './number-field-polynomial-norm';
import {encodeNumberFieldPolynomialNorm as encode, decodeNumberFieldPolynomialNorm as decode} from './number-field-polynomial-norm-wire';
import {algebraicNormPolynomial} from './algebraic-factorization';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';
import * as norm from './number-field-polynomial-norm';
import * as resultant from './number-field-polynomial-resultant';
import * as scalar from './number-field-modular-resultant';
import * as brown from './subresultant';
import * as matrix from './modular-coefficient-matrix';
import * as primes from './rational-gcd-evidence';
afterEach(() => vi.restoreAllMocks());
function fixture() {
  const ctx = fresh(), ar = new PolynomialRing(Q, 'a'), owner = constructAlgebraicExtension(ctx, ar, ar.make(ctx, [-2n, 0n, 1n].map(n => Q.fromInteger(ctx, n))), bounds), ring = new PolynomialRing(owner, 'x'), alpha = owner.generator(ctx);
  return {ctx, owner, ring, alpha};
}
it('constructs norm(x+sqrt(2))=x^2-2, including zero/constant/linear presentations', () => {
  const s = fixture(), input = s.ring.make(s.ctx, [s.alpha, s.owner.fromInteger(s.ctx, 1n)]), proof = produce(fresh(), s.owner, input, bounds), inner = proof.ring.domain.ring;
  expect(inner.equal(s.ctx, proof.value, inner.make(s.ctx, [-2n, 0n, 1n].map(n => Q.fromInteger(s.ctx, n))))).toBe(true);
  for (const value of [input, s.ring.zero(s.ctx), s.ring.constant(s.ctx, s.alpha), s.ring.make(s.ctx, [s.alpha, s.owner.fromInteger(s.ctx, 2n), s.alpha])]) {
    const p = produce(fresh(), s.owner, value, bounds), old = algebraicNormPolynomial(s.ctx, s.owner, value);
    expect(p.value.coefficients.length).toBe(old.proof.resultant.coefficients.length); expect(p.value.coefficients.every((c, i) => Q.equal(s.ctx, c, old.proof.resultant.coefficients[i]))).toBe(true); verify(fresh(), s.owner, value, p, bounds);
  }
  const linearRing = new PolynomialRing(Q, 'b'), linear = constructAlgebraicExtension(s.ctx, linearRing, linearRing.make(s.ctx, [Q.fromInteger(s.ctx, -3n), Q.fromInteger(s.ctx, 1n)]), bounds), r = new PolynomialRing(linear, 'x'), p = produce(fresh(), linear, r.make(s.ctx, [linear.generator(s.ctx), linear.fromInteger(s.ctx, 1n)]), bounds);
  expect(p.value.coefficients.map(c => c.numerator)).toEqual([3n, 1n]);
});
it('retains nested constant embeddings and replays fresh resultants with every search producer disabled', () => {
  const s = fixture(), br = new PolynomialRing(s.owner, 'b'), extension = constructAlgebraicExtension(s.ctx, br, br.make(s.ctx, [-3n, 0n, 1n].map(n => s.owner.fromInteger(s.ctx, n))), bounds), ring = new PolynomialRing(extension, 'x'), beta = extension.generator(s.ctx), input = ring.make(s.ctx, [beta, extension.embed(s.ctx, s.alpha)]), proof = produce(fresh(), extension, input, bounds);
  const data = encode(fresh(), extension, input, proof, bounds), restore = disableAlgebraicIntegrationProducers(), spies = [vi.spyOn(norm, 'produceNumberFieldPolynomialNormWithin'), vi.spyOn(resultant, 'produceNumberFieldPolynomialResultantWithin'), vi.spyOn(scalar, 'produceNumberFieldModularResultantWithin'), vi.spyOn(matrix, 'modularCoefficientLuWithin'), vi.spyOn(primes, 'rationalGcdPrimeFields'), vi.spyOn(brown, 'subresultants')];
  for (const spy of spies) spy.mockImplementation(() => {throw Error('polynomial norm producer disabled');});
  try {const result = decode(fresh(), extension, input, structuredClone(data), bounds); expect(result.ring).not.toBe(proof.ring); expect(result.value.coefficients.length).toBe(3); expect(result.value.coefficients.every((c, i) => s.owner.equal(s.ctx, c, proof.value.coefficients[i]))).toBe(true);} finally {for (const spy of spies) spy.mockRestore(); restore();}
});
it('replays complete height-eight constant constructions and rejects a stricter height', () => {
  const s = fixture();
  function visit<E>(owner: AlgebraicField<E>, remaining: number): void {
    if (remaining > 0) {
      const r = new PolynomialRing(owner, 'copy'), next = constructAlgebraicExtension(s.ctx, r, r.make(s.ctx, [owner.negate(s.ctx, owner.generator(s.ctx)), owner.fromInteger(s.ctx, 1n)]), bounds);
      visit(next, remaining - 1); return;
    }
    expect(owner.height).toBe(8); const r = new PolynomialRing(owner, 'x'), input = r.make(s.ctx, [owner.generator(s.ctx), owner.fromInteger(s.ctx, 1n)]), proof = produce(fresh(), owner, input, bounds), data = encode(fresh(), owner, input, proof, bounds);
    const restore = disableAlgebraicIntegrationProducers();
    try {decode(fresh(), owner, input, data, bounds);} finally {restore();}
    expect(() => verify(fresh(), owner, input, proof, {...bounds, towerHeight: 7})).toThrow('resource-limit');
  }
  visit(s.owner, 7);
});
it('rejects incomplete transposition, changed relations/norms, inputs and saved flags', () => {
  const s = fixture(), input = s.ring.make(s.ctx, [s.alpha, s.owner.fromInteger(s.ctx, 1n)]), proof = produce(fresh(), s.owner, input, bounds);
  for (const changed of [{...proof, defining: proof.ring.one(s.ctx)}, {...proof, converted: proof.ring.zero(s.ctx)}, {...proof, value: proof.ring.domain.ring.zero(s.ctx)}]) expect(() => verify(fresh(), s.owner, input, changed, bounds)).toThrow('verification-failed');
  const data = encode(fresh(), s.owner, input, proof, bounds) as {evidence: Record<string, unknown>}; expect(() => decode(fresh(), s.owner, s.ring.one(s.ctx), data, bounds)).toThrow('verification-failed');
  expect(() => decode(fresh(), s.owner, input, {...data, evidence: {...data.evidence, verified: true}}, bounds)).toThrow('invalid-input');
});
it('keeps native ownership/immutability, fresh accounting and sticky actual degree/byte limits', () => {
  const s = fixture(), input = s.ring.make(s.ctx, [s.alpha, s.owner.fromInteger(s.ctx, 1n)]), proof = produce(fresh(), s.owner, input, bounds), data = encode(fresh(), s.owner, input, proof, bounds), ctx = fresh();
  decode(ctx, s.owner, input, data, bounds); const work = ctx.usage.work; decode(ctx, s.owner, input, data, bounds); expect(ctx.usage.work).toBe(2 * work);
  expect(() => produce(fresh(), s.owner, {...input}, bounds)).toThrow('domain-mismatch'); const other = fixture(); expect(() => produce(fresh(), other.owner, input, bounds)).toThrow('domain-mismatch');
  for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decode(fresh(), s.owner, input, data, {...bounds, ...patch})).toThrow('resource-limit');
  for (const patch of [{degree: 1}, {work: 1}, {allocation: 1}]) {const stopped = new ExecutionContext({...fresh().limits, ...patch}); expect(() => produce(stopped, s.owner, input, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');}
  expect(Object.isFrozen(proof) && Object.isFrozen(input.coefficients)).toBe(true);
});
