import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {ExecutionContext} from './execution';
import {rationalField as Q} from './field';
import {rational} from './rational';
import {PolynomialRing} from './polynomial';
import {constructAlgebraicExtension} from './algebraic-field';
import {constructBalancedDomain, constructBalancedMumford, multiplyBalancedMumford, verifyBalancedMumfordMultiple} from './hyperelliptic-balanced';
import {encodeBalancedMumfordMultiple, decodeBalancedMumfordMultiple} from './hyperelliptic-balanced-wire';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import * as producer from './hyperelliptic-balanced';
import * as arithmetic from './balanced-cantor-arithmetic';
import * as model from './balanced-cantor-model';
import * as gcd from './polynomial-division';
import * as factor from './recursive-polynomial-factorization';
import * as fields from './algebraic-field';
import * as cantor from './cantor-arithmetic';

function prepared() {
  const ctx = fresh(), r = new PolynomialRing(Q, 'X'), p = (values: readonly bigint[]) => r.make(ctx, values.map(n => rational(ctx, n)));
  const domain = constructBalancedDomain(ctx, r, p([0n, -16n, 33n, -12n, 6n, 4n, 1n]), rational(ctx, 1n), bounds);
  const input = constructBalancedMumford(ctx, domain, r.one(ctx), r.zero(ctx), 2n, bounds).result;
  return {ctx, r, p, domain, input};
}
describe('complete bounded characteristic-zero balanced replay', () => {
  it.each([0n, 29n, -29n])('replays signed coefficient %s with search and group producers disabled', coefficient => {
    const b = prepared(), proof = multiplyBalancedMumford(fresh(), b.domain, b.input, coefficient, bounds), data = JSON.parse(JSON.stringify(encodeBalancedMumfordMultiple(fresh(), b.domain, b.input, coefficient, proof, bounds)));
    const spies = [vi.spyOn(producer, 'constructBalancedDomain'), vi.spyOn(producer, 'constructBalancedMumfordWithin'), vi.spyOn(producer, 'multiplyBalancedMumfordWithin'),
      vi.spyOn(arithmetic, 'normalizeBalancedDivisor'), vi.spyOn(arithmetic, 'addBalancedDivisors'), vi.spyOn(arithmetic, 'inverseBalancedDivisor'), vi.spyOn(arithmetic, 'multiplyBalancedDivisor'),
      vi.spyOn(model, 'constructBalancedInfinity'), vi.spyOn(cantor, 'cantorNormQuotient'), vi.spyOn(gcd, 'extendedGcd'), vi.spyOn(factor, 'factorRecursivePolynomial'), vi.spyOn(fields, 'constructAlgebraicExtension')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {
      verifyBalancedMumfordMultiple(fresh(), b.domain, b.input, coefficient, proof, bounds);
      const replayed = decodeBalancedMumfordMultiple(fresh(), b.domain, b.input, coefficient, data, bounds);
      expect(replayed.result.n).toBe(proof.result.n); expect(b.r.equal(b.ctx, replayed.result.pair.u, proof.result.pair.u)).toBe(true);
    } finally {for (const spy of spies) spy.mockRestore();}
  });
  it('binds the complete number-field construction and split root', () => {
    const ctx = fresh(), ar = new PolynomialRing(Q, 'a'), c = constructAlgebraicExtension(ctx, ar, ar.make(ctx, [-2n, 0n, 1n].map(n => rational(ctx, n))), bounds), r = new PolynomialRing(c, 'X');
    const h = r.make(ctx, [2n, 0n, 0n, 0n, 2n].map(n => c.fromInteger(ctx, n))), root = c.generator(ctx), domain = constructBalancedDomain(ctx, r, h, root, bounds);
    const input = constructBalancedMumford(ctx, domain, r.one(ctx), r.zero(ctx), 0n, bounds).result, proof = multiplyBalancedMumford(fresh(), domain, input, 2n, bounds);
    const data = encodeBalancedMumfordMultiple(fresh(), domain, input, 2n, proof, bounds), other = constructBalancedDomain(ctx, r, h, c.negate(ctx, root), bounds);
    expect(decodeBalancedMumfordMultiple(fresh(), domain, input, 2n, data, bounds).result.n).toBe(1n);
    expect(() => decodeBalancedMumfordMultiple(fresh(), other, input, 2n, data, bounds)).toThrow('verification-failed');
  });
  it('rejects missing binary/flip coverage, changed model parts and trusted flags', () => {
    const b = prepared(), proof = multiplyBalancedMumford(fresh(), b.domain, b.input, 29n, bounds), data = encodeBalancedMumfordMultiple(fresh(), b.domain, b.input, 29n, proof, bounds) as {tag: string; version: number; payload: unknown};
    for (const mutate of [
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).steps = [];},
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).coefficient = '-29';},
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).verified = true;},
      (body: Record<string, unknown>) => {body.plus = body.minus;},
      (body: Record<string, unknown>) => {body.infinityRemainder = body.plus;}
    ]) {
      const body = structuredClone(unpackAlgebraicArtifactData(fresh(), data.payload, bounds)) as Record<string, unknown>; mutate(body);
      expect(() => decodeBalancedMumfordMultiple(fresh(), b.domain, b.input, 29n, {...data, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();
    }
    expect(() => decodeBalancedMumfordMultiple(fresh(), b.domain, b.input, 28n, data, bounds)).toThrow('verification-failed');
  });
  it('bounds the entire artifact, rejects accessors and starts fresh authority', () => {
    const b = prepared(), proof = multiplyBalancedMumford(fresh(), b.domain, b.input, 29n, bounds), data = encodeBalancedMumfordMultiple(fresh(), b.domain, b.input, 29n, proof, bounds), ctx = fresh();
    decodeBalancedMumfordMultiple(ctx, b.domain, b.input, 29n, data, bounds); const first = ctx.usage.work;
    decodeBalancedMumfordMultiple(ctx, b.domain, b.input, 29n, data, bounds); expect(ctx.usage.work).toBe(2 * first);
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodeBalancedMumfordMultiple(fresh(), b.domain, b.input, 29n, data, {...bounds, ...patch})).toThrow('resource-limit');
    let accessed = false; const malformed = Object.defineProperty({}, 'payload', {enumerable: true, get() {accessed = true; throw Error('accessor');}});
    expect(() => decodeBalancedMumfordMultiple(fresh(), b.domain, b.input, 29n, malformed, bounds)).toThrow('invalid-input'); expect(accessed).toBe(false);
    const stopped = new ExecutionContext({...fresh().limits, work: 1}); expect(() => decodeBalancedMumfordMultiple(stopped, b.domain, b.input, 29n, data, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
  });
});
