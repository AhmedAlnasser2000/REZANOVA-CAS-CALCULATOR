import {it, expect, vi, afterEach} from 'vitest';
import {bounds} from './differential-test-support';
import {exponentialSetup} from './__tests__/exponential-rational-fixtures';
import {logarithmicSetup} from './__tests__/logarithmic-rational-fixtures';
import {fresh} from './__tests__/transcendental-support';
import {ExecutionContext} from './execution';
import * as compact from './first-level-elementary-evidence';
import * as wire from './first-level-elementary-wire';
import * as exponential from './exponential-rational-decision';
import * as logarithmic from './logarithmic-rational-decision';
import * as primitive from './first-level-rational-primitive';
import * as hermite from './first-level-rational-hermite';
import * as derivative from './differential-derivative';
import * as admission from './differential-admission';
import * as prs from './subresultant';
import * as traces from './quotient-trace';
import {encodeExponentialRationalDecision, decodeExponentialRationalDecision} from './exponential-rational-wire';
import {encodeLogarithmicRationalDecision, decodeLogarithmicRationalDecision} from './logarithmic-rational-wire';
import {packRecursiveArtifactGraph, unpackRecursiveArtifactGraph} from './recursive-artifact-graph';
afterEach(() => vi.restoreAllMocks());
function disable() {
  const stop = () => {throw Error('first-level producer disabled');};
  for (const name of ['produceExponentialRationalCandidate', 'produceExponentialRationalCandidateWithin', 'checkExponentialRationalCandidate', 'checkExponentialRationalCandidateWithin', 'integrateExponentialRational'] as const) vi.spyOn(exponential, name).mockImplementation(stop);
  for (const name of ['produceLogarithmicRationalCandidate', 'produceLogarithmicRationalCandidateWithin', 'checkLogarithmicRationalCandidate', 'checkLogarithmicRationalCandidateWithin', 'integrateLogarithmicRational'] as const) vi.spyOn(logarithmic, name).mockImplementation(stop);
  vi.spyOn(primitive, 'differentiateFirstLevelPrimitiveWithin').mockImplementation(stop);
  vi.spyOn(primitive, 'firstLevelLogTermWithin').mockImplementation(stop);
  vi.spyOn(derivative, 'differentiate').mockImplementation(stop); vi.spyOn(derivative, 'differentiateWithin').mockImplementation(stop);
  vi.spyOn(admission, 'buildExponential').mockImplementation(stop); vi.spyOn(admission, 'buildLogarithm').mockImplementation(stop);
  vi.spyOn(prs, 'subresultants').mockImplementation(stop); vi.spyOn(traces, 'quotientTrace').mockImplementation(stop);
}
it('produces exponential candidates before final derivative checking and keeps complete legacy negatives', () => {
  for (const [n, d] of [[[0], [1]], [[2], [1]], [[1], [0, 1]], [[1], [1, 2, 1]], [[0, 1], [1, 0, 1]]] as const) {
    const s = exponentialSetup(), input = s.v([...n], [...d]), spy = vi.spyOn(primitive, 'differentiateFirstLevelPrimitiveWithin');
    const value = compact.produceCompactExponentialCandidate(fresh(), s.F, input, bounds);
    // Internal residue derivatives are necessary solving work; the final input
    // primitive must only be differentiated after publication.
    expect(value.kind).toBe('elementary'); if (value.kind !== 'elementary') throw Error('known positive');
    expect(spy.mock.calls.every(([, p]) => p !== value.primitive)).toBe(true); spy.mockRestore();
    expect(value).not.toHaveProperty('hermite'); expect(value).not.toHaveProperty('derivative'); expect(Object.isFrozen(value)).toBe(true);
    const proof = compact.checkCompactExponentialCandidate(fresh(), s.F, input, value, bounds);
    expect(proof.kind).toBe('elementary'); if (proof.kind !== 'elementary') throw Error('known positive');
    compact.verifyCompactExponentialElementary(fresh(), s.F, input, proof, bounds);
  }
  const s = exponentialSetup(), input = s.F.make(s.ctx, [s.c(1)], [s.x, s.c(1)]), value = compact.produceCompactExponentialCandidate(fresh(), s.F, input, bounds), proof = compact.checkCompactExponentialCandidate(fresh(), s.F, input, value, bounds);
  expect(proof.kind).toBe('non-elementary'); if (proof.kind !== 'non-elementary') throw Error('known residue obstruction');
  exponential.verifyExponentialRationalDecision(fresh(), s.F, input, proof, bounds);
});
it('keeps logarithmic inverse-generator restrictions and leaves polynomial negatives complete', () => {
  const s = logarithmicSetup(), input = s.F.multiply(s.ctx, s.F.embed(s.ctx, s.a), s.F.inverse(s.ctx, s.t));
  const value = compact.produceCompactLogarithmicCandidate(fresh(), s.F, input, bounds), proof = compact.checkCompactLogarithmicCandidate(fresh(), s.F, input, value, bounds);
  expect(proof.kind).toBe('elementary'); if (proof.kind !== 'elementary') throw Error('known log t');
  expect(proof.primitive.terms).toHaveLength(1);
  expect(proof.conditions.some(c => c.path === 'input' && c.category === 'outer-denominator' && s.F.equal(s.ctx, c.value, s.t))).toBe(true);
  compact.verifyCompactLogarithmicElementary(fresh(), s.F, input, proof, bounds);
  const bad = s.F.multiply(s.ctx, s.t, s.F.embed(s.ctx, s.p([1], [1, 1]))), negative = compact.checkCompactLogarithmicCandidate(fresh(), s.F, bad, compact.produceCompactLogarithmicCandidate(fresh(), s.F, bad, bounds), bounds);
  expect(negative.kind).toBe('non-elementary'); if (negative.kind !== 'non-elementary') throw Error('known polynomial obstruction');
  logarithmic.verifyLogarithmicRationalDecision(fresh(), s.F, bad, negative, bounds);
});
it('checks complete first-level residue negatives within the enclosing operation and starts public calls cold', () => {
  const e = exponentialSetup(), ei = e.F.make(e.ctx, [e.c(1)], [e.x, e.c(1)]), ec = compact.produceCompactExponentialCandidate(fresh(), e.F, ei, bounds);
  const l = logarithmicSetup(), li = l.F.inverse(l.ctx, l.t), lc = compact.produceCompactLogarithmicCandidate(fresh(), l.F, li, bounds);
  expect(ec.kind).toBe('non-elementary'); expect(lc.kind).toBe('non-elementary');
  const original = hermite.verifyFirstLevelHermite, tokens: (object | undefined)[] = [], checks = vi.spyOn(hermite, 'verifyFirstLevelHermite').mockImplementation((ctx, ...args) => {tokens.push(ctx.operationToken); original(ctx, ...args);});
  try {
    const ctx = fresh(); ctx.operation(() => {
      const token = ctx.operationToken;
      expect(compact.checkCompactExponentialCandidateWithin(ctx, e.F, ei, ec, bounds).kind).toBe('non-elementary');
      expect(compact.checkCompactLogarithmicCandidateWithin(ctx, l.F, li, lc, bounds).kind).toBe('non-elementary');
      expect(tokens.length).toBeGreaterThan(0); expect(tokens.every(t => t === token)).toBe(true); expect(ctx.operationToken).toBe(token);
    });
    tokens.length = 0; compact.checkCompactExponentialCandidate(ctx, e.F, ei, ec, bounds); const first = tokens[0];
    tokens.length = 0; compact.checkCompactExponentialCandidate(ctx, e.F, ei, ec, bounds); expect(tokens[0]).not.toBe(first);
    expect(() => compact.checkCompactLogarithmicCandidate(fresh(), l.F, l.F.fromInteger(l.ctx, 0n), lc, bounds)).toThrow('verification-failed');
    const stopped = new ExecutionContext({...fresh().limits, work: 1}); expect(() => compact.checkCompactExponentialCandidate(stopped, e.F, ei, ec, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
  } finally {checks.mockRestore();}
});
it('replays compact exponential positives and original v1 histories without search or derivative producers', () => {
  const s = exponentialSetup(), input = s.v([0, 1], [1, 0, 1]), proof = compact.checkCompactExponentialCandidate(fresh(), s.F, input, compact.produceCompactExponentialCandidate(fresh(), s.F, input, bounds), bounds);
  if (proof.kind !== 'elementary') throw Error('known positive');
  expect(() => compact.checkCompactExponentialCandidate(fresh(), s.F, input, {...proof, primitive: {...proof.primitive}}, bounds)).toThrow('mutable primitive candidate');
  const rebuilt = compact.checkCompactExponentialCandidate(fresh(), s.F, input, {...proof, conditions: proof.conditions.map(c => ({...c}))}, bounds);
  expect(Object.isFrozen(rebuilt.conditions) && rebuilt.conditions.every(Object.isFrozen)).toBe(true);
  const old = encodeExponentialRationalDecision(fresh(), s.F, input, exponential.integrateExponentialRational(fresh(), s.F, input, bounds), bounds), data = wire.encodeCompactExponentialElementary(fresh(), s.F, input, proof, bounds);
  expect(JSON.stringify(data).length).toBeLessThan(JSON.stringify(old).length); disable();
  wire.decodeCompactExponentialElementary(fresh(), s.F, input, JSON.parse(JSON.stringify(data)), bounds);
  decodeExponentialRationalDecision(fresh(), s.F, input, JSON.parse(JSON.stringify(old)), bounds);
});
it('replays compact logarithmic positives and original v1 histories with separate admission guards', () => {
  const s = logarithmicSetup([-1, 1], [1, 1]), input = s.F.exactDivide(s.ctx, s.F.embed(s.ctx, s.a), s.t), proof = compact.checkCompactLogarithmicCandidate(fresh(), s.F, input, compact.produceCompactLogarithmicCandidate(fresh(), s.F, input, bounds), bounds);
  if (proof.kind !== 'elementary') throw Error('known positive');
  const old = encodeLogarithmicRationalDecision(fresh(), s.F, input, logarithmic.integrateLogarithmicRational(fresh(), s.F, input, bounds), bounds), data = wire.encodeCompactLogarithmicElementary(fresh(), s.F, input, proof, bounds);
  expect(JSON.stringify(data).length).toBeLessThan(JSON.stringify(old).length); disable();
  wire.decodeCompactLogarithmicElementary(fresh(), s.F, input, JSON.parse(JSON.stringify(data)), bounds);
  decodeLogarithmicRationalDecision(fresh(), s.F, input, JSON.parse(JSON.stringify(old)), bounds);
  expect(() => wire.decodeCompactExponentialElementary(fresh(), s.F, input, data, bounds)).toThrow();
});
it('rejects mutated units, traces, target, condition provenance and missing norm/root coverage', () => {
  const s = logarithmicSetup(), input = s.F.exactDivide(s.ctx, s.F.embed(s.ctx, s.a), s.t), proof = compact.checkCompactLogarithmicCandidate(fresh(), s.F, input, compact.produceCompactLogarithmicCandidate(fresh(), s.F, input, bounds), bounds);
  if (proof.kind !== 'elementary') throw Error('known positive');
  for (const changed of [{...proof, conditions: []}, {...proof, derivative: {...proof.derivative, terms: []}}, {...proof, derivative: {...proof.derivative, derivative: s.C(0)}}, {...proof, primitive: {...proof.primitive, terms: []}}]) expect(() => compact.verifyCompactLogarithmicElementary(fresh(), s.F, input, changed, bounds)).toThrow('verification-failed');
  const data = wire.encodeCompactLogarithmicElementary(fresh(), s.F, input, proof, bounds) as {payload: unknown};
  for (const mutate of [(p: Record<string, unknown>) => {p.trusted = true;}, (p: Record<string, unknown>) => {p.kind = 'non-elementary';}, (p: Record<string, unknown>) => {(p.primitive as {terms: {inverse: unknown}[]}).terms[0].inverse = null;}, (p: Record<string, unknown>) => {(p.primitive as {terms: {normEvidence: unknown}[]}).terms[0].normEvidence = null;}, (p: Record<string, unknown>) => {(p.derivative as {terms: {trace: {columns: unknown[]}}[]}).terms[0].trace.columns = [];}, (p: Record<string, unknown>) => {(p.conditions as {path: string}[])[0].path = 'lost-source';}]) {
    const payload = structuredClone(unpackRecursiveArtifactGraph(fresh(), data.payload, bounds)) as Record<string, unknown>; mutate(payload);
    expect(() => wire.decodeCompactLogarithmicElementary(fresh(), s.F, input, {...data, payload: packRecursiveArtifactGraph(fresh(), payload, bounds)}, bounds)).toThrow();
  }
  expect(() => wire.decodeCompactLogarithmicElementary(fresh(), s.F, s.C(1), data, bounds)).toThrow('verification-failed');
  const actual = proof.primitive.terms[0].algebra, called = vi.fn(() => {throw Error('forged quotient callback');}), forged = Object.assign(Object.create(Object.getPrototypeOf(actual)), actual, {verifyUnit: called, make: called});
  const replaced = {...proof, primitive: {...proof.primitive, terms: [{...proof.primitive.terms[0], algebra: forged}]}};
  expect(() => compact.verifyCompactLogarithmicElementary(fresh(), s.F, input, replaced, bounds)).toThrow('domain-mismatch'); expect(called).not.toHaveBeenCalled();
});
it('binds equal-derivative shifts to their full original construction and distinct supplied owners', () => {
  const s = logarithmicSetup(), input = s.v([0, 1]), proof = compact.checkCompactLogarithmicCandidate(fresh(), s.F, input, compact.produceCompactLogarithmicCandidate(fresh(), s.F, input, bounds), bounds);
  if (proof.kind !== 'elementary') throw Error('known positive');
  const data = wire.encodeCompactLogarithmicElementary(fresh(), s.F, input, proof, bounds), shifted = logarithmicSetup([0, 2]);
  expect(() => wire.decodeCompactLogarithmicElementary(fresh(), shifted.F, shifted.v([0, 1]), data, bounds)).toThrow();
  expect(() => compact.verifyCompactLogarithmicElementary(fresh(), shifted.F, shifted.v([0, 1]), proof, bounds)).toThrow('domain-mismatch');
  const e = exponentialSetup(), target = e.t, positive = compact.checkCompactExponentialCandidate(fresh(), e.F, target, compact.produceCompactExponentialCandidate(fresh(), e.F, target, bounds), bounds);
  if (positive.kind !== 'elementary') throw Error('known positive'); const moved = exponentialSetup([1, 1]);
  expect(() => wire.decodeCompactExponentialElementary(fresh(), moved.F, moved.t, wire.encodeCompactExponentialElementary(fresh(), e.F, target, positive, bounds), bounds)).toThrow();
});
it('starts fresh proof state, bounds complete artifacts first and preserves sticky exhaustion', () => {
  const s = exponentialSetup(), input = s.t, proof = compact.checkCompactExponentialCandidate(fresh(), s.F, input, compact.produceCompactExponentialCandidate(fresh(), s.F, input, bounds), bounds);
  if (proof.kind !== 'elementary') throw Error('known positive'); const ctx = fresh();
  compact.verifyCompactExponentialElementary(ctx, s.F, input, proof, bounds); const used = ctx.usage;
  compact.verifyCompactExponentialElementary(ctx, s.F, input, proof, bounds); expect(ctx.usage).toEqual({work: 2 * used.work, allocation: 2 * used.allocation});
  const data = wire.encodeCompactExponentialElementary(fresh(), s.F, input, proof, bounds);
  for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}, {towerHeight: 1}]) expect(() => wire.decodeCompactExponentialElementary(fresh(), s.F, input, data, {...bounds, ...patch})).toThrow('resource-limit');
  expect(() => wire.decodeCompactExponentialElementary(fresh(), s.F, input, {get tag() {throw Error('getter invoked');}}, bounds)).toThrow('artifact accessor');
  const limited = new ExecutionContext({...fresh().limits, work: 1}); expect(() => wire.decodeCompactExponentialElementary(limited, s.F, input, data, bounds)).toThrow('resource-limit'); expect(() => limited.tick()).toThrow('resource-limit');
});
