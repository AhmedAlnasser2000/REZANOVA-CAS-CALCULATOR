import {afterEach, expect, it, vi} from 'vitest';
import {fresh, bounds} from './__tests__/transcendental-support';
import {compactNegativeFixture, type CompactNegativeFixture} from './__tests__/transcendental-negative-fixtures';
import {disableRecursiveProducers} from './__tests__/recursive-replay-support';
import {ExecutionContext} from './execution';
import {produceCompactTranscendentalDecisionCandidate as produce, checkCompactTranscendentalDecisionCandidate as check,
  verifyCompactTranscendentalNegative as verify, type CompactTranscendentalNegative} from './transcendental-negative-evidence';
import {encodeCompactTranscendentalNegative as encode, decodeCompactTranscendentalNegative as decode} from './transcendental-negative-wire';
import {integrateTranscendental} from './transcendental-decision';
import {encodeTranscendentalDecision, decodeTranscendentalDecision} from './transcendental-decision-wire';
import * as decision from './transcendental-decision';
import * as negative from './transcendental-negative-evidence';
import * as primitive from './transcendental-primitive';
import * as hermite from './first-level-rational-hermite';
import * as residue from './transcendental-residue';
import * as selection from './first-level-rational-selection';
import * as polynomial from './transcendental-polynomial';
import * as laurent from './transcendental-laurent';
import * as derivative from './differential-derivative';
import * as structure from './structured-differential-admission';
import * as crde from './compact-recursive-rde';
import * as cli from './compact-recursive-limited';
import * as linear from './compact-rational-linear';
import * as padic from './rational-padic-matrix';
afterEach(() => vi.restoreAllMocks());
function fixture(kind: CompactNegativeFixture = 'polynomial-prefix') {
  const s = compactNegativeFixture(fresh(), kind), value = produce(fresh(), s.view, s.input, bounds), proof = check(fresh(), s.view, s.input, value, bounds);
  if (proof.kind !== 'non-elementary') throw Error('known negative fixture'); return {...s, value, proof};
}
function disable(): void {
  disableRecursiveProducers(); const stop = () => {throw Error('compact integration producer disabled');};
  vi.spyOn(decision, 'produceTranscendentalCandidateWithin').mockImplementation(stop); vi.spyOn(decision, 'integrateTranscendentalWithin').mockImplementation(stop);
  vi.spyOn(negative, 'produceCompactTranscendentalDecisionCandidateWithin').mockImplementation(stop); vi.spyOn(negative, 'compactTranscendentalNegativeWithin').mockImplementation(stop);
  vi.spyOn(primitive, 'differentiateTranscendentalPrimitiveWithin').mockImplementation(stop); vi.spyOn(derivative, 'differentiateWithin').mockImplementation(stop);
  vi.spyOn(hermite, 'firstLevelHermite').mockImplementation(stop); vi.spyOn(residue, 'transcendentalResiduesWithin').mockImplementation(stop); vi.spyOn(selection, 'selectFirstLevelResidues').mockImplementation(stop);
  vi.spyOn(polynomial, 'reduceTranscendentalPolynomialWithin').mockImplementation(stop); vi.spyOn(laurent, 'reduceTranscendentalLaurentWithin').mockImplementation(stop);
  vi.spyOn(structure, 'certifyStructuredDifferentialExtensionWithin').mockImplementation(stop);
  vi.spyOn(crde, 'solveCompactRecursiveParametricRdeWithin').mockImplementation(stop); vi.spyOn(crde, 'completeCompactRecursiveParametricRdeWithin').mockImplementation(stop);
  vi.spyOn(cli, 'solveCompactRecursiveLimitedIntegrationWithin').mockImplementation(stop); vi.spyOn(cli, 'completeCompactRecursiveLimitedIntegrationWithin').mockImplementation(stop);
  vi.spyOn(linear, 'solveCompactRationalLinearSystemWithin').mockImplementation(stop); vi.spyOn(padic, 'invertRationalBlockPadicWithin').mockImplementation(stop);
}
it.each(['residue', 'polynomial-prefix', 'laurent-prefix', 'parent', 'residue-polynomial'] as const)('replays complete %s obstruction and successful prefix without producers', kind => {
  const s = fixture(kind), data = encode(fresh(), s.view, s.input, s.proof, bounds), target = compactNegativeFixture(fresh(), kind);
  expect(data).toMatchObject({tag: 'transcendental-decision', version: 2});
  if (kind === 'polynomial-prefix') {expect(s.proof.polynomial!.steps).toHaveLength(2); expect(s.proof.polynomial!.failure).toBe(1);}
  if (kind === 'laurent-prefix') {expect(s.proof.laurent!.powers).toEqual([-1n, 1n]); expect(s.proof.laurent!.failure).toBe(1);}
  if (kind === 'parent') expect(s.proof.parent?.obstruction.kind).toBe('exponential-component');
  if (kind === 'residue-polynomial') expect(s.proof.remainder!.logarithms.terms.length).toBeGreaterThan(0);
  disable(); const p = decode(fresh(), target.view, target.input, structuredClone(data), bounds); verify(fresh(), target.view, target.input, p, bounds);
  expect(check(fresh(), s.view, s.input, s.value, bounds).kind).toBe('non-elementary');
  expect(p.domain.field).toBe(target.view.owner); expect(p.domain).not.toBe(s.proof.domain); expect(encode(fresh(), target.view, target.input, p, bounds)).toEqual(data);
});
it('composes retained differential reductions without repeating RDE or integration search', () => {
  const s = compactNegativeFixture(fresh(), 'polynomial-prefix'), old = decision.produceTranscendentalCandidate(fresh(), s.view, s.input, bounds);
  disableRecursiveProducers(); const stop = () => {throw Error('repeated differential solving');};
  vi.spyOn(decision, 'produceTranscendentalCandidateWithin').mockImplementation(stop);
  vi.spyOn(crde, 'solveCompactRecursiveParametricRdeWithin').mockImplementation(stop); vi.spyOn(cli, 'solveCompactRecursiveLimitedIntegrationWithin').mockImplementation(stop);
  const ctx = fresh(), proof = ctx.operation(() => negative.compactTranscendentalNegativeWithin(ctx, s.view, s.input, old, bounds));
  expect(proof.polynomial!.steps.map(p => p.limited.rule)).toEqual(['recursive-limited-rank-family-v2', 'recursive-limited-rank-family-v2']);
});
it('retains original version-one negative replay and rejects cross-version misuse', () => {
  const s = fixture('residue'), old = integrateTranscendental(fresh(), s.view, s.input, bounds), legacy = encodeTranscendentalDecision(fresh(), s.view, s.input, old, bounds), data = encode(fresh(), s.view, s.input, s.proof, bounds);
  disable(); expect(decodeTranscendentalDecision(fresh(), s.view, s.input, legacy, bounds).kind).toBe('non-elementary');
  expect(() => decodeTranscendentalDecision(fresh(), s.view, s.input, data, bounds)).toThrow('invalid-input'); expect(() => decode(fresh(), s.view, s.input, legacy, bounds)).toThrow('invalid-input');
});
it('rejects changed rank, coverage, mappings, target, obstruction and retained conditions', () => {
  const s = fixture(), e = s.proof, p = e.polynomial!, step = p.steps[1], rde = step.limited.rde, zero = s.view.owner.fromInteger(s.ctx, 0n);
  const changed: CompactTranscendentalNegative[] = [{...e, input: zero}, {...e, obstruction: {...e.obstruction, index: 0}}, {...e, conditions: e.conditions.slice(1)},
    {...e, polynomial: {...p, steps: p.steps.slice(1)}}, {...e, polynomial: {...p, failure: null}},
    {...e, polynomial: {...p, steps: [{...p.steps[0], next: zero}, step]}},
    {...e, polynomial: {...p, steps: [p.steps[0], {...step, limited: {...step.limited, rde: {...rde, slice: {...rde.slice, rank: rde.slice.rank + 1}}}}]}}];
  for (const bad of changed) expect(() => verify(fresh(), s.view, s.input, bad, bounds)).toThrow('verification-failed');
  const data = encode(fresh(), s.view, s.input, e, bounds); expect(() => decode(fresh(), s.view, zero, data, bounds)).toThrow('verification-failed');
  expect(() => decode(fresh(), s.view, s.input, {...data as object, verified: true}, bounds)).toThrow('invalid-input');
});
it('checks original shifted constructions, ownership, cold operations and sticky limits', () => {
  const s = fixture('residue'), data = encode(fresh(), s.view, s.input, s.proof, bounds), other = compactNegativeFixture(fresh(), 'residue', 2), ctx = fresh();
  expect(() => decode(fresh(), other.view, other.input, data, bounds)).toThrow('verification-failed'); expect(() => verify(fresh(), other.view, s.input, s.proof, bounds)).toThrow('domain-mismatch');
  decode(ctx, s.view, s.input, data, bounds); const work = ctx.usage.work; decode(ctx, s.view, s.input, data, bounds); expect(ctx.usage.work).toBe(2 * work);
  for (const patch of [{artifactNodes: 1}, {artifactDepth: 1}, {artifactBytes: 1}]) expect(() => decode(fresh(), s.view, s.input, data, {...bounds, ...patch})).toThrow('resource-limit');
  for (const patch of [{work: 1}, {allocation: 1}, {degree: 0}]) {const stopped = new ExecutionContext({...fresh().limits, ...patch}); expect(() => verify(stopped, s.view, s.input, s.proof, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');}
  expect(Object.isFrozen(s.proof) && Object.isFrozen(s.proof.conditions)).toBe(true);
  expect(() => check(fresh(), s.view, s.input, {...s.proof}, bounds)).toThrow('invalid-input');
  expect(() => check(fresh(), s.view, s.input, Object.freeze({...s.proof, conditions: [...s.proof.conditions]}), bounds)).toThrow('invalid-input');
});
