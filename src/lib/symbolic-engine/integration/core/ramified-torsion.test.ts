import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {ellipticDivisor} from './__tests__/algebraic-divisor-support';
import {preparedCantor} from './__tests__/cantor-support';
import {ExecutionContext} from './execution';
import {constructAlgebraicDivisor, scaleAlgebraicDivisorWithin} from './algebraic-divisor';
import {tryDecideRamifiedDivisorTorsion, verifyRamifiedDivisorTorsion} from './ramified-divisor-torsion';
import {encodeRamifiedDivisorTorsion, decodeRamifiedDivisorTorsion} from './ramified-torsion-wire';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';
import * as native from './ramified-divisor-torsion';
import * as classes from './hyperelliptic-cantor-divisor';
import * as principality from './hyperelliptic-cantor-principality';
import * as group from './positive-cantor';
import * as order from './positive-cantor-order';
import * as reduced from './reduced-cantor-order';

describe('complete odd-degree torsion through checked Cantor models', () => {
  it.each([2n, 3n, null])('retains least order or certified non-torsion for the established %s case', expected => {
    const b = ellipticDivisor(expected), proof = tryDecideRamifiedDivisorTorsion(fresh(), b.curve, b.divisor, bounds)!;
    expect(proof.kind).toBe(expected === null ? 'non-torsion' : 'torsion'); expect(proof.order).toBe(expected);
    if (expected === null) {expect(proof.reason).toBe('third-reduction'); expect(proof.principal).toBeNull();}
    verifyRamifiedDivisorTorsion(fresh(), b.curve, b.divisor, proof, bounds);
    const data = JSON.parse(JSON.stringify(encodeRamifiedDivisorTorsion(fresh(), b.curve, b.divisor, proof, bounds))), restore = disableAlgebraicIntegrationProducers(),
      spies = [vi.spyOn(native, 'tryDecideRamifiedDivisorTorsionWithin'), vi.spyOn(classes, 'reduceCantorDivisorWithin'), vi.spyOn(principality, 'decideCantorPrincipalityWithin'),
        vi.spyOn(group, 'multiplyPositiveMumfordPairWithin'), vi.spyOn(group, 'addPositiveMumfordPairsWithin'), vi.spyOn(order, 'decidePositiveCantorOrderWithin'), vi.spyOn(reduced, 'decideReducedCantorOrderWithin')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {const result = decodeRamifiedDivisorTorsion(fresh(), b.curve, b.divisor, data, bounds); expect(result.kind).toBe(proof.kind); expect(result.order).toBe(proof.order);}
    finally {for (const spy of spies) spy.mockRestore(); restore();}
  });
  it('proves direct order one for zero/principal classes and degree-based non-torsion', () => {
    const b = preparedCantor(), point = b.choose([0n, 1n], 1n);
    for (const entries of [[], [{place: point, coefficient: 3n}, {place: b.infinity, coefficient: -3n}], [{place: point, coefficient: 1n}]]) {
      const divisor = constructAlgebraicDivisor(b.ctx, b.curve, entries, bounds), proof = tryDecideRamifiedDivisorTorsion(fresh(), b.curve, divisor, bounds)!;
      expect(proof.reductions).toHaveLength(0); expect(proof.kind).toBe(divisor.degree ? 'non-torsion' : 'torsion'); expect(proof.order).toBe(divisor.degree ? null : 1n);
      const data = encodeRamifiedDivisorTorsion(fresh(), b.curve, divisor, proof, bounds); expect(decodeRamifiedDivisorTorsion(fresh(), b.curve, divisor, data, bounds).order).toBe(proof.order);
    }
  });
  it('rejects changed primes, reductions, orders, native witnesses and fresh limits', () => {
    const b = ellipticDivisor(2n), proof = tryDecideRamifiedDivisorTorsion(fresh(), b.curve, b.divisor, bounds)!, data = encodeRamifiedDivisorTorsion(fresh(), b.curve, b.divisor, proof, bounds);
    for (const change of [{...proof, reductions: []}, {...proof, reductions: [proof.reductions[0], proof.reductions[0]]}, {...proof, multiple: 1n}, {...proof, third: proof.reductions[0]}, {...proof, order: 3n}, {...proof, principal: null}])
      expect(() => verifyRamifiedDivisorTorsion(fresh(), b.curve, b.divisor, change, bounds)).toThrow('verification-failed');
    const wrong = scaleAlgebraicDivisorWithin(b.ctx, b.curve, b.divisor, 2n); expect(() => decodeRamifiedDivisorTorsion(fresh(), b.curve, wrong, data, bounds)).toThrow();
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodeRamifiedDivisorTorsion(fresh(), b.curve, b.divisor, data, {...bounds, ...patch})).toThrow('resource-limit');
    const limited = new ExecutionContext({...fresh().limits, work: 1}); expect(() => verifyRamifiedDivisorTorsion(limited, b.curve, b.divisor, proof, bounds)).toThrow('resource-limit'); expect(() => limited.tick()).toThrow('resource-limit');
    expect(Object.isFrozen(proof.reductions)).toBe(true);
  });
});
