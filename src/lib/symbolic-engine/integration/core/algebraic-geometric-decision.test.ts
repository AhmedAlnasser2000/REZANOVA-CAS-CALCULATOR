import {describe, it, expect, vi} from 'vitest';
import {base, quadratic, fresh, bounds} from './__tests__/algebraic-support';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {produceGeometricAlgebraicCandidate, checkGeometricAlgebraicCandidate, verifyGeometricAlgebraicDecision} from './algebraic-geometric-decision';
import {encodeNativeAlgebraicElementary, decodeNativeAlgebraicElementary} from './algebraic-native-wire';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';
import * as dispatch from './algebraic-principal-multiple-dispatch';
import * as native from './algebraic-native-primitive';
import * as general from './algebraic-rr-principality';
import * as geometric from './algebraic-geometric-logarithms';

describe('geometric subsidiaries in the complete integration reduction', () => {
  it('retains rational zero/constant/exact/logarithmic inputs through the general fallback', () => {
    const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds);
    for (const input of [b.field.fromInteger(b.ctx, 0n), b.field.fromInteger(b.ctx, 3n), b.field.inverse(b.ctx, b.x)]) {
      const candidate = produceGeometricAlgebraicCandidate(fresh(), curve, input, bounds); expect(candidate.kind).toBe('elementary'); expect('derivative' in candidate).toBe(false);
      const proof = checkGeometricAlgebraicCandidate(fresh(), curve, input, candidate, bounds); verifyGeometricAlgebraicDecision(fresh(), curve, input, proof, bounds);
    }
  });
  it.each([2n, 3n])('constructs logarithms from a least-order %s Miller witness without RR principality', order => {
    const b = quadratic(order === 2n ? [0n, -1n, 0n, 1n] : [1n, 0n, 0n, 1n]), f = b.owner, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds), x = f.embed(b.ctx, b.x);
    const input = order === 2n ? f.inverse(b.ctx, f.multiply(b.ctx, f.fromInteger(b.ctx, 2n), x)) : f.exactDivide(b.ctx, f.multiply(b.ctx, x, x), f.multiply(b.ctx, f.fromInteger(b.ctx, 2n), f.multiply(b.ctx, b.a, f.subtract(b.ctx, b.a, f.fromInteger(b.ctx, 1n)))));
    const spy = vi.spyOn(general, 'decideAlgebraicRrPrincipalityWithin').mockImplementation(() => {throw Error('unnecessary general principality');});
    let candidate; try {candidate = produceGeometricAlgebraicCandidate(fresh(), curve, input, bounds);} finally {spy.mockRestore();}
    expect(candidate.kind).toBe('elementary'); expect('derivative' in candidate).toBe(false); if (candidate.kind !== 'elementary') throw Error('known logarithm fixture');
    expect(candidate.primitive.terms).toHaveLength(1); expect(candidate.primitive.base.terms).toHaveLength(0);
    const proof = checkGeometricAlgebraicCandidate(fresh(), curve, input, candidate, bounds); if (proof.kind !== 'elementary') throw Error('known checked primitive');
    const data = encodeNativeAlgebraicElementary(fresh(), curve, input, proof, bounds), restore = disableAlgebraicIntegrationProducers(), extra = [vi.spyOn(dispatch, 'decideAlgebraicPrincipalMultipleWithin'), vi.spyOn(native, 'differentiateNativeAlgebraicPrimitiveWithin'), vi.spyOn(geometric, 'constructGeometricAlgebraicLogarithmsWithin')];
    for (const p of extra) p.mockImplementation(() => {throw Error('producer disabled');});
    try {decodeNativeAlgebraicElementary(fresh(), curve, input, data, bounds); verifyGeometricAlgebraicDecision(fresh(), curve, input, proof, bounds);} finally {for (const p of extra) p.mockRestore(); restore();}
  }, 60000);
  it('retains auxiliary complex residue constants and the complete relative trace', () => {
    const b = quadratic([1n, 0n, -1n]), f = b.owner, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds), input = f.inverse(b.ctx, b.a), candidate = produceGeometricAlgebraicCandidate(fresh(), curve, input, bounds);
    expect(candidate.kind).toBe('elementary'); if (candidate.kind !== 'elementary') throw Error('known auxiliary-logarithm fixture');
    expect(candidate.primitive.terms).toHaveLength(0); expect(candidate.primitive.base.terms[0].quotient.relative.degree).toBe(2);
    const proof = checkGeometricAlgebraicCandidate(fresh(), curve, input, candidate, bounds); verifyGeometricAlgebraicDecision(fresh(), curve, input, proof, bounds);
  }, 60000);
  it.each(['nonzero-holomorphic-remainder', 'infinity-principal-part-obstruction'] as const)('retains complete %s without primitive authority', reason => {
    const b = quadratic([1n, -1n, 0n, 1n]), f = b.owner, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds), inv = f.inverse(b.ctx, b.a);
    const input = reason === 'nonzero-holomorphic-remainder' ? inv : f.multiply(b.ctx, f.embed(b.ctx, b.x), inv);
      const candidate = produceGeometricAlgebraicCandidate(fresh(), curve, input, bounds), proof = checkGeometricAlgebraicCandidate(fresh(), curve, input, candidate, bounds);
      expect(proof.kind === 'non-elementary' && proof.reason).toBe(reason); const restore = disableAlgebraicIntegrationProducers();
      try {verifyGeometricAlgebraicDecision(fresh(), curve, input, proof, bounds);} finally {restore();}
      expect(() => verifyGeometricAlgebraicDecision(fresh(), curve, b.a, proof, bounds)).toThrow('verification-failed');
  }, 60000);
  it('retains the complete combined residue-divisor negative and successful prefix', () => {
    const n = quadratic([-2n, 0n, 0n, 1n]), nf = n.owner, nc = certifyAlgebraicCurve(n.ctx, nf, certifyAlgebraicConstantField(n.ctx, nf, bounds), bounds), input = nf.inverse(n.ctx, nf.multiply(n.ctx, nf.subtract(n.ctx, nf.embed(n.ctx, n.x), nf.fromInteger(n.ctx, 3n)), n.a)), candidate = produceGeometricAlgebraicCandidate(fresh(), nc, input, bounds), proof = checkGeometricAlgebraicCandidate(fresh(), nc, input, candidate, bounds);
    expect(proof.kind === 'non-elementary' && proof.reason).toBe('non-torsion-residue-divisor'); if (proof.kind !== 'non-elementary' || proof.reason !== 'non-torsion-residue-divisor') throw Error('known non-torsion fixture');
    expect(proof.logarithms.components[0].multiple.method).toBe('ramified-cantor'); expect(proof.logarithms.kind).toBe('non-torsion');
    const restore = disableAlgebraicIntegrationProducers(); try {verifyGeometricAlgebraicDecision(fresh(), nc, input, proof, bounds);} finally {restore();}
    expect(() => verifyGeometricAlgebraicDecision(fresh(), nc, input, {...proof, logarithms: {...proof.logarithms, components: []}}, bounds)).toThrow('verification-failed');
  }, 60000);
});
