import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {ExecutionContext} from './execution';
import {PositivePrimeField} from './positive-field';
import {PositivePolynomialRing} from './positive-polynomial';
import {PositiveFiniteExtension, finiteIrreducibility} from './positive-extension';
import {solvePositivePell, verifyPositivePell} from './positive-pell';
import {encodePositivePell, decodePositivePell} from './positive-pell-wire';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import * as pell from './positive-pell';
import * as arithmetic from './positive-polynomial';
import * as extension from './positive-extension';
import * as factor from './positive-factorization';

const ns = [0n, -16n, 33n, -12n, 6n, 4n, 1n];
describe('bounded finite-field Pell with separate owners', () => {
  it.each([28n, 29n])('checks and replays degree bound %s without finite search producers', bound => {
    const ctx = fresh(), field = new PositivePrimeField(ctx, 101n), r = new PositivePolynomialRing(field, 'x'), h = r.make(ctx, ns.map(n => field.fromInteger(ctx, n))), proof = solvePositivePell(ctx, field, r, h, bound, bounds);
    expect(proof.kind).toBe(bound === 29n ? 'unit' : 'bounded-empty'); expect(proof.leastDegree).toBe(bound === 29n ? 29n : null);
    const wire = JSON.parse(JSON.stringify(encodePositivePell(fresh(), field, r, h, bound, proof, bounds))), spies = [vi.spyOn(pell, 'solvePositivePellWithin'), vi.spyOn(arithmetic, 'positiveBezout'), vi.spyOn(extension, 'finiteIrreducibility'), vi.spyOn(factor, 'factorPositivePolynomial')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {verifyPositivePell(fresh(), field, r, h, bound, proof, bounds); const result = decodePositivePell(fresh(), field, r, h, bound, wire, bounds); expect(result.kind).toBe(proof.kind); expect(Object.isFrozen(result.steps)).toBe(true);}
    finally {for (const spy of spies) spy.mockRestore();}
  });
  it('reconstructs finite-extension evidence and retains its actual constant norm', () => {
    const ctx = fresh(), p = new PositivePrimeField(ctx, 3n), a = new PositivePolynomialRing(p, 'a'), modulus = a.make(ctx, [1n, 0n, 1n].map(n => p.fromInteger(ctx, n))), field = new PositiveFiniteExtension(ctx, p, a, modulus, finiteIrreducibility(ctx, a, modulus, p.size));
    const r = new PositivePolynomialRing(field, 't'), h = r.make(ctx, [field.generator(ctx), field.fromInteger(ctx, 0n), field.fromInteger(ctx, 1n)]), proof = solvePositivePell(ctx, field, r, h, 1n, bounds);
    expect(proof.kind).toBe('unit'); expect(field.equal(ctx, proof.norm!, field.negate(ctx, field.generator(ctx)))).toBe(true);
    const wire = JSON.parse(JSON.stringify(encodePositivePell(fresh(), field, r, h, 1n, proof, bounds))), spies = [vi.spyOn(pell, 'solvePositivePellWithin'), vi.spyOn(extension, 'finiteIrreducibility'), vi.spyOn(factor, 'factorPositivePolynomial')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {const result = decodePositivePell(fresh(), field, r, h, 1n, wire, bounds); expect(field.equal(ctx, result.norm!, proof.norm!)).toBe(true);}
    finally {for (const spy of spies) spy.mockRestore();}
  });
  it('rejects altered primes, norms, coverage, indices and trusted flags', () => {
    const ctx = fresh(), field = new PositivePrimeField(ctx, 101n), r = new PositivePolynomialRing(field, 'x'), h = r.make(ctx, ns.map(n => field.fromInteger(ctx, n))), proof = solvePositivePell(ctx, field, r, h, 29n, bounds);
    const wire = encodePositivePell(fresh(), field, r, h, 29n, proof, bounds) as {tag: string; version: number; payload: unknown};
    for (const mutation of [
      (body: Record<string, unknown>) => {(body.construction as Record<string, unknown>).characteristic = '103';},
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).steps = [];},
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).leastDegree = '28';},
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).norm = '0101';},
      (body: Record<string, unknown>) => {(body.evidence as Record<string, unknown>).verified = true;}
    ]) {
      const body = structuredClone(unpackAlgebraicArtifactData(fresh(), wire.payload, bounds)) as Record<string, unknown>; mutation(body);
      expect(() => decodePositivePell(fresh(), field, r, h, 29n, {...wire, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();
    }
    expect(() => decodePositivePell(fresh(), field, r, h, 28n, wire, bounds)).toThrow('verification-failed');
    const other = new PositivePrimeField(ctx, 103n); expect(() => decodePositivePell(fresh(), other, new PositivePolynomialRing(other, 'x'), h, 29n, wire, bounds)).toThrow('domain-mismatch');
    expect(() => verifyPositivePell(fresh(), field, r, h, 29n, {...proof, norm: field.fromInteger(ctx, 0n)}, bounds)).toThrow('verification-failed');
  });
  it('keeps malformed shapes, characteristic two, fresh scopes and exhaustion explicit', () => {
    const ctx = fresh(), field = new PositivePrimeField(ctx, 101n), r = new PositivePolynomialRing(field, 'x'), h = r.make(ctx, ns.map(n => field.fromInteger(ctx, n))), proof = solvePositivePell(ctx, field, r, h, 29n, bounds), data = encodePositivePell(fresh(), field, r, h, 29n, proof, bounds);
    for (const cs of [[1n], [1n, 1n], [1n, 2n, 1n]]) expect(() => solvePositivePell(fresh(), field, r, r.make(ctx, cs.map(n => field.fromInteger(ctx, n))), 3n, bounds)).toThrow('invalid-input');
    const p2 = new PositivePrimeField(ctx, 2n), r2 = new PositivePolynomialRing(p2, 'x'); expect(() => solvePositivePell(fresh(), p2, r2, r2.make(ctx, [1n, 1n, 1n].map(n => p2.fromInteger(ctx, n))), 3n, bounds)).toThrow('domain-mismatch');
    const cold = fresh(); decodePositivePell(cold, field, r, h, 29n, data, bounds); const first = cold.usage.work; decodePositivePell(cold, field, r, h, 29n, data, bounds); expect(cold.usage.work).toBe(2 * first);
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodePositivePell(fresh(), field, r, h, 29n, data, {...bounds, ...patch})).toThrow('resource-limit');
    const stopped = new ExecutionContext({...fresh().limits, degree: 5}); expect(() => decodePositivePell(stopped, field, r, h, 29n, data, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
  });
});
