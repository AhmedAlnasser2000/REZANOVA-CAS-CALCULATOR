import {afterEach, describe, expect, it, vi} from 'vitest';
import {setup, bounds} from './differential-test-support';
import {fresh} from './__tests__/transcendental-support';
import {compactTowerFixture} from './__tests__/transcendental-compact-fixtures';
import {disableRecursiveProducers} from './__tests__/recursive-replay-support';
import {buildLogarithm} from './differential-admission';
import {CertifiedTowerView} from './recursive-certified-tower';
import {DifferentialField} from './differential-field';
import {certifyRecursiveDifferentialExtension} from './recursive-differential-admission';
import {ExecutionContext} from './execution';
import {rationalField as Q} from './field';
import {solveCompactRecursiveLimitedIntegration as solve, verifyCompactRecursiveLimitedIntegration as verify} from './compact-recursive-limited';
import {encodeCompactRecursiveLimitedIntegration as encode, decodeCompactRecursiveLimitedIntegration as decode} from './compact-recursive-limited-wire';
import {solveRecursiveLimitedIntegration} from './recursive-limited-integration';
import {encodeRecursiveLimitedIntegration, decodeRecursiveLimitedIntegration} from './recursive-rde-wire';
import * as limited from './compact-recursive-limited';
import * as rde from './compact-recursive-rde';
import * as core from './recursive-rde';
import * as linear from './compact-rational-linear';
import * as derivatives from './differential-derivative';
afterEach(() => vi.restoreAllMocks());
function fixture() {
  const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), admission = buildLogarithm(s.ctx, s.f, 't', s.x, bounds);
  if (admission.status !== 'supported') throw Error('known log fixture'); const owner = admission.field, view = CertifiedTowerView.firstLevel(s.ctx, root, owner, owner.admission!, bounds);
  return {...s, owner, view, t: owner.generator(s.ctx)};
}
function disable() {
  disableRecursiveProducers(); const stop = () => {throw Error('compact limited producer disabled');};
  vi.spyOn(limited, 'solveCompactRecursiveLimitedIntegrationWithin').mockImplementation(stop); vi.spyOn(rde, 'solveCompactRecursiveParametricRdeWithin').mockImplementation(stop);
  vi.spyOn(rde, 'solveCompactRecursiveHomogeneousRdeWithin').mockImplementation(stop); vi.spyOn(core, 'solveRecursiveHomogeneousReductionWithin').mockImplementation(stop);
  vi.spyOn(linear, 'solveCompactRationalLinearSystemWithin').mockImplementation(stop); vi.spyOn(derivatives, 'differentiateWithin').mockImplementation(stop);
}
describe('complete limited-integration compact coefficient families', () => {
  it('integrates t/x with canonical representative t^2/2 and a separate arbitrary constant', () => {
    const s = fixture(), f = s.owner, x = f.embed(s.ctx, s.x), input = f.exactDivide(s.ctx, s.t, x), proof = solve(fresh(), s.view, input, [], bounds);
    expect(proof.kind).toBe('solutions'); expect(proof.family?.additiveConstant).toBe('arbitrary-rational'); expect(proof.family?.directions).toHaveLength(0);
    expect(f.equal(s.ctx, proof.family!.particular.value, f.exactDivide(s.ctx, f.multiply(s.ctx, s.t, s.t), f.fromInteger(s.ctx, 2n)))).toBe(true);
    expect(proof.projection?.method).toBe('rank-block-kernel'); verify(fresh(), s.view, input, [], proof, bounds);
  });
  it('preserves duplicates, dependence, zero function directions and singular-point-safe normalization', () => {
    const s = fixture(), f = s.owner, zero = f.fromInteger(s.ctx, 0n), one = f.fromInteger(s.ctx, 1n), generators = [one, one, zero], proof = solve(fresh(), s.view, zero, generators, bounds);
    expect(proof.family?.directions).toHaveLength(3); expect(proof.family?.directions.some(d => f.isZero(s.ctx, d.value) && d.coefficients.some(c => !Q.isZero(s.ctx, c)))).toBe(true);
    expect(proof.normalized.some(n => !Q.isZero(s.ctx, n.extraction.constant))).toBe(true);
    // No representative is normalized by evaluation at x=0, where 1/x is singular.
    const inverseX = f.inverse(s.ctx, f.embed(s.ctx, s.x)), input = f.negate(s.ctx, f.multiply(s.ctx, inverseX, inverseX)), exact = solve(fresh(), s.view, input, [], bounds);
    expect(f.equal(s.ctx, exact.family!.particular.value, inverseX)).toBe(true); verify(fresh(), s.view, input, [], exact, bounds);
  });
  it.each([false, true])('replays complete mixed-tower/negative limited evidence without producers (%s)', negative => {
    const s = negative ? (() => {const s = fixture(); return {view: s.view, input: s.owner.inverse(s.ctx, s.owner.multiply(s.ctx, s.owner.embed(s.ctx, s.x), s.t))};})() : compactTowerFixture(fresh(), 'mixed-log');
    const proof = solve(fresh(), s.view, s.input, [], bounds), data = encode(fresh(), s.view, s.input, [], proof, bounds); expect(proof.kind).toBe(negative ? 'no-field-solution' : 'solutions');
    disable(); expect(decode(fresh(), s.view, s.input, [], structuredClone(data), bounds).kind).toBe(proof.kind); verify(fresh(), s.view, s.input, [], proof, bounds);
  });
  it('retains original limited-integration version-one replay and strict family normalization', () => {
    const s = fixture(), input = s.t, old = solveRecursiveLimitedIntegration(fresh(), s.view, input, [], bounds), legacy = encodeRecursiveLimitedIntegration(fresh(), s.view, input, [], old, bounds), proof = solve(fresh(), s.view, input, [], bounds), data = encode(fresh(), s.view, input, [], proof, bounds);
    disable(); expect(decodeRecursiveLimitedIntegration(fresh(), s.view, input, [], legacy, bounds).kind).toBe('solutions'); expect(decode(fresh(), s.view, input, [], data, bounds).family?.additiveConstant).toBe('arbitrary-rational');
    expect(() => decode(fresh(), s.view, input, [], legacy, bounds)).toThrow('invalid-input'); expect(() => decodeRecursiveLimitedIntegration(fresh(), s.view, input, [], data, bounds)).toThrow('invalid-input');
  });
  it('retains general differential-rule admission and never substitutes an exp/log input restriction', () => {
    const s = setup(); let view = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds);
    for (const kind of ['hyperexponential', 'primitive'] as const) {
      const parent = view, eta = kind === 'hyperexponential' ? s.p([0n, 2n]) : parent.owner.generator(s.ctx), owner = DifferentialField.formal(s.ctx, parent.owner, kind === 'primitive' ? 's' : 't', kind === 'primitive' ? [eta] : [parent.owner.fromInteger(s.ctx, 0n), eta], bounds);
      const admission = certifyRecursiveDifferentialExtension(s.ctx, parent, owner, {kind, integrand: eta}, bounds); if (admission.kind !== 'admitted') throw Error('known general primitive tower'); view = admission.view;
    }
    const f = view.owner, input = f.embed(s.ctx, view.rate!), proof = solve(fresh(), view, input, [], bounds); expect(proof.kind).toBe('solutions');
    expect(f.equal(s.ctx, proof.family!.particular.value, f.generator(s.ctx))).toBe(true);
    const data = encode(fresh(), view, input, [], proof, bounds); disable(); expect(decode(fresh(), view, input, [], data, bounds).kind).toBe('solutions');
  });
  it('rejects changed projections, omitted constant freedom, incorrect representatives and generator order', () => {
    const s = fixture(), f = s.owner, zero = f.fromInteger(s.ctx, 0n), one = f.fromInteger(s.ctx, 1n), generators = [one, s.t], proof = solve(fresh(), s.view, zero, generators, bounds);
    if (proof.family === null || proof.projection === null) throw Error('known complete family');
    for (const changed of [{...proof, normalized: []}, {...proof, conditions: []}, {...proof, projection: {...proof.projection, rank: proof.projection.rank + 1}},
      {...proof, family: {...proof.family, additiveConstant: 'omitted' as 'arbitrary-rational'}}, {...proof, family: {...proof.family, directions: []}},
      {...proof, normalized: proof.normalized.map((n, i) => i ? n : {...n, pair: {...n.pair, value: f.add(s.ctx, n.pair.value, one)}})}]) expect(() => verify(fresh(), s.view, zero, generators, changed, bounds)).toThrow('verification-failed');
    const data = encode(fresh(), s.view, zero, generators, proof, bounds); expect(() => decode(fresh(), s.view, zero, [s.t, one], data, bounds)).toThrow('verification-failed');
  });
  it('starts replay cold, rejects foreign owners and preserves complete bounds and sticky stops', () => {
    const s = fixture(), f = s.owner, proof = solve(fresh(), s.view, s.t, [], bounds), data = encode(fresh(), s.view, s.t, [], proof, bounds), ctx = fresh();
    decode(ctx, s.view, s.t, [], data, bounds); const work = ctx.usage.work; decode(ctx, s.view, s.t, [], data, bounds); expect(ctx.usage.work).toBe(work * 2);
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}, {towerHeight: 1}]) expect(() => decode(fresh(), s.view, s.t, [], data, {...bounds, ...patch})).toThrow('resource-limit');
    const stopped = new ExecutionContext({...fresh().limits, work: 1}); expect(() => solve(stopped, s.view, s.t, [], bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
    const other = fixture(); expect(() => verify(fresh(), other.view, s.t, [], proof, bounds)).toThrow('domain-mismatch');
    expect(Object.isFrozen(proof.normalized) && Object.isFrozen(proof.family!.directions)).toBe(true); expect(f.equal(s.ctx, s.t, f.generator(s.ctx))).toBe(true);
  });
});
