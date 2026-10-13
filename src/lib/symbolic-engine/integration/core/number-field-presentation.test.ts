import { describe, it, expect, vi } from 'vitest';
import { rationalField as Q } from './field';
import { PolynomialRing } from './polynomial';
import { fresh, bounds } from './__tests__/algebraic-support';
import * as construction from './algebraic-field';
import { AlgebraicEmbedding } from './algebraic-embedding';
import { numberFieldCoordinatesWithin } from './number-field-coordinates';
import { constructNumberFieldPresentationWithin, verifyNumberFieldPresentationWithin, numberFieldPresentationValueWithin } from './number-field-presentation';
import { constructRelativeNumberFieldWithin, verifyRelativeNumberFieldWithin, reconstructRelativeNumberFieldWithin, relativeNumberFieldCoordinates, relativeNumberFieldValue } from './relative-number-field';

function nested() {
  const ctx = fresh(), r = new PolynomialRing(Q, 'a'), a = construction.constructAlgebraicExtension(ctx, r, r.make(ctx, [Q.fromInteger(ctx, -2n), Q.fromInteger(ctx, 0n), Q.fromInteger(ctx, 1n)]), bounds);
  const s = new PolynomialRing(a, 'b'), b = construction.constructAlgebraicExtension(ctx, s, s.make(ctx, [a.fromInteger(ctx, -3n), a.fromInteger(ctx, 0n), a.fromInteger(ctx, 1n)]), bounds);
  return {ctx, a, b};
}
describe('checked finite constant presentations and relative bases', () => {
  it('retains Q and complete nested tensor coordinates', () => {
    const n = nested(), c = numberFieldCoordinatesWithin(n.ctx, n.b, bounds), one = Q.fromInteger(n.ctx, 1n);
    expect(c.basis.length).toBe(4);
    const value = n.b.add(n.ctx, n.b.generator(n.ctx), n.b.embed(n.ctx, n.a.generator(n.ctx))), coordinates = c.coordinates(n.ctx, value);
    expect(coordinates.map(v => v.numerator)).toEqual([0n, 1n, 1n, 0n]);
    expect(n.b.equal(n.ctx, value, c.native(n.ctx, coordinates))).toBe(true);
    const q = numberFieldCoordinatesWithin(n.ctx, Q, bounds); expect(Q.equal(n.ctx, q.native(n.ctx, [one]), one)).toBe(true);
  });
  it('proves a full primitive presentation after a nonprimitive first combination', () => {
    const n = nested(), p = constructNumberFieldPresentationWithin(n.ctx, n.b, bounds);
    expect(p.combination).toEqual([1n, 1n]);
    expect(p.field.modulus.coefficients.map(v => v.numerator)).toEqual([1n, 0n, -10n, 0n, 1n]);
    const a = n.b.embed(n.ctx, n.a.generator(n.ctx)), image = numberFieldPresentationValueWithin(n.ctx, n.b, p, a, bounds);
    expect(n.b.equal(n.ctx, p.embedding.map(n.ctx, image), a)).toBe(true);
    expect(Object.isFrozen(p.powers)).toBe(true);
  });
  it('uses the explicitly embedded nonrational constants for the relative degree', () => {
    const n = nested(), p = constructNumberFieldPresentationWithin(n.ctx, n.b, bounds), a = numberFieldPresentationValueWithin(n.ctx, n.b, p, n.b.embed(n.ctx, n.a.generator(n.ctx)), bounds);
    const embedding = AlgebraicEmbedding.extension(n.ctx, n.a, p.field, AlgebraicEmbedding.rationals(n.ctx, p.field, bounds), a, bounds), relative = constructRelativeNumberFieldWithin(n.ctx, n.a, p.field, embedding, bounds);
    expect(relative.degree).toBe(2);
    expect(n.a.equal(n.ctx, relative.relation.coefficients[0], n.a.fromInteger(n.ctx, -1n))).toBe(true);
    expect(n.a.equal(n.ctx, relative.relation.coefficients[1], n.a.multiply(n.ctx, n.a.fromInteger(n.ctx, -2n), n.a.generator(n.ctx)))).toBe(true);
    const c = relativeNumberFieldCoordinates(n.ctx, relative, p.field.generator(n.ctx));
    expect(c.map(v => v.representative.coefficients.map(q => q.numerator))).toEqual([[], [1n]]);
    expect(p.field.equal(n.ctx, relativeNumberFieldValue(n.ctx, relative, c), p.field.generator(n.ctx))).toBe(true);
  });
  it('verifies retained presentation and relative evidence with producers disabled', () => {
    const n = nested(), p = constructNumberFieldPresentationWithin(n.ctx, n.b, bounds), r = constructRelativeNumberFieldWithin(n.ctx, p.field, p.field, AlgebraicEmbedding.identity(n.ctx, p.field, bounds), bounds);
    const spy = vi.spyOn(construction, 'constructAlgebraicExtension').mockImplementation(() => { throw Error('producer disabled'); });
    try { verifyNumberFieldPresentationWithin(fresh(), n.b, p, bounds); verifyRelativeNumberFieldWithin(fresh(), r, bounds); } finally { spy.mockRestore(); }
  });
  it('rejects changed powers, relations, missing coverage and foreign values', () => {
    const n = nested(), p = constructNumberFieldPresentationWithin(n.ctx, n.b, bounds), r = constructRelativeNumberFieldWithin(n.ctx, p.field, p.field, AlgebraicEmbedding.identity(n.ctx, p.field, bounds), bounds);
    expect(() => verifyNumberFieldPresentationWithin(fresh(), n.b, {...p, powers: []}, bounds)).toThrow('verification-failed');
    expect(() => reconstructRelativeNumberFieldWithin(fresh(), {...r, relation: r.relation.ring.make(n.ctx, [p.field.fromInteger(n.ctx, 0n), p.field.fromInteger(n.ctx, 1n)])}, bounds)).toThrow('verification-failed');
    const other = nested(); expect(() => numberFieldCoordinatesWithin(n.ctx, n.b, bounds).coordinates(n.ctx, other.b.generator(n.ctx))).toThrow('domain-mismatch');
  });
  it('charges construction and verification with sticky exhaustion', () => {
    const n = nested(), p = constructNumberFieldPresentationWithin(n.ctx, n.b, bounds), limited = new (n.ctx.constructor as typeof import('./execution').ExecutionContext)({work: 2, allocation: 100, integerBits: 2048, degree: 256});
    expect(() => verifyNumberFieldPresentationWithin(limited, n.b, p, bounds)).toThrow('resource-limit'); expect(() => limited.tick()).toThrow('resource-limit');
  });
});
