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
