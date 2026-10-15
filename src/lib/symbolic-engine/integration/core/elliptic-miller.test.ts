import {describe, expect, it, vi} from 'vitest';
import {fresh, bounds, quadratic, base} from './__tests__/algebraic-support';
import {PolynomialRing} from './polynomial';
import {constructAlgebraicExtension} from './algebraic-field';
import {ellipticDivisor} from './__tests__/algebraic-divisor-support';
import {ExecutionContext} from './execution';
import {constructAlgebraicDivisor, scaleAlgebraicDivisorWithin, principalAlgebraicDivisor, equalAlgebraicDivisors} from './algebraic-divisor';
import * as modelApi from './elliptic-curve-model';
import * as group from './elliptic-group';
import * as transport from './elliptic-place';
import * as miller from './elliptic-miller';
import * as torsion from './elliptic-divisor-torsion';
import * as rr from './algebraic-riemann-roch';
import * as good from './algebraic-good-reduction';
import * as factor from './algebraic-factorization';
import * as places from './algebraic-place';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';

describe('checked Weierstrass arithmetic and native Miller certificates', () => {
  it.each([2n, 3n])('constructs the least order %s with independently checked principal divisor equality', order => {
    const b = ellipticDivisor(order), ctx = fresh(), proof = torsion.tryDecideEllipticDivisorTorsion(ctx, b.curve, b.divisor, bounds);
    expect(proof).not.toBeNull(); expect(proof!.kind).toBe('torsion'); expect(proof!.order).toBe(order);
    torsion.verifyEllipticDivisorTorsion(fresh(), b.curve, b.divisor, proof!, bounds);
    const expanded = miller.expandEllipticFactors(fresh(), proof!.model, proof!.factors), full = principalAlgebraicDivisor(fresh(), b.curve, expanded, bounds);
    const target = scaleAlgebraicDivisorWithin(b.ctx, b.curve, b.divisor, order);
    expect(equalAlgebraicDivisors(b.ctx, b.curve, full.divisor, target)).toBe(true);
    expect(Object.isFrozen(proof) && Object.isFrozen(proof!.factors) && Object.isFrozen(proof!.tests)).toBe(true);
  });
  it('handles signed coefficients, already principal classes, zero and factored large powers', () => {
    const b = ellipticDivisor(2n);
    for (const coefficient of [-3n, 2n, (1n << 80n) + 1n]) {
      const divisor = scaleAlgebraicDivisorWithin(b.ctx, b.curve, b.divisor, coefficient), proof = torsion.tryDecideEllipticDivisorTorsion(fresh(), b.curve, divisor, bounds)!;
      expect(proof.kind).toBe('torsion'); expect(proof.order).toBe(coefficient === 2n ? 1n : 2n);
      torsion.verifyEllipticDivisorTorsion(fresh(), b.curve, divisor, proof, bounds);
      if (coefficient === -3n) {
        expect(proof.conditions.some(c => c.kind === 'nonzero' && c.path.startsWith('elliptic.torsion.factor.'))).toBe(true);
        const expanded = miller.expandEllipticFactors(fresh(), proof.model, proof.factors), full = principalAlgebraicDivisor(fresh(), b.curve, expanded, bounds);
        expect(equalAlgebraicDivisors(b.ctx, b.curve, full.divisor, scaleAlgebraicDivisorWithin(b.ctx, b.curve, divisor, 2n))).toBe(true);
      }
      if (coefficient > 100n) {
        expect(proof.factors.some(f => f.exponent > 1n << 60n)).toBe(true);
        const limited = new ExecutionContext({...fresh().limits, degree: 3});
        expect(() => miller.expandEllipticFactors(limited, proof.model, proof.factors)).toThrow('resource-limit');
      }
    }
    const zero = constructAlgebraicDivisor(b.ctx, b.curve, [], bounds), proof = torsion.tryDecideEllipticDivisorTorsion(fresh(), b.curve, zero, bounds)!;
    expect(proof.order).toBe(1n); expect(proof.factors).toHaveLength(0);
  });
  it('proves the established infinite-order class using complete rational torsion coverage', () => {
    const b = ellipticDivisor(null), proof = torsion.tryDecideEllipticDivisorTorsion(fresh(), b.curve, b.divisor, bounds)!;
    expect(proof.kind).toBe('non-torsion'); expect(proof.order).toBeNull(); expect(proof.tests.map(t => t.coefficient)).toEqual([1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n, 10n, 12n]);
    torsion.verifyEllipticDivisorTorsion(fresh(), b.curve, b.divisor, proof, bounds);
  });
  it('checks tangent, inverse and identity branches and rejects foreign points and changed slopes', () => {
    const b = ellipticDivisor(3n), model = modelApi.tryEllipticCurveModel(fresh(), b.curve, bounds)!, p = transport.transportEllipticPlace(b.ctx, model, b.divisor.entries[0].place, bounds).point;
    const tangent = group.addEllipticPoints(b.ctx, model, p, p); expect(tangent.kind).toBe('tangent');
    expect(group.equalEllipticPoints(b.ctx, model, tangent.sum, group.negateEllipticPoint(b.ctx, model, p))).toBe(true);
    const inverse = group.addEllipticPoints(b.ctx, model, p, tangent.sum); expect(inverse.kind).toBe('vertical'); expect(inverse.sum.kind).toBe('infinity');
    const identity = group.addEllipticPoints(b.ctx, model, p, group.ellipticInfinity(b.ctx, model)); expect(identity.kind).toBe('right-identity');
    expect(() => group.verifyEllipticAddition(b.ctx, model, p, p, {...tangent, slope: b.curve.coordinates.constantOwner.fromInteger(b.ctx, 1n)})).toThrow('verification-failed');
    expect(() => group.verifyEllipticAddition(b.ctx, model, p, p, {...tangent, line: b.owner.fromInteger(b.ctx, 1n)})).toThrow('verification-failed');
    expect(() => group.addEllipticPoints(b.ctx, model, p, {...p})).toThrow('domain-mismatch');
    const other = modelApi.tryEllipticCurveModel(fresh(), b.curve, bounds)!;
    expect(() => group.addEllipticPoints(b.ctx, other, p, p)).toThrow('domain-mismatch');
  });
  it('replays positive and negative native evidence with higher-level producers disabled', () => {
    for (const order of [2n, null]) {
      const b = ellipticDivisor(order), proof = torsion.tryDecideEllipticDivisorTorsion(fresh(), b.curve, b.divisor, bounds)!;
      const spies = [vi.spyOn(modelApi, 'tryEllipticCurveModelWithin'), vi.spyOn(group, 'addEllipticPoints'), vi.spyOn(group, 'multiplyEllipticPoint'),
        vi.spyOn(transport, 'transportEllipticPlace'), vi.spyOn(miller, 'reduceEllipticDivisorWithin'), vi.spyOn(torsion, 'tryDecideEllipticDivisorTorsionWithin'),
        vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin'), vi.spyOn(good, 'findAlgebraicGoodReductionWithin'), vi.spyOn(factor, 'factorAlgebraicPolynomialWithin'), vi.spyOn(places, 'decomposeAlgebraicPlacesWithin')];
      for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
      try {torsion.verifyEllipticDivisorTorsion(fresh(), b.curve, b.divisor, proof, bounds);} finally {for (const spy of spies) spy.mockRestore();}
    }
  });
  it('rejects missing branches, mappings, native factors, targets, conditions and changed least orders', () => {
    const b = ellipticDivisor(2n), proof = torsion.tryDecideEllipticDivisorTorsion(fresh(), b.curve, b.divisor, bounds)!;
    const mutations = [{...proof, order: 1n}, {...proof, tests: []}, {...proof, tests: proof.tests.slice(1)}, {...proof, factors: []}, {...proof, conditions: []},
      {...proof, reduction: {...proof.reduction, terms: []}}, {...proof, reduction: {...proof.reduction, additions: []}},
      {...proof, tests: proof.tests.map((t, i) => i ? {...t, steps: []} : t)}];
    for (const changed of mutations) expect(() => torsion.verifyEllipticDivisorTorsion(fresh(), b.curve, b.divisor, changed, bounds)).toThrow('verification-failed');
    const changedRequest = scaleAlgebraicDivisorWithin(b.ctx, b.curve, b.divisor, 2n);
    expect(() => torsion.verifyEllipticDivisorTorsion(fresh(), b.curve, changedRequest, proof, bounds)).toThrow('verification-failed');
    const reorder = constructAlgebraicDivisor(b.ctx, b.curve, [...b.divisor.input].reverse(), bounds);
    expect(() => torsion.verifyEllipticDivisorTorsion(fresh(), b.curve, reorder, proof, bounds)).toThrow('verification-failed');
  });
  it('retains applicability boundaries, fresh verification and sticky exhaustion', () => {
    const b = ellipticDivisor(2n), nonzero = constructAlgebraicDivisor(b.ctx, b.curve, [b.divisor.entries[0]], bounds);
    expect(torsion.tryDecideEllipticDivisorTorsion(fresh(), b.curve, nonzero, bounds)).toBeNull();
    const rational = quadratic(), constants = certifyAlgebraicConstantField(rational.ctx, rational.owner, bounds), curve = certifyAlgebraicCurve(rational.ctx, rational.owner, constants, bounds);
    expect(modelApi.tryEllipticCurveModel(fresh(), curve, bounds)).toBeNull();
    const proof = torsion.tryDecideEllipticDivisorTorsion(fresh(), b.curve, b.divisor, bounds)!, ctx = fresh();
    torsion.verifyEllipticDivisorTorsion(ctx, b.curve, b.divisor, proof, bounds); const first = ctx.usage.work;
    torsion.verifyEllipticDivisorTorsion(ctx, b.curve, b.divisor, proof, bounds); expect(ctx.usage.work).toBe(2 * first);
    for (const patch of [{work: 1}, {allocation: 1}]) {
      const limited = new ExecutionContext({...fresh().limits, ...patch}); expect(() => torsion.tryDecideEllipticDivisorTorsion(limited, b.curve, b.divisor, bounds)).toThrow('resource-limit'); expect(() => limited.tick()).toThrow('resource-limit');
    }
  });
  it('transports a nonmonic relation with a nonzero linear term and complete inverse coordinates', () => {
    const b = base('w'), f = b.field, a = new PolynomialRing(f, 'eta');
    const cubic = f.add(b.ctx, f.multiply(b.ctx, b.x, f.multiply(b.ctx, b.x, b.x)), b.x);
    const owner = constructAlgebraicExtension(b.ctx, a, a.make(b.ctx, [f.multiply(b.ctx, f.fromInteger(b.ctx, -2n), cubic), f.fromInteger(b.ctx, 2n), f.fromInteger(b.ctx, 2n)]), bounds);
    const constants = certifyAlgebraicConstantField(b.ctx, owner, bounds), curve = certifyAlgebraicCurve(b.ctx, owner, constants, bounds), model = modelApi.tryEllipticCurveModel(fresh(), curve, bounds)!;
    expect(model).not.toBeNull(); modelApi.verifyEllipticCurveModel(fresh(), curve, model, bounds);
    expect(owner.equal(b.ctx, model.inverseGenerator, curve.coordinates.basis[1])).toBe(true);
    const zero = constructAlgebraicDivisor(b.ctx, curve, [], bounds), proof = torsion.tryDecideEllipticDivisorTorsion(fresh(), curve, zero, bounds)!;
    expect(proof.order).toBe(1n); expect(proof.factors).toHaveLength(0);
  });
});
