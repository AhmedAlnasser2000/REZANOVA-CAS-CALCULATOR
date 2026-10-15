import {afterEach, expect, it, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {ellipticDivisor} from './__tests__/algebraic-divisor-support';
import {hyperellipticInfinityDivisor} from './__tests__/hyperelliptic-support';
import {constructGenusOnePresentation} from './genus-one-presentation';
import {constructGenusOneCoordinates as construct, verifyGenusOneCoordinates as verify, verifyGenusOneNativeCoordinateWithin} from './genus-one-coordinates';
import {ExecutionContext} from './execution';
import {encodeGenusOneCoordinates as encode, decodeGenusOneCoordinates as decode} from './genus-one-coordinates-wire';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';
import * as presentation from './genus-one-presentation';
import * as coordinates from './genus-one-coordinates';
import * as coefficient from './algebraic-coefficient-system';
import {convertGenusOneNativeWithin, multiplyGenusOneCoordinates, inverseGenusOneCoordinates} from './genus-one-coordinate-arithmetic';
afterEach(() => vi.restoreAllMocks());

it.each([0, 1])('constructs complete native inverse coordinates at origin %s', index => {
  const s = ellipticDivisor(2n), p = constructGenusOnePresentation(fresh(), s.curve, s.divisor.entries[index].place, bounds), proof = construct(fresh(), p, bounds);
  verify(fresh(), p, proof, bounds); expect(proof.basisImages).toHaveLength(s.curve.coordinates.basis.length); expect(proof.ring.domain).toBe(proof.field);
  for (let i = 0; i < proof.basisImages.length; i++) verifyGenusOneNativeCoordinateWithin(s.ctx, proof, s.curve.coordinates.basis[i], proof.basisImages[i]);
});
it('replays complete fresh-owner correspondences without Riemann–Roch, recovery or linear producers', () => {
  const s = ellipticDivisor(2n), p = constructGenusOnePresentation(fresh(), s.curve, s.divisor.entries[1].place, bounds), proof = construct(fresh(), p, bounds), data = encode(fresh(), p, proof, bounds);
  const other = ellipticDivisor(2n), target = constructGenusOnePresentation(fresh(), other.curve, other.divisor.entries[1].place, bounds), restore = disableAlgebraicIntegrationProducers(), stop = () => {throw Error('genus-one correspondence producer disabled');};
  vi.spyOn(presentation, 'constructGenusOnePresentationWithin').mockImplementation(stop); vi.spyOn(coordinates, 'constructGenusOneCoordinatesWithin').mockImplementation(stop); vi.spyOn(coefficient, 'constructAlgebraicCoefficientSystem').mockImplementation(stop);
  try {
    const result = decode(fresh(), target, structuredClone(data), bounds); verify(fresh(), target, result, bounds);
    expect(result.presentation).toBe(target); expect(result.ring).not.toBe(proof.ring); expect(encode(fresh(), target, result, bounds)).toEqual(data);
  } finally {restore();}
});
it('recovers a complete split-quartic basis with derived pole bounds', () => {
  const s = hyperellipticInfinityDivisor(), p = constructGenusOnePresentation(fresh(), s.curve, s.divisor.entries[0].place, bounds), proof = construct(fresh(), p, bounds);
  verify(fresh(), p, proof, bounds); expect(proof.presentation.curve.owner).toBe(s.curve.owner);
});
it('converts native fractions by full basis substitution and checked quadratic units', () => {
  const s = ellipticDivisor(3n), p = constructGenusOnePresentation(fresh(), s.curve, s.divisor.entries[0].place, bounds), model = construct(fresh(), p, bounds), f = s.owner;
  const value = f.exactDivide(s.ctx, f.add(s.ctx, s.a, f.embed(s.ctx, s.x)), f.add(s.ctx, s.a, f.fromInteger(s.ctx, 2n))), image = convertGenusOneNativeWithin(s.ctx, model, value);
  verifyGenusOneNativeCoordinateWithin(s.ctx, model, value, image);
  const inverse = inverseGenusOneCoordinates(s.ctx, model, image); expect(model.ring.equal(s.ctx, multiplyGenusOneCoordinates(s.ctx, model, image, inverse), model.ring.one(s.ctx))).toBe(true);
  verifyGenusOneNativeCoordinateWithin(s.ctx, model, f.multiply(s.ctx, value, value), multiplyGenusOneCoordinates(s.ctx, model, image, image));
  expect(() => inverseGenusOneCoordinates(s.ctx, model, model.ring.zero(s.ctx))).toThrow('division-by-zero');
});
it('rejects changed native basis coverage/mappings, foreign owners and sticky dimensions', () => {
  const s = ellipticDivisor(2n), p = constructGenusOnePresentation(fresh(), s.curve, s.divisor.entries[1].place, bounds), proof = construct(fresh(), p, bounds);
  for (const changed of [{...proof, basisImages: []}, {...proof, baseImage: proof.ring.zero(s.ctx)}, {...proof, basisImages: proof.basisImages.map(() => proof.ring.zero(s.ctx))}]) expect(() => verify(fresh(), p, changed, bounds)).toThrow('verification-failed');
  const other = ellipticDivisor(2n), different = constructGenusOnePresentation(fresh(), other.curve, other.divisor.entries[1].place, bounds); expect(() => verify(fresh(), different, proof, bounds)).toThrow('domain-mismatch');
  const ctx = fresh(); verify(ctx, p, proof, bounds); const work = ctx.usage.work; verify(ctx, p, proof, bounds); expect(ctx.usage.work).toBe(2 * work);
  const stopped = new ExecutionContext({...fresh().limits, work: 1}); expect(() => construct(stopped, p, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
});
