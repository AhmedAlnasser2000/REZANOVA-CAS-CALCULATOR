import { describe, expect, it, vi } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { PolynomialRing } from './polynomial';
import { factorRecursivePolynomial as factor, verifyRecursivePolynomialFactorization as verify } from './recursive-polynomial-factorization';
import { encodeRecursivePolynomialFactorization as encode, decodeRecursivePolynomialFactorization as decode } from './recursive-polynomial-factorization-wire';
import * as integers from './factorization-integer';
import * as finite from './factorization-finite';
import * as multivariate from './factorization-multivariate';
import * as squareFree from './polynomial-square-free';
import * as content from './multivariate-gcd';
import * as entry from './recursive-polynomial-factorization';
import * as sparseSquareFree from './factorization-sparse-square-free';

function fixture(recursive: boolean, split = false) {
  const {ctx, f, q, x, c, p} = setup(), owner = recursive ? f : q, ring = new PolynomialRing(owner, 'z');
  const input = recursive ? ring.make(ctx, [f.negate(ctx, x), p([]), p([1])]) : ring.make(ctx, [c(1), c(0), c(0), c(0), c(1)]);
  const value = split ? ring.multiply(ctx, input, ring.make(ctx, [owner.fromInteger(ctx, -1n), owner.fromInteger(ctx, 2n)])) : input;
  return {ctx, ring, input: value};
}
describe('factorization artifact replay', () => {
  it.each([false, true])('replays %s coefficients with all search/lift producers disabled', recursive => {
    const {ctx, ring, input} = fixture(recursive), proof = factor(ctx, ring, input, bounds), data = encode(ctx, ring, input, proof, bounds);
    const disabled = () => { throw Error('producer called'); };
    const spies = [vi.spyOn(entry, 'factorRecursivePolynomial').mockImplementation(disabled), vi.spyOn(integers, 'factorIntegerPolynomial').mockImplementation(disabled),
      vi.spyOn(integers, 'liftIntegerModularFactors').mockImplementation(disabled), vi.spyOn(finite, 'factorFinitePolynomial').mockImplementation(disabled),
      vi.spyOn(multivariate, 'factorMultivariatePolynomial').mockImplementation(disabled), vi.spyOn(content, 'multivariateContent').mockImplementation(disabled),
      vi.spyOn(content, 'multivariateGcd').mockImplementation(disabled), vi.spyOn(squareFree, 'squareFree').mockImplementation(disabled),
      vi.spyOn(sparseSquareFree, 'sparseFactorSquareFree').mockImplementation(disabled), vi.spyOn(sparseSquareFree, 'sparseFactorPrimitive').mockImplementation(disabled)];
    try { const result = decode(ctx, ring, input, JSON.parse(JSON.stringify(data)), bounds); verify(ctx, ring, input, result, bounds); }
    finally { spies.forEach(s => s.mockRestore()); }
  });
  it.each([false, true])('retains selected lifts and replays split trees (%s)', recursive => {
    const {ctx, ring, input} = fixture(recursive, true), proof = factor(ctx, ring, input, bounds), data = encode(ctx, ring, input, proof, bounds);
    const restored = decode(ctx, ring, input, JSON.parse(JSON.stringify(data)), bounds);
    expect(restored.kind === 'factorization' && restored.factors.length).toBe(2);
  });
  it.each([false, true])('rejects wrong targets and altered native multiplicities (%s)', recursive => {
    const {ctx, ring, input} = fixture(recursive), proof = factor(ctx, ring, input, bounds), data = encode(ctx, ring, input, proof, bounds);
    expect(() => decode(ctx, ring, ring.add(ctx, input, ring.one(ctx)), data, bounds)).toThrow('verification-failed');
    const bad = JSON.parse(JSON.stringify(data)); bad.decision.factors[0].multiplicity = '2';
    expect(() => decode(ctx, ring, input, bad, bounds)).toThrow('verification-failed');
    bad.decision.factors[0].multiplicity = '01'; expect(() => decode(ctx, ring, input, bad, bounds)).toThrow('invalid-input');
  });
  it('bounds the entire artifact before reading evidence or invoking getters', () => {
    const {ctx, ring, input} = fixture(true); let called = false;
    const data = {tag: 'recursive-polynomial-factorization', version: 1, get decision() { called = true; return {}; }};
    expect(() => decode(ctx, ring, input, data, bounds)).toThrow('invalid-input'); expect(called).toBe(false);
  });
  it.each([false, true])('binds replayed native values to a fresh expected owner (%s)', recursive => {
    const original = fixture(recursive), decision = factor(original.ctx, original.ring, original.input, bounds), data = encode(original.ctx, original.ring, original.input, decision, bounds);
    const fresh = fixture(recursive), restored = decode(fresh.ctx, fresh.ring, fresh.input, data, bounds);
    expect(restored.input.ring).toBe(fresh.ring); verify(fresh.ctx, fresh.ring, fresh.input, restored, bounds);
    expect(() => verify(fresh.ctx, fresh.ring, fresh.input, decision, bounds)).toThrow('domain-mismatch');
  });
  it.each(['version', 'flag', 'noncanonical', 'number', 'cycle'])('rejects malformed artifact %s', kind => {
    const v = fixture(true), decision = factor(v.ctx, v.ring, v.input, bounds), data = JSON.parse(JSON.stringify(encode(v.ctx, v.ring, v.input, decision, bounds)));
    if (kind === 'version') data.version = 2;
    if (kind === 'flag') data.decision.verified = true;
    if (kind === 'noncanonical') data.decision.factors[0].multiplicity = '+1';
    if (kind === 'number') data.decision.factors[0].multiplicity = 1;
    if (kind === 'cycle') data.decision = data;
    expect(() => decode(v.ctx, v.ring, v.input, data, bounds)).toThrow('invalid-input');
  });
});
