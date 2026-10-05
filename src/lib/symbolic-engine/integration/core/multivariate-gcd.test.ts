import { describe, expect, it } from 'vitest';
import { context } from './test-support';
import { rational, rationalEqual } from './rational';
import { rationalField } from './field';
import { MultivariateRing } from './multivariate-polynomial';
import { multivariateGcd, verifyMultivariateGcd } from './multivariate-gcd';

function fixture(arity = 2) {
  const ctx = context({work: 20_000_000, allocation: 1_000_000_000});
  const ring = MultivariateRing.create(ctx, rationalField, arity);
  const p = (terms: [number, ...number[]][]) => ring.make(ctx, terms.map(([c, ...powers]) => ({powers, coefficient: rational(ctx, c)})));
  return {ctx, ring, p};
}
describe('checked recursive multivariate GCD', () => {
  it('finds an expanded common factor across two independent variables', () => {
    const {ctx, ring, p} = fixture();
    const a = p([[1, 2, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]]), b = p([[1, 1, 0], [1, 0, 1]]);
    const proof = multivariateGcd(ctx, ring, a, b);
    expect(ring.equal(ctx, proof.gcd, b)).toBe(true);
    expect(ring.equal(ctx, proof.left, p([[1, 1, 0], [1, 0, 0]]))).toBe(true);
    verifyMultivariateGcd(ctx, ring, a, b, proof);
  });
  it('includes nontrivial recursive coefficient content', () => {
    const {ctx, ring, p} = fixture();
    const common = p([[1, 0, 1], [1, 0, 0]]);
    const a = ring.multiply(ctx, common, p([[1, 1, 0], [1, 0, 0]]));
    const b = ring.multiply(ctx, common, p([[1, 1, 0], [2, 0, 0]]));
    expect(ring.equal(ctx, multivariateGcd(ctx, ring, a, b).gcd, common)).toBe(true);
  });
  it('discovers factors involving three variables', () => {
    const {ctx, ring, p} = fixture(3);
    const common = p([[1, 1, 0, 0], [1, 0, 1, 0], [1, 0, 0, 1]]);
    const a = ring.multiply(ctx, common, p([[1, 1, 0, 0], [1, 0, 0, 0]]));
    const b = ring.multiply(ctx, common, p([[1, 0, 1, 0], [2, 0, 0, 0]]));
    expect(ring.equal(ctx, multivariateGcd(ctx, ring, a, b).gcd, common)).toBe(true);
  });
  it.each([0, 1, 2])('handles zero operands at arity %i', arity => {
    const {ctx, ring} = fixture(arity), zero = ring.zero(ctx), c = ring.constant(ctx, rational(ctx, -3));
    expect(ring.isZero(ctx, multivariateGcd(ctx, ring, zero, zero).gcd)).toBe(true);
    expect(ring.equal(ctx, multivariateGcd(ctx, ring, zero, c).gcd, ring.one(ctx))).toBe(true);
    expect(ring.equal(ctx, multivariateGcd(ctx, ring, c, zero).gcd, ring.one(ctx))).toBe(true);
  });
  it('normalizes nonmonic coefficients and keeps immutable operands', () => {
    const {ctx, ring, p} = fixture(); const a = p([[6, 2, 0], [-6, 0, 2]]), b = p([[-4, 1, 0], [-4, 0, 1]]);
    const before = a.terms;
    expect(ring.equal(ctx, multivariateGcd(ctx, ring, a, b).gcd, p([[1, 1, 0], [1, 0, 1]]))).toBe(true);
    expect(a.terms).toBe(before); expect(Object.isFrozen(a.terms[0].powers)).toBe(true);
    expect(rationalEqual(ctx, a.terms[0].coefficient, rational(ctx, 6))).toBe(true);
  });
  it('handles abnormal drops and swapped inputs', () => {
    const {ctx, ring, p} = fixture(); const a = p([[1, 4, 0], [-1, 0, 4]]), b = p([[1, 2, 0], [-1, 0, 2]]);
    expect(ring.equal(ctx, multivariateGcd(ctx, ring, a, b).gcd, b)).toBe(true);
    expect(ring.equal(ctx, multivariateGcd(ctx, ring, b, a).gcd, b)).toBe(true);
  });
  it('checks seeded products against independently coprime linear cofactors', () => {
    const {ctx, ring, p} = fixture(); let seed = 31;
    for (let i = 0; i < 8; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0; const c = seed % 7 + 1;
      const common = p([[1, 1, 0], [c, 0, 1], [1, 0, 0]]);
      const a = ring.multiply(ctx, common, p([[1, 1, 0], [c, 0, 0]]));
      const b = ring.multiply(ctx, common, p([[1, 1, 0], [c + 1, 0, 0]]));
      expect(ring.equal(ctx, multivariateGcd(ctx, ring, a, b).gcd, common)).toBe(true);
    }
  });
  it('rejects mutated pseudo, content and Bezout evidence', () => {
    const {ctx, ring, p} = fixture(); const a = p([[1, 2, 0], [1, 0, 1]]), b = p([[1, 1, 0], [1, 0, 1]]);
    const proof = multivariateGcd(ctx, ring, a, b);
    if (proof.kind !== 'recursive') throw Error('fixture');
    expect(() => verifyMultivariateGcd(ctx, ring, a, b, {...proof, s: ring.zero(ctx), t: ring.zero(ctx)})).toThrow('Bezout');
    expect(() => verifyMultivariateGcd(ctx, ring, a, b, {...proof, steps: []})).toThrow('PRS');
    expect(() => verifyMultivariateGcd(ctx, ring, a, b, {...proof, a: {...proof.a, chain: []}})).toThrow('coverage');
    const steps = [...proof.steps]; steps[0] = {...steps[0], division: {...steps[0].division, multiplier: ring.lower!.zero(ctx)}};
    expect(() => verifyMultivariateGcd(ctx, ring, a, b, {...proof, steps})).toThrow('multiplier');
  });
  it('rejects foreign owners, forged values and nonexact division', () => {
    const {ctx, ring, p} = fixture(), other = MultivariateRing.create(ctx, rationalField, 2);
    expect(() => ring.assert(ctx, other.one(ctx))).toThrow('domain-mismatch');
    expect(() => ring.assert(ctx, {...ring.one(ctx)})).toThrow('domain-mismatch');
    expect(() => ring.exactDivide(ctx, p([[1, 1, 0]]), p([[1, 1, 0], [1, 0, 0]]))).toThrow('nonexact-division');
  });
  it('checks fresh stricter contexts and sticky resource exhaustion', () => {
    const {ctx, ring, p} = fixture(), a = p([[1, 2, 0], [1, 0, 0]]), b = p([[1, 1, 0]]);
    const proof = multivariateGcd(ctx, ring, a, b);
    const strict = context({degree: 1}); expect(() => verifyMultivariateGcd(strict, ring, a, b, proof)).toThrow('degree');
    expect(() => ring.one(strict)).toThrow('degree');
    expect(() => multivariateGcd(context({allocation: 0}), ring, a, b)).toThrow('allocation');
    expect(() => verifyMultivariateGcd(context({work: 1}), ring, a, b, proof)).toThrow('work');
  });
});
