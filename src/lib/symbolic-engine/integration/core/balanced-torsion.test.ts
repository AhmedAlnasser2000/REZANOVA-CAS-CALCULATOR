import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {hyperellipticInfinityDivisor} from './__tests__/hyperelliptic-support';
import {constructAlgebraicDivisor, scaleAlgebraicDivisorWithin} from './algebraic-divisor';
import {tryDecideBalancedDivisorTorsion, verifyBalancedDivisorTorsion, verifyBalancedDivisorTorsionWithin} from './balanced-divisor-torsion';
import {encodeBalancedDivisorTorsion, decodeBalancedDivisorTorsion} from './balanced-torsion-wire';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {ExecutionContext} from './execution';
import * as torsion from './balanced-divisor-torsion';
import * as principal from './hyperelliptic-balanced-divisor';
import * as models from './hyperelliptic-balanced-place';
import * as reduced from './reduced-balanced-order';
import * as order from './positive-balanced-order';
import * as arithmetic from './balanced-cantor-arithmetic';
import * as search from './finite-class-order-search';
import * as reduction from './algebraic-good-reduction';
import * as constants from './algebraic-constant-field';
import * as rr from './algebraic-riemann-roch';
import * as places from './algebraic-place';
import * as positivePlaces from './reduced-place';
import * as factor from './positive-factorization';
import * as linear from './arithmetic-linear';

function prepared(negative = false) {
  // t=(y+5)/(x-3), W=2(x-3)+9-t^2 transforms y^2=x^3-2
  // to W^2=t^4-18t^2-40t-27. Its infinities correspond to O and (3,5).
  return hyperellipticInfinityDivisor(negative ? [-27n, -40n, -18n, 0n, 1n] : [1n, 0n, 0n, 0n, 1n]);
}
describe('complete balanced principal-multiple decisions', () => {
  it('proves least order two through complete reductions and a native factored witness', () => {
    const b = prepared(), proof = tryDecideBalancedDivisorTorsion(fresh(), b.curve, b.divisor, bounds)!;
    expect(proof.kind).toBe('torsion'); expect(proof.order).toBe(2n); expect(proof.reason).toBe('native-principality'); expect(proof.principal!.kind).toBe('principal');
    expect(proof.reductions).toHaveLength(2); expect(proof.reductions[0].reduction.number.prime.characteristic).not.toBe(proof.reductions[1].reduction.number.prime.characteristic);
    verifyBalancedDivisorTorsion(fresh(), b.curve, b.divisor, proof, bounds);
    for (const coefficient of [0n, -2n]) {
      const D = scaleAlgebraicDivisorWithin(b.ctx, b.curve, b.divisor, coefficient), direct = tryDecideBalancedDivisorTorsion(fresh(), b.curve, D, bounds)!;
      expect(direct.order).toBe(1n); expect(direct.reason).toBe('principal-divisor'); expect(direct.reductions).toHaveLength(0);
    }
    const degree = constructAlgebraicDivisor(b.ctx, b.curve, [{place: b.divisor.entries[0].place, coefficient: 1n}], bounds), stopped = tryDecideBalancedDivisorTorsion(fresh(), b.curve, degree, bounds)!;
    expect(stopped.kind).toBe('non-torsion'); expect(stopped.reason).toBe('degree');
  });
  it('proves infinite order by a third certified reduction for a transported elliptic example', () => {
    const b = prepared(true), proof = tryDecideBalancedDivisorTorsion(fresh(), b.curve, b.divisor, bounds)!;
    expect(proof.kind).toBe('non-torsion'); expect(proof.order).toBeNull(); expect(proof.reason).toBe('third-reduction'); expect(proof.principal).toBeNull();
    expect(proof.third).not.toBeNull(); expect(proof.multiple % proof.third!.order.order).not.toBe(0n); verifyBalancedDivisorTorsion(fresh(), b.curve, b.divisor, proof, bounds);
  });
  it.each([false, true])('replays %s without solver, good-prime, geometry or linear producers', negative => {
    const b = prepared(negative), proof = tryDecideBalancedDivisorTorsion(fresh(), b.curve, b.divisor, bounds)!, data = JSON.parse(JSON.stringify(encodeBalancedDivisorTorsion(fresh(), b.curve, b.divisor, proof, bounds)));
    const spies = [vi.spyOn(torsion, 'tryDecideBalancedDivisorTorsionWithin'), vi.spyOn(principal, 'decideBalancedPrincipalityWithin'), vi.spyOn(models, 'constructBalancedCurveModelWithin'),
      vi.spyOn(reduced, 'decideReducedBalancedOrderWithin'), vi.spyOn(order, 'decidePositiveBalancedOrderWithin'), vi.spyOn(arithmetic, 'normalizeBalancedDivisor'), vi.spyOn(arithmetic, 'multiplyBalancedDivisor'),
      vi.spyOn(search, 'findFiniteClassOrderMultiple'), vi.spyOn(reduction, 'findAlgebraicGoodReductionWithin'), vi.spyOn(constants, 'certifyAlgebraicConstantField'), vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin'),
      vi.spyOn(places, 'decomposeAlgebraicPlacesWithin'), vi.spyOn(positivePlaces, 'decomposeReducedPlaces'), vi.spyOn(factor, 'factorPositivePolynomial'), vi.spyOn(linear, 'solveArithmeticLinearSystem')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {verifyBalancedDivisorTorsion(fresh(), b.curve, b.divisor, proof, bounds); const replayed = decodeBalancedDivisorTorsion(fresh(), b.curve, b.divisor, data, bounds); expect(replayed.kind).toBe(proof.kind); expect(replayed.order).toBe(proof.order);}
    finally {for (const spy of spies) spy.mockRestore();}
  });
  it('rejects altered characteristics, order coverage, target multiples and native mappings', () => {
    const b = prepared(), proof = tryDecideBalancedDivisorTorsion(fresh(), b.curve, b.divisor, bounds)!;
    for (const changed of [{...proof, reductions: []}, {...proof, reductions: [proof.reductions[0], proof.reductions[0]]}, {...proof, third: proof.reductions[0]},
      {...proof, multiple: proof.multiple + 1n}, {...proof, order: 1n}, {...proof, principal: null}, {...proof, reason: 'third-reduction' as const}])
      expect(() => verifyBalancedDivisorTorsion(fresh(), b.curve, b.divisor, changed, bounds)).toThrow('verification-failed');
    const data = encodeBalancedDivisorTorsion(fresh(), b.curve, b.divisor, proof, bounds) as {tag: string; version: number; payload: unknown}, body = structuredClone(unpackAlgebraicArtifactData(fresh(), data.payload, bounds)) as Record<string, unknown>;
    ((body.evidence as Record<string, unknown>).evidence as Record<string, unknown>).verified = true;
    expect(() => decodeBalancedDivisorTorsion(fresh(), b.curve, b.divisor, {...data, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow('invalid-input');
    const reordered = constructAlgebraicDivisor(b.ctx, b.curve, [...b.divisor.input].reverse(), bounds); expect(() => decodeBalancedDivisorTorsion(fresh(), b.curve, reordered, data, bounds)).toThrow();
  });
  it('starts fresh bounded replay and preserves sticky exhaustion', () => {
    const b = prepared(), proof = tryDecideBalancedDivisorTorsion(fresh(), b.curve, b.divisor, bounds)!, data = encodeBalancedDivisorTorsion(fresh(), b.curve, b.divisor, proof, bounds), ctx = fresh();
    decodeBalancedDivisorTorsion(ctx, b.curve, b.divisor, data, bounds); const first = ctx.usage.work; decodeBalancedDivisorTorsion(ctx, b.curve, b.divisor, data, bounds); expect(ctx.usage.work).toBe(first * 2);
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodeBalancedDivisorTorsion(fresh(), b.curve, b.divisor, data, {...bounds, ...patch})).toThrow('resource-limit');
    const stopped = new ExecutionContext({...fresh().limits, work: 1}); expect(() => tryDecideBalancedDivisorTorsion(stopped, b.curve, b.divisor, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
    expect(Object.isFrozen(proof.reductions) && Object.isFrozen(proof.principal!.reduction!.factors)).toBe(true);
  });
  it('reuses successful immutable torsion checks only for the exact request in the enclosing operation', () => {
    const b = prepared(), proof = tryDecideBalancedDivisorTorsion(fresh(), b.curve, b.divisor, bounds)!, ctx = fresh(), checks = vi.spyOn(reduced, 'verifyReducedBalancedOrderWithin');
    try {
      const verify = () => verifyBalancedDivisorTorsionWithin(ctx, b.curve, b.divisor, proof, bounds);
      ctx.operation(() => {verify(); const count = checks.mock.calls.length; expect(count).toBeGreaterThan(0); verify(); expect(checks.mock.calls.length).toBe(count);
        const different = scaleAlgebraicDivisorWithin(ctx, b.curve, b.divisor, 0n);
        expect(() => verifyBalancedDivisorTorsionWithin(ctx, b.curve, different, proof, bounds)).toThrow('verification-failed');});
      const count = checks.mock.calls.length; ctx.operation(verify); expect(checks.mock.calls.length).toBeGreaterThan(count);
      const mutable = {...proof}; ctx.operation(() => {verifyBalancedDivisorTorsionWithin(ctx, b.curve, b.divisor, mutable, bounds); mutable.kind = 'non-torsion';
        expect(() => verifyBalancedDivisorTorsionWithin(ctx, b.curve, b.divisor, mutable, bounds)).toThrow('verification-failed');});
      expect(() => ctx.operation(() => verifyBalancedDivisorTorsionWithin(ctx, b.curve, b.divisor, proof, {...bounds, towerHeight: 1}))).toThrow('resource-limit');
      expect(() => ctx.tick()).toThrow('resource-limit');
    } finally {checks.mockRestore();}
  });
});
