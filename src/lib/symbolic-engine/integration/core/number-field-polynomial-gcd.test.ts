import { it, expect } from 'vitest';
import { fresh, bounds } from './__tests__/algebraic-support';
import { rationalField as Q } from './field';
import { PolynomialRing } from './polynomial';
import { constructAlgebraicExtension } from './algebraic-field';
import { numberFieldPolynomialGcd } from './number-field-polynomial-gcd';
import { recordRationalGcdEvidence, replayRationalGcdEvidence } from './rational-gcd-evidence';
import { polynomialDivide } from './polynomial-division';

it('removes irrational units before high-degree division under unchanged bit limits', () => {
  const ctx = fresh(), c = new PolynomialRing(Q, 'a'), C = constructAlgebraicExtension(ctx, c, c.make(ctx, [-2n, 0n, 1n].map(n => Q.fromInteger(ctx, n))), bounds), r = new PolynomialRing(C, 'z'), a = C.generator(ctx), u = C.add(ctx, a, C.fromInteger(ctx, 1n));
  let unit = C.fromInteger(ctx, 1n); for (let i = 0; i < 60; i++) unit = C.multiply(ctx, unit, u);
  const coefficients = Array.from({length: 41}, (_, i) => C.fromInteger(ctx, i === 0 || i === 1 || i === 40 ? 1n : 0n)), p = r.scale(ctx, r.make(ctx, coefficients), unit), q = r.scale(ctx, r.make(ctx, [C.fromInteger(ctx, 2n), C.fromInteger(ctx, 1n)]), unit), before = p.coefficients.slice();
  const root = fresh(), result = root.operation(() => recordRationalGcdEvidence(root, () => numberFieldPolynomialGcd(root, r, p, q))); expect(result.value !== null && r.equal(ctx, result.value, r.one(ctx))).toBe(true); expect(p.coefficients).toEqual(before);
  const replay = fresh(); replay.operation(() => replayRationalGcdEvidence(replay, result.evidence, () => expect(numberFieldPolynomialGcd(replay, r, p, q)).toEqual(result.value)));
});
it('retains zero cases, nonmonic common factors and exact irreducible cofactor coverage', () => {
  const ctx = fresh(), c = new PolynomialRing(Q, 'a'), C = constructAlgebraicExtension(ctx, c, c.make(ctx, [-2n, 0n, 1n].map(n => Q.fromInteger(ctx, n))), bounds), r = new PolynomialRing(C, 'z'), a = C.generator(ctx), common = r.make(ctx, [a, C.fromInteger(ctx, 1n)]), p = r.scale(ctx, r.multiply(ctx, common, r.make(ctx, [C.fromInteger(ctx, 1n), a, C.fromInteger(ctx, 1n)])), C.add(ctx, a, C.fromInteger(ctx, 2n))), q = r.scale(ctx, r.multiply(ctx, common, r.make(ctx, [C.fromInteger(ctx, -1n), C.fromInteger(ctx, 1n)])), a);
  for (const [left, right, expected] of [[p, q, common], [r.zero(ctx), r.zero(ctx), r.zero(ctx)], [common, r.zero(ctx), common]] as const) {
    const root = fresh(), g = root.operation(() => recordRationalGcdEvidence(root, () => numberFieldPolynomialGcd(root, r, left, right))).value; expect(g !== null && r.equal(ctx, g, expected)).toBe(true);
    if (g !== null && !r.isZero(ctx, g)) for (const value of [left, right]) expect(r.isZero(ctx, polynomialDivide(ctx, r, value, g).remainder)).toBe(true);
  }
});
it('preserves rational-content normalization for degree-one number-field wrappers', () => {
  const ctx = fresh(), c = new PolynomialRing(Q, 'a'), C = constructAlgebraicExtension(ctx, c, c.make(ctx, [-2n, 1n].map(n => Q.fromInteger(ctx, n))), bounds), r = new PolynomialRing(C, 'z'), unit = C.fromInteger(ctx, 1n << 120n), p = r.scale(ctx, r.make(ctx, Array.from({length: 41}, (_, i) => C.fromInteger(ctx, i === 0 || i === 1 || i === 40 ? 1n : 0n))), unit), q = r.scale(ctx, r.make(ctx, [C.fromInteger(ctx, 2n), C.fromInteger(ctx, 1n)]), unit);
  const root = fresh(), g = root.operation(() => recordRationalGcdEvidence(root, () => numberFieldPolynomialGcd(root, r, p, q))).value; expect(g !== null && r.equal(ctx, g, r.one(ctx))).toBe(true);
});
