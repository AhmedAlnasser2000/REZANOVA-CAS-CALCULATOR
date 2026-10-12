import { describe, expect, it, vi } from 'vitest';
import { rationalField as Q } from './field';
import { PolynomialRing } from './polynomial';
import * as module from './polynomial-module';
import { fresh } from './__tests__/algebraic-support';

describe('complete polynomial modules', () => {
  it.each([0, 1, 2, 3, 4])('replays seeded unimodular Hermite forms %s', seed => {
    const c = fresh(), r = new PolynomialRing(Q, 'x'), p = (cs: number[]) => r.make(c, cs.map(n => Q.fromInteger(c, BigInt(n))));
    const a = [[p([seed, 1]), p([1])], [p([1, 2, 1]), p([seed + 2, 1])], [p([0]), p([0])]];
    const proof = module.polynomialModuleHermite(c, r, a, 2);
    module.verifyPolynomialModuleHermite(fresh(), r, a, 2, proof);
    expect(proof.pivots).toEqual([0, 1]); expect(Object.isFrozen(proof.transformation[0])).toBe(true);
    expect(module.polynomialModuleCoordinates(c, r, proof, a[0])).not.toBe(null);
    const bad = {...proof, transformation: proof.transformation.slice(1)};
    expect(() => module.verifyPolynomialModuleHermite(fresh(), r, a, 2, bad)).toThrow();
  });
  it('preserves saturation and all polynomial kernel directions', () => {
    const c = fresh(), r = new PolynomialRing(Q, 'x'), x = r.make(c, [Q.fromInteger(c, 0n), Q.fromInteger(c, 1n)]);
    const input = [[x], [r.multiply(c, x, x)], [r.zero(c)]], proof = module.polynomialModuleHermite(c, r, input, 1);
    expect(proof.pivots.length).toBe(1); expect(module.polynomialModuleCoordinates(c, r, proof, [r.one(c)])).toBe(null);
    for (const v of proof.transformation.slice(1)) {
      let sum = r.zero(c); for (let i = 0; i < v.length; i++) sum = r.add(c, sum, r.multiply(c, v[i], input[i][0]));
      expect(r.isZero(c, sum)).toBe(true);
    }
    const spy = vi.spyOn(module, 'polynomialModuleHermite').mockImplementation(() => { throw Error('producer disabled'); });
    try { module.verifyPolynomialModuleHermite(fresh(), r, input, 1, proof); } finally { spy.mockRestore(); }
  });
  it('covers zero rows and zero columns', () => {
    const c = fresh(), r = new PolynomialRing(Q, 'x');
    expect(module.polynomialModuleHermite(c, r, [], 3).pivots).toEqual([]);
    const p = module.polynomialModuleHermite(c, r, [[], []], 0);
    expect(p.transformation.length).toBe(2); expect(p.pivots).toEqual([]);
  });
});
