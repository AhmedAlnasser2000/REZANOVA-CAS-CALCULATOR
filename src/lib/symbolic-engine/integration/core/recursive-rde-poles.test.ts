import { describe, expect, it } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { buildExponential, buildLogarithm } from './differential-admission';
import { CertifiedTowerView } from './recursive-certified-tower';
import { differentiate } from './differential-derivative';
import { normalPoleResonance, verifyNormalPoleResonance, fractionValuation, verifyFractionValuation, recursiveFraction } from './recursive-rde-poles';
import { normalizeRecursiveRde, verifyRecursiveWeakNormalization } from './recursive-rde-normalization';
import { solveRecursiveLogarithmicMembership, verifyRecursiveLogarithmicMembership } from './recursive-logarithmic-membership';

function fixture(hyper: boolean) {
  const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds);
  const a = hyper ? buildExponential(s.ctx, s.f, 't', [s.x], bounds) : buildLogarithm(s.ctx, s.f, 't', s.x, bounds);
  if (a.status !== 'supported') throw Error('fixture admission');
  const owner = a.field, view = CertifiedTowerView.firstLevel(s.ctx, root, owner, owner.admission!, bounds), t = owner.generator(s.ctx);
  return {...s, owner, view, t, p: owner.add(s.ctx, t, owner.embed(s.ctx, s.x))};
}
describe('complete normal pole resonances and invertible gauges', () => {
  it.each([false, true])('checks positive, negative and nonconstant residues (hyper=%s)', hyper => {
    const s = fixture(hyper), dp = differentiate(s.ctx, s.owner, s.p).derivative, delta = s.owner.exactDivide(s.ctx, dp, s.p), prime = recursiveFraction(s.ctx, s.owner, s.p).numerator;
    for (const n of [3n, -3n]) {
      const a = s.owner.multiply(s.ctx, s.owner.fromInteger(s.ctx, n), delta), e = normalPoleResonance(s.ctx, s.owner, a, prime, bounds);
      expect(e.positive).toBe(n > 0n ? n : null); verifyNormalPoleResonance(s.ctx, s.owner, a, prime, e, bounds);
      expect(() => verifyNormalPoleResonance(s.ctx, s.owner, a, prime, {...e, positive: 4n}, bounds)).toThrow('verification-failed');
    }
    const a = s.owner.multiply(s.ctx, s.owner.embed(s.ctx, s.x), delta);
    expect(normalPoleResonance(s.ctx, s.owner, a, prime, bounds).positive).toBe(null);
  });
  it('retains exact valuation division coverage, including zero and repeated poles', () => {
    const s = fixture(false), prime = recursiveFraction(s.ctx, s.owner, s.p).numerator;
    const input = s.owner.inverse(s.ctx, s.owner.multiply(s.ctx, s.p, s.owner.multiply(s.ctx, s.p, s.p))), e = fractionValuation(s.ctx, s.owner, input, prime);
    expect(e.order).toBe(-3n); verifyFractionValuation(s.ctx, s.owner, input, prime, e);
    expect(() => verifyFractionValuation(s.ctx, s.owner, input, prime, {...e, denominator: {...e.denominator, divisions: e.denominator.divisions.slice(1)}})).toThrow('verification-failed');
    expect(fractionValuation(s.ctx, s.owner, s.owner.fromInteger(s.ctx, 0n), prime).order).toBe(null);
  });
  it.each([false, true])('checks the original and transformed equation in both directions (hyper=%s)', hyper => {
    const s = fixture(hyper), delta = s.owner.exactDivide(s.ctx, differentiate(s.ctx, s.owner, s.p).derivative, s.p);
    const a = s.owner.multiply(s.ctx, s.owner.fromInteger(s.ctx, 2n), delta), forcing = [s.t, s.owner.fromInteger(s.ctx, 0n)], e = normalizeRecursiveRde(s.ctx, s.view, a, forcing, bounds);
    expect(s.owner.equal(s.ctx, e.gauge, s.owner.multiply(s.ctx, s.p, s.p))).toBe(true);
    expect(s.owner.isZero(s.ctx, e.coefficient)).toBe(true); verifyRecursiveWeakNormalization(s.ctx, s.view, a, forcing, e, bounds);
    expect(() => verifyRecursiveWeakNormalization(s.ctx, s.view, a, forcing, {...e, forcing: [...e.forcing].reverse()}, bounds)).toThrow('verification-failed');
    expect(() => verifyRecursiveWeakNormalization(s.ctx, s.view, a, forcing, {...e, poles: []}, bounds)).toThrow('verification-failed');
  });
  it('keeps the hyperexponential generator as a special factor', () => {
    const s = fixture(true), a = s.owner.inverse(s.ctx, s.t), e = normalizeRecursiveRde(s.ctx, s.view, a, [], bounds);
    expect(e.poles).toHaveLength(0); expect(s.owner.equal(s.ctx, e.gauge, s.owner.fromInteger(s.ctx, 1n))).toBe(true);
  });
  it('separates radical membership, actual membership and complete absence', () => {
    const s = fixture(true), half = s.owner.exactDivide(s.ctx, s.owner.fromInteger(s.ctx, 1n), s.owner.fromInteger(s.ctx, 2n));
    const e = solveRecursiveLogarithmicMembership(s.ctx, s.view, half, bounds);
    expect(e.radical).toBe(true); expect(e.actual).toBe(false); expect(e.witness!.index).toBe(2n);
    verifyRecursiveLogarithmicMembership(s.ctx, s.view, half, e, bounds);
    expect(solveRecursiveLogarithmicMembership(s.ctx, s.view, s.owner.fromInteger(s.ctx, 1n), bounds).actual).toBe(true);
    expect(solveRecursiveLogarithmicMembership(s.ctx, s.view, s.t, bounds).radical).toBe(false);
    expect(() => verifyRecursiveLogarithmicMembership(s.ctx, s.view, half, {...e, actual: true}, bounds)).toThrow('verification-failed');
  });
});
