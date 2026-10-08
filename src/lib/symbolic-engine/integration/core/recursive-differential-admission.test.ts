import { describe, expect, it } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { buildExponential, buildLogarithm } from './differential-admission';
import { DifferentialField } from './differential-field';
import { CertifiedTowerView, verifyCertifiedTower } from './recursive-certified-tower';
import { certifyRecursiveDifferentialExtension as certify, verifyRecursiveDifferentialExtension as verify } from './recursive-differential-admission';
import { solveRecursiveLimitedIntegration } from './recursive-limited-integration';
import { solveRecursiveLogarithmicDerivativeRelations } from './recursive-logarithmic-relations';
import { differentiate } from './differential-derivative';

function exponential() {
  const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), a = buildExponential(s.ctx, s.f, 't', [s.x], bounds);
  if (a.status !== 'supported') throw Error('fixture');
  const owner = a.field, view = CertifiedTowerView.firstLevel(s.ctx, root, owner, owner.admission!, bounds);
  return {...s, root, owner, view, t: owner.generator(s.ctx)};
}
describe('complete recursive dependency and admission', () => {
  it('certifies a supplied general hyperexponential without changing native metadata', () => {
    const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), one = s.f.fromInteger(s.ctx, 1n);
    const owner = DifferentialField.formal(s.ctx, s.f, 'u', [s.f.fromInteger(s.ctx, 0n), one], bounds), c = {kind: 'hyperexponential' as const, integrand: one};
    const e = certify(s.ctx, root, owner, c, bounds); expect(e.kind).toBe('admitted');
    if (e.kind !== 'admitted') throw Error('expected admission');
    expect(e.view.owner).toBe(owner); expect(owner.constantField).toBe('unestablished'); expect(owner.admission).toBeUndefined();
    verify(s.ctx, root, owner, c, e, bounds); verifyCertifiedTower(s.ctx, e.view, bounds);
  });
  it('retains least-index radical and integral dependence of explicit exponentials', () => {
    const s = exponential();
    for (const n of [s.owner.fromInteger(s.ctx, 2n), s.owner.exactDivide(s.ctx, s.owner.fromInteger(s.ctx, 1n), s.owner.fromInteger(s.ctx, 2n))]) {
      const owner = DifferentialField.formal(s.ctx, s.owner, 'u', [s.owner.fromInteger(s.ctx, 0n), n], bounds);
      const argument = s.owner.multiply(s.ctx, n, s.owner.embed(s.ctx, s.x)), c = {kind: 'exponential' as const, argument};
      const e = certify(s.ctx, s.view, owner, c, bounds); expect(e.kind).toBe('dependent'); verify(s.ctx, s.view, owner, c, e, bounds);
      if (e.kind !== 'dependent' || e.invariant.kind !== 'multiplicative') throw Error('expected radical dependence');
      const half = s.owner.equal(s.ctx, n, s.owner.fromInteger(s.ctx, 2n));
      expect(e.invariant.index).toBe(half ? 1n : 2n); expect(e.invariant.powers).toEqual([half ? 2n : 1n]); expect(e.view).toBe(null);
    }
  });
  it('keeps shifted exponent arguments distinct despite equal derivations', () => {
    const s = exponential(), one = s.owner.fromInteger(s.ctx, 1n), owner = DifferentialField.formal(s.ctx, s.owner, 'u', [s.owner.fromInteger(s.ctx, 0n), one], bounds);
    const c = {kind: 'exponential' as const, argument: s.owner.add(s.ctx, s.owner.embed(s.ctx, s.x), one)}, e = certify(s.ctx, s.view, owner, c, bounds);
    expect(e.kind).toBe('dependent');
    expect(() => verify(s.ctx, s.view, owner, {kind: 'exponential', argument: s.owner.embed(s.ctx, s.x)}, e, bounds)).toThrow('verification-failed');
  });
  it('certifies a general primitive D(s)=exp(x^2) and integrates in the extended field', () => {
    const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), a = buildExponential(s.ctx, s.f, 't', [s.p([0, 0, 1])], bounds);
    if (a.status !== 'supported') throw Error('fixture');
    const parent = CertifiedTowerView.firstLevel(s.ctx, root, a.field, a.field.admission!, bounds), t = a.field.generator(s.ctx), owner = DifferentialField.formal(s.ctx, a.field, 's', [t], bounds);
    const e = certify(s.ctx, parent, owner, {kind: 'primitive', integrand: t}, bounds); expect(e.kind).toBe('admitted');
    if (e.kind !== 'admitted') throw Error('expected admission');
    const input = owner.embed(s.ctx, t), decision = solveRecursiveLimitedIntegration(s.ctx, e.view, input, [], bounds);
    expect(decision.kind).toBe('solutions'); expect(owner.equal(s.ctx, decision.family!.particular.value, owner.generator(s.ctx))).toBe(true);
  });
  it('certifies log(t) over log(x), preserving t zero and pole restrictions', () => {
    const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), a = buildLogarithm(s.ctx, s.f, 't', s.x, bounds);
    if (a.status !== 'supported') throw Error('fixture');
    const parent = CertifiedTowerView.firstLevel(s.ctx, root, a.field, a.field.admission!, bounds), t = a.field.generator(s.ctx), eta = a.field.exactDivide(s.ctx, differentiate(s.ctx, a.field, t).derivative, t);
    const owner = DifferentialField.formal(s.ctx, a.field, 's', [eta], bounds), c = {kind: 'logarithm' as const, argument: t}, e = certify(s.ctx, parent, owner, c, bounds);
    expect(e.kind).toBe('admitted'); expect(e.evidence.conditions.some(c => c.kind === 'logarithm-argument' && c.path === 'construction.argument')).toBe(true);
    if (e.kind !== 'admitted') throw Error('expected admission');
    const input = owner.embed(s.ctx, eta), relations = solveRecursiveLogarithmicDerivativeRelations(s.ctx, e.view, [input], bounds);
    expect(relations.basis).toHaveLength(1);
  });
  it('returns additive invariants for log(2x) over log(x) without creating an alias', () => {
    const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), a = buildLogarithm(s.ctx, s.f, 't', s.x, bounds);
    if (a.status !== 'supported') throw Error('fixture');
    const parent = CertifiedTowerView.firstLevel(s.ctx, root, a.field, a.field.admission!, bounds), argument = a.field.embed(s.ctx, s.p([0, 2]));
    const eta = a.field.exactDivide(s.ctx, differentiate(s.ctx, a.field, argument).derivative, argument), owner = DifferentialField.formal(s.ctx, a.field, 's', [eta], bounds);
    const e = certify(s.ctx, parent, owner, {kind: 'logarithm', argument}, bounds); expect(e.kind).toBe('dependent');
    if (e.kind !== 'dependent' || e.invariant.kind !== 'additive') throw Error('expected additive dependence');
    expect(a.field.equal(s.ctx, e.invariant.representative, a.field.generator(s.ctx))).toBe(true);
  });
  it('handles zero and constant constructions without new constant-field authority', () => {
    const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), zero = s.f.fromInteger(s.ctx, 0n), owner = DifferentialField.formal(s.ctx, s.f, 's', [zero], bounds);
    expect(certify(s.ctx, root, owner, {kind: 'primitive', integrand: zero}, bounds).kind).toBe('dependent');
    expect(certify(s.ctx, root, owner, {kind: 'exponential', argument: s.f.fromInteger(s.ctx, 2n)}, bounds).kind).toBe('dependent');
    expect(() => certify(s.ctx, root, owner, {kind: 'logarithm', argument: zero}, bounds)).toThrow('division-by-zero');
  });
});
