import {expect, it} from 'vitest';
import {fresh, bounds, base} from './__tests__/algebraic-support';
import {ellipticDivisor} from './__tests__/algebraic-divisor-support';
import {PolynomialRing} from './polynomial';
import {constructAlgebraicExtension} from './algebraic-field';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {decomposeAlgebraicPlaces} from './algebraic-place';
import {constructGenusOnePresentation as construct, verifyGenusOnePresentation as verify} from './genus-one-presentation';
import {tryEllipticCurveModel} from './elliptic-curve-model';
import {hyperellipticInfinityDivisor} from './__tests__/hyperelliptic-support';

it('derives general Weierstrass coordinates at both finite and infinite owned origins', () => {
  const s = ellipticDivisor(2n), before = s.curve.owner;
  for (const entry of s.divisor.entries) {
    const proof = construct(fresh(), s.curve, entry.place, bounds); verify(fresh(), s.curve, entry.place, proof, bounds);
    expect(proof.geometry.genus).toBe(1n); expect(proof.spaces.map(s => s.dimension)).toEqual([2, 3]); expect(proof.polynomial.coefficients).toHaveLength(4);
    expect(proof.elimination.kind === 'consistent' && proof.elimination.nullspace.length).toBe(1); expect(proof.curve.owner).toBe(before);
    expect(Object.isFrozen(proof) && Object.isFrozen(proof.spaces) && Object.isFrozen(proof.indices)).toBe(true);
  }
});
it('derives coordinates for a split quartic outside the original cubic transport guard', () => {
  const s = hyperellipticInfinityDivisor(), origin = s.divisor.entries[0].place;
  expect(tryEllipticCurveModel(fresh(), s.curve, bounds)).toBeNull();
  const proof = construct(fresh(), s.curve, origin, bounds); verify(fresh(), s.curve, origin, proof, bounds);
  expect(proof.geometry.genus).toBe(1n); expect(proof.curve.owner).toBe(s.curve.owner);
});
it('handles a cubic native extension a^3=x^2+1 without replacing its owners', () => {
  const s = base(), ring = new PolynomialRing(s.field, 'a'), relation = ring.make(s.ctx, [s.field.negate(s.ctx, s.field.add(s.ctx, s.field.multiply(s.ctx, s.x, s.x), s.field.fromInteger(s.ctx, 1n))), s.field.fromInteger(s.ctx, 0n), s.field.fromInteger(s.ctx, 0n), s.field.fromInteger(s.ctx, 1n)]), owner = constructAlgebraicExtension(s.ctx, ring, relation, bounds);
  const constants = certifyAlgebraicConstantField(s.ctx, owner, bounds), curve = certifyAlgebraicCurve(s.ctx, owner, constants, bounds), ur = curve.infinity.lattice.scalar.ring, infinity = decomposeAlgebraicPlaces(s.ctx, curve, ur.make(s.ctx, [ur.domain.fromInteger(s.ctx, 0n), ur.domain.fromInteger(s.ctx, 1n)]), true, bounds);
  expect(tryEllipticCurveModel(fresh(), curve, bounds)).toBeNull(); expect(curve.coordinates.basis).toHaveLength(3);
  const proof = construct(fresh(), curve, infinity.places[0], bounds); verify(fresh(), curve, infinity.places[0], proof, bounds);
  expect(proof.curve.owner).toBe(owner); expect(owner.construction.relation).toBe(relation); expect(proof.geometry.genus).toBe(1n);
});
it('rejects altered spaces, relation kernels, pole coverage, scaling, maps and origins', () => {
  const s = ellipticDivisor(2n), origin = s.divisor.entries[1].place, proof = construct(fresh(), s.curve, origin, bounds), zero = s.curve.owner.fromInteger(s.ctx, 0n), c = s.curve.coordinates.constantOwner;
  const bad = [{...proof, spaces: proof.spaces.slice(1)}, {...proof, indices: [0, 0]}, {...proof, poles: []}, {...proof, scale: c.fromInteger(s.ctx, 0n)}, {...proof, x: zero}, {...proof, y: zero}, {...proof, polynomial: proof.polynomial.ring.one(s.ctx)},
    ...(proof.elimination.kind === 'consistent' ? [{...proof, elimination: {...proof.elimination, nullspace: []}}] : [])];
  for (const value of bad) expect(() => verify(fresh(), s.curve, origin, value, bounds)).toThrow('verification-failed');
  const other = ellipticDivisor(2n); expect(() => verify(fresh(), other.curve, other.divisor.entries[1].place, proof, bounds)).toThrow('domain-mismatch');
});
