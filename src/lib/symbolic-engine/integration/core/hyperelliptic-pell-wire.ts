/** Distinct native Pell-principality evidence; legacy RR artifacts stay intact. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import type {AlgebraicDivisor} from './algebraic-divisor';
import {verifyAlgebraicDivisorWithin} from './algebraic-divisor';
import {equalAlgebraicPlaces} from './algebraic-place';
import {algebraicCurveEvidenceCodec} from './algebraic-curve-wire';
import {algebraicDivisorCodec} from './algebraic-divisor-wire';
import {bindExpectedAlgebraicPlace} from './algebraic-place-wire';
import {NormalizedAlgebraicWireContext} from './algebraic-normalized-wire';
import {normalizationText} from './exponential-normalization-wire-values';
import {inspectExactArtifact} from './artifact-bounds';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {reconstructSplitHyperellipticModelWithin, type SplitHyperellipticModel} from './hyperelliptic-curve-model';
import {polynomialPellEvidenceCodec} from './polynomial-pell-wire';
import {hyperellipticInfinityPrincipalityRule, verifyHyperellipticInfinityPrincipalityWithin, type HyperellipticInfinityPrincipality} from './hyperelliptic-infinity-principality';
import * as w from './decision-wire-algebra';

export function hyperellipticModelCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<SplitHyperellipticModel<E>> {
  const ctx = s.ctx, f = curve.coordinates.scalar, p = w.polynomial(ctx, f.ring, s.coefficient(f)), native = s.native(curve.owner);
  const parts = w.structure(ctx, {b: s.scalar(f), c: s.scalar(f), polynomial: p, squareFree: w.bezout(ctx, p), halfDegree: w.integer(ctx, 1), x: native, y: native, inverseGenerator: native});
  return {encode(v) {demand(v.curve === curve, 'domain-mismatch', 'Pell model codec curve'); return parts.encode(v);},
    decode(data) {return reconstructSplitHyperellipticModelWithin(ctx, curve, parts.decode(data), s.bounds);}};
}
export function hyperellipticInfinityPrincipalityCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>, request: AlgebraicDivisor<E>, model: SplitHyperellipticModel<E>): w.EvidenceCodec<HyperellipticInfinityPrincipality<E>> {
  const ctx = s.ctx, native = s.native(curve.owner), pell = polynomialPellEvidenceCodec(s, model.polynomial.ring);
  const factors = w.list(ctx, w.structure(ctx, {value: native, exponent: s.integer()})), conditions = w.list(ctx, w.structure(ctx, {kind: w.literal(ctx, 'denominator', 'nonzero'), path: normalizationText(ctx), value: native}));
  const unit = w.optional(w.structure(ctx, {argument: native, conjugate: native, inverse: native, norm: native, conditions}));
  const index = w.integer(ctx), common = w.structure(ctx, {rule: w.literal(ctx, hyperellipticInfinityPrincipalityRule), coefficient: s.integer(), pell, unit,
    kind: w.literal(ctx, 'principal', 'not-principal'), reason: w.literal(ctx, 'unit-multiple', 'bounded-empty', 'nondividing-unit'), factors});
  return {encode(proof) {
    const positive = request.entries.findIndex(e => equalAlgebraicPlaces(ctx, curve, e.place, proof.infinity.positive)), negative = request.entries.findIndex(e => equalAlgebraicPlaces(ctx, curve, e.place, proof.infinity.negative));
    demand(positive >= 0 && negative >= 0 && positive !== negative, 'verification-failed', 'complete Pell codec place correspondence');
    const pair = w.structure(ctx, {positive: index, negative: index, scaledY: native, positiveResidue: s.native(proof.infinity.positive.residue), negativeResidue: s.native(proof.infinity.negative.residue)});
    return Object.freeze({infinity: pair.encode({...proof.infinity, positive, negative}), evidence: common.encode(proof)});
  }, decode(data) {
    const raw = w.record(ctx, data, ['infinity', 'evidence']), pairRaw = w.record(ctx, raw.infinity, ['positive', 'negative', 'scaledY', 'positiveResidue', 'negativeResidue']);
    const i = index.decode(pairRaw.positive), j = index.decode(pairRaw.negative);
    demand(request.entries.length === 2 && i < 2 && j < 2 && i !== j, 'verification-failed', 'Pell serialized infinity coverage');
    const positive = request.entries[i].place, negative = request.entries[j].place;
    const pair = w.structure(ctx, {positive: index, negative: index, scaledY: native, positiveResidue: s.native(positive.residue), negativeResidue: s.native(negative.residue)}).decode(raw.infinity), proof = common.decode(raw.evidence);
    const result = Object.freeze({...proof, model, divisor: request, infinity: Object.freeze({...pair, model, positive, negative}), unit: proof.unit === null ? null : Object.freeze({...proof.unit, model, pell: proof.pell})});
    verifyHyperellipticInfinityPrincipalityWithin(ctx, curve, request, result, s.bounds); return result;
  }};
}
export function encodeHyperellipticInfinityPrincipality<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, proof: HyperellipticInfinityPrincipality<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    verifyHyperellipticInfinityPrincipalityWithin(ctx, curve, divisor, proof, bounds); const s = new NormalizedAlgebraicWireContext(ctx, bounds);
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({curve: algebraicCurveEvidenceCodec(s, curve).encode(curve), request: algebraicDivisorCodec(s, curve).encode(divisor),
      model: hyperellipticModelCodec(s, curve).encode(proof.model), evidence: hyperellipticInfinityPrincipalityCodec(s, curve, divisor, proof.model).encode(proof)}), bounds);
    const data = Object.freeze({tag: 'algebraic-principality', version: 2, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeHyperellipticInfinityPrincipality<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, data: unknown, bounds: DifferentialBounds): HyperellipticInfinityPrincipality<E> {
  return ctx.operation(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']);
    demand(raw.tag === 'algebraic-principality' && raw.version === 2, 'invalid-input', 'Pell principality tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['curve', 'request', 'model', 'evidence']), s = new NormalizedAlgebraicWireContext(ctx, bounds);
    algebraicCurveEvidenceCodec(s, curve).decode(body.curve); const expected = algebraicDivisorCodec(s, curve).decode(body.request);
    verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, expected);
    for (let i = 0; i < divisor.entries.length; i++) bindExpectedAlgebraicPlace(s, curve, divisor.entries[i].place, expected.entries[i].place);
    const model = hyperellipticModelCodec(s, curve).decode(body.model); return hyperellipticInfinityPrincipalityCodec(s, curve, divisor, model).decode(body.evidence);
  });
}
