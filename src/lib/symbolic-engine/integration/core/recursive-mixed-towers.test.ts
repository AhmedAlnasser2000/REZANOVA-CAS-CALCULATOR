import { describe, expect, it, vi } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { DifferentialField, type DifferentialElement as E } from './differential-field';
import { CertifiedTowerView, verifyCertifiedTower } from './recursive-certified-tower';
import { certifyRecursiveDifferentialExtension as certify, verifyRecursiveDifferentialExtension } from './recursive-differential-admission';
import { solveRecursiveLimitedIntegration, verifyRecursiveLimitedIntegration } from './recursive-limited-integration';
import { solveRecursiveParametricRde, verifyRecursiveParametricRde } from './recursive-rde';
import { solveRecursiveLogarithmicDerivativeRelations, verifyRecursiveLogarithmicDerivativeRelations } from './recursive-logarithmic-relations';
import { differentiate } from './differential-derivative';
import { encodeRecursiveLimitedIntegration, decodeRecursiveLimitedIntegration } from './recursive-rde-wire';
import { disableRecursiveProducers } from './__tests__/recursive-replay-support';

function extend(s: ReturnType<typeof setup>, parent: CertifiedTowerView, kind: 'primitive' | 'hyperexponential', eta: E, name: string) {
  const owner = DifferentialField.formal(s.ctx, parent.owner, name, kind === 'primitive' ? [eta] : [parent.owner.fromInteger(s.ctx, 0n), eta], bounds);
  const e = certify(s.ctx, parent, owner, {kind, integrand: eta}, bounds); if (e.kind !== 'admitted') throw Error('fixture must be independent'); return e.view;
}
describe('recursive subsidiary decisions in mixed and nested towers', () => {
  it.each([true, false])('replays positive/negative evidence over general recursive admissions with producers disabled (positive=%s)', positive => {
    const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), first = extend(s, root, 'primitive', s.p([1], [0, 1]), 't');
    const second = extend(s, first, 'hyperexponential', first.owner.fromInteger(s.ctx, 1n), 'u'), o = second.owner;
    const lower = first.owner.generator(s.ctx), input = positive ? o.fromInteger(s.ctx, 1n) : o.inverse(s.ctx, o.multiply(s.ctx, o.embed(s.ctx, s.x), o.embed(s.ctx, lower)));
    const e = solveRecursiveLimitedIntegration(s.ctx, second, input, [], bounds), data = encodeRecursiveLimitedIntegration(s.ctx, second, input, [], e, bounds);
    disableRecursiveProducers(); try {
      const replay = decodeRecursiveLimitedIntegration(s.ctx, second, input, [], structuredClone(data), bounds);
      expect(replay.kind).toBe(positive ? 'solutions' : 'no-field-solution');
      expect(encodeRecursiveLimitedIntegration(s.ctx, second, input, [], replay, bounds)).toEqual(data);
    } finally { vi.restoreAllMocks(); }
  });
  it.each([false, true])('integrates the generator derivatives in both logarithm/exponential orders (logFirst=%s)', logFirst => {
    const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), logRate = s.p([1], [0, 1]);
    const first = extend(s, root, logFirst ? 'primitive' : 'hyperexponential', logFirst ? logRate : s.p([1]), 't');
    const second = extend(s, first, logFirst ? 'hyperexponential' : 'primitive', first.owner.embed(s.ctx, logFirst ? s.p([1]) : logRate), 'u');
    verifyCertifiedTower(s.ctx, second, bounds); const g = second.owner.generator(s.ctx), input = differentiate(s.ctx, second.owner, g).derivative;
    const e = solveRecursiveLimitedIntegration(s.ctx, second, input, [], bounds); expect(e.kind).toBe('solutions');
    expect(second.owner.equal(s.ctx, e.family!.particular.value, g)).toBe(true); verifyRecursiveLimitedIntegration(s.ctx, second, input, [], e, bounds);
    const data = encodeRecursiveLimitedIntegration(s.ctx, second, input, [], e, bounds), replay = decodeRecursiveLimitedIntegration(s.ctx, second, input, [], JSON.parse(JSON.stringify(data)), bounds);
    expect(replay.kind).toBe('solutions');
  });
  it('supports independent exponential families and their complete rational relation space', () => {
    const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), first = extend(s, root, 'hyperexponential', s.p([1]), 't');
    const second = extend(s, first, 'hyperexponential', first.owner.embed(s.ctx, s.p([0, 2])), 'u'), owner = second.owner;
    const inputs = [owner.fromInteger(s.ctx, 1n), owner.embed(s.ctx, s.p([0, 2])), owner.embed(s.ctx, s.p([1], [0, 1]))];
    const e = solveRecursiveLogarithmicDerivativeRelations(s.ctx, second, inputs, bounds); expect(e.basis).toHaveLength(3);
    verifyRecursiveLogarithmicDerivativeRelations(s.ctx, second, inputs, e, bounds);
    const input = owner.generator(s.ctx), a = owner.negate(s.ctx, owner.embed(s.ctx, s.p([0, 2]))), zero = owner.fromInteger(s.ctx, 0n);
    const rde = solveRecursiveParametricRde(s.ctx, second, a, zero, [input], bounds); expect(rde.family!.directions).toHaveLength(2);
    verifyRecursiveParametricRde(s.ctx, second, a, zero, [input], rde, bounds);
  });
  it('admits nested exponentials and preserves the complete tagged exponent', () => {
    const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), first = extend(s, root, 'hyperexponential', s.p([1]), 't');
    const argument = first.owner.generator(s.ctx), eta = differentiate(s.ctx, first.owner, argument).derivative;
    const owner = DifferentialField.formal(s.ctx, first.owner, 'u', [first.owner.fromInteger(s.ctx, 0n), eta], bounds), c = {kind: 'exponential' as const, argument};
    const e = certify(s.ctx, first, owner, c, bounds); expect(e.kind).toBe('admitted'); if (e.kind !== 'admitted') throw Error('fixture');
    const delta = owner.embed(s.ctx, eta), relations = solveRecursiveLogarithmicDerivativeRelations(s.ctx, e.view, [delta], bounds); expect(relations.basis).toHaveLength(1);
    const changed = {kind: 'exponential' as const, argument: first.owner.add(s.ctx, argument, first.owner.fromInteger(s.ctx, 1n))};
    expect(() => verifyRecursiveDifferentialExtension(s.ctx, first, owner, changed, e, bounds)).toThrow('verification-failed');
  });
  it('works with alternate and shadowed printed names without changing owners', () => {
    const s = setup(), f = DifferentialField.rationalFunctions(s.ctx, s.q, 'z', bounds), root = CertifiedTowerView.rationalFunctions(s.ctx, f, bounds);
    const first = extend(s, root, 'hyperexponential', f.fromInteger(s.ctx, 1n), 'z'), second = extend(s, first, 'primitive', first.owner.embed(s.ctx, f.inverse(s.ctx, f.generator(s.ctx))), 'z');
    const input = differentiate(s.ctx, second.owner, second.owner.generator(s.ctx)).derivative, e = solveRecursiveLimitedIntegration(s.ctx, second, input, [], bounds);
    expect(e.kind).toBe('solutions'); expect(e.rde.view.owner).toBe(second.owner);
    expect(() => solveRecursiveLimitedIntegration(s.ctx, second, s.x, [], bounds)).toThrow('domain-mismatch');
  });
});
