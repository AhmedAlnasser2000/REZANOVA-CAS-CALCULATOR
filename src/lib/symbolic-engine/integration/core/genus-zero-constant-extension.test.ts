import {it, expect, vi, afterEach} from 'vitest';
import {quadratic, fresh, bounds} from './__tests__/algebraic-support';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {tryGenusZeroConstantParameter, verifyGenusZeroConstantParameter} from './genus-zero-constant-extension';
import {genusZeroForwardWithin, genusZeroBackwardWithin} from './genus-zero-parameter';
import {mapAlgebraicConstantBaseChangeValue} from './algebraic-constant-quotient';
import * as numbers from './number-field-presentation';
import * as baseChange from './algebraic-curve-base-change';
import * as rr from './algebraic-riemann-roch';
import * as derivative from './algebraic-derivative';
import {encodeGenusZeroConstantParameter, decodeGenusZeroConstantParameter} from './genus-zero-parameter-wire';
import {ExecutionContext} from './execution';
import {packRecursiveArtifactGraph, unpackRecursiveArtifactGraph} from './recursive-artifact-graph';
afterEach(() => vi.restoreAllMocks());
function curve(coefficients: bigint[]) {
  const b = quadratic(coefficients), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds); return {...b, curve};
}
it('constructs and independently verifies a required finite constant extension for an anisotropic conic', () => {
  const b = curve([-1n, 0n, -1n]), proof = tryGenusZeroConstantParameter(b.ctx, b.curve, bounds);
  expect(proof?.kind).toBe('constant-extension'); if (!proof || proof.kind !== 'constant-extension') throw Error('anisotropic conic extension');
  expect(proof.quotient.relative.degree).toBe(2);
  const input = b.owner.exactDivide(b.ctx, b.owner.add(b.ctx, b.a, b.owner.embed(b.ctx, b.x)), b.owner.add(b.ctx, b.owner.fromInteger(b.ctx, 1n), b.owner.embed(b.ctx, b.x)));
  b.ctx.operation(() => {const native = mapAlgebraicConstantBaseChangeValue(b.ctx, proof.quotient, input), image = genusZeroForwardWithin(b.ctx, proof.parameter, native);
    expect(proof.curve.owner.equal(b.ctx, genusZeroBackwardWithin(b.ctx, proof.parameter, image), native)).toBe(true);});
  const off = () => {throw Error('constant extension producer disabled');};
  const data = encodeGenusZeroConstantParameter(fresh(), b.curve, proof, bounds);
  vi.spyOn(numbers, 'constructNumberFieldPresentationWithin').mockImplementation(off); vi.spyOn(baseChange, 'baseChangeAlgebraicCurveWithin').mockImplementation(off);
  vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin').mockImplementation(off); vi.spyOn(derivative, 'differentiateAlgebraicWithin').mockImplementation(off);
  verifyGenusZeroConstantParameter(fresh(), b.curve, proof, bounds);
  const decoded = decodeGenusZeroConstantParameter(fresh(), b.curve, JSON.parse(JSON.stringify(data)), bounds); expect(decoded.kind).toBe('constant-extension');
  expect(() => verifyGenusZeroConstantParameter(fresh(), b.curve, {...proof, point: -1}, bounds)).toThrow('verification-failed');
  expect(() => verifyGenusZeroConstantParameter(fresh(), b.curve, {...proof, parameter: {...proof.parameter, basisImages: []}}, bounds)).toThrow('verification-failed');
});
it('preserves the native presentation when its degree-one place already exists', () => {
  const b = curve([1n, 0n, 1n]), proof = tryGenusZeroConstantParameter(b.ctx, b.curve, bounds);
  expect(proof?.kind).toBe('native'); if (!proof) throw Error('native conic'); verifyGenusZeroConstantParameter(fresh(), b.curve, proof, bounds);
  const data = encodeGenusZeroConstantParameter(fresh(), b.curve, proof, bounds), off = () => {throw Error('native genus-zero producer disabled');};
  vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin').mockImplementation(off); vi.spyOn(derivative, 'differentiateAlgebraicWithin').mockImplementation(off);
  expect(decodeGenusZeroConstantParameter(fresh(), b.curve, data, bounds).kind).toBe('native');
  const ctx = fresh(); verifyGenusZeroConstantParameter(ctx, b.curve, proof, bounds); const used = ctx.usage;
  verifyGenusZeroConstantParameter(ctx, b.curve, proof, bounds); expect(ctx.usage).toEqual({work: 2 * used.work, allocation: 2 * used.allocation});
  for (const patch of [{artifactDepth: 1}, {artifactBytes: 1}, {artifactNodes: 1}]) expect(() => decodeGenusZeroConstantParameter(fresh(), b.curve, data, {...bounds, ...patch})).toThrow('resource-limit');
  expect(() => decodeGenusZeroConstantParameter(fresh(), b.curve, {get tag() {throw Error('getter invoked');}}, bounds)).toThrow('artifact accessor');
  const limited = new ExecutionContext({...fresh().limits, work: 1}); expect(() => decodeGenusZeroConstantParameter(limited, b.curve, data, bounds)).toThrow('resource-limit'); expect(() => limited.tick()).toThrow('resource-limit');
  const body = structuredClone(unpackRecursiveArtifactGraph(fresh(), (data as {payload: unknown}).payload, bounds)) as {evidence: {parameter: {evidence: {index: number}}}};
  body.evidence.parameter.evidence.index = -1;
  expect(() => decodeGenusZeroConstantParameter(fresh(), b.curve, {...data as object, payload: packRecursiveArtifactGraph(fresh(), body, bounds)}, bounds)).toThrow();
});
