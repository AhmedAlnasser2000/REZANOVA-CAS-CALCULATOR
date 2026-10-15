import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {ExecutionContext} from './execution';
import {PolynomialRing} from './polynomial';
import {rationalField as Q} from './field';
import {constructAlgebraicExtension} from './algebraic-field';
import {solvePolynomialPell} from './polynomial-pell';
import {encodePolynomialPell, decodePolynomialPell} from './polynomial-pell-wire';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import * as pell from './polynomial-pell';
import * as division from './polynomial-division';
import * as factor from './algebraic-factorization';
import * as recursive from './recursive-polynomial-factorization';

const ns = [0n, -16n, 33n, -12n, 6n, 4n, 1n];
describe('bounded polynomial Pell saved replay', () => {
  it.each([28n, 29n])('replays bound %s without unit, division, or factorization producers', limit => {
    const ctx = fresh(), r = new PolynomialRing(Q, 'x'), h = r.make(ctx, ns.map(n => Q.fromInteger(ctx, n))), proof = solvePolynomialPell(ctx, r, h, limit, bounds);
    const data = JSON.parse(JSON.stringify(encodePolynomialPell(fresh(), r, h, limit, proof, bounds)));
    const spies = [vi.spyOn(pell, 'solvePolynomialPellWithin'), vi.spyOn(division, 'polynomialDivide'), vi.spyOn(division, 'extendedGcd'),
      vi.spyOn(factor, 'factorAlgebraicPolynomialWithin'), vi.spyOn(recursive, 'factorRecursivePolynomial')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {const result = decodePolynomialPell(fresh(), r, h, limit, data, bounds); expect(result.kind).toBe(limit === 29n ? 'unit' : 'bounded-empty'); expect(Object.isFrozen(result.steps)).toBe(true);}
    finally {for (const spy of spies) spy.mockRestore();}
  });
  it('binds the full expected number-field construction and polynomial owner', () => {
    const ctx = fresh(), a = new PolynomialRing(Q, 'a'), c = constructAlgebraicExtension(ctx, a, a.make(ctx, [-2n, 0n, 1n].map(n => Q.fromInteger(ctx, n))), bounds);
    const r = new PolynomialRing(c, 't'), h = r.make(ctx, [c.generator(ctx), c.fromInteger(ctx, 0n), c.fromInteger(ctx, 1n)]), proof = solvePolynomialPell(ctx, r, h, 1n, bounds);
    const data = JSON.parse(JSON.stringify(encodePolynomialPell(fresh(), r, h, 1n, proof, bounds)));
    const result = decodePolynomialPell(fresh(), r, h, 1n, data, bounds); expect(c.equal(ctx, result.norm!, c.negate(ctx, c.generator(ctx)))).toBe(true);
    expect(() => decodePolynomialPell(fresh(), r, r.add(ctx, h, r.one(ctx)), 1n, data, bounds)).toThrow('verification-failed');
    expect(() => decodePolynomialPell(fresh(), new PolynomialRing(c, 't'), h, 1n, data, bounds)).toThrow('domain-mismatch');
  });
  it('rejects missing coverage, wrong signs, noncanonical integers, fabricated flags and tighter budgets', () => {
    const ctx = fresh(), r = new PolynomialRing(Q, 'x'), h = r.make(ctx, ns.map(n => Q.fromInteger(ctx, n))), proof = solvePolynomialPell(ctx, r, h, 29n, bounds);
    const data = encodePolynomialPell(fresh(), r, h, 29n, proof, bounds) as {tag: string; version: number; payload: unknown};
    for (const mutate of [
      (e: Record<string, unknown>) => {e.maximumDegree = '029';},
      (e: Record<string, unknown>) => {e.leastDegree = '28';},
      (e: Record<string, unknown>) => {e.steps = (e.steps as unknown[]).slice(1);},
      (e: Record<string, unknown>) => {e.verified = true;},
      (e: Record<string, unknown>) => {e.norm = {numerator: '1', denominator: '1'};}
    ]) {
      const body = structuredClone(unpackAlgebraicArtifactData(fresh(), data.payload, bounds)) as {evidence: Record<string, unknown>}; mutate(body.evidence);
      expect(() => decodePolynomialPell(fresh(), r, h, 29n, {...data, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();
    }
    expect(() => decodePolynomialPell(fresh(), r, h, 28n, data, bounds)).toThrow('verification-failed');
    for (const patch of [{artifactBytes: 1}, {artifactNodes: 1}, {artifactDepth: 1}]) expect(() => decodePolynomialPell(fresh(), r, h, 29n, data, {...bounds, ...patch})).toThrow('resource-limit');
    const cold = fresh(); decodePolynomialPell(cold, r, h, 29n, data, bounds); const first = cold.usage.work; decodePolynomialPell(cold, r, h, 29n, data, bounds); expect(cold.usage.work).toBe(2 * first);
    const exhausted = new ExecutionContext({...fresh().limits, work: 1}); expect(() => decodePolynomialPell(exhausted, r, h, 29n, data, bounds)).toThrow('resource-limit'); expect(() => exhausted.tick()).toThrow('resource-limit');
  });
});
