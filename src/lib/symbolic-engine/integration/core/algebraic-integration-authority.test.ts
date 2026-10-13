import { beforeAll, it, expect } from 'vitest';
import { base, fresh, bounds } from './__tests__/algebraic-support';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { AlgebraicEmbedding } from './algebraic-embedding';
import { constructRelativeNumberFieldWithin } from './relative-number-field';
import { baseChangeAlgebraicCurveWithin } from './algebraic-curve-base-change';
import { reconstructAlgebraicConstantQuotientWithin, mapAlgebraicConstantBaseChangeValue } from './algebraic-constant-quotient';
import { constructAlgebraicPrimitive, differentiateAlgebraicPrimitive } from './algebraic-primitive';
import { encodeAlgebraicPrimitive, decodeAlgebraicPrimitive } from './algebraic-primitive-wire';
import { reduceAlgebraicDifferential } from './algebraic-differential-reduction';
import { encodeAlgebraicDifferentialReduction, decodeAlgebraicDifferentialReduction } from './algebraic-reduction-wire';
import { packAlgebraicArtifactData, unpackAlgebraicArtifactData } from './algebraic-artifact-keys';
import { algebraicCoefficientCodec } from './algebraic-wire';

function fixture() {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), C = curve.coordinates.constantOwner, ctx = fresh(), embedding = AlgebraicEmbedding.identity(ctx, C, bounds);
  const relative = constructRelativeNumberFieldWithin(ctx, C, C, embedding, bounds), change = baseChangeAlgebraicCurveWithin(ctx, curve, C, embedding, bounds), quotient = reconstructAlgebraicConstantQuotientWithin(ctx, curve, change, relative, bounds), x = mapAlgebraicConstantBaseChangeValue(ctx, quotient, b.x);
  const primitive = constructAlgebraicPrimitive(fresh(), curve, b.x, [{quotient, weight: C.fromInteger(ctx, 1n), unit: C.fromInteger(ctx, 1n), factors: [{value: x, exponent: 1n}]}], bounds), derivative = differentiateAlgebraicPrimitive(fresh(), curve, primitive, bounds), wire = encodeAlgebraicPrimitive(fresh(), curve, primitive, derivative.derivative, derivative, bounds);
  const inv = b.field.inverse(b.ctx, b.x), input = b.field.add(b.ctx, b.x, b.field.add(b.ctx, inv, b.field.multiply(b.ctx, inv, inv))), reduction = reduceAlgebraicDifferential(fresh(), curve, input, bounds), reductionWire = encodeAlgebraicDifferentialReduction(fresh(), curve, input, reduction, bounds);
  return {b, curve, C, target: derivative.derivative, input, wire, reductionWire};
}
let f: ReturnType<typeof fixture>;
beforeAll(() => { f = fixture(); });
function change(body: unknown, path: readonly (string | number)[], value: unknown) {
  let out = body as Record<string | number, unknown>;
  for (const key of path.slice(0, -1)) out = out[key] as Record<string | number, unknown>;
  out[path[path.length - 1]] = value;
}
function payload(data: unknown) { return JSON.parse(JSON.stringify(unpackAlgebraicArtifactData(fresh(), (data as {payload: unknown}).payload, bounds))) as unknown; }
it.each(['weight', 'exponent', 'inverse', 'norm', 'norm-matrix', 'relative-basis', 'constant-image', 'trace', 'factors', 'conditions', 'flag'])('rejects altered primitive %s in fresh reconstruction', mutation => {
  const body = payload(f.wire), term = ['evidence', 'primitive', 'terms', 0, 'evidence'], factor = [...term, 'factors', 0], quotient = ['evidence', 'primitive', 'terms', 0, 'quotient'];
  const zero = algebraicCoefficientCodec(fresh(), f.b.field, bounds).encode(f.b.field.fromInteger(f.b.ctx, 0n)), constantZero = algebraicCoefficientCodec(fresh(), f.C, bounds).encode(f.C.fromInteger(f.b.ctx, 0n));
  if (mutation === 'weight') change(body, [...term, 'weight'], constantZero);
  if (mutation === 'exponent') change(body, [...factor, 'exponent'], '2');
  if (mutation === 'inverse') change(body, [...factor, 'inverse'], {kind: 'zero'});
  if (mutation === 'norm') change(body, [...factor, 'norm'], zero);
  if (mutation === 'norm-matrix') change(body, [...factor, 'normMatrix', 'inverse'], []);
  if (mutation === 'relative-basis') change(body, [...quotient, 'relative', 'degree'], 2);
  if (mutation === 'constant-image') change(body, [...quotient, 'relative', 'image'], constantZero);
  if (mutation === 'trace') change(body, ['evidence', 'derivative', 'terms', 0, 'trace', 'trace'], zero);
  if (mutation === 'factors') change(body, [...term, 'factors'], []);
  if (mutation === 'conditions') change(body, ['evidence', 'primitive', 'conditions'], []);
  if (mutation === 'flag') change(body, ['evidence', 'primitive', 'verified'], true);
  const data = {...f.wire as object, payload: packAlgebraicArtifactData(fresh(), body, bounds)}; expect(() => decodeAlgebraicPrimitive(fresh(), f.curve, f.target, data, bounds)).toThrow();
});
it.each(['transitions', 'connection', 'matrix', 'infinity', 'residues', 'minimal', 'conditions', 'flag'])('rejects altered complete reduction %s', mutation => {
  const body = payload(f.reductionWire), prefix = ['evidence'];
  if (mutation === 'transitions') change(body, [...prefix, 'hermite', 'steps'], []);
  if (mutation === 'connection') change(body, [...prefix, 'hermite', 'connection', 'derivatives'], []);
  if (mutation === 'matrix') change(body, [...prefix, 'hermite', 'steps', 0, 'system', 'rhs'], []);
  if (mutation === 'infinity') change(body, [...prefix, 'infinity', 'blocks'], []);
  if (mutation === 'residues') change(body, [...prefix, 'residues', 'entries'], []);
  if (mutation === 'minimal') change(body, [...prefix, 'residues', 'entries', 0, 'evidence', 'minimal'], null);
  if (mutation === 'conditions') change(body, [...prefix, 'conditions'], []);
  if (mutation === 'flag') change(body, [...prefix, 'verified'], true);
  const data = {...f.reductionWire as object, payload: packAlgebraicArtifactData(fresh(), body, bounds)}; expect(() => decodeAlgebraicDifferentialReduction(fresh(), f.curve, f.input, data, bounds)).toThrow();
});
