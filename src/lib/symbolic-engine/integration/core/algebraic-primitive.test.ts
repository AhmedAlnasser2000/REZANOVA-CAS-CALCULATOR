import { it, expect, vi } from 'vitest';
import { base, quadratic, fresh, bounds } from './__tests__/algebraic-support';
import { rationalField as Q } from './field';
import { PolynomialRing } from './polynomial';
import { constructAlgebraicExtension } from './algebraic-field';
import { AlgebraicEmbedding } from './algebraic-embedding';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve, type AlgebraicCurveView } from './algebraic-curve';
import { baseChangeAlgebraicCurveWithin } from './algebraic-curve-base-change';
import { constructRelativeNumberFieldWithin } from './relative-number-field';
import { reconstructAlgebraicConstantQuotientWithin, mapAlgebraicConstantBaseChangeValue, convertAlgebraicConstantValue,
  verifyAlgebraicConstantValueConversion, constantQuotientValue } from './algebraic-constant-quotient';
import { constructAlgebraicPrimitive, differentiateAlgebraicPrimitive, verifyAlgebraicPrimitive } from './algebraic-primitive';
import { encodeAlgebraicPrimitive, decodeAlgebraicPrimitive } from './algebraic-primitive-wire';
import * as derivative from './algebraic-derivative';
import * as trace from './quotient-trace';
import * as matrix from './algebraic-matrix';
import * as factorization from './algebraic-factorization';
import * as construction from './algebraic-field';
import * as presentation from './number-field-presentation';
import * as baseChange from './algebraic-curve-base-change';

function complex<E>(curve: AlgebraicCurveView<E>) {
  const ctx = fresh(), r = new PolynomialRing(Q, 'i'), L = constructAlgebraicExtension(ctx, r, r.make(ctx, [1n, 0n, 1n].map(n => Q.fromInteger(ctx, n))), bounds), C = curve.coordinates.constantOwner;
  expect(C.ring.degree(ctx, C.modulus)).toBe(1);
  const image = L.embed(ctx, Q.negate(ctx, Q.exactDivide(ctx, C.modulus.coefficients[0], C.modulus.coefficients[1])));
  const embedding = AlgebraicEmbedding.extension(ctx, C, L, AlgebraicEmbedding.rationals(ctx, L, bounds), image, bounds);
  const relative = constructRelativeNumberFieldWithin(ctx, C, L, embedding, bounds), change = baseChangeAlgebraicCurveWithin(ctx, curve, L, embedding, bounds);
  const quotient = reconstructAlgebraicConstantQuotientWithin(ctx, curve, change, relative, bounds);
  const i = change.coordinates.scalarNative(ctx, change.coordinates.scalar.fromCoefficient(ctx, L.generator(ctx)));
  return {ctx, L, quotient, i, f: change.field};
}
it('checks relative constant conversion including an inverse depending on the auxiliary constant', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), c = complex(curve);
  const x = mapAlgebraicConstantBaseChangeValue(c.ctx, c.quotient, b.x), input = c.f.inverse(c.ctx, c.f.add(c.ctx, x, c.i)), proof = convertAlgebraicConstantValue(c.ctx, c.quotient, input);
  expect(c.f.equal(c.ctx, input, constantQuotientValue(c.ctx, c.quotient, proof.polynomial))).toBe(true);
  expect(proof.polynomial.coefficients.length).toBe(2);
  verifyAlgebraicConstantValueConversion(fresh(), c.quotient, input, proof);
  expect(() => verifyAlgebraicConstantValueConversion(fresh(), c.quotient, input, {...proof, scalars: []})).toThrow('verification-failed');
});
it('uses the normalized relative trace of a complex logarithm to integrate 1/(x²+1)', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), c = complex(curve);
  const x = mapAlgebraicConstantBaseChangeValue(c.ctx, c.quotient, b.x), argument = c.f.subtract(c.ctx, x, c.i), weight = c.L.negate(c.ctx, c.L.generator(c.ctx));
  const primitive = constructAlgebraicPrimitive(fresh(), curve, b.field.fromInteger(b.ctx, 0n), [{quotient: c.quotient, weight, unit: c.L.fromInteger(c.ctx, 1n), factors: [{value: argument, exponent: 1n}]}], bounds);
  const target = b.field.inverse(b.ctx, b.field.add(b.ctx, b.field.multiply(b.ctx, b.x, b.x), b.field.fromInteger(b.ctx, 1n))), proof = differentiateAlgebraicPrimitive(fresh(), curve, primitive, bounds);
  expect(b.field.equal(b.ctx, proof.derivative, target)).toBe(true); verifyAlgebraicPrimitive(fresh(), curve, primitive, target, proof, bounds);
  expect(Object.isFrozen(primitive.terms[0].factors)).toBe(true);
  expect(primitive.conditions.some(p => p.path === 'primitive.log.0.norm.0')).toBe(true);
});
it('constructs the formal complex logarithm for 1/y on y²=1−x² without choosing a branch', () => {
  const b = quadratic([1n, 0n, -1n]), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds), c = complex(curve);
  const x = mapAlgebraicConstantBaseChangeValue(c.ctx, c.quotient, b.owner.embed(b.ctx, b.x)), y = mapAlgebraicConstantBaseChangeValue(c.ctx, c.quotient, b.a), argument = c.f.add(c.ctx, y, c.f.multiply(c.ctx, c.i, x));
  const primitive = constructAlgebraicPrimitive(fresh(), curve, b.owner.fromInteger(b.ctx, 0n), [{quotient: c.quotient, weight: c.L.negate(c.ctx, c.L.generator(c.ctx)), unit: c.L.fromInteger(c.ctx, 1n), factors: [{value: argument, exponent: 1n}]}], bounds);
  const proof = differentiateAlgebraicPrimitive(fresh(), curve, primitive, bounds), target = b.owner.inverse(b.ctx, b.a);
  expect(b.owner.equal(b.ctx, proof.derivative, target)).toBe(true); verifyAlgebraicPrimitive(fresh(), curve, primitive, target, proof, bounds);
});
it('keeps factored arguments and exact exponents without expanding large powers', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), c = complex(curve);
  const x = mapAlgebraicConstantBaseChangeValue(c.ctx, c.quotient, b.x), argument = c.f.subtract(c.ctx, x, c.i), e = 1n << 100n;
  const primitive = constructAlgebraicPrimitive(fresh(), curve, b.x, [{quotient: c.quotient, weight: c.L.fromInteger(c.ctx, 1n), unit: c.L.fromInteger(c.ctx, 7n), factors: [{value: argument, exponent: e}, {value: argument, exponent: -e}]}], bounds);
  const proof = differentiateAlgebraicPrimitive(fresh(), curve, primitive, bounds); expect(b.field.equal(b.ctx, proof.derivative, b.field.fromInteger(b.ctx, 1n))).toBe(true);
  expect(primitive.terms[0].factors.map(p => p.exponent)).toEqual([e, -e]);
});
it('verifies stored trace, norm and independent derivatives with producers disabled', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), c = complex(curve), x = mapAlgebraicConstantBaseChangeValue(c.ctx, c.quotient, b.x);
  const primitive = constructAlgebraicPrimitive(fresh(), curve, b.x, [{quotient: c.quotient, weight: c.L.fromInteger(c.ctx, 1n), unit: c.L.fromInteger(c.ctx, 1n), factors: [{value: x, exponent: 1n}]}], bounds), proof = differentiateAlgebraicPrimitive(fresh(), curve, primitive, bounds);
  const spies = [vi.spyOn(derivative, 'differentiateAlgebraicWithin'), vi.spyOn(trace, 'quotientTrace'), vi.spyOn(matrix, 'invertExactMatrix'), vi.spyOn(factorization, 'factorAlgebraicPolynomialWithin')];
  for (const s of spies) s.mockImplementation(() => { throw Error('producer disabled'); });
  try { verifyAlgebraicPrimitive(fresh(), curve, primitive, proof.derivative, proof, bounds); } finally { for (const s of spies) s.mockRestore(); }
});
it('rejects a forged primitive, altered target, omitted factors and changed normalization', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), c = complex(curve), x = mapAlgebraicConstantBaseChangeValue(c.ctx, c.quotient, b.x);
  const primitive = constructAlgebraicPrimitive(fresh(), curve, b.field.fromInteger(b.ctx, 0n), [{quotient: c.quotient, weight: c.L.fromInteger(c.ctx, 1n), unit: c.L.fromInteger(c.ctx, 1n), factors: [{value: x, exponent: 1n}]}], bounds), proof = differentiateAlgebraicPrimitive(fresh(), curve, primitive, bounds);
  expect(() => verifyAlgebraicPrimitive(fresh(), curve, {...primitive}, proof.derivative, proof, bounds)).toThrow('domain-mismatch');
  expect(() => verifyAlgebraicPrimitive(fresh(), curve, primitive, b.field.fromInteger(b.ctx, 0n), proof, bounds)).toThrow('verification-failed');
  expect(() => verifyAlgebraicPrimitive(fresh(), curve, primitive, proof.derivative, {...proof, terms: []}, bounds)).toThrow('verification-failed');
  expect(() => verifyAlgebraicPrimitive(fresh(), curve, primitive, proof.derivative, {...proof, terms: [{...proof.terms[0], trace: {...proof.terms[0].trace, trace: b.field.fromInteger(b.ctx, 0n)}}]}, bounds)).toThrow('verification-failed');
  expect(() => constructAlgebraicPrimitive(fresh(), curve, b.x, [{quotient: c.quotient, weight: c.L.fromInteger(c.ctx, 1n), unit: c.L.fromInteger(c.ctx, 0n), factors: []}], bounds)).toThrow('invalid-input');
});
it('reconstructs fresh constant and curve owners while replaying a normalized trace primitive', () => {
  const b = quadratic([1n, 0n, -1n]), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds), c = complex(curve);
  const x = mapAlgebraicConstantBaseChangeValue(c.ctx, c.quotient, b.owner.embed(b.ctx, b.x)), y = mapAlgebraicConstantBaseChangeValue(c.ctx, c.quotient, b.a), argument = c.f.add(c.ctx, y, c.f.multiply(c.ctx, c.i, x));
  const primitive = constructAlgebraicPrimitive(fresh(), curve, b.owner.fromInteger(b.ctx, 0n), [{quotient: c.quotient, weight: c.L.negate(c.ctx, c.L.generator(c.ctx)), unit: c.L.fromInteger(c.ctx, 1n), factors: [{value: argument, exponent: 1n}]}], bounds), proof = differentiateAlgebraicPrimitive(fresh(), curve, primitive, bounds);
  const data = encodeAlgebraicPrimitive(fresh(), curve, primitive, proof.derivative, proof, bounds), spies = [vi.spyOn(derivative, 'differentiateAlgebraicWithin'), vi.spyOn(trace, 'quotientTrace'), vi.spyOn(matrix, 'invertExactMatrix'),
    vi.spyOn(factorization, 'factorAlgebraicPolynomialWithin'), vi.spyOn(construction, 'constructAlgebraicExtension'), vi.spyOn(presentation, 'constructNumberFieldPresentationWithin'), vi.spyOn(baseChange, 'baseChangeAlgebraicCurveWithin')];
  for (const s of spies) s.mockImplementation(() => { throw Error('producer disabled'); });
  try {
    const d = decodeAlgebraicPrimitive(fresh(), curve, proof.derivative, data, bounds); verifyAlgebraicPrimitive(fresh(), curve, d.primitive, proof.derivative, d.derivative, bounds);
    expect(d.primitive.terms[0].quotient.relative.target).not.toBe(c.L); expect(d.primitive.terms[0].quotient.change.field).not.toBe(c.f);
  } finally { for (const s of spies) s.mockRestore(); }
});
it('rejects a changed primitive target, malformed tag and bounded artifact exhaustion', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), primitive = constructAlgebraicPrimitive(fresh(), curve, b.x, [], bounds), proof = differentiateAlgebraicPrimitive(fresh(), curve, primitive, bounds), data = encodeAlgebraicPrimitive(fresh(), curve, primitive, proof.derivative, proof, bounds);
  expect(() => decodeAlgebraicPrimitive(fresh(), curve, b.x, data, bounds)).toThrow('domain-mismatch');
  expect(() => decodeAlgebraicPrimitive(fresh(), curve, proof.derivative, {...data as object, tag: 'unknown'}, bounds)).toThrow('invalid-input');
  expect(() => decodeAlgebraicPrimitive(fresh(), curve, proof.derivative, data, {...bounds, artifactBytes: 10})).toThrow('resource-limit');
});
