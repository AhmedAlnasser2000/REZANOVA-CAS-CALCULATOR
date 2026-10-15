/** Complete RR/class correspondence and Miller replay, independently typed. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {assertGenusOnePresentation, verifyGenusOnePresentationWithin, type GenusOnePresentation} from './genus-one-presentation';
import type {GenusOneCoordinates} from './genus-one-coordinates';
import {genusOneCoordinatesCodec} from './genus-one-coordinates-wire';
import {NormalizedAlgebraicWireContext} from './algebraic-normalized-wire';
import {algebraicCurveEvidenceCodec} from './algebraic-curve-wire';
import {algebraicDivisorCodec, algebraicRiemannRochCodec} from './algebraic-divisor-wire';
import {bindExpectedAlgebraicPlace, algebraicPlaceCodec} from './algebraic-place-wire';
import {genusOnePresentationCodec} from './genus-one-presentation-wire';
import type {AlgebraicCurveView} from './algebraic-curve';
import {verifyAlgebraicDivisorWithin, type AlgebraicDivisor} from './algebraic-divisor';
import {verifyGenusOneDivisorClassWithin, type GenusOneDivisorClass} from './genus-one-divisor-class';
import {verifyGenusOneRationalTorsionWithin, genusOneTorsionRule, type GenusOneRationalTorsion} from './genus-one-torsion';
import {multipleCodec, pointCodec} from './elliptic-wire';
import {rationalEllipticOrderFilterCodec} from './elliptic-rational-order-filter-wire';
import {checkArtifactBounds, inspectExactArtifact} from './artifact-bounds';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import * as w from './decision-wire-algebra';

export function genusOneDivisorClassCodec<E>(s: NormalizedAlgebraicWireContext, model: GenusOneCoordinates<E>, expected: AlgebraicDivisor<E>): w.EvidenceCodec<GenusOneDivisorClass<E>> {
  const {ctx} = s, curve = model.curve, common = w.structure(ctx, {space: algebraicRiemannRochCodec(s, curve), extended: algebraicRiemannRochCodec(s, curve),
    index: w.integer(ctx), ratio: s.native(curve.owner), coordinates: w.polynomial(ctx, model.ring, s.scalar(model.field)), point: pointCodec(s, model), conditions: s.conditions(curve.owner)});
  return {encode: common.encode, decode(data) {
    const proof = Object.freeze({model, divisor: expected, ...common.decode(data)}); verifyGenusOneDivisorClassWithin(ctx, model, expected, proof, s.bounds); return proof;
  }};
}
export function genusOneRationalTorsionCodec<E>(s: NormalizedAlgebraicWireContext, model: GenusOneCoordinates<E>, expected: AlgebraicDivisor<E>, format: 'original'|'two-prime' = 'two-prime'): w.EvidenceCodec<GenusOneRationalTorsion<E>> {
  const {ctx} = s, fields = {rule: w.literal(ctx, genusOneTorsionRule), reduction: genusOneDivisorClassCodec(s, model, expected),
    tests: w.list(ctx, multipleCodec(s, model)), kind: w.literal(ctx, 'torsion', 'non-torsion'), order: w.optional(s.integer()),
    factors: w.list(ctx, w.structure(ctx, {value: s.native(model.curve.owner), exponent: s.integer()})), conditions: s.conditions(model.curve.owner)};
  const original = w.structure(ctx, fields), filtered = w.structure(ctx, {...fields, format: w.literal(ctx, 'rational-order-filter-v2'), filters: w.list(ctx, rationalEllipticOrderFilterCodec(ctx))});
  return {encode(proof) {
    if (format === 'original') {demand(proof.format === undefined, 'verification-failed', 'original genus-one torsion evidence format'); return original.encode(proof);}
    demand(proof.format === 'rational-order-filter-v2', 'verification-failed', 'filtered genus-one torsion evidence format'); return filtered.encode(proof);
  }, decode(data) {
    const proof: GenusOneRationalTorsion<E> = format === 'original' ? Object.freeze({model, divisor: expected, ...original.decode(data)}) : Object.freeze({model, divisor: expected, ...filtered.decode(data)});
    verifyGenusOneRationalTorsionWithin(ctx, model, expected, proof, s.bounds); return proof;
  }};
}
/** The request supplies the native curve/divisor. An auxiliary rational origin
 * is retained with its complete construction, without selecting one in replay. */
export function genusOnePrincipalMultipleCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>, expected: AlgebraicDivisor<E>): w.EvidenceCodec<GenusOneRationalTorsion<E>> {
  const at = algebraicPlaceCodec(s, curve);
  return {encode(proof) {
    const p = proof.model.presentation; demand(p.curve === curve, 'domain-mismatch', 'genus-one codec supplied curve');
    return Object.freeze({origin: at.encode(p.origin), presentation: genusOnePresentationCodec(s, curve, p.origin).encode(p), model: genusOneCoordinatesCodec(s, p).encode(proof.model), evidence: genusOneRationalTorsionCodec(s, proof.model, expected).encode(proof)});
  }, decode(data) {
    const raw = w.record(s.ctx, data, ['origin', 'presentation', 'model', 'evidence']), origin = at.decode(raw.origin), p = genusOnePresentationCodec(s, curve, origin).decode(raw.presentation), model = genusOneCoordinatesCodec(s, p).decode(raw.model);
    return genusOneRationalTorsionCodec(s, model, expected).decode(raw.evidence);
  }};
}
/** The model is restored into fresh auxiliary coordinate owners. Supplied
 * native curve, exact origin/construction and ordered request stay explicit. */
export function encodeGenusOneRationalTorsion<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>, expected: AlgebraicDivisor<E>, proof: GenusOneRationalTorsion<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); verifyGenusOneRationalTorsionWithin(ctx, model, expected, proof, bounds); const s = new NormalizedAlgebraicWireContext(ctx, bounds), p = model.presentation;
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({curve: algebraicCurveEvidenceCodec(s, p.curve).encode(p.curve), request: algebraicDivisorCodec(s, p.curve).encode(expected),
      model: genusOneCoordinatesCodec(s, p).encode(model), evidence: genusOneRationalTorsionCodec(s, model, expected, proof.format === undefined ? 'original' : 'two-prime').encode(proof)}), bounds);
    ctx.allocate(3); const data = Object.freeze({tag: 'genus-one-divisor-torsion', version: proof.format === undefined ? 1 : 2, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeGenusOneRationalTorsion<E>(ctx: ExecutionContext, p: GenusOnePresentation<E>, expected: AlgebraicDivisor<E>, data: unknown, bounds: DifferentialBounds): GenusOneRationalTorsion<E> {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']);
    demand(raw.tag === 'genus-one-divisor-torsion' && (raw.version === 1 || raw.version === 2), 'invalid-input', 'genus-one torsion tag/version');
    assertGenusOnePresentation(ctx, p.curve, p); verifyGenusOnePresentationWithin(ctx, p.curve, p.origin, p, bounds);
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['curve', 'request', 'model', 'evidence']), s = new NormalizedAlgebraicWireContext(ctx, bounds);
    algebraicCurveEvidenceCodec(s, p.curve).decode(body.curve); const request = algebraicDivisorCodec(s, p.curve).decode(body.request); verifyAlgebraicDivisorWithin(ctx, p.curve, expected.input, request);
    for (let i = 0; i < expected.entries.length; i++) bindExpectedAlgebraicPlace(s, p.curve, expected.entries[i].place, request.entries[i].place);
    const model = genusOneCoordinatesCodec(s, p).decode(body.model); return genusOneRationalTorsionCodec(s, model, expected, raw.version === 1 ? 'original' : 'two-prime').decode(body.evidence);
  });
}
