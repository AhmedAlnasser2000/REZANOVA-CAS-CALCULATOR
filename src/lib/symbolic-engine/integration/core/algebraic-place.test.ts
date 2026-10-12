import { describe, it, expect, vi } from 'vitest';
import { base, quadratic, bounds, fresh } from './__tests__/algebraic-support';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { decomposeAlgebraicPlaces, verifyAlgebraicPlaceDecomposition, evaluateAlgebraicPlaceIntegral } from './algebraic-place';
import { invertCurveIdeal, verifyCurveIdealInverse, multiplyCurveIdeals, equalCurveIdeals, unitCurveIdeal } from './algebraic-fractional-ideal';
import * as linear from './linear-system';
import * as factorization from './algebraic-factorization';

describe('complete owned algebraic places and fractional ideals', () => {
  it('retains a nonrational degree-two rational-field place', () => {
    const b = base(), constants = certifyAlgebraicConstantField(b.ctx, b.field, bounds), curve = certifyAlgebraicCurve(b.ctx, b.field, constants, bounds);
    const r = curve.coordinates.scalar.ring, c = r.domain, prime = r.make(b.ctx, [c.fromInteger(b.ctx, 1n), c.fromInteger(b.ctx, 0n), c.fromInteger(b.ctx, 1n)]);
    const proof = decomposeAlgebraicPlaces(b.ctx, curve, prime, false, bounds);
    expect(proof.places).toHaveLength(1); expect(proof.places[0].degree).toBe(2n); expect(proof.places[0].ramification).toBe(1n);
    verifyAlgebraicPlaceDecomposition(fresh(), curve, prime, false, proof, bounds);
    expect(Object.isFrozen(proof.places[0])).toBe(true);
  });
  it('covers ramification at zero and infinity for y²=x', () => {
    const b = quadratic(), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds);
    for (const infinity of [false, true]) {
      const r = (infinity ? curve.infinity : curve.finite).lattice.scalar.ring, prime = r.make(b.ctx, [r.domain.fromInteger(b.ctx, 0n), r.domain.fromInteger(b.ctx, 1n)]);
      const proof = decomposeAlgebraicPlaces(b.ctx, curve, prime, infinity, bounds);
      expect(proof.places).toHaveLength(1); expect(proof.places[0].ramification).toBe(2n); expect(proof.places[0].residueDegree).toBe(1n);
      verifyAlgebraicPlaceDecomposition(fresh(), curve, prime, infinity, proof, bounds);
    }
  });
  it('distinguishes the two residue maps at x=3 on y²=x³−2', () => {
    const b = quadratic([-2n, 0n, 0n, 1n]), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds);
    const r = curve.coordinates.scalar.ring, prime = r.make(b.ctx, [r.domain.fromInteger(b.ctx, -3n), r.domain.fromInteger(b.ctx, 1n)]);
    const proof = decomposeAlgebraicPlaces(b.ctx, curve, prime, false, bounds);
    expect(proof.places).toHaveLength(2);
    const signs = proof.places.map(place => {
      const value = evaluateAlgebraicPlaceIntegral(b.ctx, curve, place, b.a);
      if (place.residue.equal(b.ctx, value, place.residue.fromInteger(b.ctx, 5n))) return 1;
      if (place.residue.equal(b.ctx, value, place.residue.fromInteger(b.ctx, -5n))) return -1;
      throw new Error('incorrect residue image');
    });
    expect(signs.sort()).toEqual([-1, 1]);
    const a = proof.places[0].ideal, inverse = invertCurveIdeal(b.ctx, curve, a);
    verifyCurveIdealInverse(fresh(), curve, a, inverse);
    expect(equalCurveIdeals(b.ctx, curve, multiplyCurveIdeals(b.ctx, curve, a, inverse.result).result, unitCurveIdeal(b.ctx, curve, false))).toBe(true);
  });
  it('replays complete decomposition without factoring or linear solving', () => {
    const b = quadratic(), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds);
    const r = curve.coordinates.scalar.ring, prime = r.make(b.ctx, [r.domain.fromInteger(b.ctx, 0n), r.domain.fromInteger(b.ctx, 1n)]);
    const proof = decomposeAlgebraicPlaces(b.ctx, curve, prime, false, bounds);
    const spies = [vi.spyOn(linear, 'solveLinearSystem'), vi.spyOn(factorization, 'factorAlgebraicPolynomialWithin')];
    for (const spy of spies) spy.mockImplementation(() => { throw new Error('producer disabled'); });
    try {
      verifyAlgebraicPlaceDecomposition(fresh(), curve, prime, false, proof, bounds);
      expect(() => verifyAlgebraicPlaceDecomposition(fresh(), curve, prime, false, {...proof, places: []}, bounds)).toThrow(/covered/);
      expect(() => verifyAlgebraicPlaceDecomposition(fresh(), curve, prime, false, {...proof, products: proof.products.slice(1)}, bounds)).toThrow(/coverage|operands/);
    } finally { for (const spy of spies) spy.mockRestore(); }
  });
  it('rejects reducible base primes and unrelated infinity-chart points', () => {
    const b = base(), constants = certifyAlgebraicConstantField(b.ctx, b.field, bounds), curve = certifyAlgebraicCurve(b.ctx, b.field, constants, bounds);
    const r = curve.coordinates.scalar.ring, c = r.domain;
    const reducible = r.make(b.ctx, [c.fromInteger(b.ctx, -1n), c.fromInteger(b.ctx, 0n), c.fromInteger(b.ctx, 1n)]);
    expect(() => decomposeAlgebraicPlaces(fresh(), curve, reducible, false, bounds)).toThrow(/irreducible/);
    const u = curve.infinity.lattice.scalar.ring, wrong = u.make(b.ctx, [c.fromInteger(b.ctx, 1n), c.fromInteger(b.ctx, 1n)]);
    expect(() => decomposeAlgebraicPlaces(fresh(), curve, wrong, true, bounds)).toThrow(/u=0/);
  });
});
