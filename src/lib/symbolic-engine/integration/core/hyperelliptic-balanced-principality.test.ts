import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds, quadratic} from './__tests__/algebraic-support';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {decomposeAlgebraicPlaces, evaluateAlgebraicPlaceIntegral} from './algebraic-place';
import {constructAlgebraicDivisor} from './algebraic-divisor';
import {trySplitHyperellipticModel} from './hyperelliptic-curve-model';
import {constructBalancedCurveModelWithin} from './hyperelliptic-balanced-place';
import {decideBalancedPrincipality, verifyBalancedPrincipality} from './hyperelliptic-balanced-divisor';
import {encodeBalancedPrincipality, decodeBalancedPrincipality} from './hyperelliptic-balanced-principality-wire';
import {principalAlgebraicDivisorWithin, verifyAlgebraicPrincipalDivisor} from './algebraic-divisor';
import {algebraicFunctionPower} from './algebraic-function-power';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {ExecutionContext} from './execution';
import * as divisor from './hyperelliptic-balanced-divisor';
import * as transport from './hyperelliptic-balanced-place';
import * as arithmetic from './balanced-cantor-arithmetic';
import * as constants from './algebraic-constant-field';
import * as placeSearch from './algebraic-place';
import * as rr from './algebraic-riemann-roch';
import * as factor from './algebraic-factorization';

function prepared(h: readonly bigint[] = [1n, 0n, 0n, 0n, 1n]) {
  const b = quadratic(h), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds), model = trySplitHyperellipticModel(b.ctx, curve, bounds)!;
  const source = constructBalancedCurveModelWithin(b.ctx, model, bounds), r = curve.coordinates.scalar.ring, c = r.domain, p = (values: readonly bigint[]) => r.make(b.ctx, values.map(n => c.fromInteger(b.ctx, n)));
  const chart = curve.infinity.lattice.scalar.ring, infinity = decomposeAlgebraicPlaces(b.ctx, curve, chart.make(b.ctx, [c.fromInteger(b.ctx, 0n), c.fromInteger(b.ctx, 1n)]), true, bounds).places;
  const scaled = b.owner.exactDivide(b.ctx, model.y, algebraicFunctionPower(b.ctx, b.owner, model.x, BigInt(model.halfDegree)));
  const plus = infinity.find(place => place.residue.equal(b.ctx, evaluateAlgebraicPlaceIntegral(b.ctx, curve, place, scaled), place.residue.fromInteger(b.ctx, 1n)))!, minus = infinity.find(place => place !== plus)!;
  const above = (values: readonly bigint[]) => decomposeAlgebraicPlaces(b.ctx, curve, p(values), false, bounds).places;
  const choose = (values: readonly bigint[], y: bigint) => above(values).find(place => place.residue.equal(b.ctx, evaluateAlgebraicPlaceIntegral(b.ctx, curve, place, model.y), place.residue.fromInteger(b.ctx, y)))!;
  return {...b, curve, model, source, plus, minus, above, choose};
}
describe('complete native split-even balanced principality', () => {
  it('constructs signed finite/infinity witnesses and matches complete principal divisors', () => {
    const b = prepared(), point = b.choose([0n, 1n], 1n);
    for (const entries of [[{place: b.plus, coefficient: 2n}, {place: b.minus, coefficient: -2n}],
      [{place: point, coefficient: 2n}, {place: b.plus, coefficient: -2n}], [{place: point, coefficient: -2n}, {place: b.plus, coefficient: 2n}]]) {
      const D = constructAlgebraicDivisor(b.ctx, b.curve, entries, bounds), proof = decideBalancedPrincipality(fresh(), b.source, D, bounds); expect(proof.kind).toBe('principal');
      // Expand only this small test witness; production retains factored powers.
      let value = b.owner.fromInteger(b.ctx, 1n);
      for (const f of proof.reduction!.factors) value = b.owner.multiply(b.ctx, value, algebraicFunctionPower(b.ctx, b.owner, f.exponent < 0n ? b.owner.inverse(b.ctx, f.value) : f.value, f.exponent < 0n ? -f.exponent : f.exponent));
      const ctx = fresh(), actual = ctx.operation(() => principalAlgebraicDivisorWithin(ctx, b.curve, value, bounds)); verifyAlgebraicPrincipalDivisor(fresh(), b.curve, value, actual, bounds);
      expect(actual.divisor.entries.length).toBe(D.entries.length);
      expect(actual.divisor.entries.every(e => D.entries.some(d => d.coefficient === e.coefficient && placeSearch.equalAlgebraicPlaces(b.ctx, b.curve, d.place, e.place)))).toBe(true);
    }
  });
  it('distinguishes degree, nonprincipal classes, empty divisors and complete inert transport', () => {
    const b = prepared(), point = b.choose([0n, 1n], 1n);
    const negative = constructAlgebraicDivisor(b.ctx, b.curve, [{place: point, coefficient: 1n}, {place: b.plus, coefficient: -1n}], bounds), degree = constructAlgebraicDivisor(b.ctx, b.curve, [{place: point, coefficient: 1n}], bounds), empty = constructAlgebraicDivisor(b.ctx, b.curve, [], bounds);
    expect(decideBalancedPrincipality(fresh(), b.source, negative, bounds).kind).toBe('not-principal'); expect(decideBalancedPrincipality(fresh(), b.source, degree, bounds).reduction).toBeNull(); expect(decideBalancedPrincipality(fresh(), b.source, empty, bounds).kind).toBe('principal');
    const inert = b.above([-1n, 1n])[0]; expect(inert.residueDegree).toBe(2n);
    const D = constructAlgebraicDivisor(b.ctx, b.curve, [{place: inert, coefficient: 1n}, {place: b.plus, coefficient: -1n}, {place: b.minus, coefficient: -1n}], bounds), proof = decideBalancedPrincipality(fresh(), b.source, D, bounds);
    expect(proof.kind).toBe('principal'); expect(proof.reduction!.terms[0].transport.kind).toBe('inert');
  });
  it('retains complete nonrational ramification and combined infinity support', () => {
    const b = prepared([1n, 0n, 0n, 0n, 0n, 0n, 1n]), closed = b.above([1n, 0n, 1n])[0];
    expect(closed.degree).toBe(2n); expect(closed.ramification).toBe(2n);
    const D = constructAlgebraicDivisor(b.ctx, b.curve, [{place: closed, coefficient: 2n}, {place: b.plus, coefficient: -2n}, {place: b.minus, coefficient: -2n}], bounds);
    const proof = decideBalancedPrincipality(fresh(), b.source, D, bounds); expect(proof.kind).toBe('principal'); expect(proof.reduction!.terms[0].transport.kind).toBe('split');
    const yMinusOne = b.owner.subtract(b.ctx, b.model.y, b.owner.fromInteger(b.ctx, 1n)), ctx = fresh(), actual = ctx.operation(() => principalAlgebraicDivisorWithin(ctx, b.curve, yMinusOne, bounds));
    expect(decideBalancedPrincipality(fresh(), b.source, actual.divisor, bounds).kind).toBe('principal');
  });
  it.each([1n, 2n, -2n])('replays native principal/nonprincipal coefficient %s with search disabled', n => {
    const b = prepared(), D = constructAlgebraicDivisor(b.ctx, b.curve, [{place: b.plus, coefficient: n}, {place: b.minus, coefficient: -n}], bounds), proof = decideBalancedPrincipality(fresh(), b.source, D, bounds), data = JSON.parse(JSON.stringify(encodeBalancedPrincipality(fresh(), b.curve, D, proof, bounds)));
    const spies = [vi.spyOn(divisor, 'decideBalancedPrincipalityWithin'), vi.spyOn(divisor, 'reduceBalancedDivisorWithin'), vi.spyOn(transport, 'constructBalancedCurveModelWithin'), vi.spyOn(transport, 'transportBalancedPlaceWithin'), vi.spyOn(arithmetic, 'normalizeBalancedDivisor'), vi.spyOn(arithmetic, 'addBalancedDivisors'), vi.spyOn(arithmetic, 'multiplyBalancedDivisor'),
      vi.spyOn(constants, 'certifyAlgebraicConstantField'), vi.spyOn(placeSearch, 'decomposeAlgebraicPlacesWithin'), vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin'), vi.spyOn(factor, 'factorAlgebraicPolynomialWithin')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {verifyBalancedPrincipality(fresh(), b.source, D, proof, bounds); expect(decodeBalancedPrincipality(fresh(), b.curve, D, data, bounds).kind).toBe(n % 2n ? 'not-principal' : 'principal');} finally {for (const spy of spies) spy.mockRestore();}
  });
  it('rejects changed place coverage, factors, conditions and saved authority, with fresh scopes', () => {
    const b = prepared(), D = constructAlgebraicDivisor(b.ctx, b.curve, [{place: b.plus, coefficient: 2n}, {place: b.minus, coefficient: -2n}], bounds), proof = decideBalancedPrincipality(fresh(), b.source, D, bounds), reduction = proof.reduction!;
    expect(reduction.conditions.length).toBeGreaterThan(0);
    for (const changed of [{...proof, kind: 'not-principal' as const}, {...proof, reduction: {...reduction, terms: reduction.terms.slice(1)}},
      {...proof, reduction: {...reduction, factors: []}}, {...proof, reduction: {...reduction, factors: reduction.factors.map(f => ({...f, exponent: f.exponent + 1n}))}},
      {...proof, reduction: {...reduction, conditions: []}},
      {...proof, reduction: {...reduction, result: {...reduction.result, n: reduction.result.n + 1n}}}]) expect(() => verifyBalancedPrincipality(fresh(), b.source, D, changed, bounds)).toThrow('verification-failed');
    const data = encodeBalancedPrincipality(fresh(), b.curve, D, proof, bounds) as {tag: string; version: number; payload: unknown}, body = structuredClone(unpackAlgebraicArtifactData(fresh(), data.payload, bounds)) as Record<string, unknown>;
    (body.evidence as Record<string, unknown>).verified = true;
    expect(() => decodeBalancedPrincipality(fresh(), b.curve, D, {...data, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow('invalid-input');
    const ctx = fresh(); decodeBalancedPrincipality(ctx, b.curve, D, data, bounds); const first = ctx.usage.work; decodeBalancedPrincipality(ctx, b.curve, D, data, bounds); expect(ctx.usage.work).toBe(first * 2);
    const swapped = constructAlgebraicDivisor(b.ctx, b.curve, [...D.input].reverse(), bounds); expect(() => decodeBalancedPrincipality(fresh(), b.curve, swapped, data, bounds)).toThrow();
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodeBalancedPrincipality(fresh(), b.curve, D, data, {...bounds, ...patch})).toThrow('resource-limit');
    const stopped = new ExecutionContext({...fresh().limits, work: 1}); expect(() => decideBalancedPrincipality(stopped, b.source, D, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
  });
});
