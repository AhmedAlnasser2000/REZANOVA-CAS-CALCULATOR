import { it, expect, vi } from 'vitest';
import { rationalField as Q } from './field';
import { PolynomialRing } from './polynomial';
import { fresh, bounds } from './__tests__/algebraic-support';
import * as construction from './algebraic-field';
import * as factorization from './algebraic-factorization';
import * as presentations from './number-field-presentation';
import { splitNumberFieldPolynomialWithin, verifyNumberFieldSplittingWithin } from './number-field-splitting';
import { numberFieldSplittingCodec } from './number-field-wire';
import { packAlgebraicArtifactData, unpackAlgebraicArtifactData } from './algebraic-artifact-keys';
import { constructRelativeNumberFieldWithin } from './relative-number-field';

function fixture(squareRoot = 0n) {
  const c = fresh(), ring = new PolynomialRing(Q, 'c'), source = construction.constructAlgebraicExtension(c, ring,
    squareRoot === 0n ? ring.make(c, [Q.fromInteger(c, 0n), Q.fromInteger(c, 1n)]) : ring.make(c, [Q.fromInteger(c, -squareRoot), Q.fromInteger(c, 0n), Q.fromInteger(c, 1n)]), bounds), z = new PolynomialRing(source, 'z');
  return {c, source, z};
}
it('constructs and covers the full compositum of two independent quadratic residue polynomials', () => {
  const b = fixture(), input = b.z.make(b.c, [6n, 0n, -5n, 0n, 1n].map(n => b.source.fromInteger(b.c, n))), p = splitNumberFieldPolynomialWithin(b.c, b.z, input, bounds);
  expect(p.target.ring.degree(b.c, p.target.modulus)).toBe(4); expect(p.roots.length).toBe(4); expect(p.steps.length).toBe(3);
  for (const root of p.roots) {
    const square = p.target.multiply(b.c, root, root);
    expect(p.target.equal(b.c, square, p.target.fromInteger(b.c, 2n)) || p.target.equal(b.c, square, p.target.fromInteger(b.c, 3n))).toBe(true);
  }
});
it('preserves explicitly nonrational source constants and relative degree', () => {
  const b = fixture(2n), input = b.z.make(b.c, [-3n, 0n, 1n].map(n => b.source.fromInteger(b.c, n))), p = splitNumberFieldPolynomialWithin(b.c, b.z, input, bounds);
  const r = constructRelativeNumberFieldWithin(b.c, b.source, p.target, p.embedding, bounds); expect(r.degree).toBe(2);
  expect(p.target.equal(b.c, p.target.multiply(b.c, p.embedding.map(b.c, b.source.generator(b.c)), p.embedding.map(b.c, b.source.generator(b.c))), p.target.fromInteger(b.c, 2n))).toBe(true);
});
it('handles constants, repeated roots and formally complex constants without choosing a branch', () => {
  const b = fixture(), f = b.z.make(b.c, [1n, 0n, 2n, 0n, 1n].map(n => b.source.fromInteger(b.c, n))), p = splitNumberFieldPolynomialWithin(b.c, b.z, f, bounds);
  expect(p.roots.length).toBe(2); for (const root of p.roots) expect(p.target.equal(b.c, p.target.multiply(b.c, root, root), p.target.fromInteger(b.c, -1n))).toBe(true);
  const constant = splitNumberFieldPolynomialWithin(b.c, b.z, b.z.constant(b.c, b.source.fromInteger(b.c, 9n)), bounds); expect(constant.roots).toEqual([]);
  expect(() => splitNumberFieldPolynomialWithin(b.c, b.z, b.z.zero(b.c), bounds)).toThrow('invalid-input');
});
it('reconstructs fresh full splitting evidence with factorization and presentation producers disabled', () => {
  const b = fixture(), f = b.z.make(b.c, [-2n, 0n, 1n].map(n => b.source.fromInteger(b.c, n))), p = splitNumberFieldPolynomialWithin(b.c, b.z, f, bounds);
  const c = fresh(), data = structuredClone(packAlgebraicArtifactData(c, numberFieldSplittingCodec(c, b.z, f, bounds).encode(p), bounds));
  const spies = [vi.spyOn(factorization, 'factorAlgebraicPolynomialWithin'), vi.spyOn(construction, 'constructAlgebraicExtension'), vi.spyOn(presentations, 'constructNumberFieldPresentationWithin')];
  for (const spy of spies) spy.mockImplementation(() => { throw Error('producer disabled'); });
  try { const ctx = fresh(), restored = numberFieldSplittingCodec(ctx, b.z, f, bounds).decode(unpackAlgebraicArtifactData(ctx, data, bounds)); expect(restored.target).not.toBe(p.target); expect(restored.roots.length).toBe(2); verifyNumberFieldSplittingWithin(fresh(), b.z, f, restored, bounds); }
  finally { for (const spy of spies) spy.mockRestore(); }
});
it('rejects incomplete coverage, altered roots and mismatched expected polynomials', () => {
  const b = fixture(), f = b.z.make(b.c, [-2n, 0n, 1n].map(n => b.source.fromInteger(b.c, n))), p = splitNumberFieldPolynomialWithin(b.c, b.z, f, bounds);
  expect(() => verifyNumberFieldSplittingWithin(fresh(), b.z, f, {...p, steps: p.steps.slice(0, -1)}, bounds)).toThrow('verification-failed');
  expect(() => verifyNumberFieldSplittingWithin(fresh(), b.z, f, {...p, roots: [p.target.fromInteger(b.c, 0n), p.roots[1]]}, bounds)).toThrow('verification-failed');
  const c = fresh(), data = numberFieldSplittingCodec(c, b.z, f, bounds).encode(p), other = b.z.make(b.c, [-3n, 0n, 1n].map(n => b.source.fromInteger(b.c, n)));
  expect(() => numberFieldSplittingCodec(fresh(), b.z, other, bounds).decode(data)).toThrow('domain-mismatch');
});
