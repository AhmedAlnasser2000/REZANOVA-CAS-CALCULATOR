import { describe, it, expect, vi } from 'vitest';
import { quadratic, bounds, fresh } from './__tests__/algebraic-support';
import { rationalField as Q } from './field';
import { PolynomialRing } from './polynomial';
import { constructAlgebraicExtension } from './algebraic-field';
import { AlgebraicEmbedding } from './algebraic-embedding';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve, verifyAlgebraicCurve } from './algebraic-curve';
import { baseChangeAlgebraicCurve, verifyAlgebraicConstantBaseChange } from './algebraic-curve-base-change';
import { decomposeAlgebraicPlaces } from './algebraic-place';
import { constructAlgebraicDivisor } from './algebraic-divisor';
import { solveAlgebraicRiemannRoch } from './algebraic-riemann-roch';
import { encodeAlgebraicCurve, decodeAlgebraicCurve } from './algebraic-curve-wire';
import * as constantProducer from './algebraic-constant-field';
import * as normalization from './algebraic-integral-basis';
import * as factoring from './algebraic-factorization';
import * as linear from './linear-system';

describe('explicit finite constant base change', () => {
  it('transposes exact rational-function coefficients in the native constant basis', () => {
    const b = quadratic([1n, 0n, 0n, 1n]), source = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds), C = source.coordinates.constantOwner;
    const r = new PolynomialRing(Q, 'gamma'), L = constructAlgebraicExtension(b.ctx, r, r.make(b.ctx, [-2n, 0n, 1n].map(n => Q.fromInteger(b.ctx, n))), bounds);
    const root = L.negate(b.ctx, L.exactDivide(b.ctx, L.embed(b.ctx, C.modulus.coefficients[0]), L.embed(b.ctx, C.modulus.coefficients[1]))), embedding = AlgebraicEmbedding.extension(b.ctx, C, L, AlgebraicEmbedding.rationals(b.ctx, L, bounds), root, bounds);
    const change = baseChangeAlgebraicCurve(b.ctx, source, L, embedding, bounds), c = change.curve.coordinates, field = change.curve.owner, scalar = c.scalar, z = scalar.ring;
    const x = scalar.make(b.ctx, z.make(b.ctx, [L.fromInteger(b.ctx, 0n), L.fromInteger(b.ctx, 1n)]), z.one(b.ctx)), alpha = L.generator(b.ctx), a = scalar.fromCoefficient(b.ctx, alpha);
    const numerator = scalar.add(b.ctx, scalar.multiply(b.ctx, x, x), scalar.add(b.ctx, scalar.multiply(b.ctx, a, x), a)), denominator = scalar.add(b.ctx, x, a), value = scalar.exactDivide(b.ctx, numerator, denominator);
    const nativeX = c.scalarNative(b.ctx, x), nativeA = c.scalarNative(b.ctx, a), expected = field.exactDivide(b.ctx, field.add(b.ctx, field.multiply(b.ctx, nativeX, nativeX), field.add(b.ctx, field.multiply(b.ctx, nativeA, nativeX), nativeA)), field.add(b.ctx, nativeX, nativeA));
    const actual = c.scalarNative(b.ctx, value); expect(field.equal(b.ctx, actual, expected)).toBe(true);
    const vector = c.coordinates(b.ctx, actual); expect(scalar.equal(b.ctx, vector[0], value)).toBe(true); expect(vector.slice(1).every(v => scalar.isZero(b.ctx, v))).toBe(true);
    const general = field.add(b.ctx, actual, field.generator(b.ctx)); expect(field.equal(b.ctx, c.native(b.ctx, c.coordinates(b.ctx, general)), general)).toBe(true);
    expect(Object.isFrozen(vector)).toBe(true); verifyAlgebraicConstantBaseChange(fresh(), source, L, embedding, change.proof, bounds);
  });
  it('preserves original owners, reuses normal orders and splits residue degrees', () => {
    const b = quadratic(), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), source = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds);
    const r = new PolynomialRing(Q, 'lambda'), L = constructAlgebraicExtension(b.ctx, r, r.make(b.ctx, [Q.fromInteger(b.ctx, -2n), Q.fromInteger(b.ctx, 0n), Q.fromInteger(b.ctx, 1n)]), bounds);
    const C = source.coordinates.constantOwner, embedding = AlgebraicEmbedding.extension(b.ctx, C, L, AlgebraicEmbedding.rationals(b.ctx, L, bounds), L.fromInteger(b.ctx, 1n), bounds);
    const spies = [vi.spyOn(constantProducer, 'certifyAlgebraicConstantField'), vi.spyOn(constantProducer, 'certifyAlgebraicConstantFieldWithin'), vi.spyOn(normalization, 'algebraicIntegralBasisWithin')];
    for (const spy of spies) spy.mockImplementation(() => { throw new Error('normalization/constant search disabled'); });
    let changed: ReturnType<typeof baseChangeAlgebraicCurve<typeof b.a>>;
    try { changed = baseChangeAlgebraicCurve(b.ctx, source, L, embedding, bounds); } finally { for (const spy of spies) spy.mockRestore(); }
    expect(changed.proof.source.owner).toBe(b.owner); expect(changed.curve.coordinates.constantOwner).toBe(L);
    expect(changed.curve.coordinates.basis).toHaveLength(2); verifyAlgebraicCurve(fresh(), changed.curve.owner, changed.curve, bounds);
    const originalRing = source.finite.lattice.scalar.ring, original = decomposeAlgebraicPlaces(b.ctx, source, originalRing.make(b.ctx,
      [C.fromInteger(b.ctx, -2n), C.fromInteger(b.ctx, 1n)]), false, bounds);
    expect(original.places).toHaveLength(1); expect(original.places[0].residueDegree).toBe(2n);
    const cr = changed.curve.finite.lattice.scalar.ring, split = decomposeAlgebraicPlaces(b.ctx, changed.curve,
      cr.make(b.ctx, [L.fromInteger(b.ctx, -2n), L.fromInteger(b.ctx, 1n)]), false, bounds);
    expect(split.places).toHaveLength(2); expect(split.places.map(p => p.residueDegree)).toEqual([1n, 1n]);
    const zero = constructAlgebraicDivisor(b.ctx, changed.curve, [], bounds);
    expect(solveAlgebraicRiemannRoch(b.ctx, changed.curve, zero, bounds).dimension).toBe(1);
    const disabled = [vi.spyOn(factoring, 'factorAlgebraicPolynomialWithin'), vi.spyOn(linear, 'solveLinearSystem')];
    const wire = encodeAlgebraicCurve(fresh(), changed.curve, bounds);
    for (const spy of disabled) spy.mockImplementation(() => { throw new Error('producer disabled'); });
    try {
      verifyAlgebraicConstantBaseChange(fresh(), source, L, embedding, changed.proof, bounds);
      expect(decodeAlgebraicCurve(fresh(), changed.curve, wire, bounds).owner).toBe(changed.curve.owner);
    } finally { for (const spy of disabled) spy.mockRestore(); }
  });
  it('rejects a forged embedding and a different constant owner', () => {
    const b = quadratic(), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), source = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds);
    const C = source.coordinates.constantOwner, identity = AlgebraicEmbedding.identity(b.ctx, C, bounds);
    expect(() => baseChangeAlgebraicCurve(fresh(), source, C, Object.freeze({...identity}) as typeof identity, bounds)).toThrow(/owned algebraic embedding/);
    const r = new PolynomialRing(Q, 'lambda'), L = constructAlgebraicExtension(b.ctx, r, r.make(b.ctx, [Q.fromInteger(b.ctx, -2n), Q.fromInteger(b.ctx, 0n), Q.fromInteger(b.ctx, 1n)]), bounds);
    expect(() => baseChangeAlgebraicCurve(fresh(), source, L, identity, bounds)).toThrow(/embedding/);
  });
});
