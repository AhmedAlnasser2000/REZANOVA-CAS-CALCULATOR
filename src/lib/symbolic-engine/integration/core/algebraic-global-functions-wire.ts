/** Derived global-space reconstruction needs no Hess/module/constant search. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {NormalizedAlgebraicWireContext} from './algebraic-normalized-wire';
import {algebraicCurveEvidenceCodec} from './algebraic-curve-wire';
import {algebraicGlobalFunctionRule, reconstructAlgebraicGlobalFunctionsWithin, verifyAlgebraicGlobalFunctionsWithin, type AlgebraicGlobalFunctionSpace} from './algebraic-global-functions';
import {inspectExactArtifact} from './artifact-bounds';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import * as w from './decision-wire-algebra';

export function algebraicGlobalFunctionSpaceCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicGlobalFunctionSpace<E>> {
  const {ctx} = s, parts = w.structure(ctx, {rule: w.literal(ctx, algebraicGlobalFunctionRule), dimension: w.literal(ctx, 1), basis: w.list(ctx, s.native(curve.owner)), conditions: s.conditions(curve.owner)});
  return {encode(p) {verifyAlgebraicGlobalFunctionsWithin(ctx, curve, p, s.bounds); return parts.encode(p);},
    decode(data) {const p = parts.decode(data); return reconstructAlgebraicGlobalFunctionsWithin(ctx, curve, p.basis, p.conditions, s.bounds);}};
}
export function encodeAlgebraicGlobalFunctions<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, space: AlgebraicGlobalFunctionSpace<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    verifyAlgebraicGlobalFunctionsWithin(ctx, curve, space, bounds); const s = new NormalizedAlgebraicWireContext(ctx, bounds);
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({curve: algebraicCurveEvidenceCodec(s, curve).encode(curve), evidence: algebraicGlobalFunctionSpaceCodec(s, curve).encode(space)}), bounds), data = Object.freeze({tag: 'algebraic-global-function-space', version: 1, payload});
    inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeAlgebraicGlobalFunctions<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, data: unknown, bounds: DifferentialBounds): AlgebraicGlobalFunctionSpace<E> {
  return ctx.operation(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']); demand(raw.tag === 'algebraic-global-function-space' && raw.version === 1, 'invalid-input', 'global function space tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['curve', 'evidence']), s = new NormalizedAlgebraicWireContext(ctx, bounds);
    algebraicCurveEvidenceCodec(s, curve).decode(body.curve); return algebraicGlobalFunctionSpaceCodec(s, curve).decode(body.evidence);
  });
}
