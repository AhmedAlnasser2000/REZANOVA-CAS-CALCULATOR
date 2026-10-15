import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import type { CertifiedTowerView } from './recursive-certified-tower';
import { checkArtifactBounds, inspectExactArtifact } from './artifact-bounds';
import { encodeCertifiedTowerSnapshot, replayCertifiedTowerSnapshot } from './recursive-tower-wire';
import {encodeStructuredTowerSnapshotWithin, replayStructuredTowerSnapshotWithin} from './structured-differential-admission-wire';
import { packRecursiveArtifactGraph, unpackRecursiveArtifactGraph } from './recursive-artifact-graph';
import { record } from './decision-wire-algebra';
export function transcendentalEnvelope(ctx: ExecutionContext, view: CertifiedTowerView, tag: string, evidence: unknown, bounds: DifferentialBounds): unknown {
  return envelope(ctx, view, tag, 1, evidence, bounds);
}
export function compactTranscendentalEnvelope(ctx: ExecutionContext, view: CertifiedTowerView, tag: string, evidence: unknown, bounds: DifferentialBounds): unknown {
  return envelope(ctx, view, tag, 2, evidence, bounds);
}
function envelope(ctx: ExecutionContext, view: CertifiedTowerView, tag: string, version: 1 | 2, evidence: unknown, bounds: DifferentialBounds): unknown {
  checkArtifactBounds(ctx, bounds); ctx.allocate(4);
  const construction = version === 1 ? encodeCertifiedTowerSnapshot(ctx, view, bounds) : encodeStructuredTowerSnapshotWithin(ctx, view, bounds);
  const payload = packRecursiveArtifactGraph(ctx, {construction, evidence}, bounds);
  const data = Object.freeze({tag, version, payload}); inspectExactArtifact(ctx, bounds, data); return data;
}
export function transcendentalArtifactBody(ctx: ExecutionContext, view: CertifiedTowerView, tag: string, data: unknown, bounds: DifferentialBounds): unknown {
  return artifactBody(ctx, view, tag, 1, data, bounds);
}
export function compactTranscendentalArtifactBody(ctx: ExecutionContext, view: CertifiedTowerView, tag: string, data: unknown, bounds: DifferentialBounds): unknown {
  return artifactBody(ctx, view, tag, 2, data, bounds);
}
function artifactBody(ctx: ExecutionContext, view: CertifiedTowerView, tag: string, version: 1 | 2, data: unknown, bounds: DifferentialBounds): unknown {
  checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data);
  const raw = record(ctx, data, ['tag', 'version', 'payload']); demand(raw.tag === tag && raw.version === version, 'invalid-input', 'transcendental artifact tag/version');
  const body = record(ctx, unpackRecursiveArtifactGraph(ctx, raw.payload, bounds), ['construction', 'evidence']);
  if (version === 1) replayCertifiedTowerSnapshot(ctx, view, body.construction, bounds);
  else replayStructuredTowerSnapshotWithin(ctx, view, body.construction, bounds);
  return body.evidence;
}
