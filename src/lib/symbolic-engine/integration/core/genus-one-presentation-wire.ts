import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {PolynomialRing} from './polynomial';
import type {AlgebraicCurveView} from './algebraic-curve';
import type {AlgebraicPlace} from './algebraic-place';
import {NormalizedAlgebraicWireContext} from './algebraic-normalized-wire';
import {algebraicCurveEvidenceCodec} from './algebraic-curve-wire';
import {algebraicCanonicalGeometryCodec} from './algebraic-geometry-wire';
import {algebraicPlaceCodec, bindExpectedAlgebraicPlace, algebraicValuationCodec} from './algebraic-place-wire';
import {algebraicRiemannRochCodec} from './algebraic-divisor-wire';
import {algebraicCoefficientSystemCodec} from './algebraic-differential-wire';
import {linearEvidenceCodec} from './linear-wire';
import {checkArtifactBounds, inspectExactArtifact} from './artifact-bounds';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {verifyGenusOnePresentationWithin, reconstructGenusOnePresentationWithin, type GenusOnePresentation} from './genus-one-presentation';
import * as w from './decision-wire-algebra';

export function genusOnePresentationCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>, origin: AlgebraicPlace<E>): w.EvidenceCodec<GenusOnePresentation<E>> {
  const {ctx, bounds} = s, c = s.native(curve.coordinates.constantOwner), native = s.native(curve.owner), place = algebraicPlaceCodec(s, curve);
  const common = {origin: place, geometry: algebraicCanonicalGeometryCodec(s, curve), spaces: w.list(ctx, algebraicRiemannRochCodec(s, curve)), indices: w.list(ctx, w.integer(ctx)),
    poles: w.list(ctx, algebraicValuationCodec(s, curve)), u: native, v: native, matrix: algebraicCoefficientSystemCodec(s, curve), elimination: linearEvidenceCodec(ctx, c),
    scale: c, x: native, y: native, conditions: s.conditions(curve.owner)};
  const parts = (r: GenusOnePresentation<E>['polynomial']['ring']) => {const p = w.polynomial(ctx, r, c); return w.structure(ctx, {...common, polynomial: p, squareFree: w.bezout(ctx, p)});};
  return {encode(proof) {demand(proof.polynomial.ring.variable === 'X', 'domain-mismatch', 'genus-one polynomial binder'); return parts(proof.polynomial.ring).encode(proof);}, decode(data) {
    const decoded = parts(new PolynomialRing(curve.coordinates.constantOwner, 'X')).decode(data); bindExpectedAlgebraicPlace(s, curve, origin, decoded.origin);
    return reconstructGenusOnePresentationWithin(ctx, curve, origin, decoded, bounds);
  }};
}
export function encodeGenusOnePresentation<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, origin: AlgebraicPlace<E>, proof: GenusOnePresentation<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); verifyGenusOnePresentationWithin(ctx, curve, origin, proof, bounds); const s = new NormalizedAlgebraicWireContext(ctx, bounds);
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({curve: algebraicCurveEvidenceCodec(s, curve).encode(curve), evidence: genusOnePresentationCodec(s, curve, origin).encode(proof)}), bounds);
    ctx.allocate(3); const data = Object.freeze({tag: 'genus-one-weierstrass-presentation', version: 1, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeGenusOnePresentation<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, origin: AlgebraicPlace<E>, data: unknown, bounds: DifferentialBounds): GenusOnePresentation<E> {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']); demand(raw.tag === 'genus-one-weierstrass-presentation' && raw.version === 1, 'invalid-input', 'genus-one presentation tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['curve', 'evidence']), s = new NormalizedAlgebraicWireContext(ctx, bounds);
    algebraicCurveEvidenceCodec(s, curve).decode(body.curve); return genusOnePresentationCodec(s, curve, origin).decode(body.evidence);
  });
}
