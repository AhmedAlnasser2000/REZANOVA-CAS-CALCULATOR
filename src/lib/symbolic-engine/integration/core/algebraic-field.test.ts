import { describe, expect, it, vi } from 'vitest';
import { base, bounds, fresh, quadratic } from './__tests__/algebraic-support';
import { PolynomialRing } from './polynomial';
import { AlgebraicField, constructAlgebraicExtension, verifyAlgebraicExtension } from './algebraic-field';
import { factorAlgebraicPolynomial, verifyAlgebraicPolynomialFactorization } from './algebraic-factorization';
import { differentiateAlgebraic, verifyAlgebraicDerivative } from './algebraic-derivative';
import { decodeAlgebraicExtension, decodeAlgebraicValue, encodeAlgebraicExtension, encodeAlgebraicValue,
  decodeAlgebraicPolynomialFactorization, encodeAlgebraicPolynomialFactorization, decodeAlgebraicDerivative, encodeAlgebraicDerivative } from './algebraic-wire';
import * as factor from './algebraic-factorization';
import * as derivative from './algebraic-derivative';
import * as nativeFactor from './recursive-polynomial-factorization';

describe('owned algebraic fields', () => {
  it('reduces, inverts and keeps square-free rings separate', () => {
    const s = quadratic(), {ctx: c, owner: f, a} = s;
    expect(f.equal(c, f.multiply(c, a, a), f.embed(c, s.x))).toBe(true);
    const inverse = f.inverseEvidence(c, a); f.verifyInverse(c, a, inverse.inverse, inverse.bezout);
    expect(f.equal(c, f.multiply(c, a, inverse.inverse), f.fromInteger(c, 1n))).toBe(true);
    expect(Object.isFrozen(a)).toBe(true); expect(Object.isFrozen(f.construction)).toBe(true);
    expect(() => f.assert(c, {...a})).toThrow('domain-mismatch');
    expect(() => f.inverse(c, f.fromInteger(c, 0n))).toThrow('division-by-zero');
  });
  it.each([0, 1, 2])('rejects invalid relation %s', kind => {
    const s = base(), c = s.ctx, r = new PolynomialRing(s.field, 'a'), zero = s.field.fromInteger(c, 0n), one = s.field.fromInteger(c, 1n);
    const p = kind === 0 ? r.zero(c) : kind === 1 ? r.one(c) : r.make(c, [s.field.negate(c, s.field.multiply(c, s.x, s.x)), zero, one]);
    expect(() => constructAlgebraicExtension(c, r, p, bounds)).toThrow('invalid-input');
  });
  it('supports linear, nonmonic, cubic and fifth-degree defining relations', () => {
    const s = base(), c = s.ctx, r = new PolynomialRing(s.field, 'a'), z = s.field.fromInteger(c, 0n), o = s.field.fromInteger(c, 1n);
    for (const cs of [[s.field.negate(c, s.x), o], [s.field.multiply(c, s.field.fromInteger(c, -2n), s.x), z, s.field.fromInteger(c, 2n)],
      [s.field.negate(c, s.x), s.field.negate(c, o), z, o], [s.field.negate(c, s.x), s.field.negate(c, o), z, z, z, o]]) {
      const p = r.make(c, cs), f = constructAlgebraicExtension(c, r, p, bounds); verifyAlgebraicExtension(fresh(), r, p, f, bounds);
      expect(f.isZero(c, f.make(c, p))).toBe(true);
    }
  });
  it('does not identify printed names or grant field authority to prototype forgeries', () => {
    const a = quadratic(), b = quadratic(); expect(() => a.owner.assert(a.ctx, b.a)).toThrow('domain-mismatch');
    expect(() => verifyAlgebraicExtension(a.ctx, a.relation.ring, a.relation, Object.create(AlgebraicField.prototype), bounds)).toThrow('domain-mismatch');
  });
  it('differentiates implicitly and checks explicit targets independently', () => {
    const s = quadratic(), c = s.ctx, f = s.owner, d = differentiateAlgebraic(c, f, s.a, bounds);
    const target = f.inverse(c, f.multiply(c, f.fromInteger(c, 2n), s.a));
    verifyAlgebraicDerivative(fresh(), f, s.a, target, d, bounds);
    expect(() => verifyAlgebraicDerivative(fresh(), f, s.a, f.fromInteger(c, 0n), d, bounds)).toThrow('verification-failed');
    expect(() => verifyAlgebraicDerivative(fresh(), f, s.a, target, {...d, derivative: s.a}, bounds)).toThrow('verification-failed');
  });
  it('factorizes over an algebraic coefficient field with complete norm evidence', () => {
    const s = quadratic(), c = s.ctx, f = s.owner, r = new PolynomialRing(f, 'z');
    const p = r.make(c, [f.negate(c, f.embed(c, s.x)), f.fromInteger(c, 0n), f.fromInteger(c, 1n)]);
    const proof = factorAlgebraicPolynomial(c, r, p, bounds); verifyAlgebraicPolynomialFactorization(fresh(), r, p, proof, bounds);
    expect(proof.kind === 'factorization' && proof.factors.length).toBe(2);
    if (proof.kind !== 'factorization' || proof.route !== 'algebraic') throw Error('fixture');
    expect(() => verifyAlgebraicPolynomialFactorization(fresh(), r, p, {...proof, components: []}, bounds)).toThrow('verification-failed');
    expect(() => verifyAlgebraicPolynomialFactorization(fresh(), r, p, {...proof, factors: proof.factors.slice(1)}, bounds)).toThrow('verification-failed');
  });
  it('handles nested fields and inverse-power derivatives', () => {
    const s = quadratic(), c = s.ctx, f = s.owner, r = new PolynomialRing(f, 'b');
    const p = r.make(c, [f.negate(c, s.a), f.fromInteger(c, 0n), f.fromInteger(c, 1n)]), g = constructAlgebraicExtension(c, r, p, bounds), b = g.generator(c);
    const inv = g.inverse(c, b), d = differentiateAlgebraic(c, g, inv, bounds);
    const target = g.negate(c, g.inverse(c, g.multiply(c, g.fromInteger(c, 4n), g.multiply(c, b, g.multiply(c, g.multiply(c, b, b), g.multiply(c, b, b))))));
    verifyAlgebraicDerivative(fresh(), g, inv, target, d, bounds);
  });
  it('replays construction, values, factors and derivatives without producers', () => {
    const s = quadratic(), c = s.ctx, f = s.owner, r = new PolynomialRing(f, 'z'), p = r.make(c, [f.negate(c, s.a), f.fromInteger(c, 1n)]);
    const factors = factorAlgebraicPolynomial(c, r, p, bounds), d = differentiateAlgebraic(c, f, s.a, bounds);
    const artifacts = [encodeAlgebraicExtension(c, f.ring, s.relation, f, bounds), encodeAlgebraicValue(c, f, s.a, bounds),
      encodeAlgebraicPolynomialFactorization(c, r, p, factors, bounds), encodeAlgebraicDerivative(c, f, s.a, d.derivative, d, bounds)].map(v => JSON.parse(JSON.stringify(v)));
    const spies = [vi.spyOn(factor, 'factorAlgebraicPolynomialWithin'), vi.spyOn(factor, 'factorAlgebraicPolynomial'),
      vi.spyOn(nativeFactor, 'factorRecursivePolynomial'), vi.spyOn(derivative, 'differentiateAlgebraicWithin'), vi.spyOn(derivative, 'differentiateAlgebraic')];
    for (const spy of spies) spy.mockImplementation(() => { throw Error('producer disabled'); });
    try {
      const reconstructed = decodeAlgebraicExtension(fresh(), f.ring, s.relation, artifacts[0], bounds);
      expect(reconstructed).not.toBe(f); expect(f.equal(c, decodeAlgebraicValue(fresh(), f, artifacts[1], bounds), s.a)).toBe(true);
      decodeAlgebraicPolynomialFactorization(fresh(), r, p, artifacts[2], bounds); decodeAlgebraicDerivative(fresh(), f, s.a, d.derivative, artifacts[3], bounds);
    } finally { vi.restoreAllMocks(); }
  });
  it('bounds artifacts before decoding and retains fresh sticky accounting', () => {
    const s = quadratic(), data = encodeAlgebraicValue(s.ctx, s.owner, s.a, bounds);
    expect(() => decodeAlgebraicValue(fresh(), s.owner, data, {...bounds, artifactNodes: 1})).toThrow('resource-limit');
    expect(() => decodeAlgebraicValue(fresh(), s.owner, {...data as object, version: 2}, bounds)).toThrow('invalid-input');
    const c = fresh(); decodeAlgebraicValue(c, s.owner, data, bounds); const first = c.usage.work;
    decodeAlgebraicValue(c, s.owner, data, bounds); expect(c.usage.work - first).toBe(first);
  });
});
