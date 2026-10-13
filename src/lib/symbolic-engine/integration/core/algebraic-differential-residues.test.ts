import { it, expect, vi } from 'vitest';
import { base, quadratic, fresh, bounds } from './__tests__/algebraic-support';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { algebraicDifferentialResidues, verifyAlgebraicDifferentialResidues } from './algebraic-differential-residues';
import { constantMinimalPolynomialWithin, verifyConstantMinimalPolynomialWithin } from './constant-minimal-polynomial';
import { rationalField as Q } from './field';
import { PolynomialRing } from './polynomial';
import { constructAlgebraicExtension } from './algebraic-field';
import * as linear from './linear-system';
import * as derivative from './algebraic-derivative';
import * as local from './algebraic-local';
import * as place from './algebraic-place';

it('retains rational finite/infinity residues and explicit zero entries', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), input = b.field.inverse(b.ctx, b.x), p = algebraicDifferentialResidues(fresh(), curve, input, bounds);
  expect(p.entries.filter(e => e.order === -1n).length).toBe(2); expect(curve.coordinates.constantOwner.isZero(b.ctx, p.totalResidue)).toBe(true);
  expect(p.lcm.common.ring.degree(b.ctx, p.lcm.common)).toBe(2); verifyAlgebraicDifferentialResidues(fresh(), curve, input, p, bounds);
  const zero = algebraicDifferentialResidues(fresh(), curve, b.field.fromInteger(b.ctx, 0n), bounds); expect(zero.entries.every(e => e.order === null && e.minimal === null)).toBe(true);
});
it('accounts for ramification rather than reporting residues of a function', () => {
  const b = quadratic(), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds), input = b.owner.inverse(b.ctx, b.owner.embed(b.ctx, b.x)), p = algebraicDifferentialResidues(fresh(), curve, input, bounds);
  const poles = p.entries.filter(e => e.order === -1n); expect(poles.length).toBe(2);
  expect(poles.some(e => e.place.residue.equal(b.ctx, e.value, e.place.residue.fromInteger(b.ctx, 2n)))).toBe(true);
  expect(poles.some(e => e.place.residue.equal(b.ctx, e.value, e.place.residue.fromInteger(b.ctx, -2n)))).toBe(true);
});
it('covers nonrational places and their exact residue polynomials over actual constants', () => {
  const b = base(), denominator = b.field.add(b.ctx, b.field.multiply(b.ctx, b.x, b.x), b.field.fromInteger(b.ctx, 1n)), input = b.field.inverse(b.ctx, denominator), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), p = algebraicDifferentialResidues(fresh(), curve, input, bounds);
  const poles = p.entries.filter(e => e.order === -1n); expect(poles.length).toBe(1); expect(poles[0].place.degree).toBe(2n);
  const poly = poles[0].minimal!.polynomial; expect(poly.ring.degree(b.ctx, poly)).toBe(2); expect(curve.coordinates.constantOwner.equal(b.ctx, poly.coefficients[0], curve.coordinates.constantOwner.exactDivide(b.ctx, curve.coordinates.constantOwner.fromInteger(b.ctx, 1n), curve.coordinates.constantOwner.fromInteger(b.ctx, 4n)))).toBe(true);
});
it('keeps residues already in a non-Galois constant field linear over that field', () => {
  const c = fresh(), r = new PolynomialRing(Q, 'a'), a = constructAlgebraicExtension(c, r, r.make(c, [-2n, 0n, 0n, 1n].map(n => Q.fromInteger(c, n))), bounds), s = new PolynomialRing(a, 'b'), b = constructAlgebraicExtension(c, s, s.make(c, [-3n, 0n, 1n].map(n => a.fromInteger(c, n))), bounds);
  const input = b.embed(c, a.generator(c)), p = constantMinimalPolynomialWithin(c, a, b, input, bounds); expect(p.polynomial.ring.degree(c, p.polynomial)).toBe(1);
  expect(a.equal(c, p.polynomial.coefficients[0], a.negate(c, a.generator(c)))).toBe(true); verifyConstantMinimalPolynomialWithin(fresh(), a, b, input, p, bounds);
});
it('verifies residue and minimal-polynomial evidence with producers disabled', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), input = b.field.inverse(b.ctx, b.x), p = algebraicDifferentialResidues(fresh(), curve, input, bounds);
  const spies = [vi.spyOn(linear, 'solveLinearSystem'), vi.spyOn(derivative, 'differentiateAlgebraicWithin'), vi.spyOn(local, 'expandAlgebraicPlaceWithin'), vi.spyOn(place, 'decomposeAlgebraicPlacesWithin')];
  for (const spy of spies) spy.mockImplementation(() => { throw Error('producer disabled'); });
  try { verifyAlgebraicDifferentialResidues(fresh(), curve, input, p, bounds); } finally { for (const spy of spies) spy.mockRestore(); }
});
it('rejects omitted infinity, altered residue values, missing minimal evidence and changed totals', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), input = b.field.inverse(b.ctx, b.x), p = algebraicDifferentialResidues(fresh(), curve, input, bounds);
  expect(() => verifyAlgebraicDifferentialResidues(fresh(), curve, input, {...p, entries: p.entries.slice(0, -1)}, bounds)).toThrow('verification-failed');
  const entries = p.entries.map((e, i) => i === 0 ? {...e, value: e.place.residue.fromInteger(b.ctx, 0n)} : e);
  expect(() => verifyAlgebraicDifferentialResidues(fresh(), curve, input, {...p, entries}, bounds)).toThrow('verification-failed');
  expect(() => verifyAlgebraicDifferentialResidues(fresh(), curve, input, {...p, totalResidue: curve.coordinates.constantOwner.fromInteger(b.ctx, 1n)}, bounds)).toThrow('verification-failed');
  expect(() => algebraicDifferentialResidues(fresh(), curve, b.field.multiply(b.ctx, input, input), bounds)).toThrow('invalid-input');
});
