/** Version-3 positive decisions retain native identity and nontrivial traces.
 * Version-1 and version-2 decoding remain in their original checked codecs. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {NormalizedAlgebraicWireContext} from './algebraic-normalized-wire';
import {algebraicCurveEvidenceCodec} from './algebraic-curve-wire';
import {algebraicPrimitiveCodec, algebraicPrimitiveDerivativeCodec} from './algebraic-primitive-wire';
import {reconstructNativeAlgebraicPrimitiveWithin, type NativeAlgebraicPrimitive, type NativeAlgebraicPrimitiveDerivative} from './algebraic-native-primitive';
import {nativeAlgebraicElementaryRule, verifyNativeAlgebraicElementaryWithin, type NativeAlgebraicElementary} from './algebraic-native-elementary';
import {inspectExactArtifact} from './artifact-bounds';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import * as w from './decision-wire-algebra';

export function nativeAlgebraicPrimitiveCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<NativeAlgebraicPrimitive<E>> {
  const {ctx} = s, native = s.native(curve.owner), base = algebraicPrimitiveCodec(s, curve);
  const parts = w.structure(ctx, {kind: w.literal(ctx, 'native-and-relative-trace'), base,
    terms: w.list(ctx, w.structure(ctx, {kind: w.literal(ctx, 'identity-relative-trace'), degree: w.literal(ctx, 1), weight: s.native(curve.coordinates.constantOwner),
      embeddedWeight: native, weightDerivative: s.derivative(curve.owner),
      factors: w.list(ctx, w.structure(ctx, {value: native, exponent: s.integer(), inverse: native, norm: native}))})), conditions: s.conditions(curve.owner)});
  return {encode(p) {demand(p.base.curve === curve, 'domain-mismatch', 'native primitive codec expected curve'); return parts.encode(p);},
    decode(data) {const p = parts.decode(data); return reconstructNativeAlgebraicPrimitiveWithin(ctx, curve, p.base, p.terms, p.conditions, s.bounds);}};
}
export function nativeAlgebraicPrimitiveDerivativeCodec<E>(s: NormalizedAlgebraicWireContext, primitive: NativeAlgebraicPrimitive<E>): w.EvidenceCodec<NativeAlgebraicPrimitiveDerivative<E>> {
  const {ctx} = s, f = primitive.base.curve.owner, native = s.native(f);
  return w.structure(ctx, {base: algebraicPrimitiveDerivativeCodec(s, primitive.base),
    terms: w.list(ctx, w.structure(ctx, {factors: w.list(ctx, s.derivative(f)), logarithmicDerivative: native, column: native, trace: native, newtonSum: native})), derivative: native});
}
function decisionCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<NativeAlgebraicElementary<E>> {
  const ctx = s.ctx, primitive = nativeAlgebraicPrimitiveCodec(s, curve), common = w.structure(ctx, {rule: w.literal(ctx, nativeAlgebraicElementaryRule), kind: w.literal(ctx, 'elementary'), input: s.native(curve.owner), conditions: s.conditions(curve.owner)});
  return {encode(p) {return Object.freeze({primitive: primitive.encode(p.primitive), derivative: nativeAlgebraicPrimitiveDerivativeCodec(s, p.primitive).encode(p.derivative), evidence: common.encode(p)});},
    decode(data) {const raw = w.record(ctx, data, ['primitive', 'derivative', 'evidence']), p = primitive.decode(raw.primitive), derivative = nativeAlgebraicPrimitiveDerivativeCodec(s, p).decode(raw.derivative), proof = Object.freeze({...common.decode(raw.evidence), primitive: p, derivative});
      verifyNativeAlgebraicElementaryWithin(ctx, curve, proof.input, proof, s.bounds); return proof;}};
}
export function encodeNativeAlgebraicElementary<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: NativeAlgebraicElementary<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    verifyNativeAlgebraicElementaryWithin(ctx, curve, input, proof, bounds); const s = new NormalizedAlgebraicWireContext(ctx, bounds);
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({curve: algebraicCurveEvidenceCodec(s, curve).encode(curve), evidence: decisionCodec(s, curve).encode(proof)}), bounds);
    const data = Object.freeze({tag: 'algebraic-integration-decision', version: 3, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeNativeAlgebraicElementary<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, data: unknown, bounds: DifferentialBounds): NativeAlgebraicElementary<E> {
  return ctx.operation(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']);
    demand(raw.tag === 'algebraic-integration-decision' && raw.version === 3, 'invalid-input', 'native algebraic decision tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['curve', 'evidence']), s = new NormalizedAlgebraicWireContext(ctx, bounds);
    algebraicCurveEvidenceCodec(s, curve).decode(body.curve); const proof = decisionCodec(s, curve).decode(body.evidence);
    demand(curve.owner.equal(ctx, input, proof.input), 'verification-failed', 'native decision explicit expected input'); return proof;
  });
}
