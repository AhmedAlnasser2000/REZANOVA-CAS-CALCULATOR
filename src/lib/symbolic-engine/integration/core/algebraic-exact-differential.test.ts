import { it, expect, vi } from 'vitest';
import { base, quadratic, fresh, bounds } from './__tests__/algebraic-support';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { solveAlgebraicExactDifferential, verifyAlgebraicExactDifferential } from './algebraic-exact-differential';
import * as rr from './algebraic-riemann-roch';
import * as derivatives from './algebraic-derivative';
import * as linear from './linear-system';
import { constructAlgebraicExtension } from './algebraic-field';
import { PolynomialRing } from './polynomial';
import { ExecutionContext } from './execution';

it('solves zero, constants and polynomial exactness with the full actual constant direction', () => {
  const b = base(), constants = certifyAlgebraicConstantField(b.ctx, b.field, bounds), curve = certifyAlgebraicCurve(b.ctx, b.field, constants, bounds);
  for (const input of [b.field.fromInteger(b.ctx, 0n), b.field.fromInteger(b.ctx, 5n), b.field.multiply(b.ctx, b.x, b.x)]) {
    const d = solveAlgebraicExactDifferential(fresh(), curve, input, bounds); expect(d.kind).toBe('primitive');
    if (d.kind === 'primitive') { expect(d.elimination.kind === 'consistent' && d.elimination.nullspace.length).toBe(1); expect(b.field.equal(b.ctx, d.derivative.derivative, input)).toBe(true); }
    verifyAlgebraicExactDifferential(fresh(), curve, input, d, bounds);
  }
});
it('returns no field primitive for 1/x without an elementary non-integrability claim', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), input = b.field.inverse(b.ctx, b.x);
  const d = solveAlgebraicExactDifferential(fresh(), curve, input, bounds); expect(d.kind).toBe('no-field-primitive'); expect(d.elimination.kind).toBe('inconsistent'); expect(d.bound.entries).toEqual([]);
  verifyAlgebraicExactDifferential(fresh(), curve, input, d, bounds);
});
it('handles ramified finite and infinity poles and repeated poles', () => {
  const b = quadratic(), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds);
  const inverse = b.owner.inverse(b.ctx, b.a), input = b.owner.multiply(b.ctx, inverse, b.owner.multiply(b.ctx, inverse, inverse));
  const p = solveAlgebraicExactDifferential(fresh(), curve, inverse, bounds); expect(p.kind).toBe('primitive');
  if (p.kind === 'primitive') expect(b.owner.equal(b.ctx, p.primitive, b.owner.multiply(b.ctx, b.owner.fromInteger(b.ctx, 2n), b.a))).toBe(true);
  const repeated = solveAlgebraicExactDifferential(fresh(), curve, input, bounds); expect(repeated.kind).toBe('primitive');
  if (repeated.kind === 'primitive') expect(b.owner.equal(b.ctx, repeated.primitive, b.owner.multiply(b.ctx, b.owner.fromInteger(b.ctx, -2n), inverse))).toBe(true);
});
it('uses certified hidden constants and finite coefficient comparison', () => {
  const b = quadratic([0n, 0n, 2n]), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds);
  const input = b.owner.exactDivide(b.ctx, b.a, b.owner.embed(b.ctx, b.x)), proof = solveAlgebraicExactDifferential(fresh(), curve, input, bounds);
  expect(constants.basis.length).toBe(2); expect(proof.kind).toBe('primitive');
  if (proof.kind === 'primitive') expect(b.owner.equal(b.ctx, proof.primitive, b.a)).toBe(true);
});
it('solves a nonradical cubic defining derivative', () => {
  const b = base(), r = new PolynomialRing(b.field, 'y'), relation = r.make(b.ctx, [b.field.negate(b.ctx, b.x), b.field.fromInteger(b.ctx, -1n), b.field.fromInteger(b.ctx, 0n), b.field.fromInteger(b.ctx, 1n)]), owner = constructAlgebraicExtension(b.ctx, r, relation, bounds), y = owner.generator(b.ctx);
  const input = owner.inverse(b.ctx, owner.subtract(b.ctx, owner.multiply(b.ctx, owner.fromInteger(b.ctx, 3n), owner.multiply(b.ctx, y, y)), owner.fromInteger(b.ctx, 1n)));
  const curve = certifyAlgebraicCurve(b.ctx, owner, certifyAlgebraicConstantField(b.ctx, owner, bounds), bounds), proof = solveAlgebraicExactDifferential(fresh(), curve, input, bounds);
  expect(proof.kind).toBe('primitive'); if (proof.kind === 'primitive') expect(owner.equal(b.ctx, proof.primitive, y)).toBe(true);
});
it('certifies field-exactness failure for a nonzero holomorphic elliptic differential', () => {
  const b = quadratic([1n, -1n, 0n, 1n]), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds), input = b.owner.inverse(b.ctx, b.a);
  const p = solveAlgebraicExactDifferential(fresh(), curve, input, bounds); expect(p.kind).toBe('no-field-primitive'); expect(p.bound.entries.length).toBe(0); expect(p.differential.geometry.genus).toBe(1n);
});
it('verifies complete positive and negative evidence with solving and derivative producers disabled', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), inputs = [b.x, b.field.inverse(b.ctx, b.x)], proofs = inputs.map(v => solveAlgebraicExactDifferential(fresh(), curve, v, bounds));
  const spies = [vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin'), vi.spyOn(derivatives, 'differentiateAlgebraicWithin'), vi.spyOn(linear, 'solveLinearSystem')];
  for (const spy of spies) spy.mockImplementation(() => { throw Error('producer disabled'); });
  try { for (let i = 0; i < inputs.length; i++) verifyAlgebraicExactDifferential(fresh(), curve, inputs[i], proofs[i], bounds); } finally { for (const spy of spies) spy.mockRestore(); }
});
it('rejects altered bounds, matrix signs, derivatives, mappings and conditions', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), p = solveAlgebraicExactDifferential(fresh(), curve, b.x, bounds);
  expect(() => verifyAlgebraicExactDifferential(fresh(), curve, b.x, {...p, derivatives: []}, bounds)).toThrow('verification-failed');
  expect(() => verifyAlgebraicExactDifferential(fresh(), curve, b.x, {...p, conditions: []}, bounds)).toThrow('verification-failed');
  expect(() => verifyAlgebraicExactDifferential(fresh(), curve, b.x, {...p, matrix: {...p.matrix, degree: p.matrix.degree + 1}}, bounds)).toThrow('verification-failed');
  if (p.kind === 'primitive') expect(() => verifyAlgebraicExactDifferential(fresh(), curve, b.x, {...p, primitive: b.x}, bounds)).toThrow('verification-failed');
});
it('keeps input ownership and sticky exhaustion distinct', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), other = base();
  expect(() => solveAlgebraicExactDifferential(fresh(), curve, other.x, bounds)).toThrow('domain-mismatch');
  const limited = new ExecutionContext({work: 100, allocation: 1000, integerBits: 2048, degree: 256});
  expect(() => solveAlgebraicExactDifferential(limited, curve, b.x, bounds)).toThrow('resource-limit'); expect(() => limited.tick()).toThrow('resource-limit');
});
