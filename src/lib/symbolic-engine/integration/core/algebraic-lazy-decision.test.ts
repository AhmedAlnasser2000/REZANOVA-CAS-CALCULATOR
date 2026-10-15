import {describe, it, expect, vi} from 'vitest';
import {base, quadratic, fresh, bounds} from './__tests__/algebraic-support';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {produceLazyAlgebraicCandidate, checkLazyAlgebraicCandidate, verifyLazyAlgebraicDecision} from './algebraic-lazy-decision';
import {encodeNativeAlgebraicElementary, decodeNativeAlgebraicElementary} from './algebraic-native-wire';
import {encodeLazyAlgebraicNegative, decodeLazyAlgebraicNegative} from './algebraic-lazy-wire';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';
import {ExecutionContext} from './execution';
import * as rr from './algebraic-riemann-roch';
import * as hermite from './algebraic-hermite';
import * as principal from './algebraic-divisor';
import * as lazy from './algebraic-lazy-decision';
import * as covered from './algebraic-covered-residues';
import * as relations from './algebraic-covered-relations';
import * as geometry from './algebraic-canonical-geometry';
import * as pole from './algebraic-pole-coverage';
import * as logarithms from './algebraic-geometric-logarithms';
import * as dispatch from './algebraic-principal-multiple-dispatch';
import * as direct from './algebraic-integral-residue';

function disableLazyProducers() {
  const restore = disableAlgebraicIntegrationProducers(), spies = [vi.spyOn(lazy, 'produceLazyAlgebraicCandidateWithin'), vi.spyOn(covered, 'constructAlgebraicCoveredResiduesWithin'),
    vi.spyOn(relations, 'splitAlgebraicCoveredResiduesWithin'), vi.spyOn(relations, 'combineAlgebraicCoveredResiduesWithin'), vi.spyOn(relations, 'constructAlgebraicCoveredLogarithmsWithin'),
    vi.spyOn(geometry, 'constructAlgebraicCanonicalGeometryWithin'), vi.spyOn(pole, 'certifyAlgebraicPoleCoverageWithin'), vi.spyOn(logarithms, 'constructGeometricAlgebraicLogarithmDataWithin'), vi.spyOn(dispatch, 'decideAlgebraicPrincipalMultipleWithin'), vi.spyOn(direct, 'tryAlgebraicIntegralResidueWithin')];
  for (const spy of spies) spy.mockImplementation(() => {throw Error('lazy producer disabled');});
  return () => {for (const spy of spies) spy.mockRestore(); restore();};
}
describe('certified lazy algebraic simple-pole reduction', () => {
  it('publishes zero/log candidates before checking and keeps the complete repeated-pole method', () => {
    const b = base(), f = b.field, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds);
    for (const input of [f.fromInteger(b.ctx, 0n), f.inverse(b.ctx, b.x), f.inverse(b.ctx, f.multiply(b.ctx, b.x, b.x)), f.fromInteger(b.ctx, 3n)]) {
      const candidate = produceLazyAlgebraicCandidate(fresh(), curve, input, bounds); expect(candidate.kind).toBe('elementary'); expect(candidate).not.toHaveProperty('derivative');
      const checked = checkLazyAlgebraicCandidate(fresh(), curve, input, candidate, bounds); verifyLazyAlgebraicDecision(fresh(), curve, input, checked, bounds);
    }
  });
  it.each(['native-order-two', 'complex-trace'] as const)('constructs %s logarithms from complete pole authority', kind => {
    const b = quadratic(kind === 'native-order-two' ? [0n, -1n, 0n, 1n] : [1n, 0n, -1n]), f = b.owner, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds);
    const input = kind === 'complex-trace' ? f.inverse(b.ctx, b.a) : f.inverse(b.ctx, f.multiply(b.ctx, f.fromInteger(b.ctx, 2n), f.embed(b.ctx, b.x)));
    const spies = [vi.spyOn(hermite, 'reduceAlgebraicHermiteWithin'), ...(kind === 'native-order-two' ? [vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin'), vi.spyOn(principal, 'principalAlgebraicDivisorWithin')] : [])];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('unnecessary general reduction');});
    let candidate; try {candidate = produceLazyAlgebraicCandidate(fresh(), curve, input, bounds);} finally {for (const spy of spies) spy.mockRestore();}
    expect(candidate.kind).toBe('elementary'); if (candidate.kind !== 'elementary') throw Error('known logarithm');
    expect(kind === 'complex-trace' ? candidate.primitive.base.terms[0].quotient.relative.degree : candidate.primitive.terms.length).toBe(kind === 'complex-trace' ? 2 : 1);
    const checked = checkLazyAlgebraicCandidate(fresh(), curve, input, candidate, bounds); if (checked.kind !== 'elementary') throw Error('checked known logarithm');
    const data = encodeNativeAlgebraicElementary(fresh(), curve, input, checked, bounds), restore = disableLazyProducers();
    try {decodeNativeAlgebraicElementary(fresh(), curve, input, data, bounds);} finally {restore();}
  }, 60000);
  it('retains complete nonzero holomorphic negative coverage and producer-independent version-four replay', () => {
    const b = quadratic([1n, -1n, 0n, 1n]), f = b.owner, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds), input = f.inverse(b.ctx, b.a);
    const candidate = produceLazyAlgebraicCandidate(fresh(), curve, input, bounds), proof = checkLazyAlgebraicCandidate(fresh(), curve, input, candidate, bounds);
    expect(proof.kind === 'non-elementary' && proof.reason).toBe('nonzero-holomorphic-remainder'); if (proof.kind !== 'non-elementary' || !('method' in proof) || proof.reason !== 'nonzero-holomorphic-remainder') throw Error('known complete holomorphic obstruction');
    expect(proof.globalFunctions.dimension).toBe(1); expect(proof.holomorphic.entries.every(p => p.order !== null && p.order >= 0n)).toBe(true);
    const data = JSON.parse(JSON.stringify(encodeLazyAlgebraicNegative(fresh(), curve, input, proof, bounds))) as {tag: string; version: number; payload: unknown}, restore = disableLazyProducers();
    try {const saved = decodeLazyAlgebraicNegative(fresh(), curve, input, data, bounds); verifyLazyAlgebraicDecision(fresh(), curve, input, saved, bounds);} finally {restore();}
    for (const altered of [{...proof, holomorphic: {...proof.holomorphic, entries: []}}, {...proof, globalFunctions: {...proof.globalFunctions, dimension: 1 as const}}, {...proof, remainder: f.fromInteger(b.ctx, 0n)}, {...proof, logarithms: {...proof.logarithms, components: []}, relations: {...proof.relations, basisIndices: [0]}}]) expect(() => verifyLazyAlgebraicDecision(fresh(), curve, input, altered, bounds)).toThrow();
    for (const mutate of [(e: Record<string, unknown>) => {e.verified = true;}, (e: Record<string, unknown>) => {e.later = 'unperformed';}, (e: Record<string, unknown>) => {e.holomorphic = null;}, (e: Record<string, unknown>) => {const g = e.globalFunctions as Record<string, unknown>; g.basis = [];}, (e: Record<string, unknown>) => {const c = e.common as Record<string, unknown>; c.conditions = [];}]) {
      const body = structuredClone(unpackAlgebraicArtifactData(fresh(), data.payload, bounds)) as {evidence: Record<string, unknown>}; mutate(body.evidence);
      expect(() => decodeLazyAlgebraicNegative(fresh(), curve, input, {...data, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();
    }
    expect(() => decodeLazyAlgebraicNegative(fresh(), curve, b.a, data, bounds)).toThrow('verification-failed');
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodeLazyAlgebraicNegative(fresh(), curve, input, data, {...bounds, ...patch})).toThrow('resource-limit');
    const ctx = fresh(); verifyLazyAlgebraicDecision(ctx, curve, input, proof, bounds); const work = ctx.usage.work; verifyLazyAlgebraicDecision(ctx, curve, input, proof, bounds); expect(ctx.usage.work).toBe(2 * work);
    const exhausted = new ExecutionContext({...fresh().limits, work: 1}); expect(() => decodeLazyAlgebraicNegative(exhausted, curve, input, data, bounds)).toThrow('resource-limit'); expect(() => exhausted.tick()).toThrow('resource-limit');
  }, 60000);
  it('keeps combined non-torsion residue evidence and version-four replay', () => {
    const b = quadratic([-2n, 0n, 0n, 1n]), f = b.owner, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds), input = f.inverse(b.ctx, f.multiply(b.ctx, f.subtract(b.ctx, f.embed(b.ctx, b.x), f.fromInteger(b.ctx, 3n)), b.a));
    const candidate = produceLazyAlgebraicCandidate(fresh(), curve, input, bounds), proof = checkLazyAlgebraicCandidate(fresh(), curve, input, candidate, bounds);
    expect(proof.kind === 'non-elementary' && proof.reason).toBe('non-torsion-residue-divisor'); if (proof.kind !== 'non-elementary' || !('method' in proof) || proof.reason !== 'non-torsion-residue-divisor') throw Error('known combined-divisor obstruction');
    expect(proof.logarithms.components[0].multiple.method).toBe('ramified-cantor');
    const data = encodeLazyAlgebraicNegative(fresh(), curve, input, proof, bounds), restore = disableLazyProducers();
    try {decodeLazyAlgebraicNegative(fresh(), curve, input, data, bounds);} finally {restore();}
    expect(() => verifyLazyAlgebraicDecision(fresh(), curve, input, {...proof, logarithms: {...proof.logarithms, components: []}}, bounds)).toThrow('verification-failed');
  }, 60000);
});
