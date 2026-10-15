import type {ExecutionContext} from './execution';
import type {DifferentialElement as E, DifferentialBounds} from './differential-field';
import type {CertifiedTowerView} from './recursive-certified-tower';
import {recursiveRdeValueCodecs} from './recursive-rde-wire-algebra';
import {constantExtractionCodec} from './recursive-rde-wire';
import {compactRationalLinearCodec} from './compact-rational-linear-wire';
import {compactRecursiveParametricRdeCodec, compactRecursiveDecisionEnvelopeWithin, compactRecursiveDecisionBodyWithin} from './compact-recursive-rde-wire';
import {verifyCompactRecursiveLimitedIntegrationWithin, type CompactRecursiveLimitedIntegration} from './compact-recursive-limited';
import {checkArtifactBounds} from './artifact-bounds';
import * as w from './decision-wire-algebra';

export function compactRecursiveLimitedIntegrationCodec(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds): w.EvidenceCodec<CompactRecursiveLimitedIntegration> {
  const v = recursiveRdeValueCodecs(ctx, view, bounds), codec = w.structure(ctx, {rule: w.literal(ctx, 'recursive-limited-rank-family-v2'), f: v.value, generators: w.list(ctx, v.value),
    rde: compactRecursiveParametricRdeCodec(ctx, view, bounds), kind: w.literal(ctx, 'solutions', 'no-field-solution'),
    normalized: w.list(ctx, w.structure(ctx, {extraction: constantExtractionCodec(ctx, view.owner, bounds), pair: v.pair})), projection: w.optional(compactRationalLinearCodec(ctx)),
    family: w.optional(w.structure(ctx, {particular: v.pair, directions: w.list(ctx, v.pair), additiveConstant: w.literal(ctx, 'arbitrary-rational')})), conditions: v.conditions});
  return {encode: codec.encode, decode(data) {const proof = codec.decode(data); ctx.allocate(1); return Object.freeze({...proof, view});}};
}
export function encodeCompactRecursiveLimitedIntegration(ctx: ExecutionContext, view: CertifiedTowerView, f: E, generators: readonly E[], proof: CompactRecursiveLimitedIntegration, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); verifyCompactRecursiveLimitedIntegrationWithin(ctx, view, f, generators, proof, bounds);
    return compactRecursiveDecisionEnvelopeWithin(ctx, view, 'recursive-limited-integration-decision', compactRecursiveLimitedIntegrationCodec(ctx, view, bounds).encode(proof), bounds);
  });
}
export function decodeCompactRecursiveLimitedIntegration(ctx: ExecutionContext, view: CertifiedTowerView, f: E, generators: readonly E[], data: unknown, bounds: DifferentialBounds): CompactRecursiveLimitedIntegration {
  return ctx.operation(() => {
    const body = compactRecursiveDecisionBodyWithin(ctx, view, 'recursive-limited-integration-decision', data, bounds), proof = compactRecursiveLimitedIntegrationCodec(ctx, view, bounds).decode(body);
    verifyCompactRecursiveLimitedIntegrationWithin(ctx, view, f, generators, proof, bounds); return proof;
  });
}
