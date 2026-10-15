import {describe, expect, it, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {ExecutionContext} from './execution';
import {rationalField as Q} from './field';
import {rational} from './rational';
import {PolynomialRing} from './polynomial';
import {constructAlgebraicExtension} from './algebraic-field';
import {FactorPrimeField} from './factorization-modular';
import {NumberFieldModularRing} from './number-field-modular-ring';
import {numberFieldModularDescriptor, numberFieldModularImage} from './number-field-modular-image';
import {modularRationalReconstruction} from './modular-rational-reconstruction';
import * as search from './rational-gcd-evidence';
import * as gcd from './number-field-modular-gcd';

function quadratic() {
  const ctx = fresh(), a = new PolynomialRing(Q, 'alpha');
  const owner = constructAlgebraicExtension(ctx, a, a.make(ctx, [-2n, 0n, 1n].map(n => rational(ctx, n))), bounds);
  return {ctx, owner, ring: new PolynomialRing<ReturnType<typeof owner.generator>>(owner, 'z'), alpha: owner.generator(ctx)};
}
describe('checked number-field modular quotient rings', () => {
  it('checks units in reducible and nonreduced quotients without granting field authority', () => {
    for (const p of [7n, 2n]) {
      const ctx = fresh(), field = new FactorPrimeField(ctx, p), ring = new NumberFieldModularRing(ctx, field, field.make(ctx, [-2n, 0n, 1n]));
      expect(ring.capability).toBe('ring');
      expect(ring.inverse(ctx, ring.make(ctx, p === 7n ? [-3n, 1n] : [0n, 1n]))).toBeNull();
      const unit = ring.make(ctx, [1n, 1n]), inverse = ring.inverse(ctx, unit);
      expect(inverse).not.toBeNull(); expect(ring.equal(ctx, ring.multiply(ctx, unit, inverse!), ring.one(ctx))).toBe(true);
      const foreign = new NumberFieldModularRing(ctx, field, ring.modulus);
      expect(() => ring.add(ctx, unit, foreign.one(ctx))).toThrow('domain-mismatch');
      expect(() => ring.inverse(ctx, {...unit})).toThrow('domain-mismatch');
    }
  });
  it('reduces recursive tensor coordinates in the supplied generator order', () => {
    const {ctx, owner, alpha} = quadratic(), b = new PolynomialRing(owner, 'beta');
    const nested = constructAlgebraicExtension(ctx, b, b.make(ctx, [-3n, 0n, 1n].map(n => owner.fromInteger(ctx, n))), bounds);
    const value = nested.add(ctx, nested.embed(ctx, alpha), nested.generator(ctx));
    const descriptor = numberFieldModularDescriptor(ctx, nested), cs = descriptor.coordinates(ctx, value), image = numberFieldModularImage(ctx, descriptor, new FactorPrimeField(ctx, 17n));
    expect(nested.equal(ctx, value, descriptor.native(ctx, cs))).toBe(true); expect(image).not.toBeNull();
    const reduced = image!.fromCoordinates(ctx, cs), squared = image!.coefficients.multiply(ctx, reduced, reduced);
    expect(image!.coefficients.equal(ctx, squared, image!.fromCoordinates(ctx, descriptor.coordinates(ctx, nested.multiply(ctx, value, value))))).toBe(true);
    const inverse = image!.coefficients.inverse(ctx, reduced); expect(inverse).not.toBeNull();
    expect(image!.coefficients.equal(ctx, image!.coefficients.multiply(ctx, reduced, inverse), image!.coefficients.one(ctx))).toBe(true);
    expect(Object.isFrozen(cs)).toBe(true);
  });
  it('rejects lost denominators and checks canonical modular coordinates', () => {
    const {ctx, owner} = quadratic(), descriptor = numberFieldModularDescriptor(ctx, owner), image = numberFieldModularImage(ctx, descriptor, new FactorPrimeField(ctx, 2n))!;
    expect(image.fromCoordinates(ctx, [rational(ctx, 1n, 2n), rational(ctx, 0n)])).toBeNull();
    expect(() => image.bind(ctx, [2n, 0n])).toThrow('domain-mismatch');
    expect(() => image.bind(ctx, [0n])).toThrow('coverage');
  });
  it('checks full Bezout coverage without manufacturing larger-degree polynomials', () => {
    const ctx = new ExecutionContext({...fresh().limits, degree: 3}), field = new FactorPrimeField(ctx, 7n);
    const ring = new NumberFieldModularRing(ctx, field, field.make(ctx, [-2n, 0n, 1n]));
    const p = ring.polynomials, a = p.make(ctx, [1n, 1n, 0n, 1n].map(n => ring.make(ctx, [n])));
    const b = p.make(ctx, [2n, 0n, 0n, 1n].map(n => ring.make(ctx, [n]))), proof = p.bezout(ctx, a, b);
    expect(proof).not.toBeNull(); p.verifyBezout(ctx, a, b, proof!);
    expect(() => p.verifyBezout(ctx, a, b, {...proof!, s: p.make(ctx, [])})).toThrow('verification-failed');
    expect(() => p.make(ctx, [ring.one(ctx), ring.one(ctx), ring.one(ctx), ring.one(ctx), ring.one(ctx)])).toThrow('resource-limit');
  });
});
describe('exact rational reconstruction', () => {
  it('recovers signed fractions with checked unique bounds and rejects insufficient precision', () => {
    const ctx = fresh();
    expect(modularRationalReconstruction(ctx, 34n, 101n)).toEqual(rational(ctx, 1n, 3n));
    expect(modularRationalReconstruction(ctx, 67n, 101n)).toEqual(rational(ctx, -1n, 3n));
    expect(modularRationalReconstruction(ctx, 0n, 101n)).toEqual(rational(ctx, 0n));
    expect(modularRationalReconstruction(ctx, 1n, 2n)).toBeNull();
    expect(() => modularRationalReconstruction(ctx, 101n, 101n)).toThrow('invalid-input');
    for (let denominator = 1n; denominator <= 7n; denominator++) for (let numerator = -7n; numerator <= 7n; numerator++) {
      const field = new FactorPrimeField(ctx, 1009n), residue = field.times(ctx, field.residue(ctx, numerator), field.inverse(ctx, denominator));
      expect(modularRationalReconstruction(ctx, residue, field.modulus)).toEqual(rational(ctx, numerator, denominator));
    }
  });
});
describe('complete number-field modular GCD certificates', () => {
  it('discards unlucky reductions, reconstructs rational coordinates and checks without prime or GCD search', () => {
    const {ctx, owner, ring: r, alpha} = quadratic(), common = r.make(ctx, [owner.negate(ctx, alpha), owner.fromInteger(ctx, 1n)]);
    const a = r.multiply(ctx, common, r.make(ctx, [owner.fromInteger(ctx, 1n), owner.fromInteger(ctx, 1n)]));
    const b = r.multiply(ctx, common, r.make(ctx, [owner.fromInteger(ctx, 3n), owner.fromInteger(ctx, 1n)])), before = [...a.coefficients];
    const proof = gcd.produceNumberFieldModularGcd(fresh(), r, a, b, bounds);
    expect(r.equal(ctx, proof.gcd, common)).toBe(true); expect(proof.bound!.prime).toBeGreaterThan(2n);
    const searchSpy = vi.spyOn(search, 'rationalGcdPrimeFields').mockImplementation(() => {throw Error('prime search disabled');});
    const gcdSpy = vi.spyOn(gcd, 'produceNumberFieldModularGcdWithin').mockImplementation(() => {throw Error('GCD search disabled');});
    try {gcd.verifyNumberFieldModularGcd(fresh(), r, a, b, proof, bounds);} finally {searchSpy.mockRestore(); gcdSpy.mockRestore();}
    expect(a.coefficients).toEqual(before); expect(Object.isFrozen(proof) && Object.isFrozen(proof.bound!.gcd[0])).toBe(true);
    expect(() => gcd.verifyNumberFieldModularGcd(fresh(), r, b, a, proof, bounds)).toThrow('explicit inputs');
    expect(() => gcd.verifyNumberFieldModularGcd(fresh(), r, a, b, {...proof, bound: {...proof.bound!, prime: 9n}}, bounds)).toThrow('verification-failed');
    expect(() => gcd.verifyNumberFieldModularGcd(fresh(), r, a, b, {...proof, bound: {...proof.bound!, s: []}}, bounds)).toThrow('verification-failed');
    expect(() => gcd.verifyNumberFieldModularGcd(fresh(), r, a, b, {...proof, gcd: r.one(ctx)}, bounds)).toThrow('verification-failed');
  });
  it('preserves nonmonic units, fractional coefficients and nested number fields', () => {
    const {ctx, owner, alpha} = quadratic(), b = new PolynomialRing(owner, 'beta');
    const nested = constructAlgebraicExtension(ctx, b, b.make(ctx, [-3n, 0n, 1n].map(n => owner.fromInteger(ctx, n))), bounds), r = new PolynomialRing<ReturnType<typeof nested.generator>>(nested, 'Z');
    const coefficient = nested.exactDivide(ctx, nested.add(ctx, nested.embed(ctx, alpha), nested.generator(ctx)), nested.fromInteger(ctx, 35n));
    const common = r.make(ctx, [coefficient, nested.fromInteger(ctx, 1n)]);
    const a = r.scale(ctx, r.multiply(ctx, common, r.make(ctx, [nested.fromInteger(ctx, 1n), nested.fromInteger(ctx, 1n)])), nested.generator(ctx));
    const bInput = r.scale(ctx, r.multiply(ctx, common, r.make(ctx, [nested.fromInteger(ctx, -1n), nested.fromInteger(ctx, 1n)])), nested.embed(ctx, alpha));
    const proof = gcd.produceNumberFieldModularGcd(fresh(), r, a, bInput, bounds);
    expect(r.equal(ctx, proof.gcd, common)).toBe(true); gcd.verifyNumberFieldModularGcd(fresh(), r, a, bInput, proof, bounds);
    expect(() => gcd.verifyNumberFieldModularGcd(fresh(), r, a, bInput, {...proof, kind: 'trivial', bound: null}, bounds)).toThrow('applicability');
  });
  it('handles zero and constant inputs with complete coverage', () => {
    const {ctx, owner, ring: r, alpha} = quadratic(), p = r.make(ctx, [alpha, owner.fromInteger(ctx, 1n)]), zero = r.zero(ctx);
    for (const [a, b, expected] of [[zero, zero, zero], [zero, p, p], [p, zero, p], [p, r.constant(ctx, alpha), r.one(ctx)]] as const) {
      const proof = gcd.produceNumberFieldModularGcd(fresh(), r, a, b, bounds);
      expect(r.equal(ctx, proof.gcd, expected)).toBe(true); gcd.verifyNumberFieldModularGcd(fresh(), r, a, b, proof, bounds);
    }
  });
  it('preserves fresh scopes, foreign-owner rejection and sticky exhaustion', () => {
    const {ctx, owner, ring: r, alpha} = quadratic(), p = r.make(ctx, [alpha, owner.fromInteger(ctx, 1n)]);
    const foreign = quadratic(); expect(() => gcd.produceNumberFieldModularGcd(fresh(), r, p, foreign.ring.one(foreign.ctx), bounds)).toThrow('domain-mismatch');
    const cold = new ExecutionContext({...fresh().limits, allocation: 1});
    expect(() => gcd.produceNumberFieldModularGcd(cold, r, p, p, bounds)).toThrow('resource-limit'); expect(() => cold.tick()).toThrow('resource-limit');
    const proof = gcd.produceNumberFieldModularGcd(fresh(), r, p, p, bounds), verify = new ExecutionContext({...fresh().limits, work: 1});
    expect(() => gcd.verifyNumberFieldModularGcd(verify, r, p, p, proof, bounds)).toThrow('resource-limit');
    expect(() => gcd.verifyNumberFieldModularGcd(fresh(), r, p, p, null!, bounds)).toThrow('verification-failed');
  });
});
