import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {PositivePrimeField} from './positive-field';
import {PositivePolynomialRing} from './positive-polynomial';
import {PositiveFiniteExtension, finiteIrreducibility} from './positive-extension';
import {positiveCantorArithmetic} from './positive-cantor';
import {equalBalancedDivisors, neutralBalancedDivisor} from './balanced-cantor-arithmetic';
import {constructPositiveBalancedDomain, constructPositiveBalancedDivisor, multiplyPositiveBalancedDivisor, verifyPositiveBalancedMultiple} from './positive-balanced-cantor';
import {encodePositiveBalancedMultiple, decodePositiveBalancedMultiple} from './positive-balanced-wire';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import * as group from './positive-balanced-cantor';
import * as arithmetic from './balanced-cantor-arithmetic';
import * as polynomial from './positive-polynomial';
import * as model from './balanced-cantor-model';
import * as extension from './positive-extension';

function prepared(prime = 7n) {
  const ctx = fresh(), field = new PositivePrimeField(ctx, prime), r = new PositivePolynomialRing(field, 'x'), p = (values: readonly bigint[]) => r.make(ctx, values.map(n => field.fromInteger(ctx, n)));
  const domain = constructPositiveBalancedDomain(ctx, field, r, p([0n, -16n, 33n, -12n, 6n, 4n, 1n]), field.fromInteger(ctx, 1n), bounds);
  const input = constructPositiveBalancedDivisor(ctx, domain, r.one(ctx), r.zero(ctx), 2n, bounds);
  return {ctx, field, r, p, domain, input};
}
describe('separate finite split-even balanced arithmetic and replay', () => {
  it.each([7n, 11n])('checks the order-29 reduction in characteristic %s with producers disabled', prime => {
    const b = prepared(prime), proof = multiplyPositiveBalancedDivisor(fresh(), b.domain, b.input, 29n, bounds);
    expect(equalBalancedDivisors(b.ctx, positiveCantorArithmetic(b.r), proof.result, neutralBalancedDivisor(b.ctx, positiveCantorArithmetic(b.r), b.domain))).toBe(true);
    expect(equalBalancedDivisors(b.ctx, positiveCantorArithmetic(b.r), b.input, proof.result)).toBe(false);
    const data = JSON.parse(JSON.stringify(encodePositiveBalancedMultiple(fresh(), b.domain, b.input, 29n, proof, bounds)));
    const spies = [vi.spyOn(group, 'constructPositiveBalancedDomain'), vi.spyOn(group, 'multiplyPositiveBalancedDivisorWithin'), vi.spyOn(arithmetic, 'normalizeBalancedDivisor'),
      vi.spyOn(arithmetic, 'addBalancedDivisors'), vi.spyOn(arithmetic, 'inverseBalancedDivisor'), vi.spyOn(model, 'constructBalancedInfinity'), vi.spyOn(polynomial, 'positiveBezout'), vi.spyOn(extension, 'finiteIrreducibility')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {verifyPositiveBalancedMultiple(fresh(), b.domain, b.input, 29n, proof, bounds); expect(decodePositiveBalancedMultiple(fresh(), b.domain, b.input, 29n, data, bounds).result.n).toBe(proof.result.n);}
    finally {for (const spy of spies) spy.mockRestore();}
  });
  it('supports extension-field split leading roots and signed arithmetic', () => {
    const ctx = fresh(), prime = new PositivePrimeField(ctx, 3n), ar = new PositivePolynomialRing(prime, 'a'), modulus = ar.make(ctx, [1n, 0n, 1n].map(n => prime.fromInteger(ctx, n)));
    const field = new PositiveFiniteExtension(ctx, prime, ar, modulus, finiteIrreducibility(ctx, ar, modulus, prime.size)), r = new PositivePolynomialRing(field, 'x');
    const h = r.make(ctx, [2n, 0n, 0n, 0n, 2n].map(n => field.fromInteger(ctx, n))), domain = constructPositiveBalancedDomain(ctx, field, r, h, field.generator(ctx), bounds);
    const input = constructPositiveBalancedDivisor(ctx, domain, r.x(ctx), r.constant(ctx, field.generator(ctx)), 0n, bounds), proof = multiplyPositiveBalancedDivisor(fresh(), domain, input, -2n, bounds);
    expect(equalBalancedDivisors(ctx, positiveCantorArithmetic(r), proof.result, neutralBalancedDivisor(ctx, positiveCantorArithmetic(r), domain))).toBe(true);
    const data = encodePositiveBalancedMultiple(fresh(), domain, input, -2n, proof, bounds);
    const spy = vi.spyOn(extension, 'finiteIrreducibility').mockImplementation(() => {throw Error('producer disabled');});
    try {expect(decodePositiveBalancedMultiple(fresh(), domain, input, -2n, data, bounds).coefficient).toBe(-2n);} finally {spy.mockRestore();}
  });
  it('rejects bad characteristics, nonsplit/singular models, wrong requests and altered artifacts', () => {
    const b = prepared(), proof = multiplyPositiveBalancedDivisor(fresh(), b.domain, b.input, 29n, bounds), data = encodePositiveBalancedMultiple(fresh(), b.domain, b.input, 29n, proof, bounds) as {tag: string; version: number; payload: unknown};
    expect(() => constructPositiveBalancedDivisor(fresh(), {...b.domain}, b.r.one(b.ctx), b.r.zero(b.ctx), 0n, bounds)).toThrow('domain-mismatch');
    for (const mutate of [
      (body: Record<string, unknown>) => {(body.construction as Record<string, unknown>).characteristic = '11';},
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).steps = [];},
      (body: Record<string, unknown>) => {body.plus = body.minus;},
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).verified = true;}
    ]) {
      const body = structuredClone(unpackAlgebraicArtifactData(fresh(), data.payload, bounds)) as Record<string, unknown>; mutate(body);
      expect(() => decodePositiveBalancedMultiple(fresh(), b.domain, b.input, 29n, {...data, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();
    }
    expect(() => decodePositiveBalancedMultiple(fresh(), b.domain, b.input, 28n, data, bounds)).toThrow('verification-failed');
    const two = new PositivePrimeField(b.ctx, 2n), ring = new PositivePolynomialRing(two, 'x');
    expect(() => constructPositiveBalancedDomain(fresh(), two, ring, ring.make(b.ctx, [1n, 1n, 1n].map(n => two.fromInteger(b.ctx, n))), two.fromInteger(b.ctx, 1n), bounds)).toThrow('domain-mismatch');
    expect(() => constructPositiveBalancedDomain(fresh(), b.field, b.r, b.p([0n, 0n, 0n, 0n, 1n]), b.field.fromInteger(b.ctx, 1n), bounds)).toThrow('invalid-input');
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodePositiveBalancedMultiple(fresh(), b.domain, b.input, 29n, data, {...bounds, ...patch})).toThrow('resource-limit');
  });
});
