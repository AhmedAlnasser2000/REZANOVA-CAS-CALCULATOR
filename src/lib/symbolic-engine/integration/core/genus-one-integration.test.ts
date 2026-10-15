import {afterEach, expect, it, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {generalGenusOneFixture} from './__tests__/general-genus-one-fixtures';
import {produceLazyAlgebraicCandidate, checkLazyAlgebraicCandidate, verifyLazyAlgebraicDecision} from './algebraic-lazy-decision';
import {encodeNativeAlgebraicElementary, decodeNativeAlgebraicElementary} from './algebraic-native-wire';
import {encodeLazyAlgebraicNegative, decodeLazyAlgebraicNegative} from './algebraic-lazy-wire';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';
import * as dispatch from './algebraic-principal-multiple-dispatch';
import * as genusOne from './genus-one-dispatch';
import * as geometric from './algebraic-geometric-logarithms';
import * as group from './elliptic-group';
import {encodeGeometricAlgebraicNegative, decodeGeometricAlgebraicNegative} from './algebraic-geometric-wire';
afterEach(() => vi.restoreAllMocks());

it('constructs general genus-one logarithms in the original singular native owner and replays the final primitive', () => {
  const s = generalGenusOneFixture(), calls = vi.spyOn(dispatch, 'decideAlgebraicPrincipalMultipleWithin'), candidate = produceLazyAlgebraicCandidate(fresh(), s.curve, s.input, bounds);
  expect(calls.mock.results.some(r => r.type === 'return' && r.value.method === 'genus-one-rr-miller')).toBe(true); calls.mockRestore();
  expect(candidate.kind).toBe('elementary'); expect(candidate).not.toHaveProperty('derivative'); const proof = checkLazyAlgebraicCandidate(fresh(), s.curve, s.input, candidate, bounds);
  if (proof.kind !== 'elementary') throw Error('known native logarithmic derivative');
  const data = encodeNativeAlgebraicElementary(fresh(), s.curve, s.input, proof, bounds), restore = disableAlgebraicIntegrationProducers(), stop = () => {throw Error('general geometry producer disabled');};
  vi.spyOn(genusOne, 'tryDecideGeneralGenusOneTorsionWithin').mockImplementation(stop); vi.spyOn(dispatch, 'decideAlgebraicPrincipalMultipleWithin').mockImplementation(stop);
  try {verifyLazyAlgebraicDecision(fresh(), s.curve, s.input, proof, bounds); decodeNativeAlgebraicElementary(fresh(), s.curve, s.input, structuredClone(data), bounds);} finally {restore();}
});
it('retains a general non-torsion residue obstruction in a distinct version-five artifact', () => {
  const s = generalGenusOneFixture(undefined, true), candidate = produceLazyAlgebraicCandidate(fresh(), s.curve, s.input, bounds), proof = checkLazyAlgebraicCandidate(fresh(), s.curve, s.input, candidate, bounds);
  if (proof.kind !== 'non-elementary' || !('method' in proof) || proof.reason !== 'non-torsion-residue-divisor') throw Error('known infinite-order residue divisor');
  expect(proof.logarithms.components[0].multiple.method).toBe('genus-one-rr-miller'); expect(proof.later).toBe('unperformed');
  const data = encodeLazyAlgebraicNegative(fresh(), s.curve, s.input, proof, bounds) as {version: number}; expect(data.version).toBe(5);
  const restore = disableAlgebraicIntegrationProducers(), stop = () => {throw Error('general geometry producer disabled');};
  vi.spyOn(genusOne, 'tryDecideGeneralGenusOneTorsionWithin').mockImplementation(stop); vi.spyOn(dispatch, 'decideAlgebraicPrincipalMultipleWithin').mockImplementation(stop);
  vi.spyOn(group, 'multiplyEllipticPoint').mockImplementation(stop); vi.spyOn(group, 'addEllipticPoints').mockImplementation(stop); vi.spyOn(geometric, 'constructGeometricAlgebraicLogarithmDataWithin').mockImplementation(stop);
  try {
    verifyLazyAlgebraicDecision(fresh(), s.curve, s.input, proof, bounds); const decoded = decodeLazyAlgebraicNegative(fresh(), s.curve, s.input, structuredClone(data), bounds); expect(decoded.reason).toBe(proof.reason);
    expect(() => decodeLazyAlgebraicNegative(fresh(), s.curve, s.input, {...data, version: 4}, bounds)).toThrow('invalid-input');
  } finally {restore();}
});
it('retains the complete repeated-pole prefix in a distinct version-six negative', () => {
  const s = generalGenusOneFixture(undefined, true), f = s.owner, x = f.embed(s.ctx, s.x), denominator = f.subtract(s.ctx, x, f.fromInteger(s.ctx, 1n)),
    input = f.subtract(s.ctx, s.input, f.inverse(s.ctx, f.multiply(s.ctx, denominator, denominator))), candidate = produceLazyAlgebraicCandidate(fresh(), s.curve, input, bounds), proof = checkLazyAlgebraicCandidate(fresh(), s.curve, input, candidate, bounds);
  if (proof.kind !== 'non-elementary' || 'method' in proof || proof.reason !== 'non-torsion-residue-divisor') throw Error('known general repeated-pole obstruction');
  expect(proof.logarithms.components[0].multiple.method).toBe('genus-one-rr-miller'); const data = encodeGeometricAlgebraicNegative(fresh(), s.curve, input, proof, bounds) as {version: number}; expect(data.version).toBe(6);
  const restore = disableAlgebraicIntegrationProducers(); try {
    verifyLazyAlgebraicDecision(fresh(), s.curve, input, proof, bounds); expect(decodeGeometricAlgebraicNegative(fresh(), s.curve, input, structuredClone(data), bounds).reason).toBe(proof.reason);
    expect(() => decodeGeometricAlgebraicNegative(fresh(), s.curve, input, {...data, version: 3}, bounds)).toThrow('invalid-input');
  } finally {restore();}
});
