import {it, expect, vi, afterEach} from 'vitest';
import {quadratic, fresh, bounds} from './__tests__/algebraic-support';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {tryProduceGenusZeroCandidate} from './genus-zero-integration';
import {checkCompactAlgebraicCandidate, verifyCompactAlgebraicElementary} from './algebraic-elementary-evidence';
import {encodeCompactAlgebraicElementary, decodeCompactAlgebraicElementary} from './algebraic-elementary-wire';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';
import * as parameter from './genus-zero-parameter';
import * as constants from './genus-zero-constant-extension';
import * as primitive from './algebraic-primitive';
afterEach(() => vi.restoreAllMocks());
function curve(coefficients: bigint[]) {
  const b = quadratic(coefficients), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds); return {...b, curve};
}
it.each([[1n, 0n, 1n], [-1n, 0n, -1n]])('constructs conic logarithms over actual constants for %s', (...coefficients) => {
  const b = curve(coefficients), input = b.owner.inverse(b.ctx, b.a), candidate = tryProduceGenusZeroCandidate(b.ctx, b.curve, input, bounds);
  if (!candidate) throw Error('known genus-zero positive'); expect(candidate).not.toHaveProperty('derivative'); expect(candidate.primitive.terms.length).toBeGreaterThan(0);
  const proof = checkCompactAlgebraicCandidate(fresh(), b.curve, input, candidate, bounds); verifyCompactAlgebraicElementary(fresh(), b.curve, input, proof, bounds);
  const data = encodeCompactAlgebraicElementary(fresh(), b.curve, input, proof, bounds), off = () => {throw Error('genus-zero search disabled');};
  vi.spyOn(parameter, 'tryGenusZeroParameterWithin').mockImplementation(off); vi.spyOn(constants, 'tryGenusZeroConstantParameterWithin').mockImplementation(off);
  const restore = disableAlgebraicIntegrationProducers();
  try {decodeCompactAlgebraicElementary(fresh(), b.curve, input, JSON.parse(JSON.stringify(data)), bounds);} finally {restore();}
  expect(() => verifyCompactAlgebraicElementary(fresh(), b.curve, input, {...proof, derivative: {...proof.derivative, derivative: b.owner.fromInteger(b.ctx, 0n)}}, bounds)).toThrow('verification-failed');
});
it('keeps hidden actual constants and normalizes relative-trace weights', () => {
  const b = curve([0n, 0n, 2n]), x = b.owner.embed(b.ctx, b.x), input = b.owner.exactDivide(b.ctx, b.a, b.owner.multiply(b.ctx, x, x)), candidate = tryProduceGenusZeroCandidate(b.ctx, b.curve, input, bounds);
  if (!candidate) throw Error('known hidden-constant genus zero'); const proof = checkCompactAlgebraicCandidate(fresh(), b.curve, input, candidate, bounds);
  expect(proof.primitive.curve.coordinates.constantOwner.ring.degree(b.ctx, proof.primitive.curve.coordinates.constantOwner.modulus)).toBe(2);
  verifyCompactAlgebraicElementary(fresh(), b.curve, input, proof, bounds);
});
it('publishes a field primitive before final verification and excludes positive genus by certified geometry', () => {
  const b = curve([1n, 0n, 1n]), input = b.owner.exactDivide(b.ctx, b.owner.embed(b.ctx, b.x), b.a), off = vi.spyOn(primitive, 'differentiateAlgebraicPrimitiveWithin').mockImplementation(() => {throw Error('final checking began during solving');});
  const candidate = tryProduceGenusZeroCandidate(b.ctx, b.curve, input, bounds); off.mockRestore();
  if (!candidate) throw Error('known exact differential'); expect(candidate.primitive.terms).toHaveLength(0); checkCompactAlgebraicCandidate(fresh(), b.curve, input, candidate, bounds);
  const elliptic = curve([1n, -1n, 0n, 1n]); expect(tryProduceGenusZeroCandidate(elliptic.ctx, elliptic.curve, elliptic.owner.inverse(elliptic.ctx, elliptic.a), bounds)).toBeNull();
});
