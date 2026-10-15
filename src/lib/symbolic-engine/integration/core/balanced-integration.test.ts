import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds, quadratic} from './__tests__/algebraic-support';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {produceLazyAlgebraicCandidate, checkLazyAlgebraicCandidate, verifyLazyAlgebraicDecision} from './algebraic-lazy-decision';
import {encodeNativeAlgebraicElementary, decodeNativeAlgebraicElementary} from './algebraic-native-wire';
import {encodeLazyAlgebraicNegative, decodeLazyAlgebraicNegative} from './algebraic-lazy-wire';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';
import * as dispatch from './algebraic-principal-multiple-dispatch';
import * as general from './algebraic-rr-principality';
import * as balanced from './balanced-divisor-torsion';
import * as native from './algebraic-native-primitive';
import * as lazy from './algebraic-lazy-decision';
import * as linear from './arithmetic-linear';

describe('balanced principal multiples in general algebraic logarithm construction', () => {
  it('constructs a quartic finite/infinity logarithm from the complete balanced order-two witness', () => {
    const b = quadratic([1n, 0n, 0n, 0n, 1n]), f = b.owner, ctx = b.ctx, curve = certifyAlgebraicCurve(ctx, f, certifyAlgebraicConstantField(ctx, f, bounds), bounds), x = f.embed(ctx, b.x);
    // Independent target: D log(y+x^2-1), on y^2=x^4+1.
    const x2 = f.multiply(ctx, x, x), argument = f.subtract(ctx, f.add(ctx, b.a, x2), f.fromInteger(ctx, 1n));
    const derivative = f.add(ctx, f.exactDivide(ctx, f.multiply(ctx, f.fromInteger(ctx, 2n), f.multiply(ctx, x2, x)), b.a), f.multiply(ctx, f.fromInteger(ctx, 2n), x)), input = f.exactDivide(ctx, derivative, argument);
    const calls = vi.spyOn(dispatch, 'decideAlgebraicPrincipalMultipleWithin'), noGeneral = vi.spyOn(general, 'decideAlgebraicRrPrincipalityWithin').mockImplementation(() => {throw Error('unnecessary general principality');});
    let candidate; try {candidate = produceLazyAlgebraicCandidate(fresh(), curve, input, bounds); expect(calls.mock.results.some(p => p.type === 'return' && p.value.method === 'balanced-cantor')).toBe(true);} finally {calls.mockRestore(); noGeneral.mockRestore();}
    expect(candidate.kind).toBe('elementary'); expect(candidate).not.toHaveProperty('derivative'); if (candidate.kind !== 'elementary') throw Error('known balanced logarithm');
    const proof = checkLazyAlgebraicCandidate(fresh(), curve, input, candidate, bounds); if (proof.kind !== 'elementary') throw Error('known checked balanced logarithm');
    const data = encodeNativeAlgebraicElementary(fresh(), curve, input, proof, bounds), restore = disableAlgebraicIntegrationProducers(), spies = [vi.spyOn(balanced, 'tryDecideBalancedDivisorTorsionWithin'),
      vi.spyOn(dispatch, 'decideAlgebraicPrincipalMultipleWithin'), vi.spyOn(native, 'differentiateNativeAlgebraicPrimitiveWithin'), vi.spyOn(lazy, 'produceLazyAlgebraicCandidateWithin')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {verifyLazyAlgebraicDecision(fresh(), curve, input, proof, bounds); decodeNativeAlgebraicElementary(fresh(), curve, input, data, bounds);} finally {for (const spy of spies) spy.mockRestore(); restore();}
  }, 60000);
  it('retains a combined non-torsion balanced obstruction and independently replays version four', () => {
    const b = quadratic([-27n, -40n, -18n, 0n, 1n]), f = b.owner, ctx = b.ctx, curve = certifyAlgebraicCurve(ctx, f, certifyAlgebraicConstantField(ctx, f, bounds), bounds), x = f.embed(ctx, b.x);
    // x/y has infinity residues +/-1. Adding D log(x) gives the combined
    // finite-infinity divisor div(x) +/- (infinity+ - infinity-).
    const input = f.add(ctx, f.exactDivide(ctx, x, b.a), f.inverse(ctx, x)), candidate = produceLazyAlgebraicCandidate(fresh(), curve, input, bounds), proof = checkLazyAlgebraicCandidate(fresh(), curve, input, candidate, bounds);
    expect(proof.kind === 'non-elementary' && proof.reason).toBe('non-torsion-residue-divisor');
    if (proof.kind !== 'non-elementary' || !('method' in proof) || proof.reason !== 'non-torsion-residue-divisor') throw Error('known balanced non-torsion');
    expect(proof.logarithms.components[0].multiple.method).toBe('balanced-cantor'); expect(proof.later).toBe('unperformed');
    const data = JSON.parse(JSON.stringify(encodeLazyAlgebraicNegative(fresh(), curve, input, proof, bounds))), restore = disableAlgebraicIntegrationProducers(), spies = [vi.spyOn(balanced, 'tryDecideBalancedDivisorTorsionWithin'),
      vi.spyOn(dispatch, 'decideAlgebraicPrincipalMultipleWithin'), vi.spyOn(lazy, 'produceLazyAlgebraicCandidateWithin'), vi.spyOn(linear, 'solveArithmeticLinearSystem')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {verifyLazyAlgebraicDecision(fresh(), curve, input, proof, bounds); expect(decodeLazyAlgebraicNegative(fresh(), curve, input, data, bounds).reason).toBe(proof.reason);}
    finally {for (const spy of spies) spy.mockRestore(); restore();}
  }, 60000);
});
