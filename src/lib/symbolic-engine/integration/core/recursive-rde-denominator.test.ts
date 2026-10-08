import { describe, expect, it } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { buildExponential, buildLogarithm } from './differential-admission';
import { CertifiedTowerView } from './recursive-certified-tower';
import { differentiate } from './differential-derivative';
import { boundRecursiveDenominator, verifyRecursiveDenominatorBound } from './recursive-rde-denominator';
import { solveHyperexponentialResonance, verifyHyperexponentialResonance } from './recursive-hyperexponential-resonance';

function fixture(hyper: boolean) {
  const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds);
  const a = hyper ? buildExponential(s.ctx, s.f, 't', [s.x], bounds) : buildLogarithm(s.ctx, s.f, 't', s.x, bounds);
  if (a.status !== 'supported') throw Error('fixture admission');
  const owner = a.field, view = CertifiedTowerView.firstLevel(s.ctx, root, owner, owner.admission!, bounds), t = owner.generator(s.ctx);
  return {...s, owner, view, t, p: owner.add(s.ctx, t, owner.embed(s.ctx, s.x))};
}
describe('complete finite denominator bounds', () => {
  it.each([false, true])('bounds normal repeated poles by derivative order (hyper=%s)', hyper => {
    const s = fixture(hyper), zero = s.owner.fromInteger(s.ctx, 0n), f = s.owner.inverse(s.ctx, s.owner.multiply(s.ctx, s.p, s.p));
    const e = boundRecursiveDenominator(s.ctx, s.view, zero, [f], bounds), normal = e.poles.find(p => p.kind === 'normal')!;
    expect(normal.bound).toBe(1n); verifyRecursiveDenominatorBound(s.ctx, s.view, zero, [f], e, bounds);
    expect(() => verifyRecursiveDenominatorBound(s.ctx, s.view, zero, [f], {...e, poles: e.poles.map(p => ({...p, bound: 0n}))}, bounds)).toThrow('verification-failed');
  });
  it('retains normal homogeneous resonances with zero forcing', () => {
    const s = fixture(false), a = s.owner.multiply(s.ctx, s.owner.fromInteger(s.ctx, 3n), s.owner.exactDivide(s.ctx, differentiate(s.ctx, s.owner, s.p).derivative, s.p));
    const e = boundRecursiveDenominator(s.ctx, s.view, a, [], bounds);
    expect(e.poles[0].bound).toBe(3n); expect(e.poles[0].residue!.positive).toBe(3n);
  });
  it('includes special inverse-power homogeneous freedom without input poles', () => {
    const s = fixture(true), a = s.owner.fromInteger(s.ctx, 2n), e = boundRecursiveDenominator(s.ctx, s.view, a, [], bounds);
    expect(e.poles).toHaveLength(1); expect(e.poles[0].kind).toBe('special'); expect(e.poles[0].bound).toBe(2n);
    expect(e.poles[0].special!.exponent!.numerator).toBe(-2n);
    verifyRecursiveDenominatorBound(s.ctx, s.view, a, [], e, bounds);
    expect(() => verifyRecursiveDenominatorBound(s.ctx, s.view, a, [], {...e, poles: []}, bounds)).toThrow('verification-failed');
  });
  it('keeps nonintegral radical valuations separate from actual resonances', () => {
    const s = fixture(true);
    // alpha=3+1/(2x): its only possible t exponent is 3, but u=sqrt(x)
    // is absent from the supplied rational coefficient field.
    const input = s.f.add(s.ctx, s.f.fromInteger(s.ctx, 3n), s.f.exactDivide(s.ctx, s.f.fromInteger(s.ctx, 1n), s.f.multiply(s.ctx, s.f.fromInteger(s.ctx, 2n), s.x)));
    const e = solveHyperexponentialResonance(s.ctx, s.view, input, bounds);
    expect(e.exponent!.numerator).toBe(3n); expect(e.actual).toBe(false); expect(e.witness!.index).toBe(2n);
    verifyHyperexponentialResonance(s.ctx, s.view, input, e, bounds);
    expect(() => verifyHyperexponentialResonance(s.ctx, s.view, input, {...e, actual: true}, bounds)).toThrow('verification-failed');
  });
  it('excludes special homogeneous freedom when a has a genuine special pole', () => {
    const s = fixture(true), a = s.owner.inverse(s.ctx, s.t), e = boundRecursiveDenominator(s.ctx, s.view, a, [], bounds);
    expect(e.poles[0].bound).toBe(0n); expect(e.poles[0].special).toBe(null);
  });
});
