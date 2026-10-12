import { describe, it, expect, vi } from 'vitest';
import { base, quadratic, bounds, fresh } from './__tests__/algebraic-support';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { decomposeAlgebraicPlaces } from './algebraic-place';
import { expandAlgebraicPlace } from './algebraic-local';
import { certifyAlgebraicCurveGeometry } from './algebraic-curve-geometry';
import { constructAlgebraicFactoredFunctionWithin, expandAlgebraicFactoredFunction } from './algebraic-factored-function';
import { encodeAlgebraicCurveGeometry, decodeAlgebraicCurveGeometry, encodeAlgebraicLocalExpansion, decodeAlgebraicLocalExpansion,
  encodeAlgebraicFactoredFunction, decodeAlgebraicFactoredFunction } from './algebraic-geometry-wire';
import * as linear from './linear-system';
import * as modules from './polynomial-module';
import * as factoring from './algebraic-factorization';
import * as places from './algebraic-place';
import * as local from './algebraic-local';
import * as rr from './algebraic-riemann-roch';

const disabled = () => {
  const spies = [vi.spyOn(linear, 'solveLinearSystem'), vi.spyOn(modules, 'polynomialModuleHermite'), vi.spyOn(factoring, 'factorAlgebraicPolynomialWithin'),
    vi.spyOn(places, 'decomposeAlgebraicPlacesWithin'), vi.spyOn(local, 'expandAlgebraicPlaceWithin'), vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin')];
  for (const spy of spies) spy.mockImplementation(() => { throw new Error('producer disabled'); }); return () => spies.forEach(spy => spy.mockRestore());
};
describe('geometry, local and factored replay', () => {
  it('replays complete genus and global functions with producers disabled', () => {
    const b = quadratic([1n, 0n, 0n, 1n]), c = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, c, bounds);
    const proof = certifyAlgebraicCurveGeometry(b.ctx, curve, bounds), data = encodeAlgebraicCurveGeometry(fresh(), curve, proof, bounds), restore = disabled();
    try { expect(decodeAlgebraicCurveGeometry(fresh(), curve, data, bounds).genus).toBe(1n); } finally { restore(); }
  });
  it('reconstructs locally regular functions and their full residue-map binding', () => {
    const b = base(), c = certifyAlgebraicConstantField(b.ctx, b.field, bounds), curve = certifyAlgebraicCurve(b.ctx, b.field, c, bounds), r = curve.finite.lattice.scalar.ring;
    const place = decomposeAlgebraicPlaces(b.ctx, curve, r.make(b.ctx, [r.domain.fromInteger(b.ctx, 0n), r.domain.fromInteger(b.ctx, 1n)]), false, bounds).places[0];
    const input = b.field.inverse(b.ctx, b.field.subtract(b.ctx, b.field.fromInteger(b.ctx, 1n), b.x)), proof = expandAlgebraicPlace(b.ctx, curve, place, input, 3n, bounds);
    const data = encodeAlgebraicLocalExpansion(fresh(), curve, place, input, 3n, proof, bounds), restore = disabled();
    try {
      const result = decodeAlgebraicLocalExpansion(fresh(), curve, place, input, 3n, data, bounds); expect(result.digits).toHaveLength(3);
      expect(() => decodeAlgebraicLocalExpansion(fresh(), curve, place, input, 2n, data, bounds)).toThrow(/precision|request/);
    } finally { restore(); }
  });
  it('retains exact large powers without expanding them', () => {
    const b = base(), c = certifyAlgebraicConstantField(b.ctx, b.field, bounds), curve = certifyAlgebraicCurve(b.ctx, b.field, c, bounds), unit = curve.coordinates.constantOwner.fromInteger(b.ctx, 1n);
    const input = [{value: b.x, exponent: 10_000n}], proof = b.ctx.operation(() => constructAlgebraicFactoredFunctionWithin(b.ctx, curve, unit, input, bounds));
    expect(proof.divisor.entries.map(e => e.coefficient)).toEqual([10_000n, -10_000n]);
    const data = encodeAlgebraicFactoredFunction(fresh(), curve, unit, input, proof, bounds), restore = disabled();
    try { expect(decodeAlgebraicFactoredFunction(fresh(), curve, unit, input, data, bounds).factors[0].exponent).toBe(10_000n); } finally { restore(); }
    expect(() => expandAlgebraicFactoredFunction(fresh(), curve, proof, bounds)).toThrow(/resource-limit/);
  });
});
