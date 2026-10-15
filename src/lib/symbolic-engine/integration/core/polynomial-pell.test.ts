import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {ExecutionContext} from './execution';
import {rationalField as Q} from './field';
import {rational} from './rational';
import {PolynomialRing} from './polynomial';
import {constructAlgebraicExtension} from './algebraic-field';
import {polynomialDivide} from './polynomial-division';
import * as pell from './polynomial-pell';

const order29 = [0n, -16n, 33n, -12n, 6n, 4n, 1n];
describe('complete bounded polynomial Pell evidence', () => {
  it('constructs the sourced degree-29 unit and independently recovers its logarithmic numerator', () => {
    const ctx = fresh(), r = new PolynomialRing(Q, 'x'), h = r.make(ctx, order29.map(n => rational(ctx, n))), proof = pell.solvePolynomialPell(ctx, r, h, 29n, bounds);
    expect(proof.kind).toBe('unit'); expect(proof.leastDegree).toBe(29n);
    expect(r.degree(ctx, proof.denominator!)).toBe(26);
    const expected = r.make(ctx, [-3n, 18n, 29n].map(n => rational(ctx, n))), quotient = polynomialDivide(ctx, r, r.derivative(ctx, proof.numerator!), proof.denominator!);
    expect(r.isZero(ctx, quotient.remainder)).toBe(true); expect(r.equal(ctx, quotient.quotient, expected)).toBe(true);
    expect(Object.isFrozen(proof) && Object.isFrozen(proof.steps)).toBe(true);
    const spy = vi.spyOn(pell, 'solvePolynomialPellWithin').mockImplementation(() => {throw Error('producer disabled');});
    try {pell.verifyPolynomialPell(fresh(), r, h, 29n, proof, bounds);} finally {spy.mockRestore();}
  });
  it('proves complete bounded absence through degree 28 without making a non-torsion claim', () => {
    const ctx = fresh(), r = new PolynomialRing(Q, 'x'), h = r.make(ctx, order29.map(n => rational(ctx, n))), proof = pell.solvePolynomialPell(ctx, r, h, 28n, bounds);
    expect(proof.kind).toBe('bounded-empty'); expect(proof.numerator).toBeNull(); expect(proof.steps.at(-1)!.numerator).toBeNull();
    pell.verifyPolynomialPell(fresh(), r, h, 28n, proof, bounds);
    expect(() => pell.verifyPolynomialPell(fresh(), r, h, 29n, proof, bounds)).toThrow('verification-failed');
  });
  it('retains actual constant norms and number-field coefficients without taking constant roots', () => {
    const ctx = fresh(), defining = new PolynomialRing(Q, 'a'), c = constructAlgebraicExtension(ctx, defining, defining.make(ctx, [-2n, 0n, 1n].map(n => rational(ctx, n))), bounds);
    const r = new PolynomialRing(c, 't'), alpha = c.generator(ctx), h = r.make(ctx, [alpha, c.fromInteger(ctx, 0n), c.fromInteger(ctx, 1n)]);
    const proof = pell.solvePolynomialPell(ctx, r, h, 1n, bounds); expect(proof.kind).toBe('unit'); expect(proof.leastDegree).toBe(1n);
    expect(c.equal(ctx, proof.norm!, c.negate(ctx, alpha))).toBe(true); pell.verifyPolynomialPell(fresh(), r, h, 1n, proof, bounds);
    const empty = pell.solvePolynomialPell(fresh(), r, h, 0n, bounds); expect(empty.kind).toBe('bounded-empty'); expect(empty.steps).toHaveLength(0);
  });
  it('rejects changed root parts, signs, transitions, missing prefix coverage and wrong unit mappings', () => {
    const ctx = fresh(), r = new PolynomialRing(Q, 'x'), h = r.make(ctx, order29.map(n => rational(ctx, n))), proof = pell.solvePolynomialPell(ctx, r, h, 29n, bounds);
    const mutations = [{...proof, polynomialPart: r.one(ctx)}, {...proof, leastDegree: 28n}, {...proof, numerator: proof.denominator}, {...proof, steps: proof.steps.slice(1)},
      {...proof, steps: proof.steps.map((s, i) => i ? s : {...s, nextOffset: r.one(ctx)})}, {...proof, steps: proof.steps.map((s, i) => i ? s : {...s, norm: r.negate(ctx, s.norm!)})}];
    for (const changed of mutations) expect(() => pell.verifyPolynomialPell(fresh(), r, h, 29n, changed, bounds)).toThrow('verification-failed');
    const empty = pell.solvePolynomialPell(ctx, r, h, 28n, bounds);
    expect(() => pell.verifyPolynomialPell(fresh(), r, h, 28n, {...empty, steps: empty.steps.slice(0, -1)}, bounds)).toThrow('verification-failed');
  });
  it('keeps unsupported shapes, ownership, fresh state and exhaustion distinct', () => {
    const ctx = fresh(), r = new PolynomialRing(Q, 'x'), make = (ns: bigint[]) => r.make(ctx, ns.map(n => rational(ctx, n)));
    for (const ns of [[1n], [1n, 1n], [1n, 0n, 2n], [1n, 2n, 1n]]) expect(() => pell.solvePolynomialPell(fresh(), r, make(ns), 3n, bounds)).toThrow('invalid-input');
    const h = make(order29), foreign = new PolynomialRing(Q, 'x');
    expect(() => pell.solvePolynomialPell(fresh(), foreign, h, 29n, bounds)).toThrow('domain-mismatch');
    const proof = pell.solvePolynomialPell(fresh(), r, h, 29n, bounds), cold = fresh();
    pell.verifyPolynomialPell(cold, r, h, 29n, proof, bounds); const first = cold.usage.work; pell.verifyPolynomialPell(cold, r, h, 29n, proof, bounds); expect(cold.usage.work).toBe(2 * first);
    for (const patch of [{work: 1}, {allocation: 1}, {degree: 5}]) {
      const limited = new ExecutionContext({...fresh().limits, ...patch}); expect(() => pell.solvePolynomialPell(limited, r, h, 29n, bounds)).toThrow('resource-limit'); expect(() => limited.tick()).toThrow('resource-limit');
    }
  });
});
