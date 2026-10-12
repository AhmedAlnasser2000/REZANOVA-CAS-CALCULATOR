import { describe, it, expect, vi } from 'vitest';
import { base, quadratic, bounds, fresh } from './__tests__/algebraic-support';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { certifyAlgebraicCurveGeometry, verifyAlgebraicCurveGeometry } from './algebraic-curve-geometry';
import { decomposeAlgebraicPlaces, evaluateAlgebraicPlaceIntegral } from './algebraic-place';
import { expandAlgebraicPlace, verifyAlgebraicLocalExpansion } from './algebraic-local';
import * as linear from './linear-system';
import * as modules from './polynomial-module';

describe('canonical divisors and complete bounded local reconstruction', () => {
  it.each([{p: [0n, 1n], genus: 0n}, {p: [0n, 0n, 0n, 1n], genus: 0n}, {p: [0n, -1n, 0n, 1n], genus: 1n}, {p: [1n, 0n, 0n, 0n, 0n, 1n], genus: 2n}])('certifies genus $genus for y²=$p', ({p, genus}) => {
    const b = quadratic(p), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds);
    const proof = certifyAlgebraicCurveGeometry(b.ctx, curve, bounds); expect(proof.genus).toBe(genus); expect(proof.canonical.degree).toBe(2n * genus - 2n);
    expect(proof.globalFunctions.dimension).toBe(1); verifyAlgebraicCurveGeometry(fresh(), curve, proof, bounds);
  });
  it('reconstructs rational power-series digits with exact remainder', () => {
    const b = base(), constants = certifyAlgebraicConstantField(b.ctx, b.field, bounds), curve = certifyAlgebraicCurve(b.ctx, b.field, constants, bounds);
    const r = curve.finite.lattice.scalar.ring, prime = r.make(b.ctx, [r.domain.fromInteger(b.ctx, 0n), r.domain.fromInteger(b.ctx, 1n)]);
    const place = decomposeAlgebraicPlaces(b.ctx, curve, prime, false, bounds).places[0], value = b.field.inverse(b.ctx, b.field.subtract(b.ctx, b.field.fromInteger(b.ctx, 1n), b.x));
    const proof = expandAlgebraicPlace(b.ctx, curve, place, value, 3n, bounds);
    expect(proof.digits).toHaveLength(3); expect(proof.digits.every(v => place.residue.equal(b.ctx, v, place.residue.fromInteger(b.ctx, 1n)))).toBe(true);
    expect(proof.error?.value).toBe(3n); verifyAlgebraicLocalExpansion(fresh(), curve, place, value, 3n, proof, bounds);
    const spies = [vi.spyOn(linear, 'solveLinearSystem'), vi.spyOn(modules, 'polynomialModuleHermite')];
    for (const spy of spies) spy.mockImplementation(() => { throw new Error('producer disabled'); });
    try { verifyAlgebraicLocalExpansion(fresh(), curve, place, value, 3n, proof, bounds); } finally { for (const spy of spies) spy.mockRestore(); }
    expect(() => expandAlgebraicPlace(fresh(), curve, place, b.field.inverse(b.ctx, b.x), 2n, bounds)).toThrow(/regular/);
  });
  it('handles a locally regular function whose base denominator vanishes', () => {
    const b = quadratic([-2n, 0n, 0n, 1n]), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds);
    const r = curve.finite.lattice.scalar.ring, prime = r.make(b.ctx, [r.domain.fromInteger(b.ctx, -3n), r.domain.fromInteger(b.ctx, 1n)]);
    const place = decomposeAlgebraicPlaces(b.ctx, curve, prime, false, bounds).places.find(p => p.residue.equal(b.ctx, evaluateAlgebraicPlaceIntegral(b.ctx, curve, p, b.a), p.residue.fromInteger(b.ctx, 5n)))!;
    const x = b.owner.embed(b.ctx, b.x), value = b.owner.exactDivide(b.ctx, b.owner.subtract(b.ctx, b.a, b.owner.fromInteger(b.ctx, 5n)), b.owner.subtract(b.ctx, x, b.owner.fromInteger(b.ctx, 3n)));
    const proof = expandAlgebraicPlace(b.ctx, curve, place, value, 2n, bounds);
    expect(proof.denominatorOrder.quotients).toHaveLength(1); expect(proof.regular?.value).toBe(0n);
    verifyAlgebraicLocalExpansion(fresh(), curve, place, value, 2n, proof, bounds);
  });
  it('reconstructs at the ramified infinity place using only the localized chart', () => {
    const b = quadratic([1n, 0n, 0n, 1n]), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds);
    const r = curve.infinity.lattice.scalar.ring, place = decomposeAlgebraicPlaces(b.ctx, curve,
      r.make(b.ctx, [r.domain.fromInteger(b.ctx, 0n), r.domain.fromInteger(b.ctx, 1n)]), true, bounds).places[0];
    const value = b.owner.exactDivide(b.ctx, b.owner.embed(b.ctx, b.x), b.a), proof = expandAlgebraicPlace(b.ctx, curve, place, value, 3n, bounds);
    expect(place.ramification).toBe(2n); expect(proof.regular?.value).toBe(1n);
    expect(place.residue.isZero(b.ctx, proof.digits[0])).toBe(true); verifyAlgebraicLocalExpansion(fresh(), curve, place, value, 3n, proof, bounds);
  });
});
