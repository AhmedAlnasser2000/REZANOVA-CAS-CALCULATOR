import { describe, it, expect, vi } from 'vitest';
import { base, quadratic, bounds, fresh } from './__tests__/algebraic-support';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { decomposeAlgebraicPlaces, evaluateAlgebraicPlaceIntegral } from './algebraic-place';
import { constructAlgebraicDivisor, principalAlgebraicDivisor, verifyAlgebraicPrincipalDivisor, scaleAlgebraicDivisorWithin } from './algebraic-divisor';
import { solveAlgebraicRiemannRoch, verifyAlgebraicRiemannRoch, algebraicRiemannRochCoordinates } from './algebraic-riemann-roch';
import { decideAlgebraicPrincipality, verifyAlgebraicPrincipality } from './algebraic-principality';
import { algebraicValuation, verifyAlgebraicValuation } from './algebraic-valuation';
import * as linear from './linear-system';
import * as modules from './polynomial-module';

describe('complete divisor Riemann–Roch and principality', () => {
  it('constructs the full divisor of x and its inverse on the rational field', () => {
    const b = base(), constants = certifyAlgebraicConstantField(b.ctx, b.field, bounds), curve = certifyAlgebraicCurve(b.ctx, b.field, constants, bounds);
    for (const sign of [1, -1]) {
      const value = sign === 1 ? b.x : b.field.inverse(b.ctx, b.x), proof = principalAlgebraicDivisor(b.ctx, curve, value, bounds);
      expect(proof.divisor.degree).toBe(0n); expect(proof.divisor.entries.map(e => e.coefficient)).toEqual([BigInt(sign), -BigInt(sign)]);
      verifyAlgebraicPrincipalDivisor(fresh(), curve, value, proof, bounds);
      expect(decideAlgebraicPrincipality(fresh(), curve, proof.divisor, bounds).kind).toBe('principal');
    }
  });
  it('computes signed rational spaces and exact coordinates', () => {
    const b = base(), constants = certifyAlgebraicConstantField(b.ctx, b.field, bounds), curve = certifyAlgebraicCurve(b.ctx, b.field, constants, bounds);
    const f = curve.finite.lattice.scalar, r = f.ring, ur = curve.infinity.lattice.scalar.ring;
    const atZero = decomposeAlgebraicPlaces(b.ctx, curve, r.make(b.ctx, [r.domain.fromInteger(b.ctx, 0n), r.domain.fromInteger(b.ctx, 1n)]), false, bounds).places[0];
    const atInfinity = decomposeAlgebraicPlaces(b.ctx, curve, ur.make(b.ctx, [ur.domain.fromInteger(b.ctx, 0n), ur.domain.fromInteger(b.ctx, 1n)]), true, bounds).places[0];
    const divisor = constructAlgebraicDivisor(b.ctx, curve, [{place: atInfinity, coefficient: 3n}, {place: atZero, coefficient: -1n}], bounds);
    const space = solveAlgebraicRiemannRoch(b.ctx, curve, divisor, bounds); expect(space.dimension).toBe(3);
    const coordinates = algebraicRiemannRochCoordinates(fresh(), curve, space, b.x, bounds); expect(coordinates).toHaveLength(3);
    expect(() => algebraicRiemannRochCoordinates(fresh(), curve, space, b.field.fromInteger(b.ctx, 1n), bounds)).toThrow(/outside/);
    algebraicRiemannRochCoordinates(fresh(), curve, space, b.field.fromInteger(b.ctx, 0n), bounds);
    const negative = constructAlgebraicDivisor(b.ctx, curve, [{place: atInfinity, coefficient: -1n}], bounds);
    expect(solveAlgebraicRiemannRoch(b.ctx, curve, negative, bounds).dimension).toBe(0);
    expect(decideAlgebraicPrincipality(b.ctx, curve, negative, bounds)).toMatchObject({kind: 'not-principal', reason: 'nonzero-degree'});
  });
  it('has correct ramified valuations in the singular y²=x³ model', () => {
    const b = quadratic([0n, 0n, 0n, 1n]), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds);
    const x = b.owner.embed(b.ctx, b.x), normalized = b.owner.exactDivide(b.ctx, b.a, x), principal = principalAlgebraicDivisor(b.ctx, curve, normalized, bounds);
    expect(principal.divisor.entries.map(e => e.coefficient)).toEqual([1n, -1n]);
    const atZero = principal.divisor.entries[0].place, val = algebraicValuation(b.ctx, curve, atZero, b.a, bounds);
    expect(val.value).toBe(3n); verifyAlgebraicValuation(fresh(), curve, atZero, b.a, val, bounds);
  });
  it('retains zeros and poles whose original norm cancels above one prime', () => {
    const b = quadratic([-2n, 0n, 0n, 1n]), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds);
    const five = b.owner.fromInteger(b.ctx, 5n), value = b.owner.exactDivide(b.ctx, b.owner.subtract(b.ctx, b.a, five), b.owner.add(b.ctx, b.a, five));
    const proof = principalAlgebraicDivisor(b.ctx, curve, value, bounds), atThree = proof.divisor.entries.filter(e => {
      const r = e.place.prime.ring, c = r.domain; return !e.place.order.infinity && r.equal(b.ctx, e.place.prime, r.make(b.ctx, [c.fromInteger(b.ctx, -3n), c.fromInteger(b.ctx, 1n)]));
    });
    expect(atThree.map(e => e.coefficient).sort()).toEqual([-1n, 1n]); expect(proof.divisor.degree).toBe(0n);
    verifyAlgebraicPrincipalDivisor(fresh(), curve, value, proof, bounds);
  });
  it.each([2n, 3n])('recognizes the known elliptic principal multiple of order %s', order => {
    const b = quadratic(order === 2n ? [0n, -1n, 0n, 1n] : [1n, 0n, 0n, 1n]), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds);
    const curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds), r = curve.finite.lattice.scalar.ring, ur = curve.infinity.lattice.scalar.ring;
    const zero = decomposeAlgebraicPlaces(b.ctx, curve, r.make(b.ctx, [r.domain.fromInteger(b.ctx, 0n), r.domain.fromInteger(b.ctx, 1n)]), false, bounds);
    const point = order === 2n ? zero.places[0] : zero.places.find(p => p.residue.equal(b.ctx, evaluateAlgebraicPlaceIntegral(b.ctx, curve, p, b.a), p.residue.fromInteger(b.ctx, 1n)))!;
    const infinity = decomposeAlgebraicPlaces(b.ctx, curve, ur.make(b.ctx, [ur.domain.fromInteger(b.ctx, 0n), ur.domain.fromInteger(b.ctx, 1n)]), true, bounds).places[0];
    const d = constructAlgebraicDivisor(b.ctx, curve, [{place: point, coefficient: 1n}, {place: infinity, coefficient: -1n}], bounds);
    const negative = decideAlgebraicPrincipality(b.ctx, curve, d, bounds); expect(negative.kind).toBe('not-principal');
    verifyAlgebraicPrincipality(fresh(), curve, d, negative, bounds);
    const multiple = scaleAlgebraicDivisorWithin(b.ctx, curve, d, order), positive = decideAlgebraicPrincipality(b.ctx, curve, multiple, bounds);
    expect(positive.kind).toBe('principal'); verifyAlgebraicPrincipality(fresh(), curve, multiple, positive, bounds);
    const mO = constructAlgebraicDivisor(b.ctx, curve, [{place: infinity, coefficient: 4n}], bounds);
    expect(solveAlgebraicRiemannRoch(b.ctx, curve, mO, bounds).dimension).toBe(4);
  });
  it('replays positive and zero spaces without module or linear producers', () => {
    const b = base(), constants = certifyAlgebraicConstantField(b.ctx, b.field, bounds), curve = certifyAlgebraicCurve(b.ctx, b.field, constants, bounds);
    const divisor = constructAlgebraicDivisor(b.ctx, curve, [], bounds), space = solveAlgebraicRiemannRoch(b.ctx, curve, divisor, bounds);
    const spies = [vi.spyOn(linear, 'solveLinearSystem'), vi.spyOn(modules, 'polynomialModuleHermite')];
    for (const spy of spies) spy.mockImplementation(() => { throw new Error('producer disabled'); });
    try {
      verifyAlgebraicRiemannRoch(fresh(), curve, divisor, space, bounds);
      expect(() => verifyAlgebraicRiemannRoch(fresh(), curve, divisor, {...space, basis: [], dimension: 0}, bounds)).toThrow(/dimension/);
    } finally { for (const spy of spies) spy.mockRestore(); }
  });
});
