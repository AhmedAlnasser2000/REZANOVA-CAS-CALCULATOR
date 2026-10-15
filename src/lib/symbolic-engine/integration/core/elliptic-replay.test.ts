import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {ellipticDivisor} from './__tests__/algebraic-divisor-support';
import {tryDecideEllipticDivisorTorsion} from './elliptic-divisor-torsion';
import {encodeEllipticDivisorTorsion, decodeEllipticDivisorTorsion} from './elliptic-wire';
import {scaleAlgebraicDivisorWithin, constructAlgebraicDivisor} from './algebraic-divisor';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {ExecutionContext} from './execution';
import * as models from './elliptic-curve-model';
import * as group from './elliptic-group';
import * as places from './algebraic-place';
import * as constants from './algebraic-constant-field';
import * as factor from './algebraic-factorization';
import * as rr from './algebraic-riemann-roch';
import * as good from './algebraic-good-reduction';
import * as torsion from './elliptic-divisor-torsion';
import * as linear from './linear-system';

describe('compact elliptic replay with original construction and explicit value evidence', () => {
  it.each([2n, null])('replays the %s fixture without geometry, factorization or solver producers', order => {
    const b = ellipticDivisor(order), proof = tryDecideEllipticDivisorTorsion(fresh(), b.curve, b.divisor, bounds)!, data = JSON.parse(JSON.stringify(encodeEllipticDivisorTorsion(fresh(), b.curve, b.divisor, proof, bounds)));
    const spies = [vi.spyOn(models, 'tryEllipticCurveModelWithin'), vi.spyOn(group, 'addEllipticPoints'), vi.spyOn(group, 'multiplyEllipticPoint'),
      vi.spyOn(places, 'decomposeAlgebraicPlacesWithin'), vi.spyOn(constants, 'certifyAlgebraicConstantField'), vi.spyOn(factor, 'factorAlgebraicPolynomialWithin'),
      vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin'), vi.spyOn(good, 'findAlgebraicGoodReductionWithin'), vi.spyOn(torsion, 'tryDecideEllipticDivisorTorsionWithin'), vi.spyOn(linear, 'solveLinearSystem')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {
      const result = decodeEllipticDivisorTorsion(fresh(), b.curve, b.divisor, data, bounds); expect(result.kind).toBe(order === null ? 'non-torsion' : 'torsion'); expect(result.order).toBe(order);
      expect(Object.isFrozen(result.model) && Object.isFrozen(result.factors)).toBe(true);
    } finally {for (const spy of spies) spy.mockRestore();}
  });
  it('rejects altered orders, model mappings, binary coverage, units, conditions and trusted flags', () => {
    const b = ellipticDivisor(2n), proof = tryDecideEllipticDivisorTorsion(fresh(), b.curve, b.divisor, bounds)!, wire = encodeEllipticDivisorTorsion(fresh(), b.curve, b.divisor, proof, bounds) as {tag: string; version: number; payload: unknown};
    const change = (mutate: (body: Record<string, unknown>) => void) => {
      const body = structuredClone(unpackAlgebraicArtifactData(fresh(), wire.payload, bounds)) as Record<string, unknown>; mutate(body);
      return {...wire, payload: packAlgebraicArtifactData(fresh(), body, bounds)};
    };
    const mutations = [
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).order = '1';},
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).tests = [];},
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).factors = [];},
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).conditions = [];},
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).verified = true;},
      (body: Record<string, unknown>) => {(body.model as Record<string, unknown>).inverseGenerator = (body.model as Record<string, unknown>).x;},
      (body: Record<string, unknown>) => {const b = body.model as Record<string, unknown>; (b.squareFree as Record<string, unknown>).s = (b.squareFree as Record<string, unknown>).t;}
    ];
    for (const mutate of mutations) expect(() => decodeEllipticDivisorTorsion(fresh(), b.curve, b.divisor, change(mutate), bounds)).toThrow();
    const changed = scaleAlgebraicDivisorWithin(b.ctx, b.curve, b.divisor, 2n), reordered = constructAlgebraicDivisor(b.ctx, b.curve, [...b.divisor.input].reverse(), bounds);
    for (const divisor of [changed, reordered]) expect(() => decodeEllipticDivisorTorsion(fresh(), b.curve, divisor, wire, bounds)).toThrow();
    expect(() => decodeEllipticDivisorTorsion(fresh(), b.curve, b.divisor, {...wire, version: 1}, bounds)).toThrow('invalid-input');
  });
  it('bounds the entire artifact before reconstruction and starts fresh replay scopes', () => {
    const b = ellipticDivisor(2n), proof = tryDecideEllipticDivisorTorsion(fresh(), b.curve, b.divisor, bounds)!, wire = encodeEllipticDivisorTorsion(fresh(), b.curve, b.divisor, proof, bounds);
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodeEllipticDivisorTorsion(fresh(), b.curve, b.divisor, wire, {...bounds, ...patch})).toThrow('resource-limit');
    const ctx = fresh(); decodeEllipticDivisorTorsion(ctx, b.curve, b.divisor, wire, bounds); const first = ctx.usage.work;
    decodeEllipticDivisorTorsion(ctx, b.curve, b.divisor, wire, bounds); expect(ctx.usage.work).toBe(2 * first);
    const limited = new ExecutionContext({...fresh().limits, work: 1}); expect(() => decodeEllipticDivisorTorsion(limited, b.curve, b.divisor, wire, bounds)).toThrow('resource-limit'); expect(() => limited.tick()).toThrow('resource-limit');
  });
});
