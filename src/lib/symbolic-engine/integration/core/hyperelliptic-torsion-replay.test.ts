import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {hyperellipticInfinityDivisor} from './__tests__/hyperelliptic-support';
import {tryDecideHyperellipticInfinityTorsion} from './hyperelliptic-infinity-torsion';
import {encodeHyperellipticInfinityTorsion, decodeHyperellipticInfinityTorsion} from './hyperelliptic-torsion-wire';
import {scaleAlgebraicDivisorWithin} from './algebraic-divisor';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {ExecutionContext} from './execution';
import * as good from './algebraic-good-reduction';
import * as specialization from './algebraic-divisor-specialization';
import * as reduced from './reduced-infinity-pell-order';
import * as finite from './positive-pell';
import * as pell from './polynomial-pell';
import * as principal from './hyperelliptic-infinity-principality';
import * as factors from './positive-factorization';
import * as constant from './algebraic-constant-field';
import * as rr from './algebraic-riemann-roch';
import * as linear from './arithmetic-linear';
import * as modules from './arithmetic-polynomial-module';

describe('complete infinity torsion saved replay', () => {
  it('replays a finite-field non-torsion certificate without constructing a native principal multiple', () => {
    const b = hyperellipticInfinityDivisor([1n, 1n, 0n, 0n, 1n]), skipped = vi.spyOn(principal, 'tryDecideHyperellipticInfinityPrincipalityWithin').mockImplementation(() => {throw Error('native principal producer disabled');});
    let proof: NonNullable<ReturnType<typeof tryDecideHyperellipticInfinityTorsion<typeof b.a>>>;
    try {proof = tryDecideHyperellipticInfinityTorsion(fresh(), b.curve, b.divisor, bounds)!;} finally {skipped.mockRestore();}
    expect(proof.kind).toBe('non-torsion'); expect(proof.reason).toBe('third-reduction'); expect(proof.principal).toBeNull(); expect(proof.order).toBeNull();
    expect(proof.reductions.map(p => p.order.order)).toEqual([7n, 9n]); expect(proof.multiple).toBe(63n); expect(proof.third.order.order).toBe(4n);
    const wire = encodeHyperellipticInfinityTorsion(fresh(), b.curve, b.divisor, proof, bounds) as {tag: string; version: number; payload: unknown}, data = JSON.parse(JSON.stringify(wire));
    const spies = [vi.spyOn(good, 'findAlgebraicGoodReductionWithin'), vi.spyOn(specialization, 'specializeAlgebraicDivisorWithin'), vi.spyOn(reduced, 'decideReducedInfinityPellOrderWithin'),
      vi.spyOn(finite, 'solvePositivePellWithin'), vi.spyOn(pell, 'solvePolynomialPellWithin'), vi.spyOn(principal, 'tryDecideHyperellipticInfinityPrincipalityWithin'), vi.spyOn(factors, 'factorPositivePolynomial'),
      vi.spyOn(constant, 'certifyAlgebraicConstantField'), vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin'), vi.spyOn(linear, 'solveArithmeticLinearSystem'), vi.spyOn(modules, 'arithmeticModuleHermite')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {const result = decodeHyperellipticInfinityTorsion(fresh(), b.curve, b.divisor, data, bounds); expect(result.kind).toBe('non-torsion'); expect(result.reason).toBe('third-reduction'); expect(result.principal).toBeNull();}
    finally {for (const spy of spies) spy.mockRestore();}
    for (const mutation of [
      (e: Record<string, unknown>) => {e.third = (e.reductions as unknown[])[0];},
      (e: Record<string, unknown>) => {e.reason = 'native-principality';},
      (e: Record<string, unknown>) => {e.multiple = '64';}
    ]) {
      const body = structuredClone(unpackAlgebraicArtifactData(fresh(), wire.payload, bounds)) as {evidence: {evidence: Record<string, unknown>}}; mutation(body.evidence.evidence);
      expect(() => decodeHyperellipticInfinityTorsion(fresh(), b.curve, b.divisor, {...wire, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();
    }
  });
  it('replays both reduced orders and the native unit with all search producers disabled', () => {
    const b = hyperellipticInfinityDivisor(), proof = tryDecideHyperellipticInfinityTorsion(fresh(), b.curve, b.divisor, bounds)!, wire = encodeHyperellipticInfinityTorsion(fresh(), b.curve, b.divisor, proof, bounds), data = JSON.parse(JSON.stringify(wire));
    const spies = [vi.spyOn(good, 'findAlgebraicGoodReductionWithin'), vi.spyOn(specialization, 'specializeAlgebraicDivisorWithin'), vi.spyOn(reduced, 'decideReducedInfinityPellOrderWithin'),
      vi.spyOn(finite, 'solvePositivePellWithin'), vi.spyOn(pell, 'solvePolynomialPellWithin'), vi.spyOn(principal, 'tryDecideHyperellipticInfinityPrincipalityWithin'), vi.spyOn(factors, 'factorPositivePolynomial'),
      vi.spyOn(constant, 'certifyAlgebraicConstantField'), vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin'), vi.spyOn(linear, 'solveArithmeticLinearSystem'), vi.spyOn(modules, 'arithmeticModuleHermite')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {
      const cold = fresh(), result = decodeHyperellipticInfinityTorsion(cold, b.curve, b.divisor, data, bounds); expect(result.kind).toBe('torsion'); expect(result.order).toBe(2n);
      expect(result.reductions[0].reduction.number.prime).not.toBe(proof.reductions[0].reduction.number.prime); expect(Object.isFrozen(result.reductions) && Object.isFrozen(result.principal!.factors)).toBe(true);
      const first = cold.usage.work; decodeHyperellipticInfinityTorsion(cold, b.curve, b.divisor, data, bounds); expect(cold.usage.work).toBe(2 * first);
    } finally {for (const spy of spies) spy.mockRestore();}
    const changed = scaleAlgebraicDivisorWithin(b.ctx, b.curve, b.divisor, 2n); expect(() => decodeHyperellipticInfinityTorsion(fresh(), b.curve, changed, data, bounds)).toThrow();
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodeHyperellipticInfinityTorsion(fresh(), b.curve, b.divisor, data, {...bounds, ...patch})).toThrow('resource-limit');
    const stopped = new ExecutionContext({...fresh().limits, work: 1}); expect(() => decodeHyperellipticInfinityTorsion(stopped, b.curve, b.divisor, data, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
  });
  it('rejects missing finite exclusions, wrong native precision, changed order and trusted flags', () => {
    const b = hyperellipticInfinityDivisor(), proof = tryDecideHyperellipticInfinityTorsion(fresh(), b.curve, b.divisor, bounds)!, wire = encodeHyperellipticInfinityTorsion(fresh(), b.curve, b.divisor, proof, bounds) as {tag: string; version: number; payload: unknown};
    const mutations = [
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).order = '1';},
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).reductions = [];},
      (body: Record<string, unknown>) => {const p = (body.evidence as {reductions: {order: {evidence: Record<string, unknown>}}[]}).reductions[0]; p.order.evidence.exclusions = [];},
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).verified = true;},
      (body: Record<string, unknown>) => {const p = body.principal as {evidence: {evidence: {pell: Record<string, unknown>}}}; p.evidence.evidence.pell.maximumDegree = '1';}
    ];
    for (const mutation of mutations) {
      const body = structuredClone(unpackAlgebraicArtifactData(fresh(), wire.payload, bounds)) as {evidence: Record<string, unknown>}; mutation(body.evidence);
      expect(() => decodeHyperellipticInfinityTorsion(fresh(), b.curve, b.divisor, {...wire, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();
    }
  });
});
