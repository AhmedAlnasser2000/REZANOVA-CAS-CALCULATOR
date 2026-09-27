import { expect, it } from 'vitest';
import { context, poly, rationalRing } from './test-support';
import { SquareFreeQuotientAlgebra } from './quotient-algebra';
import { requireField } from './field';
import { quotientTrace, verifyQuotientTrace } from './quotient-trace';
import { rational } from './rational';

it('checks units, zero, proper splitting and CRT for reducible z²-1', () => {
  const ctx = context(), r = rationalRing('z'), algebra = new SquareFreeQuotientAlgebra(ctx, r, poly(ctx, r, [-1, 0, 1]));
  expect(() => requireField(algebra)).toThrow('domain-mismatch');
  const z = algebra.make(ctx, poly(ctx, r, [0, 1])), unit = algebra.analyzeUnit(ctx, z);
  expect(unit.kind).toBe('unit');
  if (unit.kind !== 'unit') throw Error('expected unit');
  expect(algebra.equal(ctx, unit.inverse, z)).toBe(true);
  expect(() => algebra.verifyUnit(ctx, z, { ...unit, inverse: algebra.fromInteger(ctx, 1n) })).toThrow('verification-failed');
  expect(() => algebra.verifyUnit(ctx, z, { ...unit, bezout: { ...unit.bezout, s: r.zero(ctx) } })).toThrow('verification-failed');
  expect(algebra.analyzeUnit(ctx, algebra.fromInteger(ctx, 0n)).kind).toBe('zero');
  const value = algebra.make(ctx, poly(ctx, r, [-1, 1])), nonunit = algebra.analyzeUnit(ctx, value);
  expect(nonunit.kind).toBe('nonunit');
  if (nonunit.kind !== 'nonunit') throw Error('expected split');
  const [left, right] = algebra.components(ctx, nonunit.split);
  const a = algebra.project(ctx, z, left), b = algebra.project(ctx, z, right);
  expect(algebra.equal(ctx, algebra.recombine(ctx, nonunit.split, a, b), z)).toBe(true);
  expect(() => algebra.verifyRecombination(ctx, nonunit.split, a, b, algebra.fromInteger(ctx, 1n))).toThrow('verification-failed');
  expect(() => algebra.verifyUnit(ctx, value, { ...nonunit, split: { ...nonunit.split, factor: r.one(ctx) } })).toThrow('verification-failed');
  const arbitrary = algebra.recombine(ctx, nonunit.split, left.fromInteger(ctx, 7n), right.fromInteger(ctx, -3n));
  expect(algebra.equal(ctx, arbitrary, algebra.make(ctx, poly(ctx, r, [2, 5])))).toBe(true);
});
it('rejects repeated-root, constant, nonmonic and foreign moduli', () => {
  const ctx = context(), r = rationalRing('z');
  for (const a of [[1, -2, 1], [1], [], [2, 2]]) expect(() => new SquareFreeQuotientAlgebra(ctx, r, poly(ctx, r, a))).toThrow('invalid-input');
  expect(() => new SquareFreeQuotientAlgebra(ctx, r, poly(ctx, rationalRing('z'), [-1, 0, 1]))).toThrow('domain-mismatch');
});
it('verifies matrix traces independently by Newton sums and rejects mutated evidence', () => {
  const ctx = context(), r = rationalRing('z'), algebra = new SquareFreeQuotientAlgebra(ctx, r, poly(ctx, r, [-1, -1, 0, 0, 0, 1]));
  const value = algebra.make(ctx, poly(ctx, r, [2, 1, 3, 4, 5])), proof = quotientTrace(ctx, algebra, value);
  expect(proof.trace).toEqual(rational(ctx, 30)); // p0=5,p1=p2=p3=0,p4=4.
  expect(() => verifyQuotientTrace(ctx, algebra, value, { ...proof, trace: rational(ctx, 10) })).toThrow('verification-failed');
  expect(() => verifyQuotientTrace(ctx, algebra, value, { ...proof, columns: [r.one(ctx), ...proof.columns.slice(1)] })).toThrow('verification-failed');
});
it('exercises units and component splitting over Q(x)', async () => {
  const { FormalPrimitiveDomain } = await import('./formal-primitive');
  const ctx = context({ work: 100_000_000, allocation: 1_000_000_000 }), owner = new FormalPrimitiveDomain('x', 'z');
  const algebra = new SquareFreeQuotientAlgebra(ctx, owner.residues, owner.liftResidue(ctx, poly(ctx, owner.z, [-1, 0, 1])));
  const x = owner.fractions.make(ctx, poly(ctx, owner.x, [0, 1]), owner.x.one(ctx));
  const value = algebra.make(ctx, owner.residues.make(ctx, [owner.fractions.negate(ctx, x), owner.fractions.fromInteger(ctx, 1n)]));
  expect(algebra.analyzeUnit(ctx, value).kind).toBe('unit');
  const nonunit = algebra.analyzeUnit(ctx, algebra.make(ctx, owner.liftResidue(ctx, poly(ctx, owner.z, [-1, 1]))));
  expect(nonunit.kind).toBe('nonunit');
  if (nonunit.kind !== 'nonunit') throw Error('expected proper factor');
  const [a, b] = algebra.components(ctx, nonunit.split);
  expect(algebra.equal(ctx, algebra.recombine(ctx, nonunit.split, algebra.project(ctx, value, a), algebra.project(ctx, value, b)), value)).toBe(true);
});
