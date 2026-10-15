import {it, expect, vi} from 'vitest';
import {base, quadratic, fresh, bounds} from './__tests__/algebraic-support';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {decomposeAlgebraicPlaces, evaluateAlgebraicPlaceIntegral} from './algebraic-place';
import {tryAlgebraicIntegralResidueWithin, verifyAlgebraicIntegralResidueWithin} from './algebraic-integral-residue';
import {expandAlgebraicPlace} from './algebraic-local';
import {algebraicValuation} from './algebraic-valuation';
import {recordRationalGcdEvidence} from './rational-gcd-evidence';
import {constructAlgebraicCoveredResidues} from './algebraic-covered-residues';
import {encodeAlgebraicCoveredResidues, decodeAlgebraicCoveredResidues} from './algebraic-covered-wire';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import * as direct from './algebraic-integral-residue';
import * as covered from './algebraic-covered-residues';

it('checks complete quotient maps and units at ramified and split places', () => {
  for (const polynomial of [[0n, 1n], [1n, 0n, 0n, 1n]]) {
    const b = quadratic(polynomial), f = b.owner, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds), r = curve.finite.lattice.scalar.ring, C = curve.coordinates.constantOwner;
    const places = decomposeAlgebraicPlaces(fresh(), curve, r.make(b.ctx, [C.fromInteger(b.ctx, 0n), C.fromInteger(b.ctx, 1n)]), false, bounds), x = f.embed(b.ctx, b.x), input = f.exactDivide(b.ctx, f.add(b.ctx, x, b.a), f.add(b.ctx, x, f.fromInteger(b.ctx, 2n)));
    for (const place of places.places) {
      const ctx = fresh(), proof = ctx.operation(() => recordRationalGcdEvidence(ctx, () => tryAlgebraicIntegralResidueWithin(ctx, curve, place, input)).value); expect(proof).not.toBeNull(); if (!proof) throw Error('known coordinate units');
      expect(place.residue.equal(b.ctx, proof.value, evaluateAlgebraicPlaceIntegral(b.ctx, curve, place, input))).toBe(true);
      const verify = fresh(); verify.operation(() => verifyAlgebraicIntegralResidueWithin(verify, curve, place, input, proof));
      for (const changed of [{...proof, units: []}, {...proof, coordinates: []}, {...proof, inverses: proof.inverses.map(() => place.algebra.base.fromInteger(b.ctx, 0n))}, {...proof, value: place.residue.fromInteger(b.ctx, 37n)}]) {const c = fresh(); expect(() => c.operation(() => verifyAlgebraicIntegralResidueWithin(c, curve, place, input, changed))).toThrow('verification-failed');}
      expect(() => verifyAlgebraicIntegralResidueWithin(fresh(), curve, place, x, proof)).toThrow('verification-failed'); expect(Object.isFrozen(proof.units)).toBe(true);
    }
  }
});
it('replays direct residue maps without evaluation, local, field or search producers', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), input = b.field.inverse(b.ctx, b.x), proof = constructAlgebraicCoveredResidues(fresh(), curve, input, bounds);
  expect(proof.entries.some(p => p.method === 'quotient-map')).toBe(true);
  const data = JSON.parse(JSON.stringify(encodeAlgebraicCoveredResidues(fresh(), curve, input, proof, bounds))) as {tag: string; version: number; payload: unknown}, restore = disableAlgebraicIntegrationProducers(), spies = [vi.spyOn(direct, 'tryAlgebraicIntegralResidueWithin'), vi.spyOn(covered, 'constructAlgebraicCoveredResiduesWithin')];
  for (const spy of spies) spy.mockImplementation(() => {throw Error('direct producer disabled');});
  try {decodeAlgebraicCoveredResidues(fresh(), curve, input, data, bounds);} finally {for (const spy of spies) spy.mockRestore(); restore();}
  for (const change of [(e: Record<string, unknown>) => {const v = e.evaluation as Record<string, unknown>; v.units = [];}, (e: Record<string, unknown>) => {(e.parameter as Record<string, unknown>).method = 'ideal-basis';}, (e: Record<string, unknown>) => {e.method = 'local-lift';}, (e: Record<string, unknown>) => {e.verified = true;}]) {
    const body = structuredClone(unpackAlgebraicArtifactData(fresh(), data.payload, bounds)) as {evidence: {entries: {evidence: Record<string, unknown>}[]}};
    const at = body.evidence.entries.find(p => p.evidence.method === 'quotient-map'); if (!at) throw Error('known direct map'); change(at.evidence);
    expect(() => decodeAlgebraicCoveredResidues(fresh(), curve, input, {...data, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();
  }
  expect(() => decodeAlgebraicCoveredResidues(fresh(), curve, b.x, data, bounds)).toThrow('verification-failed');
});
it('selects complete local lifting before search for locally regular nonunit coordinates', () => {
  const b = quadratic([1n, 0n, 1n]), f = b.owner, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds), r = curve.finite.lattice.scalar.ring, C = curve.coordinates.constantOwner;
  const places = decomposeAlgebraicPlaces(fresh(), curve, r.make(b.ctx, [C.fromInteger(b.ctx, 0n), C.fromInteger(b.ctx, 1n)]), false, bounds), input = f.exactDivide(b.ctx, f.subtract(b.ctx, b.a, f.fromInteger(b.ctx, 1n)), f.embed(b.ctx, b.x));
  const place = places.places.find(p => algebraicValuation(fresh(), curve, p, input, bounds).value >= 0n); if (!place) throw Error('known regular branch');
  expect(tryAlgebraicIntegralResidueWithin(fresh(), curve, place, input)).toBeNull();
  const lifted = expandAlgebraicPlace(fresh(), curve, place, input, 1n, bounds); expect(lifted.digits).toHaveLength(1); expect(place.residue.isZero(b.ctx, lifted.digits[0])).toBe(true);
});
