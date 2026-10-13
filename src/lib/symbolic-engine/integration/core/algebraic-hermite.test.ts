import { it, expect, vi } from 'vitest';
import { base, quadratic, fresh, bounds } from './__tests__/algebraic-support';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { reduceAlgebraicHermite, verifyAlgebraicHermite } from './algebraic-hermite';
import { reduceAlgebraicInfinity, verifyAlgebraicInfinityReduction } from './algebraic-infinity-reduction';
import * as derivatives from './algebraic-derivative';
import * as linear from './linear-system';
import * as rr from './algebraic-riemann-roch';
import * as squareFree from './factorization-square-free';

it('reduces complete rational repeated poles with checked modular transitions', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), inverse = b.field.inverse(b.ctx, b.x), input = b.field.add(b.ctx, inverse, b.field.multiply(b.ctx, inverse, inverse));
  const proof = reduceAlgebraicHermite(fresh(), curve, input, bounds); expect(proof.steps.length).toBe(1);
  expect(b.field.equal(b.ctx, proof.fieldPart, b.field.negate(b.ctx, inverse))).toBe(true); expect(b.field.equal(b.ctx, proof.remainder, inverse)).toBe(true);
  verifyAlgebraicHermite(fresh(), curve, input, proof, bounds);
});
it('handles a ramified repeated pole using the actual integral-basis connection', () => {
  const b = quadratic(), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds), inverse = b.owner.inverse(b.ctx, b.a), input = b.owner.multiply(b.ctx, inverse, b.owner.multiply(b.ctx, inverse, inverse));
  const proof = reduceAlgebraicHermite(fresh(), curve, input, bounds); expect(proof.steps.length).toBe(1); expect(b.owner.isZero(b.ctx, proof.remainder)).toBe(true);
  expect(b.owner.equal(b.ctx, proof.fieldPart, b.owner.multiply(b.ctx, b.owner.fromInteger(b.ctx, -2n), inverse))).toBe(true);
});
it('reduces several disjoint pole multiplicities and retains zero/simple inputs', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), inverse = b.field.inverse(b.ctx, b.x), shifted = b.field.inverse(b.ctx, b.field.add(b.ctx, b.x, b.field.fromInteger(b.ctx, 1n)));
  const input = b.field.add(b.ctx, b.field.multiply(b.ctx, inverse, b.field.multiply(b.ctx, inverse, inverse)), b.field.multiply(b.ctx, shifted, shifted));
  const p = reduceAlgebraicHermite(fresh(), curve, input, bounds); expect(p.steps.length).toBeGreaterThan(1); expect(b.field.isZero(b.ctx, p.remainder)).toBe(true);
  expect(reduceAlgebraicHermite(fresh(), curve, b.field.fromInteger(b.ctx, 0n), bounds).steps).toEqual([]);
});
it('uses the complete infinity space for polynomial and ramified corrections', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), input = b.field.multiply(b.ctx, b.x, b.x);
  const p = reduceAlgebraicInfinity(fresh(), curve, input, bounds); expect(p.kind).toBe('reduced');
  if (p.kind === 'reduced') { expect(b.field.isZero(b.ctx, p.remainder)).toBe(true); expect(p.blocks.length).toBe(1); }
  verifyAlgebraicInfinityReduction(fresh(), curve, input, p, bounds);
  const q = quadratic(), qc = certifyAlgebraicCurve(q.ctx, q.owner, certifyAlgebraicConstantField(q.ctx, q.owner, bounds), bounds), f = q.owner.inverse(q.ctx, q.a), proof = reduceAlgebraicInfinity(fresh(), qc, f, bounds);
  expect(proof.kind).toBe('reduced'); if (proof.kind === 'reduced') expect(q.owner.equal(q.ctx, proof.primitive, q.owner.multiply(q.ctx, q.owner.fromInteger(q.ctx, 2n), q.a))).toBe(true);
});
it('retains full infinity inconsistency separately from elementary decision authority', () => {
  const b = quadratic([1n, -1n, 0n, 1n]), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds), input = b.owner.exactDivide(b.ctx, b.owner.embed(b.ctx, b.x), b.a);
  const p = reduceAlgebraicInfinity(fresh(), curve, input, bounds); expect(p.kind).toBe('no-simple-pole-reduction'); expect(p.elimination.kind).toBe('inconsistent');
  verifyAlgebraicInfinityReduction(fresh(), curve, input, p, bounds);
});
it('verifies Hermite and infinity evidence with all corresponding producers disabled', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), inverse = b.field.inverse(b.ctx, b.x), h = reduceAlgebraicHermite(fresh(), curve, b.field.multiply(b.ctx, inverse, inverse), bounds), p = reduceAlgebraicInfinity(fresh(), curve, b.x, bounds);
  const spies = [vi.spyOn(derivatives, 'differentiateAlgebraicWithin'), vi.spyOn(linear, 'solveLinearSystem'), vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin'), vi.spyOn(squareFree, 'checkedFactorSquareFree')];
  for (const spy of spies) spy.mockImplementation(() => { throw Error('producer disabled'); });
  try { verifyAlgebraicHermite(fresh(), curve, h.input, h, bounds); verifyAlgebraicInfinityReduction(fresh(), curve, b.x, p, bounds); } finally { for (const spy of spies) spy.mockRestore(); }
});
it('rejects removed transitions, wrong multiplicities and incomplete infinity constraints', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), inverse = b.field.inverse(b.ctx, b.x), input = b.field.multiply(b.ctx, inverse, inverse), h = reduceAlgebraicHermite(fresh(), curve, input, bounds);
  expect(() => verifyAlgebraicHermite(fresh(), curve, input, {...h, steps: []}, bounds)).toThrow('verification-failed');
  expect(() => verifyAlgebraicHermite(fresh(), curve, input, {...h, steps: [{...h.steps[0], ell: 2n}]}, bounds)).toThrow('verification-failed');
  const p = reduceAlgebraicInfinity(fresh(), curve, b.x, bounds); expect(() => verifyAlgebraicInfinityReduction(fresh(), curve, b.x, {...p, blocks: []}, bounds)).toThrow('verification-failed');
});
