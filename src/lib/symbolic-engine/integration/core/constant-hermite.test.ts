import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds, base} from './__tests__/algebraic-support';
import {PolynomialRing} from './polynomial';
import {RationalFunctionField} from './rational-function';
import {rationalField as Q} from './field';
import {constructAlgebraicExtension} from './algebraic-field';
import * as hermite from './constant-rational-hermite';
import {constantHermiteEvidenceCodec} from './hermite-wire';
import {algebraicCoefficientCodec} from './algebraic-wire';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve, verifyAlgebraicCurveWithin} from './algebraic-curve';
import * as coordinates from './algebraic-curve-coordinates';

describe('formal rational Hermite arithmetic over actual number-field constants', () => {
  it('reduces repeated poles and polynomial terms without assuming rational coefficients', () => {
    const ctx = fresh(), defining = new PolynomialRing(Q, 'a'), c = constructAlgebraicExtension(ctx, defining,
      defining.make(ctx, [Q.fromInteger(ctx, -2n), Q.fromInteger(ctx, 0n), Q.fromInteger(ctx, 1n)]), bounds);
    const x = new PolynomialRing(c, 't'), fractions = new RationalFunctionField(x), owner = {x, fractions};
    const alpha = c.generator(ctx), zero = c.fromInteger(ctx, 0n), one = c.fromInteger(ctx, 1n);
    const pole = x.make(ctx, [c.fromInteger(ctx, -1n), one]), term = fractions.make(ctx, x.constant(ctx, alpha), x.power(ctx, pole, 2));
    const input = fractions.add(ctx, term, fractions.make(ctx, x.make(ctx, [zero, alpha]), x.one(ctx)));
    const proof = hermite.reduceConstantRationalHermite(ctx, owner, input);
    expect(fractions.isZero(ctx, proof.residual)).toBe(true);
    const expected = fractions.add(ctx, fractions.make(ctx, x.constant(ctx, c.negate(ctx, alpha)), pole),
      fractions.make(ctx, x.make(ctx, [zero, zero, c.exactDivide(ctx, alpha, c.fromInteger(ctx, 2n))]), x.one(ctx)));
    expect(fractions.equal(ctx, proof.rationalPart, expected)).toBe(true);
    const codec = constantHermiteEvidenceCodec(ctx, owner, algebraicCoefficientCodec(ctx, c, bounds));
    const data = JSON.parse(JSON.stringify(codec.encode(proof))), spy = vi.spyOn(hermite, 'reduceConstantRationalHermite').mockImplementation(() => {throw Error('producer disabled');});
    try {
      const cold = fresh(), decoded = constantHermiteEvidenceCodec(cold, owner, algebraicCoefficientCodec(cold, c, bounds)).decode(data);
      hermite.verifyConstantRationalHermite(cold, owner, input, decoded);
      expect(() => hermite.verifyConstantRationalHermite(cold, owner, input, {...decoded, blocks: []})).toThrow('verification-failed');
    } finally {spy.mockRestore();}
  });
  it('retains complete proper residuals including algebraic residues', () => {
    const ctx = fresh(), defining = new PolynomialRing(Q, 'a'), c = constructAlgebraicExtension(ctx, defining,
      defining.make(ctx, [Q.fromInteger(ctx, -2n), Q.fromInteger(ctx, 0n), Q.fromInteger(ctx, 1n)]), bounds);
    const x = new PolynomialRing(c, 't'), fractions = new RationalFunctionField(x), owner = {x, fractions};
    const input = fractions.make(ctx, x.constant(ctx, c.generator(ctx)), x.make(ctx, [c.fromInteger(ctx, 1n), c.fromInteger(ctx, 0n), c.fromInteger(ctx, 1n)]));
    const proof = hermite.reduceConstantRationalHermite(ctx, owner, input);
    expect(fractions.equal(ctx, input, proof.residual)).toBe(true); expect(fractions.isZero(ctx, proof.rationalPart)).toBe(true);
  });
});

it('reuses only exact registered curve authority in one operation and rechecks fresh/stricter requests', () => {
  const b = base(), constants = certifyAlgebraicConstantField(b.ctx, b.field, bounds), curve = certifyAlgebraicCurve(b.ctx, b.field, constants, bounds);
  const ctx = fresh(), spy = vi.spyOn(coordinates, 'verifyAlgebraicCurveCoordinatesWithin');
  try {
    ctx.operation(() => {
      verifyAlgebraicCurveWithin(ctx, b.field, curve, bounds); const count = spy.mock.calls.length;
      verifyAlgebraicCurveWithin(ctx, b.field, curve, bounds); expect(spy.mock.calls.length).toBe(count);
      verifyAlgebraicCurveWithin(ctx, b.field, curve, Object.freeze({...bounds})); expect(spy.mock.calls.length).toBeGreaterThan(count);
      expect(() => verifyAlgebraicCurveWithin(ctx, b.field, {...curve}, bounds)).toThrow('domain-mismatch');
    });
    const count = spy.mock.calls.length; ctx.operation(() => verifyAlgebraicCurveWithin(ctx, b.field, curve, bounds));
    expect(spy.mock.calls.length).toBeGreaterThan(count);
  } finally {spy.mockRestore();}
});
