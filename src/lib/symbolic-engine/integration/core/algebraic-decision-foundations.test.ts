import { it, expect } from 'vitest';
import { base, quadratic, fresh, bounds } from './__tests__/algebraic-support';
import { nestedHiddenConstantCurve, heightEightHiddenConstantCurve } from './__tests__/algebraic-divisor-support';
import { PolynomialRing } from './polynomial';
import { constructAlgebraicExtension } from './algebraic-field';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { differentiateAlgebraic } from './algebraic-derivative';
import { integrateAlgebraic, verifyAlgebraicDecision } from './algebraic-decision';
import { encodeAlgebraicDecision, decodeAlgebraicDecision } from './algebraic-decision-wire';

it('preserves rational independence of residues over hidden number-field constants', () => {
  const b = quadratic([0n, 0n, 2n]), f = b.owner, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds), x = f.embed(b.ctx, b.x), c = f.exactDivide(b.ctx, b.a, x);
  const input = f.add(b.ctx, f.inverse(b.ctx, x), f.exactDivide(b.ctx, c, f.subtract(b.ctx, x, f.fromInteger(b.ctx, 1n))));
  const proof = integrateAlgebraic(fresh(), curve, input, bounds); expect(proof.kind).toBe('elementary'); if (proof.kind === 'elementary') { expect(proof.relations.basis.length).toBe(2); expect(proof.primitive.terms.length).toBe(2); }
  const data = encodeAlgebraicDecision(fresh(), curve, input, proof, bounds); verifyAlgebraicDecision(fresh(), curve, input, decodeAlgebraicDecision(fresh(), curve, input, data, bounds), bounds);
}, 500000);
it('retains nested native owners and height-eight replay', () => {
  for (const b of [nestedHiddenConstantCurve(), heightEightHiddenConstantCurve()]) {
    const input = b.owner.fromInteger(b.ctx, (1n << 95n) + 17n), proof = integrateAlgebraic(fresh(), b.curve, input, bounds); expect(proof.kind).toBe('elementary');
    if (proof.kind === 'elementary') expect(proof.primitive.curve.owner).toBe(b.owner);
    const data = encodeAlgebraicDecision(fresh(), b.curve, input, proof, bounds), decoded = decodeAlgebraicDecision(fresh(), b.curve, input, data, bounds); verifyAlgebraicDecision(fresh(), b.curve, input, decoded, bounds);
  }
}, 500000);
it('integrates a nonradical cubic through general reductions', () => {
  const b = base('z'), r = new PolynomialRing(b.field, 'a'), f = constructAlgebraicExtension(b.ctx, r, r.make(b.ctx, [b.field.negate(b.ctx, b.x), b.field.fromInteger(b.ctx, -1n), b.field.fromInteger(b.ctx, 0n), b.field.fromInteger(b.ctx, 1n)]), bounds), a = f.generator(b.ctx), curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds);
  const input = f.inverse(b.ctx, f.subtract(b.ctx, f.multiply(b.ctx, f.fromInteger(b.ctx, 3n), f.multiply(b.ctx, a, a)), f.fromInteger(b.ctx, 1n))), proof = integrateAlgebraic(fresh(), curve, input, bounds);
  expect(proof.kind).toBe('elementary'); if (proof.kind === 'elementary') expect(f.equal(b.ctx, proof.primitive.fieldPart, a)).toBe(true); verifyAlgebraicDecision(fresh(), curve, input, proof, bounds);
}, 500000);
it('retains a logarithmic prefix followed by a nonzero holomorphic obstruction', () => {
  const b = quadratic([1n, -1n, 0n, 1n]), f = b.owner, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds), input = f.add(b.ctx, f.inverse(b.ctx, f.embed(b.ctx, b.x)), f.inverse(b.ctx, b.a));
  const proof = integrateAlgebraic(fresh(), curve, input, bounds); expect(proof).toMatchObject({kind: 'non-elementary', reason: 'nonzero-holomorphic-remainder', later: 'complete'});
  if (proof.kind === 'non-elementary' && proof.reason === 'nonzero-holomorphic-remainder') expect(proof.logarithms.components.length).toBe(1);
  verifyAlgebraicDecision(fresh(), curve, input, proof, bounds);
}, 500000);
it('integrates seeded exact plus logarithmic identities without mutating operands', () => {
  const b = quadratic(), f = b.owner, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds), x = f.embed(b.ctx, b.x); let seed = 73n;
  for (let i = 0; i < 3; i++) {
    seed = seed * 17n % 997n; const v = f.exactDivide(b.ctx, f.add(b.ctx, f.multiply(b.ctx, f.fromInteger(b.ctx, seed), b.a), x), f.add(b.ctx, x, f.fromInteger(b.ctx, 1n))), g = f.add(b.ctx, b.a, f.fromInteger(b.ctx, 2n)), before = v.representative.coefficients.slice();
    const input = f.add(b.ctx, differentiateAlgebraic(fresh(), f, v, bounds).derivative, f.multiply(b.ctx, f.fromInteger(b.ctx, seed), f.exactDivide(b.ctx, differentiateAlgebraic(fresh(), f, g, bounds).derivative, g))), proof = integrateAlgebraic(fresh(), curve, input, bounds);
    expect(proof.kind).toBe('elementary'); expect(v.representative.coefficients).toEqual(before); expect(Object.isFrozen(proof)).toBe(true); verifyAlgebraicDecision(fresh(), curve, input, proof, bounds);
  }
}, 500000);
it('integrates singular presentations and a genus-three exact differential', () => {
  for (const b of [quadratic([0n, 0n, 0n, 1n]), quadratic([-1n, 0n, 0n, 0n, 0n, 0n, 0n, 1n])]) {
    const f = b.owner, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds), input = differentiateAlgebraic(fresh(), f, b.a, bounds).derivative;
    const proof = integrateAlgebraic(fresh(), curve, input, bounds); expect(proof.kind).toBe('elementary'); if (proof.kind === 'elementary') expect(f.equal(b.ctx, proof.primitive.fieldPart, b.a)).toBe(true); verifyAlgebraicDecision(fresh(), curve, input, proof, bounds);
  }
}, 500000);
