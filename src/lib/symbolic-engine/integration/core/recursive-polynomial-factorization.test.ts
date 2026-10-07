import { describe, expect, it } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { PolynomialRing } from './polynomial';
import { factorRecursivePolynomial as factor, verifyRecursivePolynomialFactorization as verify } from './recursive-polynomial-factorization';
import { DifferentialField } from './differential-field';
import { rationalField } from './field';
import { rational } from './rational';
import { RationalFunctionField } from './rational-function';
import { encodeRecursivePolynomialFactorization as encode, decodeRecursivePolynomialFactorization as decode } from './recursive-polynomial-factorization-wire';

describe('recursive coefficient factorization', () => {
  it('proves z²-x irreducible over Q(x)', () => {
    const {ctx, f, x} = setup(), ring = new PolynomialRing(f, 'z'), input = ring.make(ctx, [f.negate(ctx, x), f.fromInteger(ctx, 0n), f.fromInteger(ctx, 1n)]);
    const result = factor(ctx, ring, input, bounds); verify(ctx, ring, input, result, bounds);
    expect(result.kind === 'factorization' && result.factors.length).toBe(1);
  });
  it('factors nonconstant leading coefficients over Q(x)', () => {
    const {ctx, f, x, p} = setup(), ring = new PolynomialRing(f, 'z'), a = ring.make(ctx, [p([1, 1]), x]), b = ring.make(ctx, [f.negate(ctx, x), p([1, 1])]);
    const input = ring.multiply(ctx, a, b), result = factor(ctx, ring, input, bounds); verify(ctx, ring, input, result, bounds);
    expect(result.kind === 'factorization' && result.factors.length).toBe(2);
  });
  it('handles scalar wrappers with repeated rational factors', () => {
    const {ctx, q, c} = setup(), ring = new PolynomialRing(q, 'z'), input = ring.power(ctx, ring.make(ctx, [c(-1), c(2)]), 3);
    const result = factor(ctx, ring, input, bounds); verify(ctx, ring, input, result, bounds);
    expect(result.kind === 'factorization' && result.factors[0].multiplicity).toBe(3n);
  });
  it.each([false, true])('represents zero/constant inputs explicitly over Q(x): zero=%s', zero => {
    const {ctx, f, p} = setup(), ring = new PolynomialRing(f, 'z'), input = zero ? ring.zero(ctx) : ring.constant(ctx, p([1, 1], [2, 1]));
    const result = factor(ctx, ring, input, bounds); verify(ctx, ring, input, result, bounds);
    expect(result.kind).toBe(zero ? 'zero' : 'factorization');
    if (result.kind === 'factorization') { expect(result.factors).toHaveLength(0); expect(f.equal(ctx, result.unit, input.coefficients[0])).toBe(true); }
    expect(decode(ctx, ring, input, encode(ctx, ring, input, result, bounds), bounds).kind).toBe(result.kind);
  });
  it('preserves recursive multiplicities and nonconstant unit reconstruction', () => {
    const {ctx, f, x, p} = setup(), ring = new PolynomialRing(f, 'z'), a = ring.make(ctx, [p([1, 1]), x]), b = ring.make(ctx, [f.negate(ctx, x), p([1, 1])]);
    const input = ring.multiply(ctx, ring.power(ctx, a, 3), ring.power(ctx, b, 2)), result = factor(ctx, ring, input, bounds);
    verify(ctx, ring, input, result, bounds); expect(result.kind === 'factorization' && result.factors.map(f => f.multiplicity)).toEqual([2n, 3n]);
    expect(decode(ctx, ring, input, encode(ctx, ring, input, result, bounds), bounds).kind).toBe('factorization');
  });
  it.each([1, 2, 3, 8])('retains abstract differential owners at height %s', height => {
    const {ctx, q} = setup(); let owner = q;
    for (let i = 0; i < height; i++) owner = DifferentialField.formal(ctx, owner, `a${i}`, [owner.fromInteger(ctx, 0n)], bounds);
    const ring = new PolynomialRing(owner, 'answer'), t = owner.generator(ctx), zero = owner.fromInteger(ctx, 0n), one = owner.fromInteger(ctx, 1n);
    const input = ring.make(ctx, [owner.negate(ctx, t), zero, one]), before = input.coefficients;
    const result = factor(ctx, ring, input, bounds); verify(ctx, ring, input, result, bounds);
    expect(result.kind === 'factorization' && result.factors.length).toBe(1); expect(input.coefficients).toBe(before);
    const wire = encode(ctx, ring, input, result, bounds); expect(decode(ctx, ring, input, wire, bounds).kind).toBe('factorization');
    expect(owner.constantField).toBe('unestablished');
  });
  it('supports native registered fraction towers without differential wrappers', () => {
    const {ctx} = setup(), base = new RationalFunctionField(new PolynomialRing(rationalField, 'x'));
    const x = base.make(ctx, base.ring.make(ctx, [rational(ctx, 0), rational(ctx, 1)]), base.ring.one(ctx));
    const next = new RationalFunctionField(new PolynomialRing(base, 'y')), y = next.make(ctx, next.ring.make(ctx, [base.fromInteger(ctx, 0n), base.fromInteger(ctx, 1n)]), next.ring.one(ctx));
    const ring = new PolynomialRing(next, 'z'), a = ring.make(ctx, [next.add(ctx, y, next.fromCoefficient(ctx, x)), next.fromInteger(ctx, 1n)]);
    const b = ring.make(ctx, [next.fromInteger(ctx, 2n), next.fromInteger(ctx, 3n)]), input = ring.multiply(ctx, a, b);
    const result = factor(ctx, ring, input, bounds); expect(result.kind === 'factorization' && result.factors.length).toBe(2);
    expect(decode(ctx, ring, input, encode(ctx, ring, input, result, bounds), bounds).kind).toBe('factorization');
  });
  it('clears nested denominators and separates coefficient-only content', () => {
    const {ctx, f, x, p} = setup(), owner = DifferentialField.formal(ctx, f, 't', [p([])], bounds), ring = new PolynomialRing(owner, 'z');
    const t = owner.generator(ctx), coefficient = owner.make(ctx, [p([1, 1]), p([1])], [p([0, 1]), p([1])]);
    const a = ring.make(ctx, [coefficient, owner.fromInteger(ctx, 1n)]), b = ring.make(ctx, [owner.add(ctx, t, owner.embed(ctx, x)), owner.embed(ctx, p([1, 1]))]);
    const input = ring.scale(ctx, ring.multiply(ctx, a, b), owner.embed(ctx, p([2], [1, 1]))), result = factor(ctx, ring, input, bounds);
    verify(ctx, ring, input, result, bounds); expect(result.kind === 'factorization' && result.factors.length).toBe(2);
    expect(decode(ctx, ring, input, encode(ctx, ring, input, result, bounds), bounds).kind).toBe('factorization');
  });
  it('lifts sparse products involving three distinct supplied coordinates', () => {
    const {ctx, f, x, p} = setup(), y = DifferentialField.formal(ctx, f, 'y', [p([])], bounds), owner = DifferentialField.formal(ctx, y, 't', [y.fromInteger(ctx, 0n)], bounds);
    const ring = new PolynomialRing(owner, 'z'), a = owner.embed(ctx, x), b = owner.embed(ctx, y.generator(ctx)), t = owner.generator(ctx), one = owner.fromInteger(ctx, 1n);
    const first = ring.make(ctx, [owner.add(ctx, t, owner.multiply(ctx, a, b)), one]), second = ring.make(ctx, [owner.add(ctx, a, b), one]);
    const input = ring.multiply(ctx, first, second), result = factor(ctx, ring, input, bounds); verify(ctx, ring, input, result, bounds);
    expect(result.kind === 'factorization' && result.factors.length).toBe(2);
    expect(decode(ctx, ring, input, encode(ctx, ring, input, result, bounds), bounds).kind).toBe('factorization');
  });
  it('recovers large exact coefficients through modular recombination', () => {
    const {ctx} = setup(), ring = new PolynomialRing(rationalField, 'z'), large = 2n ** 65n + 1n;
    const first = ring.make(ctx, [rational(ctx, -large), rational(ctx, 1)]), second = ring.make(ctx, [rational(ctx, 1), rational(ctx, 0), rational(ctx, 1)]);
    const input = ring.multiply(ctx, first, second), result = factor(ctx, ring, input, bounds); verify(ctx, ring, input, result, bounds);
    expect(result.kind === 'factorization' && result.factors.some(f => ring.equal(ctx, f.polynomial, first))).toBe(true);
    expect(decode(ctx, ring, input, encode(ctx, ring, input, result, bounds), bounds).kind).toBe('factorization');
  });
  it.each([1, 2, 3, 4, 5, 6])('reconstructs seeded known rational products %s', seed => {
    const {ctx} = setup(), ring = new PolynomialRing(rationalField, 'different');
    const a = ring.make(ctx, [rational(ctx, seed), rational(ctx, seed + 1)]), b = ring.make(ctx, [rational(ctx, seed + 2), rational(ctx, 0), rational(ctx, 1)]);
    const input = ring.scale(ctx, ring.multiply(ctx, ring.power(ctx, a, seed % 3 + 1), b), rational(ctx, -3, seed + 3)), result = factor(ctx, ring, input, bounds);
    verify(ctx, ring, input, result, bounds); expect(result.kind === 'factorization' && result.factors.length).toBe(2);
  });
  it('rejects foreign values and prototype-forged polynomial owners', () => {
    const {ctx, f, x} = setup(), other = setup(), ring = new PolynomialRing(f, 'z');
    const input = ring.make(ctx, [x, f.fromInteger(ctx, 1n)]), foreign = new PolynomialRing(other.f, 'z').make(ctx, [other.x]);
    expect(() => factor(ctx, ring, foreign, bounds)).toThrow('domain-mismatch');
    expect(() => factor(ctx, Object.create(PolynomialRing.prototype), input, bounds)).toThrow('domain-mismatch');
    expect(() => factor(ctx, ring, {...input}, bounds)).toThrow('domain-mismatch');
    const proof = factor(ctx, ring, input, bounds); if (proof.kind !== 'factorization') throw Error('fixture');
    expect(Object.isFrozen(proof)).toBe(true); expect(Object.isFrozen(proof.factors)).toBe(true);
    expect(() => verify(ctx, ring, input, {...proof, factors: [...proof.factors, proof.factors[0]]}, bounds)).toThrow('verification-failed');
  });
});
