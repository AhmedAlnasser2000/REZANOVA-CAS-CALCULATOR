import {describe, it, expect, vi} from 'vitest';
import {base, quadratic, fresh, bounds} from './__tests__/algebraic-support';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {certifyAlgebraicDifferential} from './algebraic-differential';
import {certifyAlgebraicPoleCoverage, verifyAlgebraicPoleCoverage} from './algebraic-pole-coverage';
import {encodeAlgebraicPoleCoverage, decodeAlgebraicPoleCoverage} from './algebraic-pole-coverage-wire';
import {equalAlgebraicPlaces} from './algebraic-place';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {ExecutionContext} from './execution';
import * as divisors from './algebraic-divisor';
import * as rr from './algebraic-riemann-roch';
import * as valuations from './algebraic-valuation';
import * as coverage from './algebraic-pole-coverage';

describe('complete integral-coordinate pole coverage', () => {
  it('agrees with full differential orders without principal-divisor or Hess producers', () => {
    const b = quadratic([1n, -1n, 0n, 1n]), f = b.owner, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds);
    const input = f.inverse(b.ctx, b.a), legacy = certifyAlgebraicDifferential(fresh(), curve, input, bounds);
    const principal = vi.spyOn(divisors, 'principalAlgebraicDivisorWithin').mockImplementation(() => {throw Error('numerator factorization disabled');});
    const hess = vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin').mockImplementation(() => {throw Error('Hess disabled');});
    try {
      const proof = certifyAlgebraicPoleCoverage(fresh(), curve, input, bounds); verifyAlgebraicPoleCoverage(fresh(), curve, input, proof, bounds);
      for (const entry of proof.entries) expect(entry.order).toBe(legacy.divisor?.entries.find(e => equalAlgebraicPlaces(b.ctx, curve, e.place, entry.place))?.coefficient ?? 0n);
      for (const pole of legacy.divisor?.entries.filter(e => e.coefficient < 0n) ?? []) expect(proof.entries.some(e => equalAlgebraicPlaces(b.ctx, curve, e.place, pole.place) && e.order === pole.coefficient)).toBe(true);
      expect(proof.entries.every(e => e.order !== null && e.order >= -1n)).toBe(true); expect(proof).not.toHaveProperty('principal'); expect(proof).not.toHaveProperty('globalFunctions');
    } finally {principal.mockRestore(); hess.mockRestore();}
  });
  it('retains denominator cancellations and repeated finite/infinity poles', () => {
    const b = base(), f = b.field, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds);
    const inputs = [f.fromInteger(b.ctx, 0n), f.multiply(b.ctx, b.x, b.x), f.inverse(b.ctx, f.multiply(b.ctx, b.x, b.x)), f.make(b.ctx, b.ring.make(b.ctx, [b.q(1n), b.q(0n), b.q(1n)]), b.ring.make(b.ctx, [b.q(-1n), b.q(1n)]))];
    for (const input of inputs) {
      const proof = certifyAlgebraicPoleCoverage(fresh(), curve, input, bounds);
      if (f.isZero(b.ctx, input)) expect(proof.entries.every(e => e.valuation === null && e.order === null)).toBe(true);
      else {
        const legacy = certifyAlgebraicDifferential(fresh(), curve, input, bounds);
        for (const e of proof.entries) expect(e.order).toBe(legacy.divisor?.entries.find(p => equalAlgebraicPlaces(b.ctx, curve, p.place, e.place))?.coefficient ?? 0n);
      }
      expect(Object.isFrozen(proof.entries)).toBe(true); expect(Object.isFrozen(proof.normalization.integral)).toBe(true);
    }
    const polynomial = certifyAlgebraicPoleCoverage(fresh(), curve, inputs[1], bounds), inverse = certifyAlgebraicPoleCoverage(fresh(), curve, inputs[2], bounds);
    expect(polynomial.denominatorFactors.kind === 'factorization' && polynomial.denominatorFactors.factors.length).toBe(0);
    expect(polynomial.entries.some(e => e.place.order.infinity && e.order === -4n)).toBe(true);
    expect(inverse.entries.some(e => !e.place.order.infinity && e.order === -2n)).toBe(true);
  });
  it('rejects changed coordinates, missing places, valuations and conditions', () => {
    const b = base(), f = b.field, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds), input = f.inverse(b.ctx, b.x), proof = certifyAlgebraicPoleCoverage(fresh(), curve, input, bounds);
    for (const changed of [
      {...proof, normalization: {...proof.normalization, coordinates: []}}, {...proof, normalization: {...proof.normalization, integral: []}},
      {...proof, finite: []}, {...proof, entries: proof.entries.slice(1)}, {...proof, entries: proof.entries.map(e => ({...e, order: 123n}))},
      {...proof, entries: proof.entries.map(e => ({...e, valuation: null}))}, {...proof, conditions: []},
      {...proof, denominatorFactors: {...proof.denominatorFactors, factors: []}}, {...proof, geometry: {...proof.geometry, genus: 8n}},
    ]) expect(() => verifyAlgebraicPoleCoverage(fresh(), curve, input, changed, bounds)).toThrow();
    expect(() => verifyAlgebraicPoleCoverage(fresh(), curve, b.x, proof, bounds)).toThrow('verification-failed');
    const foreign = base(); expect(() => verifyAlgebraicPoleCoverage(fresh(), curve, foreign.x, proof, bounds)).toThrow('domain-mismatch');
  });
  it('bounds whole artifacts and replays without search or derivative producers', () => {
    const b = base(), f = b.field, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds), input = f.inverse(b.ctx, b.x), proof = certifyAlgebraicPoleCoverage(fresh(), curve, input, bounds);
    const data = JSON.parse(JSON.stringify(encodeAlgebraicPoleCoverage(fresh(), curve, input, proof, bounds))) as {tag: string; version: number; payload: unknown};
    const restore = disableAlgebraicIntegrationProducers(), noValuation = vi.spyOn(valuations, 'algebraicValuationWithin').mockImplementation(() => {throw Error('valuation producer disabled');}), noCoverage = vi.spyOn(coverage, 'certifyAlgebraicPoleCoverageWithin').mockImplementation(() => {throw Error('coverage producer disabled');});
    try {const saved = decodeAlgebraicPoleCoverage(fresh(), curve, input, data, bounds); verifyAlgebraicPoleCoverage(fresh(), curve, input, saved, bounds);} finally {restore(); noValuation.mockRestore(); noCoverage.mockRestore();}
    for (const mutate of [(e: Record<string, unknown>) => {e.entries = [];}, (e: Record<string, unknown>) => {e.verified = true;}, (e: Record<string, unknown>) => {e.conditions = [];}, (e: Record<string, unknown>) => {e.rule = 'trusted';}]) {
      const body = structuredClone(unpackAlgebraicArtifactData(fresh(), data.payload, bounds)) as {evidence: Record<string, unknown>}; mutate(body.evidence);
      expect(() => decodeAlgebraicPoleCoverage(fresh(), curve, input, {...data, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();
    }
    expect(() => decodeAlgebraicPoleCoverage(fresh(), curve, b.x, data, bounds)).toThrow('verification-failed');
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodeAlgebraicPoleCoverage(fresh(), curve, input, data, {...bounds, ...patch})).toThrow('resource-limit');
    const cold = fresh(); decodeAlgebraicPoleCoverage(cold, curve, input, data, bounds); const first = cold.usage.work; decodeAlgebraicPoleCoverage(cold, curve, input, data, bounds); expect(cold.usage.work).toBe(2 * first);
    const exhausted = new ExecutionContext({...fresh().limits, work: 1}); expect(() => decodeAlgebraicPoleCoverage(exhausted, curve, input, data, bounds)).toThrow('resource-limit'); expect(() => exhausted.tick()).toThrow('resource-limit');
  });
});
