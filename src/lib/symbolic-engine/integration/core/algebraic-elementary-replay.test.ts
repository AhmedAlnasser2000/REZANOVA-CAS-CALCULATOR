import {describe, it, expect} from 'vitest';
import {base, quadratic, fresh, bounds} from './__tests__/algebraic-support';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';
import {ExecutionContext} from './execution';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {constructAlgebraicPrimitive, differentiateAlgebraicPrimitive} from './algebraic-primitive';
import {encodeAlgebraicPrimitive, decodeAlgebraicPrimitive} from './algebraic-primitive-wire';
import {FormalPrimitiveDomain} from './formal-primitive';
import {embedRationalAlgebraicPrimitive} from './algebraic-rational-primitive';
import {constructCompactAlgebraicCandidateWithin, checkCompactAlgebraicCandidate, verifyCompactAlgebraicElementary} from './algebraic-elementary-evidence';
import {encodeCompactAlgebraicElementary, decodeCompactAlgebraicElementary} from './algebraic-elementary-wire';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';

describe('compact algebraic positive authority', () => {
  it('checks an untrusted candidate with final derivative equality and no search history', () => {
    const b = quadratic(), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds), input = b.owner.inverse(b.ctx, b.a);
    const primitive = constructAlgebraicPrimitive(fresh(), curve, b.owner.multiply(b.ctx, b.owner.fromInteger(b.ctx, 2n), b.a), [], bounds), candidate = b.ctx.operation(() => constructCompactAlgebraicCandidateWithin(b.ctx, curve, input, primitive, bounds));
    expect('derivative' in candidate || 'rule' in candidate).toBe(false);
    const proof = checkCompactAlgebraicCandidate(fresh(), curve, input, candidate, bounds); expect('reduction' in proof).toBe(false); verifyCompactAlgebraicElementary(fresh(), curve, input, proof, bounds);
    const data = JSON.parse(JSON.stringify(encodeCompactAlgebraicElementary(fresh(), curve, input, proof, bounds))), restore = disableAlgebraicIntegrationProducers();
    try {const result = decodeCompactAlgebraicElementary(fresh(), curve, input, data, bounds); verifyCompactAlgebraicElementary(fresh(), curve, input, result, bounds);}
    finally {restore();}
    expect(() => checkCompactAlgebraicCandidate(fresh(), curve, b.owner.fromInteger(b.ctx, 1n), {...candidate, input: b.owner.fromInteger(b.ctx, 1n)}, bounds)).toThrow('verification-failed');
  });
  it.each([1n, -1n])('retains all-root trace bindings for modulus constant %s and old version-1 replay', n => {
    const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), d = new FormalPrimitiveDomain('x', 'z');
    const input = d.make(b.ctx, d.fractions.fromInteger(b.ctx, 0n), [d.term(b.ctx, d.z.make(b.ctx, [n, 0n, 1n].map(v => d.z.domain.fromInteger(b.ctx, v))), d.z.make(b.ctx, [0n, 1n].map(v => d.z.domain.fromInteger(b.ctx, v))),
      d.arguments.make(b.ctx, [d.z.make(b.ctx, [0n, 1n].map(v => d.z.domain.fromInteger(b.ctx, v))), d.z.one(b.ctx)]))]);
    const embedded = embedRationalAlgebraicPrimitive(fresh(), curve, input, bounds), candidate = b.ctx.operation(() => constructCompactAlgebraicCandidateWithin(b.ctx, curve, embedded.target, embedded.primitive, bounds)), proof = checkCompactAlgebraicCandidate(fresh(), curve, embedded.target, candidate, bounds);
    const data = JSON.parse(JSON.stringify(encodeCompactAlgebraicElementary(fresh(), curve, embedded.target, proof, bounds))), oldDerivative = differentiateAlgebraicPrimitive(fresh(), curve, embedded.primitive, bounds);
    const old = encodeAlgebraicPrimitive(fresh(), curve, embedded.primitive, embedded.target, oldDerivative, bounds), restore = disableAlgebraicIntegrationProducers();
    try {
      const result = decodeCompactAlgebraicElementary(fresh(), curve, embedded.target, data, bounds); expect(result.primitive.terms).toHaveLength(n === 1n ? 1 : 2);
      if (n === 1n) expect(result.primitive.terms[0].quotient.relative.target).not.toBe(embedded.primitive.terms[0].quotient.relative.target);
      decodeAlgebraicPrimitive(fresh(), curve, embedded.target, old, bounds);
    } finally {restore();}
    if (n === 1n) {
      const wire = data as {tag: string; version: number; payload: unknown};
      for (const mutate of [
        (body: Record<string, unknown>) => {const p = body.primitive as {terms: {evidence: Record<string, unknown>}[]}; p.terms[0].evidence.weight = p.terms[0].evidence.unit;},
        (body: Record<string, unknown>) => {const p = body.primitive as {terms: {evidence: {factors: Record<string, unknown>[]}}[]}; p.terms[0].evidence.factors[0].norm = (body.evidence as Record<string, unknown>).input;},
        (body: Record<string, unknown>) => {const d = body.derivative as {terms: {trace: Record<string, unknown>}[]}; d.terms[0].trace.columns = [];},
        (body: Record<string, unknown>) => {const d = body.derivative as {terms: unknown[]}; d.terms = [];}
      ]) {
        const body = structuredClone(unpackAlgebraicArtifactData(fresh(), wire.payload, bounds)) as {evidence: Record<string, unknown>}; mutate(body.evidence);
        expect(() => decodeCompactAlgebraicElementary(fresh(), curve, embedded.target, {...wire, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();
      }
    }
  });
  it('rejects altered target, conditions, derivative coverage, trace normalization and malformed evidence', () => {
    const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), primitive = constructAlgebraicPrimitive(fresh(), curve, b.x, [], bounds), input = b.field.fromInteger(b.ctx, 1n);
    const candidate = b.ctx.operation(() => constructCompactAlgebraicCandidateWithin(b.ctx, curve, input, primitive, bounds)), proof = checkCompactAlgebraicCandidate(fresh(), curve, input, candidate, bounds), wire = encodeCompactAlgebraicElementary(fresh(), curve, input, proof, bounds) as {tag: string; version: number; payload: unknown};
    for (const mutate of [
      (e: Record<string, unknown>) => {(e.evidence as Record<string, unknown>).conditions = [];},
      (e: Record<string, unknown>) => {(e.evidence as Record<string, unknown>).verified = true;},
      (e: Record<string, unknown>) => {(e.derivative as Record<string, unknown>).field = null;},
      (e: Record<string, unknown>) => {(e.primitive as Record<string, unknown>).fieldPart = (e.evidence as Record<string, unknown>).input;}
    ]) {
      const body = structuredClone(unpackAlgebraicArtifactData(fresh(), wire.payload, bounds)) as {evidence: Record<string, unknown>}; mutate(body.evidence);
      expect(() => decodeCompactAlgebraicElementary(fresh(), curve, input, {...wire, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();
    }
    expect(() => decodeCompactAlgebraicElementary(fresh(), curve, b.x, wire, bounds)).toThrow('verification-failed');
    expect(() => decodeCompactAlgebraicElementary(fresh(), curve, input, {...wire, version: 1}, bounds)).toThrow('invalid-input');
    const cold = fresh(); decodeCompactAlgebraicElementary(cold, curve, input, wire, bounds); const first = cold.usage.work; decodeCompactAlgebraicElementary(cold, curve, input, wire, bounds); expect(cold.usage.work).toBe(2 * first);
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodeCompactAlgebraicElementary(fresh(), curve, input, wire, {...bounds, ...patch})).toThrow('resource-limit');
    const exhausted = new ExecutionContext({...fresh().limits, work: 1}); expect(() => decodeCompactAlgebraicElementary(exhausted, curve, input, wire, bounds)).toThrow('resource-limit'); expect(() => exhausted.tick()).toThrow('resource-limit');
  });
});
