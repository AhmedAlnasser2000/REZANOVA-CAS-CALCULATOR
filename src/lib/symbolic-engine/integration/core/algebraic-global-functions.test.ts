import {describe, it, expect} from 'vitest';
import {base, quadratic, fresh, bounds} from './__tests__/algebraic-support';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve, reconstructConstantBaseChangedCurveWithin} from './algebraic-curve';
import {PolynomialRing} from './polynomial';
import {constructAlgebraicExtension} from './algebraic-field';
import {constructAlgebraicGlobalFunctions, coordinateAlgebraicGlobalFunction, verifyAlgebraicGlobalFunctions} from './algebraic-global-functions';
import {encodeAlgebraicGlobalFunctions, decodeAlgebraicGlobalFunctions} from './algebraic-global-functions-wire';
import {solveAlgebraicRiemannRoch} from './algebraic-riemann-roch';
import {constructAlgebraicDivisor} from './algebraic-divisor';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {ExecutionContext} from './execution';
import {rationalField as Q} from './field';
import {AlgebraicEmbedding} from './algebraic-embedding';
import {baseChangeAlgebraicCurveWithin} from './algebraic-curve-base-change';

describe('complete global functions from actual constants', () => {
  it('agrees with the full Hess space and rejects nonconstant field elements', () => {
    const b = quadratic([1n, -1n, 0n, 1n]), f = b.owner, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds), space = constructAlgebraicGlobalFunctions(fresh(), curve, bounds), divisor = constructAlgebraicDivisor(b.ctx, curve, [], bounds), hess = solveAlgebraicRiemannRoch(fresh(), curve, divisor, bounds);
    expect(space.dimension).toBe(hess.dimension); expect(space.dimension).toBe(1); expect(f.equal(b.ctx, space.basis[0], f.fromInteger(b.ctx, 1n))).toBe(true);
    for (const value of [f.fromInteger(b.ctx, 0n), f.fromInteger(b.ctx, 3n)]) {
      const member = coordinateAlgebraicGlobalFunction(fresh(), curve, space, value, bounds); expect(member.kind).toBe('member');
      if (member.kind !== 'member') throw Error('known constant'); expect(f.equal(b.ctx, curve.coordinates.scalarNative(b.ctx, curve.coordinates.scalar.fromCoefficient(b.ctx, member.coefficient)), value)).toBe(true);
    }
    for (const value of [b.a, f.embed(b.ctx, b.x), f.inverse(b.ctx, b.a)]) expect(coordinateAlgebraicGlobalFunction(fresh(), curve, space, value, bounds).kind).toBe('not-member');
  });
  it('returns one C-basis vector when hidden constants have rational degree two', () => {
    const b = quadratic(), ring = new PolynomialRing(b.owner, 'b'), owner = constructAlgebraicExtension(b.ctx, ring, ring.make(b.ctx, [b.owner.negate(b.ctx, b.owner.embed(b.ctx, b.field.multiply(b.ctx, b.field.fromInteger(b.ctx, 2n), b.x))), b.owner.fromInteger(b.ctx, 0n), b.owner.fromInteger(b.ctx, 1n)]), bounds), constants = certifyAlgebraicConstantField(b.ctx, owner, bounds), curve = certifyAlgebraicCurve(b.ctx, owner, constants, bounds), space = constructAlgebraicGlobalFunctions(fresh(), curve, bounds);
    expect(curve.coordinates.constantOwner.ring.degree(b.ctx, curve.coordinates.constantOwner.modulus)).toBe(2); expect(space.basis).toHaveLength(1);
    const hidden = owner.exactDivide(b.ctx, owner.generator(b.ctx), owner.embed(b.ctx, b.a)), member = coordinateAlgebraicGlobalFunction(fresh(), curve, space, hidden, bounds); expect(member.kind).toBe('member');
    expect(member.conditions.some(p => p.kind === 'denominator' && p.path.startsWith('global-functions.input'))).toBe(true);
    expect(coordinateAlgebraicGlobalFunction(fresh(), curve, space, owner.generator(b.ctx), bounds).kind).toBe('not-member');
  });
  it('replays complete authority without constant, geometry, module or derivative producers', () => {
    const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), space = constructAlgebraicGlobalFunctions(fresh(), curve, bounds), data = JSON.parse(JSON.stringify(encodeAlgebraicGlobalFunctions(fresh(), curve, space, bounds))) as {tag: string; version: number; payload: unknown}, restore = disableAlgebraicIntegrationProducers();
    try {const p = decodeAlgebraicGlobalFunctions(fresh(), curve, data, bounds); verifyAlgebraicGlobalFunctions(fresh(), curve, p, bounds);} finally {restore();}
    for (const mutate of [(e: Record<string, unknown>) => {e.dimension = 2;}, (e: Record<string, unknown>) => {e.basis = [];}, (e: Record<string, unknown>) => {e.conditions = [{kind: 'nonzero', path: 'injected', value: (e.basis as unknown[])[0]}];}, (e: Record<string, unknown>) => {e.verified = true;}]) {
      const body = structuredClone(unpackAlgebraicArtifactData(fresh(), data.payload, bounds)) as {evidence: Record<string, unknown>}; mutate(body.evidence);
      expect(() => decodeAlgebraicGlobalFunctions(fresh(), curve, {...data, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();
    }
    expect(() => verifyAlgebraicGlobalFunctions(fresh(), curve, {...space}, bounds)).toThrow('domain-mismatch');
    const foreign = base(), fc = certifyAlgebraicCurve(foreign.ctx, foreign.field, certifyAlgebraicConstantField(foreign.ctx, foreign.field, bounds), bounds); expect(() => coordinateAlgebraicGlobalFunction(fresh(), fc, space, foreign.x, bounds)).toThrow('domain-mismatch');
    const cold = fresh(); decodeAlgebraicGlobalFunctions(cold, curve, data, bounds); const first = cold.usage.work; decodeAlgebraicGlobalFunctions(cold, curve, data, bounds); expect(cold.usage.work).toBe(2 * first);
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodeAlgebraicGlobalFunctions(fresh(), curve, data, {...bounds, ...patch})).toThrow('resource-limit');
    const exhausted = new ExecutionContext({...fresh().limits, work: 1}); expect(() => decodeAlgebraicGlobalFunctions(exhausted, curve, data, bounds)).toThrow('resource-limit'); expect(() => exhausted.tick()).toThrow('resource-limit');
  });
  it('preserves complete global constants through checked finite constant base change', () => {
    const b = base(), source = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), C = source.coordinates.constantOwner, ring = new PolynomialRing(Q, 'i'), L = constructAlgebraicExtension(b.ctx, ring, ring.make(b.ctx, [1n, 0n, 1n].map(n => Q.fromInteger(b.ctx, n))), bounds);
    const image = L.embed(b.ctx, Q.negate(b.ctx, Q.exactDivide(b.ctx, C.modulus.coefficients[0], C.modulus.coefficients[1]))), embedding = AlgebraicEmbedding.extension(b.ctx, C, L, AlgebraicEmbedding.rationals(b.ctx, L, bounds), image, bounds);
    const change = b.ctx.operation(() => baseChangeAlgebraicCurveWithin(b.ctx, source, L, embedding, bounds)), curve = b.ctx.operation(() => reconstructConstantBaseChangedCurveWithin(b.ctx, change, bounds)), space = constructAlgebraicGlobalFunctions(fresh(), curve, bounds), i = curve.coordinates.scalarNative(b.ctx, curve.coordinates.scalar.fromCoefficient(b.ctx, L.generator(b.ctx)));
    const member = coordinateAlgebraicGlobalFunction(fresh(), curve, space, i, bounds); expect(member.kind).toBe('member'); if (member.kind === 'member') expect(L.equal(b.ctx, member.coefficient, L.generator(b.ctx))).toBe(true);
    const wire = encodeAlgebraicGlobalFunctions(fresh(), curve, space, bounds), restore = disableAlgebraicIntegrationProducers();
    try {decodeAlgebraicGlobalFunctions(fresh(), curve, wire, bounds);} finally {restore();}
  });
});
