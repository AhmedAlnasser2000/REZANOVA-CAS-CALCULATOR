import {afterEach, describe, expect, it, vi} from 'vitest';
import {setup, mixed, extend, bounds, fresh} from './__tests__/transcendental-support';
import {disableRecursiveProducers} from './__tests__/recursive-replay-support';
import {compactTowerFixture} from './__tests__/transcendental-compact-fixtures';
import {CertifiedTowerView} from './recursive-certified-tower';
import {TranscendentalDomain} from './transcendental-domain';
import {transcendentalConditions} from './transcendental-conditions';
import {ExecutionContext} from './execution';
import {rationalField as Q} from './field';
import {produceCompactTranscendentalCandidate, checkCompactTranscendentalCandidate, verifyCompactTranscendentalElementary} from './transcendental-elementary-evidence';
import {encodeCompactTranscendentalElementary, decodeCompactTranscendentalElementary} from './transcendental-elementary-wire';
import {integrateTranscendental, verifyTranscendentalDecision} from './transcendental-decision';
import {encodeTranscendentalDecision, decodeTranscendentalDecision} from './transcendental-decision-wire';
import {packRecursiveArtifactGraph, unpackRecursiveArtifactGraph} from './recursive-artifact-graph';
import * as decision from './transcendental-decision';
import * as compact from './transcendental-elementary-evidence';
import * as primitive from './transcendental-primitive';
import * as firstPrimitive from './first-level-rational-primitive';
import * as hermite from './first-level-rational-hermite';
import * as residue from './transcendental-residue';
import * as selection from './first-level-rational-selection';
import * as derivative from './differential-derivative';
import * as structure from './structured-differential-admission';
import * as rational from './rational-decision-internal';
afterEach(() => vi.restoreAllMocks());

function positive(logFirst = false) {
  const s = mixed(logFirst), f = s.owner, t = f.generator(s.ctx);
  // D log(1+t^2) = 2t*D(t)/(1+t^2), independent of the unused lower generator.
  const rate = f.embed(s.ctx, s.view.rate!), dt = s.view.monomial === 'primitive' ? rate : f.multiply(s.ctx, rate, t);
  const input = f.exactDivide(s.ctx, f.multiply(s.ctx, f.fromInteger(s.ctx, 2n), f.multiply(s.ctx, t, dt)), f.add(s.ctx, f.multiply(s.ctx, t, t), f.fromInteger(s.ctx, 1n)));
  return {...s, input};
}
function checked(logFirst = false) {
  const s = positive(logFirst), candidate = produceCompactTranscendentalCandidate(fresh(), s.view, s.input, bounds), proof = checkCompactTranscendentalCandidate(fresh(), s.view, s.input, candidate, bounds);
  if (proof.kind !== 'elementary') throw Error('known root logarithm'); return {...s, candidate, proof};
}
function disable() {
  disableRecursiveProducers(); const stop = () => {throw Error('compact recursive producer disabled');};
  vi.spyOn(compact, 'produceCompactTranscendentalCandidateWithin').mockImplementation(stop); vi.spyOn(compact, 'checkCompactTranscendentalCandidateWithin').mockImplementation(stop);
  vi.spyOn(decision, 'produceTranscendentalCandidateWithin').mockImplementation(stop); vi.spyOn(decision, 'integrateTranscendentalWithin').mockImplementation(stop);
  vi.spyOn(primitive, 'differentiateTranscendentalPrimitiveWithin').mockImplementation(stop); vi.spyOn(firstPrimitive, 'differentiateFirstLevelPrimitiveWithin').mockImplementation(stop);
  vi.spyOn(hermite, 'firstLevelHermite').mockImplementation(stop); vi.spyOn(residue, 'transcendentalResiduesWithin').mockImplementation(stop); vi.spyOn(selection, 'selectFirstLevelResidues').mockImplementation(stop);
  vi.spyOn(derivative, 'differentiateWithin').mockImplementation(stop); vi.spyOn(structure, 'certifyStructuredDifferentialExtensionWithin').mockImplementation(stop);
  vi.spyOn(rational, 'integrateRationalWithin').mockImplementation(stop);
}
describe('compact recursive exponential/logarithmic positive authority', () => {
  it.each([false, true])('publishes both mixed orders before the final derivative (log first=%s)', logFirst => {
    const s = positive(logFirst), spy = vi.spyOn(primitive, 'differentiateTranscendentalPrimitiveWithin'), value = produceCompactTranscendentalCandidate(fresh(), s.view, s.input, bounds);
    expect(value.kind).toBe('elementary'); if (value.kind !== 'elementary') throw Error('known positive');
    expect(spy.mock.calls.every(([, p]) => p !== value.primitive)).toBe(true); expect(value).not.toHaveProperty('derivative'); expect(value).not.toHaveProperty('hermite');
    const proof = checkCompactTranscendentalCandidate(fresh(), s.view, s.input, value, bounds); expect(proof.kind).toBe('elementary');
    if (proof.kind === 'elementary') {expect(Object.isFrozen(proof) && Object.isFrozen(proof.conditions)).toBe(true); verifyCompactTranscendentalElementary(fresh(), s.view, s.input, proof, bounds);}
  });
  it.each([false, true])('rebinds fresh mixed owners and checks all-root logs with producers disabled (%s)', logFirst => {
    const s = checked(logFirst), data = encodeCompactTranscendentalElementary(fresh(), s.view, s.input, s.proof, bounds), target = positive(logFirst);
    expect(data).toMatchObject({tag: 'transcendental-decision', version: 2}); disable();
    const proof = decodeCompactTranscendentalElementary(fresh(), target.view, target.input, structuredClone(data), bounds);
    expect(proof.domain).not.toBe(s.proof.domain); expect(proof.domain.field).toBe(target.owner); expect(proof.primitive.terms.length).toBeGreaterThan(0);
    verifyCompactTranscendentalElementary(fresh(), target.view, target.input, proof, bounds);
    expect(encodeCompactTranscendentalElementary(fresh(), target.view, target.input, proof, bounds)).toEqual(data);
  });
  it('retains rational root additions and original version-one full replay', () => {
    const s = setup(), view = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), input = s.p([1], [1, 0, 1]);
    const old = integrateTranscendental(fresh(), view, input, bounds), legacy = encodeTranscendentalDecision(fresh(), view, input, old, bounds);
    const value = produceCompactTranscendentalCandidate(fresh(), view, input, bounds), proof = checkCompactTranscendentalCandidate(fresh(), view, input, value, bounds);
    if (proof.kind !== 'elementary') throw Error('known rational positive'); const data = encodeCompactTranscendentalElementary(fresh(), view, input, proof, bounds);
    disable(); expect(decodeTranscendentalDecision(fresh(), view, input, legacy, bounds).kind).toBe('elementary');
    expect(decodeCompactTranscendentalElementary(fresh(), view, input, data, bounds).primitive.terms.length).toBeGreaterThan(0);
    expect(() => decodeTranscendentalDecision(fresh(), view, input, data, bounds)).toThrow('invalid-input');
    expect(() => decodeCompactTranscendentalElementary(fresh(), view, input, legacy, bounds)).toThrow('invalid-input');
  });
  it('checks reducible quotient-ring root bindings and every coefficient derivative', () => {
    const s = mixed(), f = s.owner, t = f.generator(s.ctx), x = f.embed(s.ctx, s.x), domain = new TranscendentalDomain(s.ctx, s.view, bounds);
    // Sum over alpha=+1,-1 of alpha*log(t+alpha). Its derivative
    // is D(t)/(t+1)-D(t)/(t-1), without any branch identity.
    const modulus = domain.z.make(s.ctx, [-1n, 0n, 1n].map(n => Q.fromInteger(s.ctx, n))), weight = domain.z.make(s.ctx, [Q.fromInteger(s.ctx, 0n), Q.fromInteger(s.ctx, 1n)]), argument = domain.fz.make(s.ctx, [t, f.fromInteger(s.ctx, 1n)]);
    const term = primitive.transcendentalLogTerm(s.ctx, domain, modulus, weight, argument, bounds), value = primitive.transcendentalPrimitive(s.ctx, domain, x, [term], bounds);
    const dt = f.multiply(s.ctx, f.embed(s.ctx, s.view.rate!), t), target = f.add(s.ctx, f.fromInteger(s.ctx, 1n), f.subtract(s.ctx,
      f.exactDivide(s.ctx, dt, f.add(s.ctx, t, f.fromInteger(s.ctx, 1n))), f.exactDivide(s.ctx, dt, f.subtract(s.ctx, t, f.fromInteger(s.ctx, 1n)))));
    const conditions = transcendentalConditions(s.ctx, domain, target, value), proof = checkCompactTranscendentalCandidate(fresh(), s.view, target, Object.freeze({kind: 'elementary', domain, input: target, primitive: value, conditions}), bounds);
    if (proof.kind !== 'elementary') throw Error('known reducible root-log primitive'); const data = encodeCompactTranscendentalElementary(fresh(), s.view, target, proof, bounds);
    const coefficient = proof.derivative.terms[0].coefficients[0], wrong = {...coefficient, derivative: f.add(s.ctx, coefficient.derivative, f.fromInteger(s.ctx, 1n))};
    expect(() => verifyCompactTranscendentalElementary(fresh(), s.view, target, {...proof, derivative: {...proof.derivative, terms: [{...proof.derivative.terms[0], coefficients: [wrong, ...proof.derivative.terms[0].coefficients.slice(1)]}]}}, bounds)).toThrow('verification-failed');
    disable(); expect(decodeCompactTranscendentalElementary(fresh(), s.view, target, data, bounds).primitive.terms[0].modulus.coefficients).toHaveLength(3);
  });
  it('keeps complete residue/polynomial negative authority and strict wrappers', () => {
    for (const route of ['residue', 'polynomial', 'exponential'] as const) {
      const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), view = extend(s.ctx, root, route === 'exponential' ? 'exponential' : 'logarithm', s.x, 't'), f = view.owner, t = f.generator(s.ctx);
      const input = route === 'residue' ? f.inverse(s.ctx, t) : f.exactDivide(s.ctx, t, f.embed(s.ctx, route === 'exponential' ? s.x : s.p([1, 1])));
      const value = produceCompactTranscendentalCandidate(fresh(), view, input, bounds), proof = checkCompactTranscendentalCandidate(fresh(), view, input, value, bounds);
      expect(proof.kind).toBe('non-elementary'); if (proof.kind !== 'non-elementary') throw Error('known obstruction'); verifyTranscendentalDecision(fresh(), view, input, proof, bounds);
      expect(proof.hermite).not.toBeNull(); expect(proof.obstruction?.kind).toBe(route === 'residue' ? 'normal-residue' : route === 'polynomial' ? 'logarithmic-coefficient' : 'exponential-component');
      expect(integrateTranscendental(fresh(), view, input, bounds).kind).toBe('non-elementary');
    }
  });
  it('preserves inverse-generator/nested coefficient restrictions and equal-derivative construction shifts', () => {
    const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), view = extend(s.ctx, root, 'logarithm', s.p([0, 2]), 't'), f = view.owner, t = f.generator(s.ctx);
    const input = f.exactDivide(s.ctx, f.embed(s.ctx, view.rate!), t), value = produceCompactTranscendentalCandidate(fresh(), view, input, bounds), proof = checkCompactTranscendentalCandidate(fresh(), view, input, value, bounds);
    if (proof.kind !== 'elementary') throw Error('known log t'); expect(proof.conditions.some(c => c.path === 'input' && f.equal(s.ctx, c.value, t))).toBe(true);
    expect(proof.conditions.some(c => c.path === 'construction.2.argument.numerator')).toBe(true);
    const data = encodeCompactTranscendentalElementary(fresh(), view, input, proof, bounds), other = setup(), parent = CertifiedTowerView.rationalFunctions(other.ctx, other.f, bounds), shifted = extend(other.ctx, parent, 'logarithm', other.x, 't');
    const wrong = shifted.owner.exactDivide(other.ctx, shifted.owner.embed(other.ctx, shifted.rate!), shifted.owner.generator(other.ctx));
    expect(() => decodeCompactTranscendentalElementary(fresh(), shifted, wrong, data, bounds)).toThrow('verification-failed');
  });
  it('rejects mutable/foreign primitives, changed derivatives/norms/conditions and malformed stored authority', () => {
    const s = checked(), p = s.proof;
    expect(() => checkCompactTranscendentalCandidate(fresh(), s.view, s.input, {...p, primitive: {...p.primitive}}, bounds)).toThrow('mutable primitive candidate');
    for (const changed of [{...p, input: s.owner.fromInteger(s.ctx, 0n)}, {...p, conditions: []}, {...p, derivative: {...p.derivative, derivative: s.owner.fromInteger(s.ctx, 0n)}},
      {...p, primitive: {...p.primitive, fieldPart: s.owner.generator(s.ctx)}}]) expect(() => verifyCompactTranscendentalElementary(fresh(), s.view, s.input, changed, bounds)).toThrow('verification-failed');
    const term = p.primitive.terms[0]; expect(term).toBeDefined();
    const wrongNorm = {...term, norm: s.owner.add(s.ctx, term.norm, s.owner.fromInteger(s.ctx, 1n))};
    expect(() => verifyCompactTranscendentalElementary(fresh(), s.view, s.input, {...p, primitive: {...p.primitive, terms: [wrongNorm, ...p.primitive.terms.slice(1)]}}, bounds)).toThrow('verification-failed');
    const trace = p.derivative.terms[0];
    expect(() => verifyCompactTranscendentalElementary(fresh(), s.view, s.input, {...p, derivative: {...p.derivative, terms: [{...trace, trace: {...trace.trace, trace: s.owner.add(s.ctx, trace.trace.trace, s.owner.fromInteger(s.ctx, 1n))}}, ...p.derivative.terms.slice(1)]}}, bounds)).toThrow('verification-failed');
    const other = positive(); expect(() => verifyCompactTranscendentalElementary(fresh(), other.view, other.input, p, bounds)).toThrow('domain-mismatch');
    const data = encodeCompactTranscendentalElementary(fresh(), s.view, s.input, p, bounds) as {tag: string; version: number; payload: unknown};
    const body = structuredClone(unpackRecursiveArtifactGraph(fresh(), data.payload, bounds)) as {evidence: Record<string, unknown>};
    for (const patch of [{conditions: []}, {verified: true}, {rule: 'guess'}, {kind: 'non-elementary'}]) {
      const altered = {...data, payload: packRecursiveArtifactGraph(fresh(), {...body, evidence: {...body.evidence, ...patch}}, bounds)};
      expect(() => decodeCompactTranscendentalElementary(fresh(), s.view, s.input, altered, bounds)).toThrow();
    }
    expect(() => decodeCompactTranscendentalElementary(fresh(), s.view, s.owner.fromInteger(s.ctx, 0n), data, bounds)).toThrow('verification-failed');
    expect(Object.isFrozen(p.primitive)).toBe(true);
  });
  it('checks cold operations and whole-artifact budgets with sticky exhaustion', () => {
    const s = checked(), data = encodeCompactTranscendentalElementary(fresh(), s.view, s.input, s.proof, bounds), ctx = fresh();
    decodeCompactTranscendentalElementary(ctx, s.view, s.input, data, bounds); const used = ctx.usage.work;
    decodeCompactTranscendentalElementary(ctx, s.view, s.input, data, bounds); expect(ctx.usage.work).toBe(2 * used);
    for (const limit of [{towerHeight: 1}, {artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodeCompactTranscendentalElementary(fresh(), s.view, s.input, data, {...bounds, ...limit})).toThrow('resource-limit');
    for (const limit of [{work: 1}, {allocation: 1}, {integerBits: 1}, {degree: 0}]) {
      const stopped = new ExecutionContext({...fresh().limits, ...limit}); expect(() => decodeCompactTranscendentalElementary(stopped, s.view, s.input, data, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
    }
  });
  it('retains the complete height-eight construction with producer-independent bounded replay', () => {
    const s = compactTowerFixture(fresh(), 'height-eight'), candidate = produceCompactTranscendentalCandidate(fresh(), s.view, s.input, bounds), proof = checkCompactTranscendentalCandidate(fresh(), s.view, s.input, candidate, bounds);
    if (proof.kind !== 'elementary') throw Error('known height-eight derivative'); expect(s.view.owner.height).toBe(8);
    const data = encodeCompactTranscendentalElementary(fresh(), s.view, s.input, proof, bounds), target = compactTowerFixture(fresh(), 'height-eight'); disable();
    expect(decodeCompactTranscendentalElementary(fresh(), target.view, target.input, data, bounds).kind).toBe('elementary');
  });
});
