import {demand, type ExecutionContext} from './execution';
import type {DifferentialElement as E, DifferentialBounds} from './differential-field';
import type {CertifiedTowerView} from './recursive-certified-tower';
import {recursiveRdeValueCodecs} from './recursive-rde-wire-algebra';
import {recursiveHomogeneousRankEvidenceCodec} from './recursive-rde-wire';
import {compactRationalLinearCodec} from './compact-rational-linear-wire';
import {verifyCompactRecursiveParametricRdeWithin, type CompactRecursiveParametricRde} from './compact-recursive-rde';
import {checkArtifactBounds, inspectExactArtifact} from './artifact-bounds';
import {encodeStructuredTowerSnapshotWithin, replayStructuredTowerSnapshotWithin} from './structured-differential-admission-wire';
import {packRecursiveArtifactGraph, unpackRecursiveArtifactGraph} from './recursive-artifact-graph';
import * as w from './decision-wire-algebra';

export function compactRecursiveParametricRdeCodec(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds): w.EvidenceCodec<CompactRecursiveParametricRde> {
  const v = recursiveRdeValueCodecs(ctx, view, bounds), linear = compactRationalLinearCodec(ctx);
  const codec = w.structure(ctx, {rule: w.literal(ctx, 'recursive-parametric-rde-rank-family-v2'), a: v.value, b: v.value, forcing: w.list(ctx, v.value),
    homogeneous: recursiveHomogeneousRankEvidenceCodec(ctx, view, bounds, linear), slice: linear, kind: w.literal(ctx, 'solutions', 'no-field-solution'),
    family: w.optional(w.structure(ctx, {particular: v.pair, directions: w.list(ctx, v.pair)})), conditions: v.conditions});
  return {encode: codec.encode, decode(data) {const proof = codec.decode(data); ctx.allocate(1); return Object.freeze({...proof, view});}};
}
export function encodeCompactRecursiveParametricRde(ctx: ExecutionContext, view: CertifiedTowerView, a: E, b: E, forcing: readonly E[], proof: CompactRecursiveParametricRde, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); verifyCompactRecursiveParametricRdeWithin(ctx, view, a, b, forcing, proof, bounds);
    return compactRecursiveDecisionEnvelopeWithin(ctx, view, 'recursive-parametric-rde-decision', compactRecursiveParametricRdeCodec(ctx, view, bounds).encode(proof), bounds);
  });
}
export function decodeCompactRecursiveParametricRde(ctx: ExecutionContext, view: CertifiedTowerView, a: E, b: E, forcing: readonly E[], data: unknown, bounds: DifferentialBounds): CompactRecursiveParametricRde {
  return ctx.operation(() => {
    const body = compactRecursiveDecisionBodyWithin(ctx, view, 'recursive-parametric-rde-decision', data, bounds), proof = compactRecursiveParametricRdeCodec(ctx, view, bounds).decode(body);
    verifyCompactRecursiveParametricRdeWithin(ctx, view, a, b, forcing, proof, bounds); return proof;
  });
}
/** Narrow v2 family envelope only; references do not establish completeness. */
export function compactRecursiveDecisionEnvelopeWithin(ctx: ExecutionContext, view: CertifiedTowerView, tag: 'recursive-parametric-rde-decision' | 'recursive-limited-integration-decision', decision: unknown, bounds: DifferentialBounds): unknown {
  checkArtifactBounds(ctx, bounds); ctx.allocate(4);
  const payload = packRecursiveArtifactGraph(ctx, {construction: encodeStructuredTowerSnapshotWithin(ctx, view, bounds), decision}, bounds), data = Object.freeze({tag, version: 2, payload});
  inspectExactArtifact(ctx, bounds, data); return data;
}
export function compactRecursiveDecisionBodyWithin(ctx: ExecutionContext, view: CertifiedTowerView, tag: 'recursive-parametric-rde-decision' | 'recursive-limited-integration-decision', data: unknown, bounds: DifferentialBounds): unknown {
  checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']);
  demand(raw.tag === tag && raw.version === 2, 'invalid-input', 'compact recursive family tag/version');
  const body = w.record(ctx, unpackRecursiveArtifactGraph(ctx, raw.payload, bounds), ['construction', 'decision']);
  replayStructuredTowerSnapshotWithin(ctx, view, body.construction, bounds); return body.decision;
}
