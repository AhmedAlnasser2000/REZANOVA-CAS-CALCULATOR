import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {ExecutionContext} from './execution';
import {PositivePrimeField} from './positive-field';
import {PositivePolynomialRing} from './positive-polynomial';
import {PositiveFiniteExtension, finiteIrreducibility} from './positive-extension';
import {constructPositiveCantorDomain, constructPositiveMumfordPair, multiplyPositiveMumfordPair, verifyPositiveMumfordMultiple,
  constructPositiveMumfordPairWithin, verifyPositiveMumfordPairWithin} from './positive-cantor';
import {encodePositiveCantorMultiple, decodePositiveCantorMultiple} from './positive-cantor-wire';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import * as group from './positive-cantor';
import * as arithmetic from './cantor-arithmetic';
import * as polynomial from './positive-polynomial';
import * as extension from './positive-extension';
import * as factor from './positive-factorization';

function prepared() {
  const ctx = fresh(), field = new PositivePrimeField(ctx, 5n), r = new PositivePolynomialRing(field, 'x'), p = (values: readonly bigint[]) => r.make(ctx, values.map(n => field.fromInteger(ctx, n)));
  const domain = constructPositiveCantorDomain(ctx, field, r, p([1n, 0n, 0n, 1n]), bounds), point = constructPositiveMumfordPair(ctx, domain, p([0n, 1n]), p([1n]), bounds);
  return {ctx, field, r, p, domain, point};
}
describe('separate finite Cantor domains and replay', () => {
  it.each([2n, 3n, -3n])('checks signed multiple %s without finite/GCD/group producers', coefficient => {
    const b = prepared(), proof = multiplyPositiveMumfordPair(fresh(), b.domain, b.point, coefficient, bounds);
    expect(b.r.degree(b.ctx, proof.result.u)).toBe(coefficient % 3n === 0n ? 0 : 1);
    const wire = JSON.parse(JSON.stringify(encodePositiveCantorMultiple(fresh(), b.domain, b.point, coefficient, proof, bounds)));
    const spies = [vi.spyOn(group, 'constructPositiveCantorDomain'), vi.spyOn(group, 'multiplyPositiveMumfordPairWithin'), vi.spyOn(arithmetic, 'constructCantorPair'),
      vi.spyOn(arithmetic, 'multiplyCantorPair'), vi.spyOn(arithmetic, 'addCantorPairs'), vi.spyOn(polynomial, 'positiveBezout'), vi.spyOn(extension, 'finiteIrreducibility'), vi.spyOn(factor, 'factorPositivePolynomial')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {verifyPositiveMumfordMultiple(fresh(), b.domain, b.point, coefficient, proof, bounds); const result = decodePositiveCantorMultiple(fresh(), b.domain, b.point, coefficient, wire, bounds); expect(result.result.u.coefficients.length).toBe(proof.result.u.coefficients.length);}
    finally {for (const spy of spies) spy.mockRestore();}
  });
  it('reconstructs an extension field and independently checks its order-four elliptic point', () => {
    const ctx = fresh(), prime = new PositivePrimeField(ctx, 3n), a = new PositivePolynomialRing(prime, 'a'), modulus = a.make(ctx, [1n, 0n, 1n].map(n => prime.fromInteger(ctx, n))),
      field = new PositiveFiniteExtension(ctx, prime, a, modulus, finiteIrreducibility(ctx, a, modulus, prime.size)), r = new PositivePolynomialRing(field, 'x');
    const h = r.make(ctx, [2n, 1n, 0n, 1n].map(n => field.fromInteger(ctx, n))), domain = constructPositiveCantorDomain(ctx, field, r, h, bounds),
      point = constructPositiveMumfordPair(ctx, domain, r.x(ctx), r.constant(ctx, field.generator(ctx)), bounds);
    const double = multiplyPositiveMumfordPair(fresh(), domain, point, 2n, bounds), proof = multiplyPositiveMumfordPair(fresh(), domain, point, 4n, bounds);
    expect(r.equal(ctx, double.result.u, r.make(ctx, [field.fromInteger(ctx, 1n), field.fromInteger(ctx, 1n)]))).toBe(true); expect(r.isZero(ctx, double.result.v)).toBe(true); expect(r.degree(ctx, proof.result.u)).toBe(0);
    const wire = encodePositiveCantorMultiple(fresh(), domain, point, 4n, proof, bounds), spies = [vi.spyOn(extension, 'finiteIrreducibility'), vi.spyOn(group, 'multiplyPositiveMumfordPairWithin')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {expect(decodePositiveCantorMultiple(fresh(), domain, point, 4n, wire, bounds).coefficient).toBe(4n);} finally {for (const spy of spies) spy.mockRestore();}
  });
  it('checks complete streamed norms and Bezout evidence under the actual degree bound', () => {
    const ctx = fresh(), field = new PositivePrimeField(ctx, 11n), r = new PositivePolynomialRing(field, 'x'), p = (v: readonly bigint[]) => r.make(ctx, v.map(n => field.fromInteger(ctx, n))),
      domain = constructPositiveCantorDomain(ctx, field, r, p([1n, 0n, 0n, 0n, 0n, 2n, 0n, 1n]), bounds), u = p([0n, 0n, 0n, 0n, 0n, 0n, 1n]), v = p([1n, 0n, 0n, 0n, 0n, 1n]);
    const limited = new ExecutionContext({...fresh().limits, degree: 7}), pair = limited.operation(() => constructPositiveMumfordPairWithin(limited, domain, u, v, bounds));
    limited.operation(() => verifyPositiveMumfordPairWithin(limited, domain, pair, bounds)); expect(r.degree(ctx, pair.normQuotient)).toBe(4);
  });
  it('rejects altered constructions, norms, binary coverage, signs, flags and foreign owners', () => {
    const b = prepared(), proof = multiplyPositiveMumfordPair(fresh(), b.domain, b.point, 3n, bounds), wire = encodePositiveCantorMultiple(fresh(), b.domain, b.point, 3n, proof, bounds) as {tag: string; version: number; payload: unknown};
    for (const mutate of [
      (body: Record<string, unknown>) => {(body.construction as Record<string, unknown>).characteristic = '7';},
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).steps = [];},
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).coefficient = '-3';},
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).verified = true;}
    ]) {
      const body = structuredClone(unpackAlgebraicArtifactData(fresh(), wire.payload, bounds)) as Record<string, unknown>; mutate(body);
      expect(() => decodePositiveCantorMultiple(fresh(), b.domain, b.point, 3n, {...wire, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();
    }
    expect(() => verifyPositiveMumfordMultiple(fresh(), b.domain, b.point, 3n, {...proof, result: b.point}, bounds)).toThrow('verification-failed');
    expect(() => decodePositiveCantorMultiple(fresh(), b.domain, b.point, 2n, wire, bounds)).toThrow('verification-failed');
    expect(() => constructPositiveMumfordPair(fresh(), {...b.domain}, b.point.u, b.point.v, bounds)).toThrow('domain-mismatch');
    const other = new PositivePrimeField(b.ctx, 5n), foreign = new PositivePolynomialRing(other, 'x');
    expect(() => constructPositiveMumfordPair(fresh(), b.domain, foreign.x(b.ctx), foreign.one(b.ctx), bounds)).toThrow('domain-mismatch');
  });
  it('preserves characteristic guards, fresh scopes, immutable values and sticky exhaustion', () => {
    const b = prepared(), proof = multiplyPositiveMumfordPair(fresh(), b.domain, b.point, 3n, bounds), wire = encodePositiveCantorMultiple(fresh(), b.domain, b.point, 3n, proof, bounds), ctx = fresh();
    decodePositiveCantorMultiple(ctx, b.domain, b.point, 3n, wire, bounds); const first = ctx.usage.work;
    decodePositiveCantorMultiple(ctx, b.domain, b.point, 3n, wire, bounds); expect(ctx.usage.work).toBe(2 * first);
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodePositiveCantorMultiple(fresh(), b.domain, b.point, 3n, wire, {...bounds, ...patch})).toThrow('resource-limit');
    const two = new PositivePrimeField(b.ctx, 2n), r = new PositivePolynomialRing(two, 'x'); expect(() => constructPositiveCantorDomain(fresh(), two, r, r.make(b.ctx, [two.fromInteger(b.ctx, 1n), two.fromInteger(b.ctx, 1n)]), bounds)).toThrow('domain-mismatch');
    expect(Object.isFrozen(proof.steps) && Object.isFrozen(b.point.u.coefficients)).toBe(true);
    const stopped = new ExecutionContext({...fresh().limits, work: 1}); expect(() => verifyPositiveMumfordMultiple(stopped, b.domain, b.point, 3n, proof, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
  });
});
