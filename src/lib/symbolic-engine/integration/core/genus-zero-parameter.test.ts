import {it, expect, vi, afterEach} from 'vitest';
import {quadratic, fresh, bounds} from './__tests__/algebraic-support';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import * as parameter from './genus-zero-parameter';
import * as rr from './algebraic-riemann-roch';
import * as derivative from './algebraic-derivative';
import * as divisor from './algebraic-divisor';
import * as geometry from './algebraic-canonical-geometry';
import * as places from './algebraic-place';
import * as linear from './linear-system';
afterEach(() => vi.restoreAllMocks());
function curve(coefficients: bigint[]) {
  const b = quadratic(coefficients), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds); return {...b, curve};
}
it('constructs a general conic parameter with exact native forward/inverse maps', () => {
  const b = curve([1n, 0n, 1n]), p = parameter.tryGenusZeroParameter(b.ctx, b.curve, bounds); if (!p) throw Error('split conic parameter');
  expect(p.geometry.genus).toBe(0n); expect(p.space.dimension).toBe(2); expect(p.divisor.divisor.entries.filter(e => e.coefficient < 0n)).toHaveLength(1);
  const x = b.owner.embed(b.ctx, b.x), input = b.owner.exactDivide(b.ctx, b.owner.add(b.ctx, x, b.a), b.owner.add(b.ctx, x, b.owner.fromInteger(b.ctx, 2n)));
  b.ctx.operation(() => {const image = parameter.genusZeroForwardWithin(b.ctx, p, input); expect(b.owner.equal(b.ctx, parameter.genusZeroBackwardWithin(b.ctx, p, image), input)).toBe(true);});
  expect(p.field.ring.domain).toBe(b.curve.coordinates.constantOwner); expect(Object.isFrozen(p) && Object.isFrozen(p.basisImages)).toBe(true);
  const off = () => {throw Error('genus-zero producer disabled');};
  vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin').mockImplementation(off); vi.spyOn(derivative, 'differentiateAlgebraicWithin').mockImplementation(off);
  vi.spyOn(divisor, 'principalAlgebraicDivisorWithin').mockImplementation(off); vi.spyOn(geometry, 'constructAlgebraicCanonicalGeometryWithin').mockImplementation(off);
  vi.spyOn(places, 'decomposeAlgebraicPlacesWithin').mockImplementation(off); vi.spyOn(linear, 'solveLinearSystem').mockImplementation(off);
  parameter.verifyGenusZeroParameter(fresh(), b.curve, p, bounds);
});
it('rejects changed point, complete space, mappings, pole divisor and selected derivation', () => {
  const b = curve([1n, 0n, 1n]), p = parameter.tryGenusZeroParameter(b.ctx, b.curve, bounds); if (!p) throw Error('split conic parameter');
  for (const changed of [{...p, point: -1}, {...p, index: -1}, {...p, geometry: {...p.geometry, genus: 1n}}, {...p, space: {...p.space, dimension: 1}}, {...p, basisImages: []}, {...p, xImage: p.field.fromInteger(b.ctx, 0n)}, {...p, derivative: {...p.derivative, derivative: b.owner.fromInteger(b.ctx, 0n)}}, {...p, parameter: b.owner.fromInteger(b.ctx, 1n)}]) expect(() => parameter.verifyGenusZeroParameter(fresh(), b.curve, changed, bounds)).toThrow('verification-failed');
  const foreign = curve([1n, 0n, 1n]); expect(() => parameter.verifyGenusZeroParameter(fresh(), foreign.curve, p, bounds)).toThrow('domain-mismatch');
});
it('does not declare positive-genus or a missing rational infinity place parametrized', () => {
  const elliptic = curve([1n, -1n, 0n, 1n]); expect(parameter.tryGenusZeroParameter(elliptic.ctx, elliptic.curve, bounds)).toBeNull();
  const anisotropic = curve([-1n, 0n, -1n]); expect(parameter.tryGenusZeroParameter(anisotropic.ctx, anisotropic.curve, bounds)).toBeNull();
});
