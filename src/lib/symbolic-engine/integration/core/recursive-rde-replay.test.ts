import { describe, expect, it, vi } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { DifferentialField } from './differential-field';
import { buildExponential, buildLogarithm } from './differential-admission';
import { CertifiedTowerView } from './recursive-certified-tower';
import * as rde from './recursive-rde';
import * as limited from './recursive-limited-integration';
import * as admission from './recursive-differential-admission';
import { encodeRecursiveParametricRde, decodeRecursiveParametricRde, encodeRecursiveLimitedIntegration, decodeRecursiveLimitedIntegration } from './recursive-rde-wire';
import { encodeRecursiveDifferentialAdmission, decodeRecursiveDifferentialAdmission } from './recursive-differential-admission-wire';
import { disableRecursiveProducers } from './__tests__/recursive-replay-support';
import { packRecursiveArtifactGraph, unpackRecursiveArtifactGraph } from './recursive-artifact-graph';

type Data = {[key: string]: any}; // eslint-disable-line @typescript-eslint/no-explicit-any
const clone = (v: unknown): Data => JSON.parse(JSON.stringify(v)) as Data;
function fixture(hyper: boolean) {
  const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), built = hyper ? buildExponential(s.ctx, s.f, 't', [s.x], bounds) : buildLogarithm(s.ctx, s.f, 't', s.x, bounds);
  if (built.status !== 'supported') throw Error('fixture'); const owner = built.field;
  return {...s, root, owner, view: CertifiedTowerView.firstLevel(s.ctx, root, owner, owner.admission!, bounds), t: owner.generator(s.ctx)};
}
describe('independent recursive RDE, limited and admission replay', () => {
  it.each([false, true])('replays complete paired families with all search producers disabled (hyper=%s)', hyper => {
    const s = fixture(hyper), a = s.owner.fromInteger(s.ctx, hyper ? -1n : 0n), b = s.owner.fromInteger(s.ctx, 0n), forcing = [s.t];
    const e = rde.solveRecursiveParametricRde(s.ctx, s.view, a, b, forcing, bounds), data = encodeRecursiveParametricRde(s.ctx, s.view, a, b, forcing, e, bounds);
    const t = fixture(hyper), aa = t.owner.fromInteger(t.ctx, hyper ? -1n : 0n), bb = t.owner.fromInteger(t.ctx, 0n);
    disableRecursiveProducers(); try {
      const decoded = decodeRecursiveParametricRde(t.ctx, t.view, aa, bb, [t.t], clone(data), bounds);
      expect(decoded.kind).toBe('solutions'); expect(decoded.family!.directions.length).toBe(e.family!.directions.length);
      expect(encodeRecursiveParametricRde(t.ctx, t.view, aa, bb, [t.t], decoded, bounds)).toEqual(data);
    } finally { vi.restoreAllMocks(); }
  });
  it.each([true, false])('replays positive and negative limited-integration evidence (positive=%s)', positive => {
    const s = fixture(false), x = s.owner.embed(s.ctx, s.x), input = positive ? s.owner.exactDivide(s.ctx, s.t, x) : s.owner.inverse(s.ctx, s.owner.multiply(s.ctx, x, s.t));
    const e = limited.solveRecursiveLimitedIntegration(s.ctx, s.view, input, [], bounds), data = encodeRecursiveLimitedIntegration(s.ctx, s.view, input, [], e, bounds);
    const t = fixture(false), xx = t.owner.embed(t.ctx, t.x), expected = positive ? t.owner.exactDivide(t.ctx, t.t, xx) : t.owner.inverse(t.ctx, t.owner.multiply(t.ctx, xx, t.t));
    disableRecursiveProducers(); try {
      const decoded = decodeRecursiveLimitedIntegration(t.ctx, t.view, expected, [], clone(data), bounds);
      expect(decoded.kind).toBe(positive ? 'solutions' : 'no-field-solution');
      expect(encodeRecursiveLimitedIntegration(t.ctx, t.view, expected, [], decoded, bounds)).toEqual(data);
    } finally { vi.restoreAllMocks(); }
  });
  it.each([false, true])('replays admitted and dependent extension decisions (dependent=%s)', dependent => {
    const s = fixture(true), rate = dependent ? s.owner.fromInteger(s.ctx, 2n) : s.owner.multiply(s.ctx, s.owner.fromInteger(s.ctx, 2n), s.t);
    const c = {kind: 'hyperexponential' as const, integrand: rate}, owner = DifferentialField.formal(s.ctx, s.owner, 's', [s.owner.fromInteger(s.ctx, 0n), rate], bounds);
    const e = admission.certifyRecursiveDifferentialExtension(s.ctx, s.view, owner, c, bounds), data = encodeRecursiveDifferentialAdmission(s.ctx, s.view, owner, c, e, bounds);
    const t = fixture(true), eta = dependent ? t.owner.fromInteger(t.ctx, 2n) : t.owner.multiply(t.ctx, t.owner.fromInteger(t.ctx, 2n), t.t);
    const target = DifferentialField.formal(t.ctx, t.owner, 's', [t.owner.fromInteger(t.ctx, 0n), eta], bounds), construction = {kind: 'hyperexponential' as const, integrand: eta};
    disableRecursiveProducers(); try {
      const decoded = decodeRecursiveDifferentialAdmission(t.ctx, t.view, target, construction, clone(data), bounds);
      expect(decoded.kind).toBe(dependent ? 'dependent' : 'admitted');
      if (decoded.kind === 'admitted') expect(decoded.view.owner).toBe(target);
      expect(encodeRecursiveDifferentialAdmission(t.ctx, t.view, target, construction, decoded, bounds)).toEqual(data);
    } finally { vi.restoreAllMocks(); }
  });
  it('rejects missing coverage, altered parameters, signs, mappings and trusted flags', () => {
    const s = fixture(true), a = s.owner.fromInteger(s.ctx, -1n), zero = s.owner.fromInteger(s.ctx, 0n), e = rde.solveRecursiveParametricRde(s.ctx, s.view, a, zero, [s.t], bounds);
    const data = encodeRecursiveParametricRde(s.ctx, s.view, a, zero, [s.t], e, bounds);
    const mutations = [
      (d: Data) => { d.decision.homogeneous.degree.bound = '0'; },
      (d: Data) => { d.decision.homogeneous.polynomial.coefficients = []; },
      (d: Data) => { d.decision.family.directions = []; },
      (d: Data) => { d.decision.conditions = []; },
      (d: Data) => { d.decision.forcing = []; },
      (d: Data) => { d.decision.slice.nullspace = []; },
      (d: Data) => { d.decision.verified = true; },
    ];
    for (const [i, mutate] of mutations.entries()) {
      const outer = clone(data), bad = clone(unpackRecursiveArtifactGraph(s.ctx, outer.payload, bounds)); mutate(bad);
      expect(() => decodeRecursiveParametricRde(s.ctx, s.view, a, zero, [s.t], {...outer, payload: packRecursiveArtifactGraph(s.ctx, bad, bounds)}, bounds), `mutation ${i}`).toThrow();
    }
    expect(() => decodeRecursiveParametricRde(s.ctx, s.view, a, zero, [zero], data, bounds)).toThrow('verification-failed');
  });
});
