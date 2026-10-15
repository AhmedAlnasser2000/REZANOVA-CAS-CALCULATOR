import {afterEach, expect, it, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {rationalField as Q} from './field';
import {PolynomialRing} from './polynomial';
import {constructAlgebraicExtension} from './algebraic-field';
import {algebraicNormPolynomial, produceAlgebraicFactorNormWithin, verifyAlgebraicFactorNormWithin, factorAlgebraicPolynomial, verifyAlgebraicPolynomialFactorization} from './algebraic-factorization';
import {algebraicFactorNormCodec, encodeAlgebraicPolynomialFactorization, decodeAlgebraicPolynomialFactorization} from './algebraic-wire';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';
import * as norm from './number-field-polynomial-norm';
import * as resultant from './number-field-polynomial-resultant';
afterEach(() => vi.restoreAllMocks());
function fixture() {
  const ctx = fresh(), ar = new PolynomialRing(Q, 'a'), owner = constructAlgebraicExtension(ctx, ar, ar.make(ctx, [-2n, 0n, 1n].map(n => Q.fromInteger(ctx, n))), bounds), ring = new PolynomialRing(owner, 'z');
  return {ctx, owner, ring, input: ring.make(ctx, [-2n, 0n, 1n].map(n => owner.fromInteger(ctx, n)))};
}
it('composes complete modular polynomial norms into Trager factorization', () => {
  const s = fixture(), proof = factorAlgebraicPolynomial(fresh(), s.ring, s.input, bounds);
  expect(proof.kind === 'factorization' && proof.route === 'algebraic' && proof.components.every(c => c.norm.format === 'number-field-polynomial-norm-v2')).toBe(true);
  expect(proof.kind === 'factorization' && proof.factors.length).toBe(2);
  verifyAlgebraicPolynomialFactorization(fresh(), s.ring, s.input, proof, bounds);
  const data = encodeAlgebraicPolynomialFactorization(fresh(), s.ring, s.input, proof, bounds), restore = disableAlgebraicIntegrationProducers();
  const spies = [vi.spyOn(norm, 'produceNumberFieldPolynomialNormWithin'), vi.spyOn(resultant, 'produceNumberFieldPolynomialResultantWithin')];
  for (const spy of spies) spy.mockImplementation(() => {throw Error('norm producer disabled');});
  try {const out = decodeAlgebraicPolynomialFactorization(fresh(), s.ring, s.input, structuredClone(data), bounds); expect(out.kind === 'factorization' && out.factors.length).toBe(2);} finally {for (const spy of spies) spy.mockRestore(); restore();}
});
it('retains original Brown norm replay and rejects altered compact conversion, target and discriminator', () => {
  const s = fixture(), codec = algebraicFactorNormCodec(s.ctx, s.owner, s.ring, bounds), old = algebraicNormPolynomial(s.ctx, s.owner, s.input);
  const proof = s.ctx.operation(() => produceAlgebraicFactorNormWithin(s.ctx, s.owner, s.input, bounds));
  for (const value of [old, proof]) {
    const decoded = codec.decode(structuredClone(codec.encode(value)));
    const ctx = fresh(); ctx.operation(() => verifyAlgebraicFactorNormWithin(ctx, s.owner, s.input, decoded, bounds));
  }
  if (proof.format !== 'number-field-polynomial-norm-v2') throw Error('fixture');
  for (const evidence of [{...proof.evidence, converted: proof.ring.zero(s.ctx)}, {...proof.evidence, value: proof.outer.zero(s.ctx)}]) {
    expect(() => verifyAlgebraicFactorNormWithin(fresh(), s.owner, s.input, {...proof, evidence}, bounds)).toThrow('verification-failed');
  }
  expect(() => verifyAlgebraicFactorNormWithin(fresh(), s.owner, s.ring.one(s.ctx), proof, bounds)).toThrow('verification-failed');
  expect(() => codec.decode({...codec.encode(proof) as object, format: 'trusted'})).toThrow('invalid-input');
});
