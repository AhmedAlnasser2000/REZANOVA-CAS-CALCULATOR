import {it, expect} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {PolynomialRing} from './polynomial';
import {rationalField as Q} from './field';
import {PositivePrimeField} from './positive-field';
import {PositivePolynomialRing} from './positive-polynomial';
import {solvePolynomialPell, verifyPolynomialPellWithin} from './polynomial-pell';
import {solvePositivePell, verifyPositivePellWithin} from './positive-pell';

it('reuses exact Pell obligations only inside one operation without trusting failed or changed evidence', () => {
  const setup = fresh(), r = new PolynomialRing(Q, 'x'), h = r.make(setup, [1n, 0n, 0n, 0n, 1n].map(n => Q.fromInteger(setup, n))), proof = solvePolynomialPell(setup, r, h, 2n, bounds), ctx = fresh();
  const run = () => ctx.operation(() => {
    const before = ctx.usage.work; verifyPolynomialPellWithin(ctx, r, h, 2n, proof, bounds); const cold = ctx.usage.work - before, next = ctx.usage.work;
    verifyPolynomialPellWithin(ctx, r, h, 2n, proof, bounds); expect(ctx.usage.work - next).toBeLessThan(cold);
    expect(() => verifyPolynomialPellWithin(ctx, r, h, 3n, proof, bounds)).toThrow('verification-failed');
    expect(() => verifyPolynomialPellWithin(ctx, r, h, 2n, {...proof, norm: Q.fromInteger(setup, 0n)}, bounds)).toThrow('verification-failed');
    verifyPolynomialPellWithin(ctx, r, h, 2n, proof, bounds); return cold;
  });
  const first = run(); expect(run()).toBe(first);
});
it('keeps finite-field construction and Pell reuse exact-owner-bound, cold and charged', () => {
  const setup = fresh(), field = new PositivePrimeField(setup, 101n), r = new PositivePolynomialRing(field, 'x'), h = r.make(setup, [1n, 0n, 0n, 0n, 1n].map(n => field.fromInteger(setup, n))), proof = solvePositivePell(setup, field, r, h, 2n, bounds), ctx = fresh();
  ctx.operation(() => {
    const before = ctx.usage.work; verifyPositivePellWithin(ctx, field, r, h, 2n, proof, bounds); const cold = ctx.usage.work - before, next = ctx.usage.work;
    verifyPositivePellWithin(ctx, field, r, h, 2n, proof, bounds); const warm = ctx.usage.work - next; expect(warm).toBeLessThan(cold);
    expect(() => verifyPositivePellWithin(ctx, field, r, h, 1n, proof, bounds)).toThrow('verification-failed');
    const other = new PositivePrimeField(setup, 101n); expect(() => verifyPositivePellWithin(ctx, other, r, h, 2n, proof, bounds)).toThrow('domain-mismatch');
    expect(() => verifyPositivePellWithin(ctx, field, r, h, 2n, {...proof, steps: []}, bounds)).toThrow('verification-failed');
    const beforeDifferent = ctx.usage.work; verifyPositivePellWithin(ctx, field, r, h, 2n, proof, Object.freeze({...bounds})); expect(ctx.usage.work - beforeDifferent).toBeGreaterThan(warm);
  });
});
