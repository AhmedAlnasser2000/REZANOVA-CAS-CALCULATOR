import { it, expect, vi } from 'vitest';
import { base, quadratic, fresh, bounds } from './__tests__/algebraic-support';
import { rationalField as Q } from './field';
import { rational } from './rational';
import { FormalPrimitiveDomain } from './formal-primitive';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { embedRationalAlgebraicPrimitive, verifyAlgebraicRationalPrimitiveEmbedding } from './algebraic-rational-primitive';
import { encodeAlgebraicRationalPrimitiveEmbedding, decodeAlgebraicRationalPrimitiveEmbedding } from './algebraic-rational-primitive-wire';
import * as factor from './algebraic-factorization';
import * as construction from './algebraic-field';
import * as presentation from './number-field-presentation';
import * as derivatives from './algebraic-derivative';
import * as primitive from './primitive-verification-internal';

function source(constant: bigint, weightRoot = true) {
  const ctx = fresh(), d = new FormalPrimitiveDomain('x', 'z'), modulus = d.z.make(ctx, [constant, 0n, 1n].map(n => rational(ctx, n))), weight = weightRoot ? d.z.make(ctx, [rational(ctx, 0n), rational(ctx, 1n)]) : d.z.one(ctx), argument = d.arguments.make(ctx, [d.z.make(ctx, [rational(ctx, 0n), rational(ctx, 1n)]), d.z.one(ctx)]);
  return d.make(ctx, d.fractions.fromInteger(ctx, 0n), [d.term(ctx, modulus, weight, argument)]);
}
it('preserves an unnormalized all-root sum when converting to normalized relative traces', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), input = source(1n), p = embedRationalAlgebraicPrimitive(fresh(), curve, input, bounds);
  expect(p.components[0].roots.length).toBe(1); expect(p.primitive.terms[0].quotient.relative.degree).toBe(2);
  const expected = b.field.exactDivide(b.ctx, b.field.fromInteger(b.ctx, 2n), b.field.add(b.ctx, b.field.multiply(b.ctx, b.x, b.x), b.field.fromInteger(b.ctx, 1n)));
  expect(b.field.equal(b.ctx, p.target, expected)).toBe(true); verifyAlgebraicRationalPrimitiveEmbedding(fresh(), curve, input, p, bounds);
});
it('preserves every distinct component of a reducible rational modulus', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), input = source(-1n, false), p = embedRationalAlgebraicPrimitive(fresh(), curve, input, bounds);
  expect(p.components[0].roots.length).toBe(2); expect(p.primitive.terms.length).toBe(2); expect(p.primitive.terms.every(t => t.quotient.relative.degree === 1)).toBe(true);
  const expected = b.field.exactDivide(b.ctx, b.field.multiply(b.ctx, b.field.fromInteger(b.ctx, 2n), b.x), b.field.subtract(b.ctx, b.field.multiply(b.ctx, b.x, b.x), b.field.fromInteger(b.ctx, 1n)));
  expect(b.field.equal(b.ctx, p.target, expected)).toBe(true);
});
it('factors residue moduli over the actual hidden constants while preserving the supplied owner', () => {
  const b = quadratic([0n, 0n, 2n]), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds), input = source(-2n), p = embedRationalAlgebraicPrimitive(fresh(), curve, input, bounds);
  expect(p.primitive.curve.owner).toBe(b.owner); expect(p.components[0].roots.length).toBe(2); expect(p.primitive.terms.every(t => t.quotient.relative.degree === 1)).toBe(true);
  verifyAlgebraicRationalPrimitiveEmbedding(fresh(), curve, input, p, bounds);
});
it('checks all conversions and scaling with search and derivative producers disabled', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), input = source(1n), p = embedRationalAlgebraicPrimitive(fresh(), curve, input, bounds), spies = [vi.spyOn(factor, 'factorAlgebraicPolynomialWithin'), vi.spyOn(construction, 'constructAlgebraicExtension'),
    vi.spyOn(presentation, 'constructNumberFieldPresentationWithin'), vi.spyOn(derivatives, 'differentiateAlgebraicWithin'), vi.spyOn(primitive, 'differentiatePrimitiveWithin')];
  for (const s of spies) s.mockImplementation(() => { throw Error('producer disabled'); });
  try { verifyAlgebraicRationalPrimitiveEmbedding(fresh(), curve, input, p, bounds); } finally { for (const s of spies) s.mockRestore(); }
  expect(() => verifyAlgebraicRationalPrimitiveEmbedding(fresh(), curve, input, {...p, components: []}, bounds)).toThrow('domain-mismatch');
  expect(() => verifyAlgebraicRationalPrimitiveEmbedding(fresh(), curve, input, {...p, target: b.field.fromCoefficient(b.ctx, Q.fromInteger(b.ctx, 0n))}, bounds)).toThrow('verification-failed');
});
it('replays irreducible and split root coverage against the complete expected rational primitive', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds);
  for (const coefficient of [1n, -1n]) {
    const input = source(coefficient), p = embedRationalAlgebraicPrimitive(fresh(), curve, input, bounds), data = encodeAlgebraicRationalPrimitiveEmbedding(fresh(), curve, input, p, bounds), spies = [vi.spyOn(factor, 'factorAlgebraicPolynomialWithin'), vi.spyOn(construction, 'constructAlgebraicExtension'),
      vi.spyOn(presentation, 'constructNumberFieldPresentationWithin'), vi.spyOn(derivatives, 'differentiateAlgebraicWithin'), vi.spyOn(primitive, 'differentiatePrimitiveWithin')];
    for (const s of spies) s.mockImplementation(() => { throw Error('producer disabled'); });
    try { const decoded = decodeAlgebraicRationalPrimitiveEmbedding(fresh(), curve, input, data, bounds); verifyAlgebraicRationalPrimitiveEmbedding(fresh(), curve, input, decoded, bounds); expect(b.field.equal(b.ctx, decoded.target, p.target)).toBe(true); }
    finally { for (const s of spies) s.mockRestore(); }
    expect(() => decodeAlgebraicRationalPrimitiveEmbedding(fresh(), curve, source(2n), data, bounds)).toThrow('domain-mismatch');
  }
});
