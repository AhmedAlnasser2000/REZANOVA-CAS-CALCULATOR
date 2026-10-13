import { it, expect, vi } from 'vitest';
import { base, fresh, bounds } from './__tests__/algebraic-support';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { certifyAlgebraicDifferential, verifyAlgebraicDifferential } from './algebraic-differential';
import * as geometry from './algebraic-curve-geometry';
import * as divisors from './algebraic-divisor';
it('replays complete differential support with geometry and divisor producers disabled', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), inputs = [b.field.fromInteger(b.ctx, 0n), b.x], proofs = inputs.map(input => certifyAlgebraicDifferential(fresh(), curve, input, bounds));
  const spies = [vi.spyOn(geometry, 'certifyAlgebraicCurveGeometryWithin'), vi.spyOn(divisors, 'principalAlgebraicDivisorWithin')]; for (const s of spies) s.mockImplementation(() => { throw Error('producer disabled'); });
  try { for (let i = 0; i < inputs.length; i++) verifyAlgebraicDifferential(fresh(), curve, inputs[i], proofs[i], bounds); } finally { for (const s of spies) s.mockRestore(); }
  expect(proofs[0].divisor).toBeNull(); expect(() => verifyAlgebraicDifferential(fresh(), curve, b.x, {...proofs[1], divisor: null}, bounds)).toThrow('verification-failed');
});
it('requires replay accounting and starts standalone support verification cold', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), p = certifyAlgebraicDifferential(fresh(), curve, b.x, bounds), reused = fresh();
  verifyAlgebraicDifferential(reused, curve, b.x, p, bounds); const first = reused.usage.work; verifyAlgebraicDifferential(reused, curve, b.x, p, bounds); expect(reused.usage.work).toBe(2 * first);
  expect(() => verifyAlgebraicDifferential(fresh(), curve, b.x, {...p, arithmetic: undefined}, bounds)).toThrow('verification-failed');
});
