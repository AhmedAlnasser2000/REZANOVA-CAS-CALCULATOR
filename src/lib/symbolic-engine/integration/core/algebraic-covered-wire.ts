/** Composed stored evidence. Each source wrapper supplies its own complete
 * pole authority; shared-data references never replace these checks. */
import type {AlgebraicCurveView} from './algebraic-curve';
import type {NormalizedAlgebraicWireContext} from './algebraic-normalized-wire';
import {algebraicPoleCoverageCodec} from './algebraic-pole-coverage-wire';
import {algebraicResidueDataCommonParts, algebraicResidueMinimalCodec} from './algebraic-reduction-wire';
import {algebraicResidueSplittingDataCodec, algebraicResidueRelationsDataCodec} from './algebraic-residue-wire';
import {verifyAlgebraicCoveredResiduesWithin, type AlgebraicCoveredResidues, type AlgebraicCoveredResidue} from './algebraic-covered-residues';
import {verifyAlgebraicCoveredSplittingWithin, verifyAlgebraicCoveredRelationsWithin, verifyAlgebraicCoveredLogarithmsWithin, type AlgebraicCoveredRelations, type AlgebraicCoveredLogarithms} from './algebraic-covered-relations';
import {geometricLogarithmDataCodec, type GeometricEvidenceFormat} from './algebraic-geometric-wire';
import {algebraicPlaceCodec, algebraicValuationCodec} from './algebraic-place-wire';
import {algebraicLocalExpansionCodec} from './algebraic-geometry-wire';
import {demand} from './execution';
import * as w from './decision-wire-algebra';
import type {DifferentialBounds} from './differential-field';
import type {ExecutionContext} from './execution';
import {algebraicCurveEvidenceCodec} from './algebraic-curve-wire';
import {NormalizedAlgebraicWireContext as WireContext} from './algebraic-normalized-wire';
import {inspectExactArtifact} from './artifact-bounds';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {recordRationalGcdEvidence, replayRationalGcdEvidence} from './rational-gcd-evidence';
import type {AlgebraicCoveredUniformizer} from './algebraic-covered-uniformizer';

export function algebraicCoveredResiduesCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicCoveredResidues<E>> {
  const {ctx} = s, at = algebraicPlaceCodec(s, curve), {ring, parts: common} = algebraicResidueDataCommonParts(s, curve), native = s.native(curve.owner);
  const entryParts = (place: ReturnType<typeof at.decode>) => {
    const base = s.native(place.algebra.base), scalar = place.order.lattice.scalar, p = w.polynomial(ctx, scalar.ring, s.coefficient(scalar));
    const value = s.native(place.residue), parameter = w.structure(ctx, {index: w.integer(ctx), value: native, valuation: algebraicValuationCodec(s, curve)}), derivative = s.derivative(curve.owner), minimal = w.optional(algebraicResidueMinimalCodec(s, place.residue, ring));
    const baseParameter = w.structure(ctx, {method: w.literal(ctx, 'base-prime'), value: native}), idealParameter = w.structure(ctx, {method: w.literal(ctx, 'ideal-basis'), value: native, evidence: parameter});
    const coveredParameter: w.EvidenceCodec<AlgebraicCoveredUniformizer<E>> = {
      encode(v) {return v.method === 'base-prime' ? baseParameter.encode(v) : idealParameter.encode(v);},
      decode(data) {
        demand(data !== null && typeof data === 'object', 'invalid-input', 'covered uniformizer discriminator'); const descriptor = Object.getOwnPropertyDescriptor(data, 'method');
        demand(descriptor !== undefined && 'value' in descriptor, 'invalid-input', 'covered uniformizer method');
        if (descriptor.value === 'base-prime') return baseParameter.decode(data);
        demand(descriptor.value === 'ideal-basis', 'invalid-input', 'covered uniformizer method'); return idealParameter.decode(data);
      }
    };
    const fields = {order: w.optional(s.integer()), value, parameter: w.optional(parameter), derivative: w.optional(derivative), minimal};
    return {local: (method: 'zero' | 'local-lift') => w.structure(ctx, {...fields, method: w.literal(ctx, method), expansion: w.optional(algebraicLocalExpansionCodec(s, curve))}),
      direct: w.structure(ctx, {...fields, method: w.literal(ctx, 'quotient-map'), parameter: coveredParameter, derivative,
        evaluation: w.structure(ctx, {input: native, coordinates: w.list(ctx, s.scalar(scalar)), units: w.list(ctx, w.bezout(ctx, p)), numerators: w.list(ctx, base), inverses: w.list(ctx, base), value})})};
  };
  const entry: w.EvidenceCodec<AlgebraicCoveredResidue<E>> = {encode(v) {const parts = entryParts(v.place); return Object.freeze({place: at.encode(v.place), evidence: v.method === 'quotient-map' ? parts.direct.encode(v) : parts.local(v.method).encode(v)});},
    decode(data) {
      const raw = w.record(ctx, data, ['place', 'evidence']), place = at.decode(raw.place), parts = entryParts(place);
      demand(raw.evidence !== null && typeof raw.evidence === 'object', 'invalid-input', 'covered residue discriminator'); const descriptor = Object.getOwnPropertyDescriptor(raw.evidence, 'method');
      demand(descriptor !== undefined && 'value' in descriptor, 'invalid-input', 'covered residue method');
      if (descriptor.value === 'quotient-map') return Object.freeze({place, ...parts.direct.decode(raw.evidence)});
      demand(descriptor.value === 'zero' || descriptor.value === 'local-lift', 'invalid-input', 'covered residue method'); return Object.freeze({place, ...parts.local(descriptor.value).decode(raw.evidence)});
    }};
  const parts = w.structure(s.ctx, {...common, entries: w.list(ctx, entry), coverage: algebraicPoleCoverageCodec(s, curve)});
  return s.memo('algebraic-covered-residues', curve, {encode: parts.encode, decode(data) {const proof = parts.decode(data); verifyAlgebraicCoveredResiduesWithin(s.ctx, curve, proof.input, proof, s.bounds); return proof;}});
}
export function algebraicCoveredRelationsCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>, original: AlgebraicCoveredResidues<E>): w.EvidenceCodec<AlgebraicCoveredRelations<E>> {
  const split = algebraicResidueSplittingDataCodec(s, curve, original, active => algebraicCoveredResiduesCodec(s, active), proof => verifyAlgebraicCoveredSplittingWithin(s.ctx, curve, original, proof, s.bounds));
  return algebraicResidueRelationsDataCodec(s, original, split, proof => verifyAlgebraicCoveredRelationsWithin(s.ctx, proof, s.bounds));
}
export function algebraicCoveredLogarithmsCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>, relations: AlgebraicCoveredRelations<E>, format: GeometricEvidenceFormat = 'original'): w.EvidenceCodec<AlgebraicCoveredLogarithms<E>> {
  return geometricLogarithmDataCodec(s, curve, relations, proof => verifyAlgebraicCoveredLogarithmsWithin(s.ctx, curve, relations, proof, s.bounds), format);
}
export function encodeAlgebraicCoveredResidues<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicCoveredResidues<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    const p = recordRationalGcdEvidence(ctx, () => {verifyAlgebraicCoveredResiduesWithin(ctx, curve, input, proof, bounds); const s = new WireContext(ctx, bounds);
      return Object.freeze({curve: algebraicCurveEvidenceCodec(s, curve).encode(curve), evidence: algebraicCoveredResiduesCodec(s, curve).encode(proof)});}, proof.arithmetic);
    const arithmetic = w.structure(ctx, {primes: w.list(ctx, new WireContext(ctx, bounds).integer())}).encode(p.evidence);
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({...p.value, arithmetic}), bounds), data = Object.freeze({tag: 'algebraic-covered-residues', version: 1, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeAlgebraicCoveredResidues<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, data: unknown, bounds: DifferentialBounds): AlgebraicCoveredResidues<E> {
  return ctx.operation(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']); demand(raw.tag === 'algebraic-covered-residues' && raw.version === 1, 'invalid-input', 'covered residue tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['curve', 'evidence', 'arithmetic']), s = new WireContext(ctx, bounds), arithmetic = w.structure(ctx, {primes: w.list(ctx, s.integer())}).decode(body.arithmetic);
    return replayRationalGcdEvidence(ctx, arithmetic, () => {algebraicCurveEvidenceCodec(s, curve).decode(body.curve); const p = Object.freeze({...algebraicCoveredResiduesCodec(s, curve).decode(body.evidence), arithmetic}); verifyAlgebraicCoveredResiduesWithin(ctx, curve, input, p, bounds); return p;});
  });
}
