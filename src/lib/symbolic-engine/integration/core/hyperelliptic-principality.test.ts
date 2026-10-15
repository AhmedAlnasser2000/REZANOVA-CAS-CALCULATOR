import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds, quadratic} from './__tests__/algebraic-support';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {decomposeAlgebraicPlaces} from './algebraic-place';
import {constructAlgebraicDivisor, scaleAlgebraicDivisorWithin} from './algebraic-divisor';
import {tryDecideHyperellipticInfinityPrincipality, verifyHyperellipticInfinityPrincipality} from './hyperelliptic-infinity-principality';
import {encodeHyperellipticInfinityPrincipality, decodeHyperellipticInfinityPrincipality} from './hyperelliptic-pell-wire';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {ExecutionContext} from './execution';
import * as models from './hyperelliptic-curve-model';
import * as pell from './polynomial-pell';
import * as units from './hyperelliptic-pell-unit';
import * as principal from './hyperelliptic-infinity-principality';
import * as factor from './algebraic-factorization';
import * as constants from './algebraic-constant-field';
import * as places from './algebraic-place';
import * as rr from './algebraic-riemann-roch';
import * as derivative from './algebraic-derivative';

function prepared(k: bigint) {
  const b = quadratic([1n, 0n, 0n, 0n, 1n]), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds);
  const r = curve.infinity.lattice.scalar.ring, pair = decomposeAlgebraicPlaces(b.ctx, curve, r.make(b.ctx, [r.domain.fromInteger(b.ctx, 0n), r.domain.fromInteger(b.ctx, 1n)]), true, bounds);
  const divisor = constructAlgebraicDivisor(b.ctx, curve, [{place: pair.places[0], coefficient: k}, {place: pair.places[1], coefficient: -k}], bounds);
  return {...b, curve, divisor};
}
describe('complete two-infinity Pell principality', () => {
  it('covers principal signed multiples, complete bounded absence and nondividing units', () => {
    const b = prepared(1n);
    for (const k of [1n, 2n, 3n, -2n, 2n ** 60n]) {
      const divisor = scaleAlgebraicDivisorWithin(b.ctx, b.curve, b.divisor, k), proof = tryDecideHyperellipticInfinityPrincipality(fresh(), b.curve, divisor, bounds)!;
      expect(proof.kind).toBe(k % 2n ? 'not-principal' : 'principal');
      expect(proof.reason).toBe(k === 1n ? 'bounded-empty' : k % 2n ? 'nondividing-unit' : 'unit-multiple');
      verifyHyperellipticInfinityPrincipality(fresh(), b.curve, divisor, proof, bounds);
      if (proof.kind === 'principal') {expect(proof.factors).toHaveLength(1); expect(proof.factors[0].exponent).toBe(-proof.coefficient / 2n);}
      expect(Object.isFrozen(proof.factors)).toBe(true);
    }
  });
  it.each([1n, 2n, 3n])('replays coefficient %s with all solving and geometric search producers disabled', k => {
    const b = prepared(k), proof = tryDecideHyperellipticInfinityPrincipality(fresh(), b.curve, b.divisor, bounds)!, data = JSON.parse(JSON.stringify(encodeHyperellipticInfinityPrincipality(fresh(), b.curve, b.divisor, proof, bounds)));
    const spies = [vi.spyOn(models, 'trySplitHyperellipticModelWithin'), vi.spyOn(pell, 'solvePolynomialPellWithin'), vi.spyOn(units, 'constructHyperellipticPellUnitWithin'), vi.spyOn(units, 'constructSplitHyperellipticInfinityWithin'),
      vi.spyOn(principal, 'tryDecideHyperellipticInfinityPrincipalityWithin'), vi.spyOn(factor, 'factorAlgebraicPolynomialWithin'), vi.spyOn(constants, 'certifyAlgebraicConstantField'),
      vi.spyOn(places, 'decomposeAlgebraicPlacesWithin'), vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin'), vi.spyOn(derivative, 'differentiateAlgebraicWithin')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {const result = decodeHyperellipticInfinityPrincipality(fresh(), b.curve, b.divisor, data, bounds); expect(result.kind).toBe(proof.kind); expect(result.reason).toBe(proof.reason);}
    finally {for (const spy of spies) spy.mockRestore();}
  });
  it('rejects changed bounds, infinity orientation, coverage, functions, exponents and conditions', () => {
    const b = prepared(2n), proof = tryDecideHyperellipticInfinityPrincipality(fresh(), b.curve, b.divisor, bounds)!;
    for (const change of [{...proof, coefficient: -proof.coefficient}, {...proof, factors: []}, {...proof, factors: [{value: proof.unit!.conjugate, exponent: proof.factors[0].exponent}]},
      {...proof, factors: [{value: proof.factors[0].value, exponent: 1n + proof.factors[0].exponent}]}, {...proof, pell: {...proof.pell, maximumDegree: 3n}}])
      expect(() => verifyHyperellipticInfinityPrincipality(fresh(), b.curve, b.divisor, change, bounds)).toThrow('verification-failed');
    const wire = encodeHyperellipticInfinityPrincipality(fresh(), b.curve, b.divisor, proof, bounds) as {tag: string; version: number; payload: unknown};
    for (const change of [
      (e: Record<string, unknown>) => {(e.evidence as Record<string, unknown>).factors = [];},
      (e: Record<string, unknown>) => {(e.infinity as Record<string, unknown>).positive = (e.infinity as Record<string, unknown>).negative;},
      (e: Record<string, unknown>) => {((e.evidence as Record<string, unknown>).unit as Record<string, unknown>).conditions = [];},
      (e: Record<string, unknown>) => {(e.evidence as Record<string, unknown>).verified = true;}
    ]) {
      const body = structuredClone(unpackAlgebraicArtifactData(fresh(), wire.payload, bounds)) as {evidence: Record<string, unknown>}; change(body.evidence);
      expect(() => decodeHyperellipticInfinityPrincipality(fresh(), b.curve, b.divisor, {...wire, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();
    }
    const wrong = scaleAlgebraicDivisorWithin(b.ctx, b.curve, b.divisor, 2n), reordered = constructAlgebraicDivisor(b.ctx, b.curve, [...b.divisor.input].reverse(), bounds);
    for (const request of [wrong, reordered]) expect(() => decodeHyperellipticInfinityPrincipality(fresh(), b.curve, request, wire, bounds)).toThrow();
  });
  it('checks foreign requests, explicit fresh scopes and sticky limits', () => {
    const b = prepared(2n), proof = tryDecideHyperellipticInfinityPrincipality(fresh(), b.curve, b.divisor, bounds)!, data = encodeHyperellipticInfinityPrincipality(fresh(), b.curve, b.divisor, proof, bounds);
    const empty = constructAlgebraicDivisor(b.ctx, b.curve, [], bounds); expect(tryDecideHyperellipticInfinityPrincipality(fresh(), b.curve, empty, bounds)).toBeNull();
    const other = prepared(2n); expect(() => verifyHyperellipticInfinityPrincipality(fresh(), other.curve, other.divisor, proof, bounds)).toThrow();
    const ctx = fresh(); decodeHyperellipticInfinityPrincipality(ctx, b.curve, b.divisor, data, bounds); const first = ctx.usage.work;
    decodeHyperellipticInfinityPrincipality(ctx, b.curve, b.divisor, data, bounds); expect(ctx.usage.work).toBe(2 * first);
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodeHyperellipticInfinityPrincipality(fresh(), b.curve, b.divisor, data, {...bounds, ...patch})).toThrow('resource-limit');
    const stopped = new ExecutionContext({...fresh().limits, allocation: 1}); expect(() => tryDecideHyperellipticInfinityPrincipality(stopped, b.curve, b.divisor, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
  });
});
