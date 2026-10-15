/** Explicit pole-only evidence; the legacy full-divisor format stays intact. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {NormalizedAlgebraicWireContext} from './algebraic-normalized-wire';
import {algebraicCurveEvidenceCodec} from './algebraic-curve-wire';
import {algebraicFactorizationCodec} from './algebraic-wire';
import {algebraicCanonicalGeometryCodec} from './algebraic-geometry-wire';
import {algebraicPlaceCodec, algebraicPlaceDecompositionCodec, algebraicValuationCodec} from './algebraic-place-wire';
import {algebraicPoleCoverageRule, verifyAlgebraicPoleCoverageWithin, type AlgebraicPoleCoverage} from './algebraic-pole-coverage';
import {inspectExactArtifact} from './artifact-bounds';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {recordRationalGcdEvidence, replayRationalGcdEvidence} from './rational-gcd-evidence';
import * as w from './decision-wire-algebra';

export function algebraicPoleCoverageCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicPoleCoverage<E>> {
  const {ctx, bounds} = s, scalar = curve.finite.lattice.scalar, coefficient = s.scalar(scalar);
  const parts = w.structure(ctx, {rule: w.literal(ctx, algebraicPoleCoverageRule), input: s.native(curve.owner), geometry: algebraicCanonicalGeometryCodec(s, curve),
    normalization: w.structure(ctx, {coordinates: w.list(ctx, coefficient), denominators: s.denominators(scalar), integral: w.list(ctx, coefficient)}),
    denominatorFactors: algebraicFactorizationCodec(ctx, scalar.ring, bounds), finite: w.list(ctx, algebraicPlaceDecompositionCodec(s, curve)),
    entries: w.list(ctx, w.structure(ctx, {place: algebraicPlaceCodec(s, curve), valuation: w.optional(algebraicValuationCodec(s, curve)), order: w.optional(s.integer())})), conditions: s.conditions(curve.owner)});
  return {encode: parts.encode, decode(data) {const proof = parts.decode(data); verifyAlgebraicPoleCoverageWithin(ctx, curve, proof.input, proof, bounds); return proof;}};
}
export function encodeAlgebraicPoleCoverage<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicPoleCoverage<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    const recorded = recordRationalGcdEvidence(ctx, () => {
      verifyAlgebraicPoleCoverageWithin(ctx, curve, input, proof, bounds); const s = new NormalizedAlgebraicWireContext(ctx, bounds);
      return Object.freeze({curve: algebraicCurveEvidenceCodec(s, curve).encode(curve), evidence: algebraicPoleCoverageCodec(s, curve).encode(proof)});
    }, proof.arithmetic);
    const arithmetic = w.structure(ctx, {primes: w.list(ctx, new NormalizedAlgebraicWireContext(ctx, bounds).integer())}).encode(recorded.evidence);
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({...recorded.value, arithmetic}), bounds), data = Object.freeze({tag: 'algebraic-differential-pole-coverage', version: 1, payload});
    inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeAlgebraicPoleCoverage<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, data: unknown, bounds: DifferentialBounds): AlgebraicPoleCoverage<E> {
  return ctx.operation(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']);
    demand(raw.tag === 'algebraic-differential-pole-coverage' && raw.version === 1, 'invalid-input', 'pole coverage tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['curve', 'evidence', 'arithmetic']), s = new NormalizedAlgebraicWireContext(ctx, bounds);
    const arithmetic = w.structure(ctx, {primes: w.list(ctx, s.integer())}).decode(body.arithmetic);
    return replayRationalGcdEvidence(ctx, arithmetic, () => {
      algebraicCurveEvidenceCodec(s, curve).decode(body.curve); const proof = Object.freeze({...algebraicPoleCoverageCodec(s, curve).decode(body.evidence), arithmetic});
      verifyAlgebraicPoleCoverageWithin(ctx, curve, input, proof, bounds); return proof;
    });
  });
}
