import {it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {FormalPrimitiveDomain} from './formal-primitive';
import {rationalField as Q} from './field';
import {produceCompactRationalCandidate, checkCompactRationalCandidate, verifyCompactRationalElementary} from './rational-elementary-evidence';
import {encodeCompactRationalElementary, decodeCompactRationalElementary} from './rational-elementary-wire';
import {integrateRational} from './rational-decision';
import {encodeRationalDecision, decodeRationalDecision} from './rational-decision-wire';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {ExecutionContext} from './execution';
import * as integration from './rational-decision-internal';
import * as hermite from './hermite-reduction';
import * as lrt from './lrt-reduction';
import * as derivative from './primitive-verification-internal';

function fixture(n: readonly bigint[], d: readonly bigint[]) {
  const ctx = fresh(), owner = new FormalPrimitiveDomain('x', 'z'), poly = (values: readonly bigint[]) => owner.x.make(ctx, values.map(n => Q.fromInteger(ctx, n))), input = owner.fractions.make(ctx, poly(n), poly(d)); return {ctx, owner, input};
}
function disable() {
  const spies = [vi.spyOn(integration, 'produceRationalCandidateWithin'), vi.spyOn(integration, 'integrateRationalWithin'), vi.spyOn(hermite, 'hermiteReduce'), vi.spyOn(lrt, 'lrtReduce'),
    vi.spyOn(derivative, 'differentiatePrimitiveWithin'), vi.spyOn(derivative, 'differentiateRootLogWithin'), vi.spyOn(derivative, 'verifyPrimitiveWithin')];
  for (const spy of spies) spy.mockImplementation(() => {throw Error('rational producer disabled');});
  return () => {for (const spy of spies) spy.mockRestore();};
}
it('publishes complete primitive candidates before final checking and omits search history', () => {
  for (const [n, d] of [[[0n], [1n]], [[3n], [1n]], [[1n, 0n, 1n], [-1n, 1n]], [[1n], [1n, 0n, 1n]]] as const) {
    const b = fixture(n, d), spy = vi.spyOn(derivative, 'verifyPrimitiveWithin').mockImplementation(() => {throw Error('final derivative begun too early');});
    let candidate; try {candidate = produceCompactRationalCandidate(fresh(), b.owner, b.input);} finally {spy.mockRestore();}
    expect(candidate).not.toHaveProperty('derivative'); expect(candidate).not.toHaveProperty('hermite'); expect(candidate).not.toHaveProperty('lrt'); expect(Object.isFrozen(candidate)).toBe(true);
    const search = [vi.spyOn(hermite, 'hermiteReduce'), vi.spyOn(lrt, 'lrtReduce')]; for (const s of search) s.mockImplementation(() => {throw Error('integration rerun during check');});
    let proof; try {proof = checkCompactRationalCandidate(fresh(), b.owner, b.input, candidate);} finally {for (const s of search) s.mockRestore();}
    verifyCompactRationalElementary(fresh(), b.owner, b.input, proof); expect(b.owner.fractions.equal(b.ctx, proof.derivative.derivative, b.input)).toBe(true);
  }
});
it('replays compact output and retained version-one decisions with all search/evidence producers disabled', () => {
  const b = fixture([1n], [1n, 0n, 1n]), full = integrateRational(fresh(), b.owner, b.input), old = encodeRationalDecision(fresh(), b.owner, full), candidate = produceCompactRationalCandidate(fresh(), b.owner, b.input), proof = checkCompactRationalCandidate(fresh(), b.owner, b.input, candidate), data = JSON.parse(JSON.stringify(encodeCompactRationalElementary(fresh(), b.owner, b.input, proof, bounds)));
  expect(JSON.stringify(data).length).toBeLessThan(JSON.stringify(old).length); const restore = disable();
  try {decodeCompactRationalElementary(fresh(), b.owner, b.input, data, bounds); decodeRationalDecision(fresh(), b.owner, b.input, JSON.parse(JSON.stringify(old)));} finally {restore();}
});
it('keeps every reducible-modulus root binding, exact weight, norm, unit and trace', () => {
  const b = fixture([2n], [-1n, 0n, 1n]), o = b.owner, q = o.z.make(b.ctx, [-1n, 0n, 1n].map(n => Q.fromInteger(b.ctx, n))), weight = o.z.make(b.ctx, [Q.fromInteger(b.ctx, 0n), Q.fromInteger(b.ctx, 1n)]), argument = o.arguments.make(b.ctx, [o.z.negate(b.ctx, weight), o.z.one(b.ctx)]);
  const primitive = o.make(b.ctx, o.fractions.fromInteger(b.ctx, 0n), [o.term(b.ctx, q, weight, argument)]), candidate = Object.freeze({kind: 'elementary' as const, input: b.input, primitive, conditions: Object.freeze({...primitive.conditions, inputDenominator: b.input.denominator})}), proof = checkCompactRationalCandidate(fresh(), o, b.input, candidate), data = encodeCompactRationalElementary(fresh(), o, b.input, proof, bounds), restore = disable();
  try {const decoded = decodeCompactRationalElementary(fresh(), o, b.input, data, bounds); expect(decoded.primitive.terms).toHaveLength(1); expect(o.z.degree(b.ctx, decoded.primitive.terms[0].modulus)).toBe(2); expect(o.z.equal(b.ctx, decoded.primitive.terms[0].weight, weight)).toBe(true);} finally {restore();}
});
it('rejects altered targets, restrictions, terms, units, traces, norms and trusted flags', () => {
  const b = fixture([1n], [1n, 0n, 1n]), candidate = produceCompactRationalCandidate(fresh(), b.owner, b.input), proof = checkCompactRationalCandidate(fresh(), b.owner, b.input, candidate);
  for (const changed of [{...proof, rule: 'unchecked' as typeof proof.rule}, {...proof, conditions: {...proof.conditions, inputDenominator: b.owner.x.one(b.ctx)}}, {...proof, conditions: {...proof.conditions, logNorms: []}}, {...proof, derivative: {...proof.derivative, terms: []}}, {...proof, derivative: {...proof.derivative, derivative: b.owner.fractions.fromInteger(b.ctx, 0n)}}]) expect(() => verifyCompactRationalElementary(fresh(), b.owner, b.input, changed)).toThrow('verification-failed');
  const data = encodeCompactRationalElementary(fresh(), b.owner, b.input, proof, bounds) as {payload: unknown};
  for (const change of [(p: Record<string, unknown>) => {p.norms = [];}, (p: Record<string, unknown>) => {(p.evidence as Record<string, unknown>).verified = true;}, (p: Record<string, unknown>) => {(p.evidence as Record<string, unknown>).kind = 'non-elementary';}, (p: Record<string, unknown>) => {const d = p.derivative as {terms: Record<string, unknown>[]}; d.terms[0].inverse = {kind: 'zero'};}, (p: Record<string, unknown>) => {const d = p.derivative as {terms: {trace: {columns: unknown[]}}[]}; d.terms[0].trace.columns = [];}]) {
    const body = structuredClone(unpackAlgebraicArtifactData(fresh(), data.payload, bounds)) as Record<string, unknown>; change(body);
    expect(() => decodeCompactRationalElementary(fresh(), b.owner, b.input, {...data, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();
  }
  expect(() => decodeCompactRationalElementary(fresh(), b.owner, b.owner.fractions.fromInteger(b.ctx, 2n), data, bounds)).toThrow('verification-failed');
  const foreign = fixture([1n], [1n, 0n, 1n]); expect(() => verifyCompactRationalElementary(fresh(), foreign.owner, foreign.input, proof)).toThrow('domain-mismatch');
});
it('bounds the whole artifact and keeps fresh operation accounting and sticky exhaustion', () => {
  const b = fixture([1n], [1n, 0n, 1n]), proof = checkCompactRationalCandidate(fresh(), b.owner, b.input, produceCompactRationalCandidate(fresh(), b.owner, b.input)), data = encodeCompactRationalElementary(fresh(), b.owner, b.input, proof, bounds), ctx = fresh();
  verifyCompactRationalElementary(ctx, b.owner, b.input, proof); const work = ctx.usage.work; verifyCompactRationalElementary(ctx, b.owner, b.input, proof); expect(ctx.usage.work).toBe(2 * work);
  for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodeCompactRationalElementary(fresh(), b.owner, b.input, data, {...bounds, ...patch})).toThrow('resource-limit');
  const limited = new ExecutionContext({...fresh().limits, work: 1}); expect(() => decodeCompactRationalElementary(limited, b.owner, b.input, data, bounds)).toThrow('resource-limit'); expect(() => limited.tick()).toThrow('resource-limit');
  expect(() => decodeCompactRationalElementary(fresh(), b.owner, b.input, {get kind() {throw Error('getter invoked');}}, bounds)).toThrow('artifact accessor');
});
