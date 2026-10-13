import { it, expect, vi } from 'vitest';
import { base, quadratic, fresh, bounds } from './__tests__/algebraic-support';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { reduceAlgebraicDifferential, verifyAlgebraicDifferentialReduction } from './algebraic-differential-reduction';
import { encodeAlgebraicDifferentialReduction, decodeAlgebraicDifferentialReduction } from './algebraic-reduction-wire';
import * as derivative from './algebraic-derivative';
import * as linear from './linear-system';
import * as rr from './algebraic-riemann-roch';
import * as local from './algebraic-local';
import * as places from './algebraic-place';
import * as factor from './algebraic-factorization';
import * as square from './factorization-square-free';
import * as hermite from './algebraic-hermite';
import * as infinity from './algebraic-infinity-reduction';
import * as residues from './algebraic-differential-residues';

it('replays complete finite, infinity and residue evidence without producers', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), inv = b.field.inverse(b.ctx, b.x), input = b.field.add(b.ctx, b.x, b.field.add(b.ctx, inv, b.field.multiply(b.ctx, inv, inv))), proof = reduceAlgebraicDifferential(fresh(), curve, input, bounds);
  expect(proof.kind).toBe('simple-poles'); const data = encodeAlgebraicDifferentialReduction(fresh(), curve, input, proof, bounds);
  const spies = [vi.spyOn(derivative, 'differentiateAlgebraicWithin'), vi.spyOn(linear, 'solveLinearSystem'), vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin'), vi.spyOn(local, 'algebraicLocalParameterWithin'), vi.spyOn(local, 'expandAlgebraicPlaceWithin'),
    vi.spyOn(places, 'decomposeAlgebraicPlacesWithin'), vi.spyOn(factor, 'factorAlgebraicPolynomialWithin'), vi.spyOn(square, 'checkedFactorSquareFree'), vi.spyOn(hermite, 'reduceAlgebraicHermiteWithin'), vi.spyOn(infinity, 'reduceAlgebraicInfinityWithin'), vi.spyOn(residues, 'algebraicDifferentialResiduesWithin')];
  for (const s of spies) s.mockImplementation(() => { throw Error('producer disabled'); });
  try { const decoded = decodeAlgebraicDifferentialReduction(fresh(), curve, input, data, bounds); verifyAlgebraicDifferentialReduction(fresh(), curve, input, decoded, bounds); expect(decoded.kind).toBe('simple-poles'); }
  finally { for (const s of spies) s.mockRestore(); }
});
it('retains nonrational residue owners and infinity inconsistency in fresh replay', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), input = b.field.inverse(b.ctx, b.field.add(b.ctx, b.field.multiply(b.ctx, b.x, b.x), b.field.fromInteger(b.ctx, 1n))), p = reduceAlgebraicDifferential(fresh(), curve, input, bounds), data = encodeAlgebraicDifferentialReduction(fresh(), curve, input, p, bounds), d = decodeAlgebraicDifferentialReduction(fresh(), curve, input, data, bounds);
  expect(d.kind).toBe('simple-poles'); if (d.kind === 'simple-poles') expect(d.residues.entries.some(e => e.place.degree === 2n && e.order === -1n)).toBe(true);
  const q = quadratic([1n, -1n, 0n, 1n]), qc = certifyAlgebraicCurve(q.ctx, q.owner, certifyAlgebraicConstantField(q.ctx, q.owner, bounds), bounds), f = q.owner.exactDivide(q.ctx, q.owner.embed(q.ctx, q.x), q.a), no = reduceAlgebraicDifferential(fresh(), qc, f, bounds);
  expect(no.kind).toBe('infinity-unsolved'); const wire = encodeAlgebraicDifferentialReduction(fresh(), qc, f, no, bounds), decoded = decodeAlgebraicDifferentialReduction(fresh(), qc, f, wire, bounds); expect(decoded.kind).toBe('infinity-unsolved');
});
it('bounds the complete artifact and binds its expected input before returning evidence', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), input = b.field.inverse(b.ctx, b.x), p = reduceAlgebraicDifferential(fresh(), curve, input, bounds), data = encodeAlgebraicDifferentialReduction(fresh(), curve, input, p, bounds);
  expect(() => decodeAlgebraicDifferentialReduction(fresh(), curve, b.x, data, bounds)).toThrow('domain-mismatch');
  expect(() => decodeAlgebraicDifferentialReduction(fresh(), curve, input, {...data as object, version: 2}, bounds)).toThrow('invalid-input');
  expect(() => decodeAlgebraicDifferentialReduction(fresh(), curve, input, data, {...bounds, artifactNodes: 3})).toThrow('resource-limit');
  expect(() => verifyAlgebraicDifferentialReduction(fresh(), curve, input, {...p, hermite: {...p.hermite, fieldPart: b.x}}, bounds)).toThrow('verification-failed');
});
