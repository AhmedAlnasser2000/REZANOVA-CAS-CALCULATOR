import { it, expect, vi } from 'vitest';
import { base, quadratic, fresh, bounds } from './__tests__/algebraic-support';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { solveAlgebraicExactDifferential, verifyAlgebraicExactDifferential } from './algebraic-exact-differential';
import { encodeAlgebraicExactDifferential, decodeAlgebraicExactDifferential } from './algebraic-differential-wire';
import * as rr from './algebraic-riemann-roch';
import * as derivatives from './algebraic-derivative';
import * as linear from './linear-system';
import * as divisor from './algebraic-divisor';
import * as factor from './algebraic-factorization';
import * as place from './algebraic-place';
import { ExecutionContext } from './execution';

function rationalCurve() { const b = base(); return {...b, curve: certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds)}; }
it('replays complete positive and negative exactness without any producers', () => {
  const b = rationalCurve(), inputs = [b.x, b.field.inverse(b.ctx, b.x)], proofs = inputs.map(v => solveAlgebraicExactDifferential(fresh(), b.curve, v, bounds)), data = proofs.map((p, i) => structuredClone(encodeAlgebraicExactDifferential(fresh(), b.curve, inputs[i], p, bounds)));
  const spies = [vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin'), vi.spyOn(derivatives, 'differentiateAlgebraicWithin'), vi.spyOn(linear, 'solveLinearSystem'),
    vi.spyOn(divisor, 'principalAlgebraicDivisorWithin'), vi.spyOn(factor, 'factorAlgebraicPolynomialWithin'), vi.spyOn(place, 'decomposeAlgebraicPlacesWithin')];
  for (const spy of spies) spy.mockImplementation(() => { throw Error('producer disabled'); });
  try { for (let i = 0; i < inputs.length; i++) { const restored = decodeAlgebraicExactDifferential(fresh(), b.curve, inputs[i], data[i], bounds); expect(restored.kind).toBe(proofs[i].kind); verifyAlgebraicExactDifferential(fresh(), b.curve, inputs[i], restored, bounds); } }
  finally { for (const spy of spies) spy.mockRestore(); }
});
it('retains complete nonrational constant ownership through fresh replay', () => {
  const b = quadratic([0n, 0n, 2n]), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds), input = b.owner.exactDivide(b.ctx, b.a, b.owner.embed(b.ctx, b.x));
  const proof = solveAlgebraicExactDifferential(fresh(), curve, input, bounds), data = structuredClone(encodeAlgebraicExactDifferential(fresh(), curve, input, proof, bounds));
  const restored = decodeAlgebraicExactDifferential(fresh(), curve, input, data, bounds); expect(restored.kind).toBe('primitive');
  if (restored.kind === 'primitive') expect(b.owner.equal(b.ctx, restored.primitive, b.a)).toBe(true);
});
it('rejects wrong expected inputs, tags and malformed evidence', () => {
  const b = rationalCurve(), p = solveAlgebraicExactDifferential(fresh(), b.curve, b.x, bounds), data = encodeAlgebraicExactDifferential(fresh(), b.curve, b.x, p, bounds) as {tag: string; version: number; payload: unknown};
  expect(() => decodeAlgebraicExactDifferential(fresh(), b.curve, b.field.inverse(b.ctx, b.x), data, bounds)).toThrow('domain-mismatch');
  expect(() => decodeAlgebraicExactDifferential(fresh(), b.curve, b.x, {...data, version: 2}, bounds)).toThrow('invalid-input');
  expect(() => decodeAlgebraicExactDifferential(fresh(), b.curve, b.x, {...data, payload: null}, bounds)).toThrow('invalid-input');
});
it('bounds the entire imported artifact before nested evidence and preserves sticky exhaustion', () => {
  const b = rationalCurve(), p = solveAlgebraicExactDifferential(fresh(), b.curve, b.x, bounds), data = encodeAlgebraicExactDifferential(fresh(), b.curve, b.x, p, bounds), c = fresh();
  expect(() => decodeAlgebraicExactDifferential(c, b.curve, b.x, data, {...bounds, artifactBytes: 10})).toThrow('resource-limit'); expect(() => c.tick()).toThrow('resource-limit');
  const exhausted = new ExecutionContext({work: 100, allocation: 1000, integerBits: 2048, degree: 256}); expect(() => decodeAlgebraicExactDifferential(exhausted, b.curve, b.x, data, bounds)).toThrow('resource-limit');
});
