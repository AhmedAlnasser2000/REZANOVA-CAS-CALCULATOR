import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {hyperellipticInfinityDivisor} from './__tests__/hyperelliptic-support';
import {tryDecideHyperellipticInfinityTorsion, verifyHyperellipticInfinityTorsion} from './hyperelliptic-infinity-torsion';
import {ExecutionContext} from './execution';
import * as good from './algebraic-good-reduction';
import * as specialization from './algebraic-divisor-specialization';
import * as reduced from './reduced-infinity-pell-order';
import * as finite from './positive-pell';
import * as pell from './polynomial-pell';
import * as principal from './hyperelliptic-infinity-principality';
import * as factor from './positive-factorization';

describe('complete two-reduction infinity Pell torsion', () => {
  it('certifies exact order two with finite and native norm-unit witnesses', () => {
    const b = hyperellipticInfinityDivisor(), proof = tryDecideHyperellipticInfinityTorsion(fresh(), b.curve, b.divisor, bounds)!;
    expect(proof.kind).toBe('torsion'); expect(proof.order).toBe(2n); expect(proof.multiple).toBe(2n); expect(proof.principal!.pell.leastDegree).toBe(2n);
    expect(proof.reductions.map(p => p.order.order)).toEqual([2n, 2n]); expect(proof.reductions[0].reduction.number.prime.characteristic).not.toBe(proof.reductions[1].reduction.number.prime.characteristic);
    verifyHyperellipticInfinityTorsion(fresh(), b.curve, b.divisor, proof, bounds);
    const spies = [vi.spyOn(good, 'findAlgebraicGoodReductionWithin'), vi.spyOn(specialization, 'specializeAlgebraicDivisorWithin'), vi.spyOn(reduced, 'decideReducedInfinityPellOrderWithin'),
      vi.spyOn(finite, 'solvePositivePellWithin'), vi.spyOn(pell, 'solvePolynomialPellWithin'), vi.spyOn(principal, 'tryDecideHyperellipticInfinityPrincipalityWithin'), vi.spyOn(factor, 'factorPositivePolynomial')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {verifyHyperellipticInfinityTorsion(fresh(), b.curve, b.divisor, proof, bounds);} finally {for (const spy of spies) spy.mockRestore();}
    for (const changed of [{...proof, order: 1n}, {...proof, multiple: 1n}, {...proof, gcd: 1n}, {...proof, reductions: [proof.reductions[0], proof.reductions[0]] as const}])
      expect(() => verifyHyperellipticInfinityTorsion(fresh(), b.curve, b.divisor, changed, bounds)).toThrow('verification-failed');
    const cold = fresh(); verifyHyperellipticInfinityTorsion(cold, b.curve, b.divisor, proof, bounds); const first = cold.usage.work;
    verifyHyperellipticInfinityTorsion(cold, b.curve, b.divisor, proof, bounds); expect(cold.usage.work).toBe(2 * first);
    const stopped = new ExecutionContext({...fresh().limits, work: 1}); expect(() => verifyHyperellipticInfinityTorsion(stopped, b.curve, b.divisor, proof, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
  });
});
