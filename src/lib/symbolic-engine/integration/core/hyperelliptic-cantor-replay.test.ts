import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {preparedCantor} from './__tests__/cantor-support';
import {ExecutionContext} from './execution';
import {constructAlgebraicDivisor, scaleAlgebraicDivisorWithin} from './algebraic-divisor';
import {decideCantorPrincipality} from './hyperelliptic-cantor-principality';
import {encodeCantorPrincipality, decodeCantorPrincipality} from './hyperelliptic-cantor-wire';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import * as constants from './algebraic-constant-field';
import * as factor from './algebraic-factorization';
import * as models from './ramified-hyperelliptic-model';
import * as group from './hyperelliptic-cantor';
import * as arithmetic from './cantor-arithmetic';
import * as classes from './hyperelliptic-cantor-divisor';
import * as transport from './hyperelliptic-cantor-place';
import * as principal from './hyperelliptic-cantor-principality';
import * as places from './algebraic-place';
import * as rr from './algebraic-riemann-roch';
import * as linear from './linear-system';
import * as derivative from './algebraic-derivative';

describe('compact complete Cantor principality replay', () => {
  it.each([1n, 3n])('replays principal/nonprincipal coefficient %s with all search producers disabled', coefficient => {
    const b = preparedCantor(), point = b.choose([0n, 1n], 1n), d = constructAlgebraicDivisor(b.ctx, b.curve, [{place: point, coefficient}, {place: b.infinity, coefficient: -coefficient}], bounds);
    const proof = decideCantorPrincipality(fresh(), b.model, d, bounds), data = JSON.parse(JSON.stringify(encodeCantorPrincipality(fresh(), b.curve, d, proof, bounds)));
    const spies = [vi.spyOn(constants, 'certifyAlgebraicConstantField'), vi.spyOn(factor, 'factorAlgebraicPolynomialWithin'), vi.spyOn(models, 'tryRamifiedHyperellipticModelWithin'),
      vi.spyOn(group, 'addMumfordPairsWithin'), vi.spyOn(group, 'multiplyMumfordPairWithin'), vi.spyOn(arithmetic, 'addCantorPairs'), vi.spyOn(arithmetic, 'constructCantorPair'),
      vi.spyOn(classes, 'reduceCantorDivisorWithin'), vi.spyOn(transport, 'transportCantorPlaceWithin'), vi.spyOn(principal, 'decideCantorPrincipalityWithin'),
      vi.spyOn(places, 'decomposeAlgebraicPlacesWithin'), vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin'), vi.spyOn(linear, 'solveLinearSystem'), vi.spyOn(derivative, 'differentiateAlgebraicWithin')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {const result = decodeCantorPrincipality(fresh(), b.curve, d, data, bounds); expect(result.kind).toBe(proof.kind); expect(result.model).not.toBe(proof.model); expect(result.model.domain).not.toBe(proof.model.domain);}
    finally {for (const spy of spies) spy.mockRestore();}
  });
  it('rejects incomplete polynomial coverage, changed constructions, functions, signs and trusted flags', () => {
    const b = preparedCantor(), point = b.choose([0n, 1n], 1n), d = constructAlgebraicDivisor(b.ctx, b.curve, [{place: point, coefficient: 3n}, {place: b.infinity, coefficient: -3n}], bounds), proof = decideCantorPrincipality(fresh(), b.model, d, bounds);
    const wire = encodeCantorPrincipality(fresh(), b.curve, d, proof, bounds) as {tag: string; version: number; payload: unknown};
    type Body = {model: Record<string, unknown>; evidence: {kind: string; verified?: boolean; reduction: {terms: unknown[]; evidence: Record<string, unknown>}}};
    for (const mutate of [
      (body: Body) => {body.model.y = body.model.x;},
      (body: Body) => {body.evidence.reduction.terms = [];},
      (body: Body) => {body.evidence.reduction.evidence.factors = [];},
      (body: Body) => {body.evidence.reduction.evidence.conditions = [];},
      (body: Body) => {body.evidence.kind = 'not-principal';},
      (body: Body) => {body.evidence.verified = true;}
    ]) {
      const body = structuredClone(unpackAlgebraicArtifactData(fresh(), wire.payload, bounds)) as Body; mutate(body);
      expect(() => decodeCantorPrincipality(fresh(), b.curve, d, {...wire, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();
    }
    const wrong = scaleAlgebraicDivisorWithin(b.ctx, b.curve, d, 2n), reordered = constructAlgebraicDivisor(b.ctx, b.curve, [...d.input].reverse(), bounds);
    for (const request of [wrong, reordered]) expect(() => decodeCantorPrincipality(fresh(), b.curve, request, wire, bounds)).toThrow();
  });
  it('bounds the whole artifact before reconstruction and preserves fresh operation accounting', () => {
    const b = preparedCantor(), d = constructAlgebraicDivisor(b.ctx, b.curve, [], bounds), proof = decideCantorPrincipality(fresh(), b.model, d, bounds), wire = encodeCantorPrincipality(fresh(), b.curve, d, proof, bounds);
    const ctx = fresh(); decodeCantorPrincipality(ctx, b.curve, d, wire, bounds); const first = ctx.usage.work;
    decodeCantorPrincipality(ctx, b.curve, d, wire, bounds); expect(ctx.usage.work).toBe(2 * first);
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodeCantorPrincipality(fresh(), b.curve, d, wire, {...bounds, ...patch})).toThrow('resource-limit');
    const stopped = new ExecutionContext({...fresh().limits, work: 1}); expect(() => decodeCantorPrincipality(stopped, b.curve, d, wire, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
    expect(() => decodeCantorPrincipality(fresh(), b.curve, d, {tag: 'algebraic-principality', version: 2, payload: null}, bounds)).toThrow('invalid-input');
  });
});
