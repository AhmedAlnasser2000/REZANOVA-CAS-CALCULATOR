import {it, expect, vi} from 'vitest';
import {quadratic, fresh, bounds} from './__tests__/algebraic-support';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {certifyAlgebraicCurveGeometryWithin, verifyAlgebraicCurveGeometry} from './algebraic-curve-geometry';
import * as factors from './algebraic-factorization';

it('reuses complete geometry only for the exact live curve/bounds and replays cold', () => {
  const b = quadratic([1n, 0n, 1n]), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds), ctx = fresh(), spy = vi.spyOn(factors, 'factorAlgebraicPolynomialWithin');
  try {
    const first = ctx.operation(() => {
      const p = certifyAlgebraicCurveGeometryWithin(ctx, curve, bounds), calls = spy.mock.calls.length; expect(calls).toBeGreaterThan(0);
      const allocation = ctx.usage.allocation, q = certifyAlgebraicCurveGeometryWithin(ctx, curve, bounds); expect(q).toBe(p); expect(spy.mock.calls.length).toBe(calls); expect(ctx.usage.allocation).toBeGreaterThan(allocation);
      const differentBounds = Object.freeze({...bounds}), distinct = certifyAlgebraicCurveGeometryWithin(ctx, curve, differentBounds); expect(distinct).not.toBe(p); expect(spy.mock.calls.length).toBeGreaterThan(calls); return p;
    });
    const before = spy.mock.calls.length, second = ctx.operation(() => certifyAlgebraicCurveGeometryWithin(ctx, curve, bounds)); expect(second).not.toBe(first); expect(spy.mock.calls.length).toBeGreaterThan(before);
    const count = spy.mock.calls.length; spy.mockImplementation(() => {throw Error('geometry producer disabled');}); verifyAlgebraicCurveGeometry(fresh(), curve, first, bounds); expect(spy.mock.calls.length).toBe(count);
    expect(() => certifyAlgebraicCurveGeometryWithin(fresh(), {...curve}, bounds)).toThrow('domain-mismatch');
    expect(() => verifyAlgebraicCurveGeometry(fresh(), curve, {...first, genus: 9n}, bounds)).toThrow('verification-failed');
  } finally {spy.mockRestore();}
});
it('does not reuse mutable bounds and preserves stricter limits and sticky exhaustion', () => {
  const b = quadratic(), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds), ctx = fresh();
  ctx.operation(() => {
    const mutable = {...bounds}, first = certifyAlgebraicCurveGeometryWithin(ctx, curve, mutable), second = certifyAlgebraicCurveGeometryWithin(ctx, curve, mutable); expect(second).not.toBe(first);
    certifyAlgebraicCurveGeometryWithin(ctx, curve, bounds);
    expect(() => certifyAlgebraicCurveGeometryWithin(ctx, curve, Object.freeze({...bounds, towerHeight: 1}))).toThrow('resource-limit');
    expect(() => certifyAlgebraicCurveGeometryWithin(ctx, curve, bounds)).toThrow('resource-limit');
  });
});
