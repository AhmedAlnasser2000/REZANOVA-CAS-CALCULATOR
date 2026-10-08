import { describe, expect, it } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { buildExponential, buildLogarithm } from './differential-admission';
import { CertifiedTowerView } from './recursive-certified-tower';
import { differentiate } from './differential-derivative';
import { solveRecursiveParametricRde, verifyRecursiveParametricRde } from './recursive-rde';
import { solveRecursiveLimitedIntegration, verifyRecursiveLimitedIntegration } from './recursive-limited-integration';
import { boundRecursiveDegree, verifyRecursiveDegreeBound } from './recursive-rde-degree';
import { descendCoefficientSystem } from './recursive-coefficient-system';
import { solveLinearSystem } from './linear-system';
import { rationalField as Q } from './field';

function fixture(hyper: boolean) {
  const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds);
  const a = hyper ? buildExponential(s.ctx, s.f, 't', [s.x], bounds) : buildLogarithm(s.ctx, s.f, 't', s.x, bounds);
  if (a.status !== 'supported') throw Error('fixture');
  return {...s, owner: a.field, view: CertifiedTowerView.firstLevel(s.ctx, root, a.field, a.field.admission!, bounds), t: a.field.generator(s.ctx)};
}
describe('seeded recursive RDE identities and exact cancellation bounds', () => {
  it.each([false, true])('covers seeded rational functions, SPDE transformations and large coefficients (hyper=%s)', hyper => {
    const s = fixture(hyper), o = s.owner, x = o.embed(s.ctx, s.x);
    let seed = 0x51f29;
    for (let i = 0; i < 4; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const k = BigInt(seed % 9 + 1), pole = o.add(s.ctx, s.t, o.multiply(s.ctx, o.fromInteger(s.ctx, k), x));
      const large = o.fromInteger(s.ctx, i === 3 ? 9007199254740993n : k);
      const y = o.add(s.ctx, o.multiply(s.ctx, large, o.multiply(s.ctx, s.t, s.t)), o.inverse(s.ctx, o.multiply(s.ctx, pole, pole)));
      const a = o.fromInteger(s.ctx, k), input = o.add(s.ctx, differentiate(s.ctx, o, y).derivative, o.multiply(s.ctx, a, y));
      const before = y, e = solveRecursiveParametricRde(s.ctx, s.view, a, input, [], bounds);
      expect(e.kind).toBe('solutions'); verifyRecursiveParametricRde(s.ctx, s.view, a, input, [], e, bounds);
      const comparison = descendCoefficientSystem(s.ctx, o, {rows: 1, columns: e.family!.directions.length,
        matrix: [e.family!.directions.map(d => d.value)], rhs: [o.subtract(s.ctx, y, e.family!.particular.value)]}, bounds);
      expect(solveLinearSystem(s.ctx, Q, comparison.system).kind).toBe('consistent');
      expect(y).toBe(before); expect(Object.isFrozen(y)).toBe(true);
    }
  });
  it('uses the actual indexed next coefficient after an abnormal degree drop', () => {
    const s = fixture(false), ring = s.owner.fractions!.ring, zero = s.f.fromInteger(s.ctx, 0n), one = s.f.fromInteger(s.ctx, 1n), inverseX = s.f.inverse(s.ctx, s.x);
    const A = ring.make(s.ctx, [zero, zero, one]), B = ring.make(s.ctx, [s.f.fromInteger(s.ctx, 7n), zero, s.f.negate(s.ctx, inverseX)]);
    const e = boundRecursiveDegree(s.ctx, s.view, A, B, [], bounds);
    expect(e.membership!.actual).toBe(true); expect(e.bound).toBe(0n);
    expect(s.f.isZero(s.ctx, e.limited!.f)).toBe(true); verifyRecursiveDegreeBound(s.ctx, s.view, A, B, [], e, bounds);
    expect(() => verifyRecursiveDegreeBound(s.ctx, s.view, A, B, [], {...e, bound: 7n}, bounds)).toThrow('verification-failed');
  });
  it('retains a primitive infinity resonance beyond the forcing degree', () => {
    const s = fixture(false), o = s.owner, x = o.embed(s.ctx, s.x), five = o.fromInteger(s.ctx, 5n);
    const a = o.negate(s.ctx, o.add(s.ctx, o.inverse(s.ctx, x), o.exactDivide(s.ctx, five, o.multiply(s.ctx, x, s.t))));
    const e = solveRecursiveParametricRde(s.ctx, s.view, a, o.fromInteger(s.ctx, 0n), [], bounds);
    const ring = o.fractions!.ring, expected = o.multiply(s.ctx, x, o.fraction(s.ctx, o.fractions!.make(s.ctx, ring.power(s.ctx, ring.make(s.ctx, [s.f.fromInteger(s.ctx, 0n), s.f.fromInteger(s.ctx, 1n)]), 5), ring.one(s.ctx))));
    expect(e.family!.directions).toHaveLength(1);
    const ratio = o.exactDivide(s.ctx, expected, e.family!.directions[0].value);
    expect(o.isZero(s.ctx, differentiate(s.ctx, o, ratio).derivative)).toBe(true);
    verifyRecursiveParametricRde(s.ctx, s.view, a, o.fromInteger(s.ctx, 0n), [], e, bounds);
  });
  it.each([false, true])('retains source and normalized primitive restrictions separately (hyper=%s)', hyper => {
    const s = fixture(hyper), o = s.owner, value = o.inverse(s.ctx, o.add(s.ctx, s.t, o.embed(s.ctx, s.x))), input = differentiate(s.ctx, o, value).derivative;
    const e = solveRecursiveLimitedIntegration(s.ctx, s.view, input, [input, o.fromInteger(s.ctx, 0n)], bounds);
    expect(e.family!.directions).toHaveLength(2); expect(e.conditions.some(c => c.path === 'generator.0')).toBe(true);
    expect(e.conditions.some(c => c.path === 'primitive.particular')).toBe(true);
    verifyRecursiveLimitedIntegration(s.ctx, s.view, input, [input, o.fromInteger(s.ctx, 0n)], e, bounds);
    expect(() => verifyRecursiveLimitedIntegration(s.ctx, s.view, input, [input, o.fromInteger(s.ctx, 0n)], {...e, conditions: []}, bounds)).toThrow('verification-failed');
  });
});
