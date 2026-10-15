import {describe, it, expect, vi} from 'vitest';
import {base, quadratic, fresh, bounds} from './__tests__/algebraic-support';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';
import {ExecutionContext} from './execution';
import {PolynomialRing} from './polynomial';
import {constructAlgebraicExtension} from './algebraic-field';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {constructAlgebraicPrimitive} from './algebraic-primitive';
import {constructNativeAlgebraicPrimitive, differentiateNativeAlgebraicPrimitive, verifyNativeAlgebraicPrimitive} from './algebraic-native-primitive';
import {constructNativeAlgebraicCandidateWithin, checkNativeAlgebraicCandidate, verifyNativeAlgebraicElementary} from './algebraic-native-elementary';
import {encodeNativeAlgebraicElementary, decodeNativeAlgebraicElementary} from './algebraic-native-wire';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {FormalPrimitiveDomain} from './formal-primitive';
import {embedRationalAlgebraicPrimitive} from './algebraic-rational-primitive';
import * as primitiveProducers from './algebraic-native-primitive';

function prepared() {
  const b = quadratic([1n, 0n, 1n]), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds), f = b.owner;
  const zero = constructAlgebraicPrimitive(fresh(), curve, f.fromInteger(b.ctx, 0n), [], bounds), argument = f.add(b.ctx, f.embed(b.ctx, b.x), b.a), weight = curve.coordinates.constantOwner.fromInteger(b.ctx, 1n);
  return {...b, curve, f, zero, argument, weight};
}
describe('native constant logarithms and compact positive authority', () => {
  it('produces an unchecked actual answer, then checks log(x+y) independently', () => {
    const b = prepared(), terms = [{weight: b.weight, factors: [{value: b.argument, exponent: 1n}]}], before = JSON.stringify(b.argument.representative.coefficients.map(c => [c.numerator.coefficients, c.denominator.coefficients]), (_, v) => typeof v === 'bigint' ? String(v) : v);
    const primitive = constructNativeAlgebraicPrimitive(fresh(), b.curve, b.zero, terms, bounds), input = b.f.inverse(b.ctx, b.a), candidate = b.ctx.operation(() => constructNativeAlgebraicCandidateWithin(b.ctx, b.curve, input, primitive, bounds));
    expect('derivative' in candidate || 'rule' in candidate).toBe(false); expect(primitive.base.terms).toHaveLength(0);
    expect(Object.isFrozen(primitive.terms[0].factors[0])).toBe(true); terms[0].factors[0].exponent = 2n; expect(primitive.terms[0].factors[0].exponent).toBe(1n);
    const proof = checkNativeAlgebraicCandidate(fresh(), b.curve, input, candidate, bounds); verifyNativeAlgebraicElementary(fresh(), b.curve, input, proof, bounds);
    expect('reduction' in proof).toBe(false); expect(primitive.conditions.some(p => p.kind === 'nonzero' && p.path.endsWith('norm.0'))).toBe(true);
    expect(JSON.stringify(b.argument.representative.coefficients.map(c => [c.numerator.coefficients, c.denominator.coefficients]), (_, v) => typeof v === 'bigint' ? String(v) : v)).toBe(before);
    expect(() => checkNativeAlgebraicCandidate(fresh(), b.curve, b.f.fromInteger(b.ctx, 1n), {...candidate, input: b.f.fromInteger(b.ctx, 1n)}, bounds)).toThrow('verification-failed');
  });
  it('keeps huge signed factored powers unexpanded and restrictions after cancellation', () => {
    const b = prepared(), exponent = 1_000_000n, primitive = constructNativeAlgebraicPrimitive(fresh(), b.curve, b.zero, [{weight: b.weight, factors: [
      {value: b.argument, exponent: exponent}, {value: b.argument, exponent: -exponent}]}], bounds), derivative = differentiateNativeAlgebraicPrimitive(fresh(), b.curve, primitive, bounds);
    expect(b.f.isZero(b.ctx, derivative.derivative)).toBe(true); expect(primitive.terms[0].factors).toHaveLength(2); expect(primitive.conditions.filter(p => p.kind === 'nonzero')).toHaveLength(5);
    verifyNativeAlgebraicPrimitive(fresh(), b.curve, primitive, b.f.fromInteger(b.ctx, 0n), derivative, bounds);
    for (const mutate of [(p: typeof derivative) => ({...p, terms: []}), (p: typeof derivative) => ({...p, terms: [{...p.terms[0], newtonSum: b.a}]}),
      (p: typeof derivative) => ({...p, terms: [{...p.terms[0], factors: []}]}), (p: typeof derivative) => ({...p, terms: [{...p.terms[0], column: b.a}]})]) {
      expect(() => verifyNativeAlgebraicPrimitive(fresh(), b.curve, primitive, derivative.derivative, mutate(derivative), bounds)).toThrow('verification-failed');
    }
    expect(() => constructNativeAlgebraicPrimitive(fresh(), b.curve, b.zero, [{weight: b.weight, factors: [{value: b.argument, exponent: 1n, inverse: b.a}]}], bounds)).toThrow('verification-failed');
    expect(() => constructNativeAlgebraicPrimitive(fresh(), b.curve, b.zero, [{weight: b.weight, factors: [{value: b.f.fromInteger(b.ctx, 0n), exponent: 0n}]}], bounds)).toThrow('division-by-zero');
    expect(() => verifyNativeAlgebraicPrimitive(fresh(), b.curve, {...primitive}, derivative.derivative, derivative, bounds)).toThrow('domain-mismatch');
  });
  it('uses the full hidden constant field without an identity base change', () => {
    const b = quadratic(), r = new PolynomialRing(b.owner, 'b'), relation = r.make(b.ctx, [b.owner.negate(b.ctx, b.owner.embed(b.ctx, b.field.multiply(b.ctx, b.field.fromInteger(b.ctx, 2n), b.x))), b.owner.fromInteger(b.ctx, 0n), b.owner.fromInteger(b.ctx, 1n)]), owner = constructAlgebraicExtension(b.ctx, r, relation, bounds);
    const curve = certifyAlgebraicCurve(b.ctx, owner, certifyAlgebraicConstantField(b.ctx, owner, bounds), bounds), C = curve.coordinates.constantOwner, weight = C.generator(b.ctx), x = owner.embed(b.ctx, b.owner.embed(b.ctx, b.x));
    expect(C.ring.degree(b.ctx, C.modulus)).toBe(2); const embedded = curve.coordinates.scalarNative(b.ctx, curve.coordinates.scalar.fromCoefficient(b.ctx, weight));
    const zero = constructAlgebraicPrimitive(fresh(), curve, owner.fromInteger(b.ctx, 0n), [], bounds), primitive = constructNativeAlgebraicPrimitive(fresh(), curve, zero, [{weight, factors: [{value: x, exponent: -3n}]}], bounds);
    const expected = owner.multiply(b.ctx, owner.fromInteger(b.ctx, -3n), owner.exactDivide(b.ctx, embedded, x)), derivative = differentiateNativeAlgebraicPrimitive(fresh(), curve, primitive, bounds);
    verifyNativeAlgebraicPrimitive(fresh(), curve, primitive, expected, derivative, bounds); expect(primitive.terms[0].degree).toBe(1);
    expect(() => constructNativeAlgebraicPrimitive(fresh(), curve, zero, [{weight: prepared().weight, factors: []}], bounds)).toThrow('domain-mismatch');
  });
  it('preserves nontrivial all-root traces alongside native logarithms', () => {
    const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), d = new FormalPrimitiveDomain('x', 'z');
    const old = d.make(b.ctx, d.fractions.fromInteger(b.ctx, 0n), [d.term(b.ctx, d.z.make(b.ctx, [1n, 0n, 1n].map(n => d.z.domain.fromInteger(b.ctx, n))), d.z.make(b.ctx, [0n, 1n].map(n => d.z.domain.fromInteger(b.ctx, n))), d.arguments.make(b.ctx, [d.z.make(b.ctx, [0n, 1n].map(n => d.z.domain.fromInteger(b.ctx, n))), d.z.one(b.ctx)]))]);
    const embedded = embedRationalAlgebraicPrimitive(fresh(), curve, old, bounds), weight = curve.coordinates.constantOwner.fromInteger(b.ctx, 2n), primitive = constructNativeAlgebraicPrimitive(fresh(), curve, embedded.primitive, [{weight, factors: [{value: b.x, exponent: 1n}]}], bounds);
    const input = b.field.add(b.ctx, embedded.target, b.field.exactDivide(b.ctx, b.field.fromInteger(b.ctx, 2n), b.x)), candidate = b.ctx.operation(() => constructNativeAlgebraicCandidateWithin(b.ctx, curve, input, primitive, bounds)), proof = checkNativeAlgebraicCandidate(fresh(), curve, input, candidate, bounds);
    const wire = encodeNativeAlgebraicElementary(fresh(), curve, input, proof, bounds), restore = disableAlgebraicIntegrationProducers();
    try {const decoded = decodeNativeAlgebraicElementary(fresh(), curve, input, wire, bounds); expect(decoded.primitive.base.terms).toHaveLength(1); expect(decoded.primitive.terms).toHaveLength(1); verifyNativeAlgebraicElementary(fresh(), curve, input, decoded, bounds);} finally {restore();}
  });
  it('replays without producers and rejects forged units, traces, coverage, target and conditions', () => {
    const b = prepared(), primitive = constructNativeAlgebraicPrimitive(fresh(), b.curve, b.zero, [{weight: b.weight, factors: [{value: b.argument, exponent: 1n}]}], bounds), input = b.f.inverse(b.ctx, b.a), candidate = b.ctx.operation(() => constructNativeAlgebraicCandidateWithin(b.ctx, b.curve, input, primitive, bounds)), proof = checkNativeAlgebraicCandidate(fresh(), b.curve, input, candidate, bounds);
    const wire = JSON.parse(JSON.stringify(encodeNativeAlgebraicElementary(fresh(), b.curve, input, proof, bounds))) as {tag: string; version: number; payload: unknown}, restore = disableAlgebraicIntegrationProducers(), spy = vi.spyOn(primitiveProducers, 'differentiateNativeAlgebraicPrimitiveWithin').mockImplementation(() => {throw Error('producer disabled');});
    try {decodeNativeAlgebraicElementary(fresh(), b.curve, input, wire, bounds);} finally {spy.mockRestore(); restore();}
    type Body = {evidence: {primitive: {terms: {degree: number; factors: {inverse: unknown; norm: unknown; exponent: unknown}[]}[]; conditions: unknown[]}; derivative: {terms: {trace: unknown; factors: unknown[]}[]}; evidence: {input: unknown}}};
    for (const mutate of [
      (body: Body) => {body.evidence.primitive.terms[0].degree = 2;},
      (body: Body) => {body.evidence.primitive.terms[0].factors[0].inverse = body.evidence.evidence.input;},
      (body: Body) => {body.evidence.primitive.terms[0].factors[0].norm = body.evidence.evidence.input;},
      (body: Body) => {body.evidence.primitive.terms[0].factors[0].exponent = '2';},
      (body: Body) => {body.evidence.primitive.conditions = [];},
      (body: Body) => {body.evidence.derivative.terms[0].trace = body.evidence.evidence.input; body.evidence.derivative.terms[0].factors = [];}
    ]) {const body = structuredClone(unpackAlgebraicArtifactData(fresh(), wire.payload, bounds)) as Body; mutate(body); expect(() => decodeNativeAlgebraicElementary(fresh(), b.curve, input, {...wire, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();}
    expect(() => decodeNativeAlgebraicElementary(fresh(), b.curve, b.a, wire, bounds)).toThrow('verification-failed');
    expect(() => decodeNativeAlgebraicElementary(fresh(), b.curve, input, {...wire, version: 1}, bounds)).toThrow('invalid-input');
    const cold = fresh(); decodeNativeAlgebraicElementary(cold, b.curve, input, wire, bounds); const first = cold.usage.work; decodeNativeAlgebraicElementary(cold, b.curve, input, wire, bounds); expect(cold.usage.work).toBe(2 * first);
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodeNativeAlgebraicElementary(fresh(), b.curve, input, wire, {...bounds, ...patch})).toThrow('resource-limit');
    const exhausted = new ExecutionContext({...fresh().limits, work: 1}); expect(() => decodeNativeAlgebraicElementary(exhausted, b.curve, input, wire, bounds)).toThrow('resource-limit'); expect(() => exhausted.tick()).toThrow('resource-limit');
  });
});
