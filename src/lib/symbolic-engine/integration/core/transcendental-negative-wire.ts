import {AlgebraError, type ExecutionContext} from './execution';
import type {DifferentialElement as E, DifferentialBounds} from './differential-field';
import type {CertifiedTowerView} from './recursive-certified-tower';
import {TranscendentalDomain} from './transcendental-domain';
import {TRANSCENDENTAL_RULE} from './transcendental-decision';
import {firstLevelReductionCodecs} from './first-level-rational-reduction-codecs';
import {constantExtractionCodec} from './recursive-rde-wire';
import {compactRecursiveLimitedIntegrationCodec} from './compact-recursive-limited-wire';
import {compactRecursiveParametricRdeCodec} from './compact-recursive-rde-wire';
import {transcendentalFamilyReductionCodecs} from './transcendental-reduction-codecs';
import {compactTranscendentalEnvelope, compactTranscendentalArtifactBody} from './transcendental-artifact';
import {verifyCompactTranscendentalNegativeWithin, type CompactTranscendentalNegative} from './transcendental-negative-evidence';
import * as w from './decision-wire-algebra';

function codec(ctx: ExecutionContext, d: TranscendentalDomain, bounds: DifferentialBounds): w.EvidenceCodec<CompactTranscendentalNegative> {
  const view = d.view; if (view.parent === null) return rejecting(ctx);
  const c = firstLevelReductionCodecs(ctx, d), parent = codec(ctx, new TranscendentalDomain(ctx, view.parent, bounds), bounds);
  const families = transcendentalFamilyReductionCodecs(ctx, d,
    compactRecursiveLimitedIntegrationCodec(ctx, view.parent, bounds), compactRecursiveParametricRdeCodec(ctx, view.parent, bounds));
  const body = w.structure(ctx, {kind: w.literal(ctx, 'non-elementary'), rule: w.literal(ctx, TRANSCENDENTAL_RULE), format: w.literal(ctx, 'compact-obstruction-v2'),
    input: c.e, stage: w.literal(ctx, 'logarithmic', 'exponential'), hermite: c.hermite,
    residue: w.optional(w.structure(ctx, {evidence: c.residue, descent: w.list(ctx, constantExtractionCodec(ctx, d.base, bounds))})),
    remainder: w.optional(w.structure(ctx, {logarithms: c.primitive, derivative: c.proof, value: c.e})),
    polynomial: w.optional(families.polynomial), laurent: w.optional(families.laurent), parent: w.optional(parent),
    obstruction: w.structure(ctx, {kind: w.literal(ctx, 'normal-residue', 'logarithmic-coefficient', 'exponential-component', 'parent-decision'), index: w.optional(w.integer(ctx)), level: w.integer(ctx, 1)}), conditions: c.conditions});
  return {encode(proof) {
    // Existing evidence has distinct auxiliary owners. Encode each node using
    // its own domain, rather than rebinding it by a codec round trip.
    if (proof.domain !== d) return codec(ctx, proof.domain, bounds).encode(proof);
    return body.encode(proof);
  }, decode(data) {const proof = body.decode(data); ctx.allocate(1); return Object.freeze({...proof, domain: d});}};
}
function rejecting<T>(ctx: ExecutionContext): w.EvidenceCodec<T> {
  const stop = (): never => {ctx.tick(); throw new AlgebraError('verification-failed', 'negative reduction at rational base');};
  return {encode: stop, decode: stop};
}
export function encodeCompactTranscendentalNegative(ctx: ExecutionContext, view: CertifiedTowerView, input: E, proof: CompactTranscendentalNegative, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {verifyCompactTranscendentalNegativeWithin(ctx, view, input, proof, bounds);
    return compactTranscendentalEnvelope(ctx, view, 'transcendental-decision', codec(ctx, proof.domain, bounds).encode(proof), bounds);});
}
export function decodeCompactTranscendentalNegative(ctx: ExecutionContext, view: CertifiedTowerView, input: E, data: unknown, bounds: DifferentialBounds): CompactTranscendentalNegative {
  return ctx.operation(() => {
    const body = compactTranscendentalArtifactBody(ctx, view, 'transcendental-decision', data, bounds), proof = codec(ctx, new TranscendentalDomain(ctx, view, bounds), bounds).decode(body);
    verifyCompactTranscendentalNegativeWithin(ctx, view, input, proof, bounds); return proof;
  });
}
