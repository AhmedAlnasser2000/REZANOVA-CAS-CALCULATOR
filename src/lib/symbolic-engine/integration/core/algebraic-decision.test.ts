import { it, expect } from 'vitest';
import { base, quadratic, fresh, bounds } from './__tests__/algebraic-support';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { integrateAlgebraic, verifyAlgebraicDecision } from './algebraic-decision';
import { verifyAlgebraicPrimitive } from './algebraic-primitive';

it('constructs verified zero, constant and rational logarithmic primitives through one algorithm', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds);
  for (const input of [b.field.fromInteger(b.ctx, 0n), b.field.fromInteger(b.ctx, 3n), b.field.inverse(b.ctx, b.x)]) {
    const p = integrateAlgebraic(fresh(), curve, input, bounds); expect(p.kind).toBe('elementary'); verifyAlgebraicDecision(fresh(), curve, input, p, bounds);
    if (p.kind === 'elementary') verifyAlgebraicPrimitive(fresh(), curve, p.primitive, input, p.derivative, bounds);
  }
});
it('constructs the exact primitive 2y on y²=x', () => {
  const b = quadratic(), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds), input = b.owner.inverse(b.ctx, b.a), p = integrateAlgebraic(fresh(), curve, input, bounds);
  expect(p.kind).toBe('elementary'); if (p.kind === 'elementary') { expect(b.owner.equal(b.ctx, p.primitive.fieldPart, b.owner.multiply(b.ctx, b.owner.fromInteger(b.ctx, 2n), b.a))).toBe(true); expect(p.primitive.terms).toEqual([]); }
});
it('constructs a logarithm on y²=x²+1 despite field-exactness failure', () => {
  const b = quadratic([1n, 0n, 1n]), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds), input = b.owner.inverse(b.ctx, b.a), p = integrateAlgebraic(fresh(), curve, input, bounds);
  expect(p.kind).toBe('elementary'); if (p.kind === 'elementary') { expect(p.primitive.terms.length).toBe(1); expect(p.logarithms.kind).toBe('complete'); }
  verifyAlgebraicDecision(fresh(), curve, input, p, bounds);
}, 120000);
it('constructs formal complex logarithms for y²=1−x² with explicit auxiliary i', () => {
  const b = quadratic([1n, 0n, -1n]), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds), input = b.owner.inverse(b.ctx, b.a), p = integrateAlgebraic(fresh(), curve, input, bounds);
  expect(p.kind).toBe('elementary'); if (p.kind === 'elementary') expect(p.primitive.terms[0].quotient.relative.degree).toBe(2);
  verifyAlgebraicDecision(fresh(), curve, input, p, bounds);
}, 120000);
it('certifies both a nonzero holomorphic remainder and a complete infinity obstruction', () => {
  const b = quadratic([1n, -1n, 0n, 1n]), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds), inv = b.owner.inverse(b.ctx, b.a);
  const h = integrateAlgebraic(fresh(), curve, inv, bounds); expect(h.kind === 'non-elementary' && h.reason).toBe('nonzero-holomorphic-remainder'); verifyAlgebraicDecision(fresh(), curve, inv, h, bounds);
  const input = b.owner.multiply(b.ctx, b.owner.embed(b.ctx, b.x), inv), p = integrateAlgebraic(fresh(), curve, input, bounds); expect(p.kind === 'non-elementary' && p.reason).toBe('infinity-principal-part-obstruction'); verifyAlgebraicDecision(fresh(), curve, input, p, bounds);
});
