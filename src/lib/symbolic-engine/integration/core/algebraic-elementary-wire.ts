/** Compact positive decision. Version-1 search-evidence replay remains separate. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {NormalizedAlgebraicWireContext} from './algebraic-normalized-wire';
import {algebraicCurveEvidenceCodec} from './algebraic-curve-wire';
import {algebraicPrimitiveCodec, algebraicPrimitiveDerivativeCodec} from './algebraic-primitive-wire';
import {inspectExactArtifact} from './artifact-bounds';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {algebraicElementaryRule, verifyCompactAlgebraicElementaryWithin, type CompactAlgebraicElementary} from './algebraic-elementary-evidence';
import * as w from './decision-wire-algebra';

function evidenceCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<CompactAlgebraicElementary<E>> {
  const ctx = s.ctx, primitive = algebraicPrimitiveCodec(s, curve), common = w.structure(ctx, {rule: w.literal(ctx, algebraicElementaryRule), kind: w.literal(ctx, 'elementary'), input: s.native(curve.owner), conditions: s.conditions(curve.owner)});
  return {encode(proof) {return Object.freeze({primitive: primitive.encode(proof.primitive), derivative: algebraicPrimitiveDerivativeCodec(s, proof.primitive).encode(proof.derivative), evidence: common.encode(proof)});},
    decode(data) {const raw = w.record(ctx, data, ['primitive', 'derivative', 'evidence']), p = primitive.decode(raw.primitive), derivative = algebraicPrimitiveDerivativeCodec(s, p).decode(raw.derivative), proof = Object.freeze({...common.decode(raw.evidence), primitive: p, derivative});
      verifyCompactAlgebraicElementaryWithin(ctx, curve, proof.input, proof, s.bounds); return proof;}};
}
export function encodeCompactAlgebraicElementary<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: CompactAlgebraicElementary<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    verifyCompactAlgebraicElementaryWithin(ctx, curve, input, proof, bounds); const s = new NormalizedAlgebraicWireContext(ctx, bounds);
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({curve: algebraicCurveEvidenceCodec(s, curve).encode(curve), evidence: evidenceCodec(s, curve).encode(proof)}), bounds);
    const data = Object.freeze({tag: 'algebraic-integration-decision', version: 2, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeCompactAlgebraicElementary<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, data: unknown, bounds: DifferentialBounds): CompactAlgebraicElementary<E> {
  return ctx.operation(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']);
    demand(raw.tag === 'algebraic-integration-decision' && raw.version === 2, 'invalid-input', 'compact algebraic decision tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['curve', 'evidence']), s = new NormalizedAlgebraicWireContext(ctx, bounds);
    algebraicCurveEvidenceCodec(s, curve).decode(body.curve); const proof = evidenceCodec(s, curve).decode(body.evidence);
    demand(curve.owner.equal(ctx, proof.input, input), 'verification-failed', 'compact decision explicit expected input'); return proof;
  });
}
