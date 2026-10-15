import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {PolynomialRing} from './polynomial';
import {RationalFunctionField} from './rational-function';
import {NormalizedAlgebraicWireContext} from './algebraic-normalized-wire';
import {algebraicCurveEvidenceCodec} from './algebraic-curve-wire';
import {checkArtifactBounds, inspectExactArtifact} from './artifact-bounds';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {genusOnePresentationCodec} from './genus-one-presentation-wire';
import {verifyGenusOnePresentationWithin, type GenusOnePresentation} from './genus-one-presentation';
import {verifyGenusOneCoordinatesWithin, reconstructGenusOneCoordinatesWithin, type GenusOneCoordinates} from './genus-one-coordinates';
import * as w from './decision-wire-algebra';

export function genusOneCoordinatesCodec<E>(s: NormalizedAlgebraicWireContext, p: GenusOnePresentation<E>): w.EvidenceCodec<GenusOneCoordinates<E>> {
  const {ctx, bounds} = s, model = genusOnePresentationCodec(s, p.curve, p.origin);
  const parts = (ring: GenusOneCoordinates<E>['ring'], field: GenusOneCoordinates<E>['field']) => {const image = w.polynomial(ctx, ring, s.scalar(field)); return w.structure(ctx, {baseImage: image, basisImages: w.list(ctx, image)});};
  return {encode(proof) {demand(proof.ring.variable === 'Y', 'domain-mismatch', 'genus-one coordinate binder');
    ctx.allocate(2); return Object.freeze({presentation: model.encode(p), evidence: parts(proof.ring, proof.field).encode(proof)});
  }, decode(data) {
    const raw = w.record(ctx, data, ['presentation', 'evidence']), saved = model.decode(raw.presentation), f = p.curve.owner;
    demand(f.equal(ctx, saved.u, p.u) && f.equal(ctx, saved.v, p.v) && f.equal(ctx, saved.x, p.x) && f.equal(ctx, saved.y, p.y)
      && p.polynomial.ring.equal(ctx, p.polynomial, p.polynomial.ring.make(ctx, saved.polynomial.coefficients)), 'verification-failed', 'exact expected genus-one coordinate construction');
    const field = new RationalFunctionField(p.polynomial.ring), ring = new PolynomialRing(field, 'Y'), values = parts(ring, field).decode(raw.evidence);
    return reconstructGenusOneCoordinatesWithin(ctx, p, field, ring, values.baseImage, values.basisImages, bounds);
  }};
}
export function encodeGenusOneCoordinates<E>(ctx: ExecutionContext, p: GenusOnePresentation<E>, proof: GenusOneCoordinates<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); verifyGenusOneCoordinatesWithin(ctx, p, proof, bounds); const s = new NormalizedAlgebraicWireContext(ctx, bounds);
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({curve: algebraicCurveEvidenceCodec(s, p.curve).encode(p.curve), evidence: genusOneCoordinatesCodec(s, p).encode(proof)}), bounds);
    ctx.allocate(3); const data = Object.freeze({tag: 'genus-one-native-correspondence', version: 1, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeGenusOneCoordinates<E>(ctx: ExecutionContext, p: GenusOnePresentation<E>, data: unknown, bounds: DifferentialBounds): GenusOneCoordinates<E> {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']); demand(raw.tag === 'genus-one-native-correspondence' && raw.version === 1, 'invalid-input', 'genus-one correspondence tag/version');
    verifyGenusOnePresentationWithin(ctx, p.curve, p.origin, p, bounds);
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['curve', 'evidence']), s = new NormalizedAlgebraicWireContext(ctx, bounds);
    algebraicCurveEvidenceCodec(s, p.curve).decode(body.curve); return genusOneCoordinatesCodec(s, p).decode(body.evidence);
  });
}
