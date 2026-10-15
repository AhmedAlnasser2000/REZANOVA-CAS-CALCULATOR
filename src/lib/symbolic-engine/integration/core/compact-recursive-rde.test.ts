import {afterEach, describe, expect, it, vi} from 'vitest';
import {setup, bounds} from './differential-test-support';
import {fresh} from './__tests__/transcendental-support';
import {disableRecursiveProducers} from './__tests__/recursive-replay-support';
import {buildExponential, buildLogarithm} from './differential-admission';
import {CertifiedTowerView} from './recursive-certified-tower';
import {ExecutionContext} from './execution';
import {rationalField as Q} from './field';
import {solveCompactRecursiveParametricRde, verifyCompactRecursiveParametricRde, type CompactRecursiveParametricRde} from './compact-recursive-rde';
import {encodeCompactRecursiveParametricRde, decodeCompactRecursiveParametricRde} from './compact-recursive-rde-wire';
import {solveRecursiveParametricRde, verifyRecursiveParametricRde} from './recursive-rde';
import {encodeRecursiveParametricRde, decodeRecursiveParametricRde} from './recursive-rde-wire';
import {descendCoefficientSystem} from './recursive-coefficient-system';
import {solveCompactRationalLinearSystem} from './compact-rational-linear';
import {rationalInOwner} from './recursive-rde-family';
import type {DifferentialElement as E} from './differential-field';
import {packRecursiveArtifactGraph, unpackRecursiveArtifactGraph} from './recursive-artifact-graph';
import * as core from './recursive-rde';
import * as compact from './compact-recursive-rde';
import * as matrix from './compact-rational-linear';
import * as padic from './rational-padic-matrix';
import * as derivative from './differential-derivative';
afterEach(() => vi.restoreAllMocks());

function fixture(hyper = true) {
  const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), admitted = hyper ? buildExponential(s.ctx, s.f, 't', [s.x], bounds) : buildLogarithm(s.ctx, s.f, 't', s.x, bounds);
  if (admitted.status !== 'supported') throw Error('known first-level fixture');
  const owner = admitted.field, view = CertifiedTowerView.firstLevel(s.ctx, root, owner, owner.admission!, bounds);
  return {...s, view, owner, t: owner.generator(s.ctx)};
}
function contains(s: ReturnType<typeof fixture>, proof: CompactRecursiveParametricRde, coefficients: readonly bigint[], value: E): boolean {
  if (proof.family === null) return false;
  const f = s.owner, family = proof.family, directions = family.directions, matrix = coefficients.map((_, i) => directions.map(p => rationalInOwner(s.ctx, f, p.coefficients[i])));
  const rhs = coefficients.map((n, i) => f.subtract(s.ctx, f.fromInteger(s.ctx, n), rationalInOwner(s.ctx, f, family.particular.coefficients[i])));
  matrix.push(directions.map(p => p.value)); rhs.push(f.subtract(s.ctx, value, family.particular.value));
  const descent = descendCoefficientSystem(fresh(), f, {rows: rhs.length, columns: directions.length, matrix, rhs}, bounds);
  return solveCompactRationalLinearSystem(fresh(), descent.system).kind === 'consistent';
}
function disable() {
  disableRecursiveProducers(); const stop = () => {throw Error('compact family producer disabled');};
  vi.spyOn(core, 'solveRecursiveHomogeneousReductionWithin').mockImplementation(stop); vi.spyOn(compact, 'solveCompactRecursiveParametricRdeWithin').mockImplementation(stop);
  vi.spyOn(compact, 'solveCompactRecursiveHomogeneousRdeWithin').mockImplementation(stop); vi.spyOn(matrix, 'solveCompactRationalLinearSystemWithin').mockImplementation(stop);
  vi.spyOn(padic, 'invertRationalBlockPadicWithin').mockImplementation(stop); vi.spyOn(derivative, 'differentiateWithin').mockImplementation(stop);
}
describe('complete compact recursive paired RDE families', () => {
  it('retains resonance, inverse-power homogeneous freedom and zero-valued coefficient directions', () => {
    const s = fixture(), f = s.owner, zero = f.fromInteger(s.ctx, 0n), a = f.fromInteger(s.ctx, -1n), proof = solveCompactRecursiveParametricRde(fresh(), s.view, a, zero, [s.t], bounds);
    expect(proof.family?.directions).toHaveLength(2); expect(contains(s, proof, [1n], f.multiply(s.ctx, f.embed(s.ctx, s.x), s.t))).toBe(true); expect(contains(s, proof, [0n], s.t)).toBe(true);
    expect(proof.slice.method).toBe('rank-block-kernel'); expect(proof.slice).not.toHaveProperty('operations'); expect(proof.homogeneous.independent).not.toHaveProperty('rref');
    const inverse = solveCompactRecursiveParametricRde(fresh(), s.view, f.fromInteger(s.ctx, 2n), zero, [], bounds);
    expect(contains(s, inverse, [], f.inverse(s.ctx, f.multiply(s.ctx, s.t, s.t)))).toBe(true);
    const one = f.fromInteger(s.ctx, 1n), duplicate = solveCompactRecursiveParametricRde(fresh(), s.view, zero, zero, [one, one, zero], bounds);
    expect(duplicate.family?.directions).toHaveLength(4); expect(contains(s, duplicate, [1n, -1n, 0n], zero)).toBe(true); expect(contains(s, duplicate, [0n, 0n, 1n], zero)).toBe(true);
    expect(contains(s, duplicate, [1n, 0n, 0n], f.embed(s.ctx, s.x))).toBe(true); expect(contains(s, duplicate, [0n, 0n, 0n], one)).toBe(true);
  });
  it.each([false, true])('preserves complete field-solution decisions, without elementary absence claims (hyper=%s)', hyper => {
    const s = fixture(hyper), f = s.owner, zero = f.fromInteger(s.ctx, 0n), x = f.embed(s.ctx, s.x), input = hyper ? f.exactDivide(s.ctx, s.t, x) : f.inverse(s.ctx, f.multiply(s.ctx, x, s.t));
    const proof = solveCompactRecursiveParametricRde(fresh(), s.view, zero, input, [], bounds); expect(proof.kind).toBe('no-field-solution'); expect(proof.slice.kind).toBe('inconsistent');
    verifyCompactRecursiveParametricRde(fresh(), s.view, zero, input, [], proof, bounds); expect(proof).not.toHaveProperty('nonElementary');
  });
  it('handles rational zero-row families and preserves original strict/version-one certificates', () => {
    const s = setup(), view = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), zero = s.f.fromInteger(s.ctx, 0n), forcing = [zero, zero];
    const proof = solveCompactRecursiveParametricRde(fresh(), view, zero, zero, forcing, bounds), old = solveRecursiveParametricRde(fresh(), view, zero, zero, forcing, bounds);
    expect(proof.family?.directions).toHaveLength(3); expect(old.family?.directions).toHaveLength(3); verifyRecursiveParametricRde(fresh(), view, zero, zero, forcing, old, bounds);
    const compactData = encodeCompactRecursiveParametricRde(fresh(), view, zero, zero, forcing, proof, bounds), legacy = encodeRecursiveParametricRde(fresh(), view, zero, zero, forcing, old, bounds);
    disable(); expect(decodeCompactRecursiveParametricRde(fresh(), view, zero, zero, forcing, compactData, bounds).kind).toBe('solutions'); expect(decodeRecursiveParametricRde(fresh(), view, zero, zero, forcing, legacy, bounds).kind).toBe('solutions');
    expect(() => decodeRecursiveParametricRde(fresh(), view, zero, zero, forcing, compactData, bounds)).toThrow('invalid-input');
    expect(() => decodeCompactRecursiveParametricRde(fresh(), view, zero, zero, forcing, legacy, bounds)).toThrow('invalid-input');
  });
  it.each([false, true])('replays complete positive/negative evidence with search, elimination and derivatives disabled (%s)', negative => {
    const s = fixture(!negative), f = s.owner, zero = f.fromInteger(s.ctx, 0n), a = f.fromInteger(s.ctx, negative ? 0n : -1n), input = negative ? f.inverse(s.ctx, f.multiply(s.ctx, f.embed(s.ctx, s.x), s.t)) : zero, forcing = negative ? [] : [s.t];
    const proof = solveCompactRecursiveParametricRde(fresh(), s.view, a, input, forcing, bounds), data = encodeCompactRecursiveParametricRde(fresh(), s.view, a, input, forcing, proof, bounds), target = fixture(!negative), tf = target.owner;
    const ta = tf.fromInteger(target.ctx, negative ? 0n : -1n), tb = negative ? tf.inverse(target.ctx, tf.multiply(target.ctx, tf.embed(target.ctx, target.x), target.t)) : tf.fromInteger(target.ctx, 0n), ts = negative ? [] : [target.t];
    disable(); const result = decodeCompactRecursiveParametricRde(fresh(), target.view, ta, tb, ts, structuredClone(data), bounds);
    expect(result.kind).toBe(proof.kind); expect(result.homogeneous.view.owner).toBe(tf); verifyCompactRecursiveParametricRde(fresh(), target.view, ta, tb, ts, result, bounds);
  });
  it('rejects incomplete ranks, kernels, affine mappings, ordered forcing and conditions', () => {
    const s = fixture(), f = s.owner, a = f.fromInteger(s.ctx, -1n), zero = f.fromInteger(s.ctx, 0n), forcing = [s.t, zero], proof = solveCompactRecursiveParametricRde(fresh(), s.view, a, zero, forcing, bounds);
    for (const changed of [{...proof, conditions: []}, {...proof, homogeneous: {...proof.homogeneous, basis: []}}, {...proof, slice: {...proof.slice, rank: proof.slice.rank + 1}},
      {...proof, slice: {...proof.slice, nullspace: []}}, {...proof, homogeneous: {...proof.homogeneous, independent: {...proof.homogeneous.independent, inverse: []}}},
      {...proof, family: proof.family && {...proof.family, directions: []}}]) expect(() => verifyCompactRecursiveParametricRde(fresh(), s.view, a, zero, forcing, changed, bounds)).toThrow('verification-failed');
    const data = encodeCompactRecursiveParametricRde(fresh(), s.view, a, zero, forcing, proof, bounds) as {tag: string; version: number; payload: unknown}, body = structuredClone(unpackRecursiveArtifactGraph(fresh(), data.payload, bounds)) as {decision: Record<string, unknown>};
    expect(() => decodeCompactRecursiveParametricRde(fresh(), s.view, a, zero, [zero, s.t], data, bounds)).toThrow('verification-failed');
    expect(() => decodeCompactRecursiveParametricRde(fresh(), s.view, a, zero, forcing, {...data, payload: packRecursiveArtifactGraph(fresh(), {...body, decision: {...body.decision, verified: true}}, bounds)}, bounds)).toThrow('invalid-input');
    expect(proof.family?.directions.every(d => d.coefficients.every(c => Q.isZero(s.ctx, c)))).toBe(false);
  });
  it('retains immutable operands, cold replay and sticky/stricter budgets', () => {
    const s = fixture(), f = s.owner, a = f.fromInteger(s.ctx, -1n), zero = f.fromInteger(s.ctx, 0n), forcing = Object.freeze([s.t]), proof = solveCompactRecursiveParametricRde(fresh(), s.view, a, zero, forcing, bounds), data = encodeCompactRecursiveParametricRde(fresh(), s.view, a, zero, forcing, proof, bounds), ctx = fresh();
    decodeCompactRecursiveParametricRde(ctx, s.view, a, zero, forcing, data, bounds); const used = ctx.usage.work; decodeCompactRecursiveParametricRde(ctx, s.view, a, zero, forcing, data, bounds); expect(ctx.usage.work).toBe(2 * used);
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}, {towerHeight: 1}]) expect(() => decodeCompactRecursiveParametricRde(fresh(), s.view, a, zero, forcing, data, {...bounds, ...patch})).toThrow('resource-limit');
    for (const limit of [{work: 1}, {allocation: 1}, {integerBits: 1}, {degree: 0}]) {const stopped = new ExecutionContext({...fresh().limits, ...limit}); expect(() => decodeCompactRecursiveParametricRde(stopped, s.view, a, zero, forcing, data, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');}
    expect(Object.isFrozen(proof) && Object.isFrozen(proof.forcing) && Object.isFrozen(proof.slice.nullspace)).toBe(true); expect(forcing).toEqual([s.t]);
    const other = fixture(); expect(() => solveCompactRecursiveParametricRde(fresh(), {...s.view}, a, zero, forcing, bounds)).toThrow('domain-mismatch');
    expect(() => verifyCompactRecursiveParametricRde(fresh(), other.view, a, zero, forcing, proof, bounds)).toThrow('domain-mismatch');
  });
});
