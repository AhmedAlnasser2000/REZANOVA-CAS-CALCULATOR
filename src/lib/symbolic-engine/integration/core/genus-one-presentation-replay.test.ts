import {afterEach, expect, it, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {ellipticDivisor} from './__tests__/algebraic-divisor-support';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';
import {ExecutionContext} from './execution';
import {constructGenusOnePresentation as construct, verifyGenusOnePresentation as verify, reconstructGenusOnePresentationWithin} from './genus-one-presentation';
import {encodeGenusOnePresentation as encode, decodeGenusOnePresentation as decode} from './genus-one-presentation-wire';
import * as producer from './genus-one-presentation';
import * as coefficient from './algebraic-coefficient-system';
afterEach(() => vi.restoreAllMocks());

it.each([0, 1])('replays a general presentation at origin %s with geometry/linear/search producers disabled', index => {
  const s = ellipticDivisor(2n), origin = s.divisor.entries[index].place, proof = construct(fresh(), s.curve, origin, bounds), data = encode(fresh(), s.curve, origin, proof, bounds), other = ellipticDivisor(2n), target = other.divisor.entries[index].place;
  const restore = disableAlgebraicIntegrationProducers(), stop = () => {throw Error('genus-one construction producer disabled');};
  vi.spyOn(producer, 'constructGenusOnePresentationWithin').mockImplementation(stop); vi.spyOn(coefficient, 'constructAlgebraicCoefficientSystem').mockImplementation(stop);
  try {
    const result = decode(fresh(), other.curve, target, structuredClone(data), bounds); verify(fresh(), other.curve, target, result, bounds);
    expect(result.curve.owner).toBe(other.curve.owner); expect(result.polynomial.ring).not.toBe(proof.polynomial.ring); expect(result.origin).toBe(target);
    expect(encode(fresh(), other.curve, target, result, bounds)).toEqual(data);
  } finally {restore();}
});
it('rejects mutable retention, changed origins, flags and malformed/stricter artifacts with cold sticky accounting', () => {
  const s = ellipticDivisor(2n), origin = s.divisor.entries[1].place, proof = construct(fresh(), s.curve, origin, bounds), data = encode(fresh(), s.curve, origin, proof, bounds);
  const retention = fresh(); expect(() => retention.operation(() => reconstructGenusOnePresentationWithin(retention, s.curve, origin, {...proof, spaces: [...proof.spaces]}, bounds))).toThrow('invalid-input');
  expect(() => decode(fresh(), s.curve, s.divisor.entries[0].place, data, bounds)).toThrow('domain-mismatch');
  expect(() => decode(fresh(), s.curve, origin, {...data as object, verified: true}, bounds)).toThrow('invalid-input');
  const ctx = fresh(); decode(ctx, s.curve, origin, data, bounds); const work = ctx.usage.work; decode(ctx, s.curve, origin, data, bounds); expect(ctx.usage.work).toBe(2 * work);
  for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decode(fresh(), s.curve, origin, data, {...bounds, ...patch})).toThrow('resource-limit');
  for (const patch of [{work: 1}, {allocation: 1}, {degree: 0}]) {const stopped = new ExecutionContext({...fresh().limits, ...patch}); expect(() => verify(stopped, s.curve, origin, proof, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');}
});
