import {describe, it, expect, vi} from 'vitest';
import {quadratic, fresh, bounds} from './__tests__/algebraic-support';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {produceGeometricAlgebraicCandidate, checkGeometricAlgebraicCandidate} from './algebraic-geometric-decision';
import {encodeGeometricAlgebraicNegative, decodeGeometricAlgebraicNegative} from './algebraic-geometric-wire';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import * as geometric from './algebraic-geometric-logarithms';
import * as dispatch from './algebraic-principal-multiple-dispatch';
import * as ramified from './ramified-divisor-torsion';

describe('complete geometric negative replay', () => {
  it.each(['infinity-principal-part-obstruction', 'nonzero-holomorphic-remainder', 'non-torsion-residue-divisor'] as const)('replays %s independently with explicit owner/input binding', reason => {
    const residue = reason === 'non-torsion-residue-divisor', b = quadratic(residue ? [-2n, 0n, 0n, 1n] : [1n, -1n, 0n, 1n]), f = b.owner, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds), x = f.embed(b.ctx, b.x), inv = f.inverse(b.ctx, b.a);
    const input = residue ? f.exactDivide(b.ctx, inv, f.subtract(b.ctx, x, f.fromInteger(b.ctx, 3n))) : reason === 'infinity-principal-part-obstruction' ? f.multiply(b.ctx, x, inv) : inv;
    const candidate = produceGeometricAlgebraicCandidate(fresh(), curve, input, bounds), proof = checkGeometricAlgebraicCandidate(fresh(), curve, input, candidate, bounds);
    expect(proof.kind === 'non-elementary' && proof.reason).toBe(reason); if (proof.kind !== 'non-elementary') throw Error('known non-elementary fixture');
    const data = JSON.parse(JSON.stringify(encodeGeometricAlgebraicNegative(fresh(), curve, input, proof, bounds))) as {tag: string; version: number; payload: unknown}, restore = disableAlgebraicIntegrationProducers(), extra = [vi.spyOn(geometric, 'constructGeometricAlgebraicLogarithmsWithin'), vi.spyOn(dispatch, 'decideAlgebraicPrincipalMultipleWithin'), vi.spyOn(ramified, 'tryDecideRamifiedDivisorTorsionWithin')];
    for (const p of extra) p.mockImplementation(() => {throw Error('producer disabled');});
    try {const decoded = decodeGeometricAlgebraicNegative(fresh(), curve, input, data, bounds); expect(decoded.reason).toBe(reason);} finally {for (const p of extra) p.mockRestore(); restore();}
    expect(() => decodeGeometricAlgebraicNegative(fresh(), curve, b.a, data, bounds)).toThrow('verification-failed');
    expect(() => decodeGeometricAlgebraicNegative(fresh(), curve, input, {...data, version: 1}, bounds)).toThrow('invalid-input');
    const body = structuredClone(unpackAlgebraicArtifactData(fresh(), data.payload, bounds)) as {evidence: {common: {conditions: unknown[]}; logarithms?: {evidence: {components: unknown[]}}}};
    if (residue) body.evidence.logarithms!.evidence.components = []; else body.evidence.common.conditions = [];
    expect(() => decodeGeometricAlgebraicNegative(fresh(), curve, input, {...data, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();
    for (const patch of [{artifactNodes: 1}, {artifactDepth: 1}, {artifactBytes: 1}]) expect(() => decodeGeometricAlgebraicNegative(fresh(), curve, input, data, {...bounds, ...patch})).toThrow('resource-limit');
  }, 60000);
});
