import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import type { CertifiedTowerView } from './recursive-certified-tower';
import { checkArtifactBounds, inspectExactArtifact } from './artifact-bounds';
import { encodeCertifiedTowerSnapshot, replayCertifiedTowerSnapshot } from './recursive-tower-wire';
import { packRecursiveArtifactGraph, unpackRecursiveArtifactGraph } from './recursive-artifact-graph';
import { record } from './decision-wire-algebra';
export function transcendentalEnvelope(ctx: ExecutionContext, view: CertifiedTowerView, tag: string, evidence: unknown, bounds: DifferentialBounds): unknown {
  checkArtifactBounds(ctx, bounds); ctx.allocate(4);
  const payload = packRecursiveArtifactGraph(ctx, {construction: encodeCertifiedTowerSnapshot(ctx, view, bounds), evidence}, bounds);
  const data = Object.freeze({tag, version: 1, payload}); inspectExactArtifact(ctx, bounds, data); return data;
}
export function transcendentalArtifactBody(ctx: ExecutionContext, view: CertifiedTowerView, tag: string, data: unknown, bounds: DifferentialBounds): unknown {
  checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data);
  const raw = record(ctx, data, ['tag', 'version', 'payload']); demand(raw.tag === tag && raw.version === 1, 'invalid-input', 'transcendental artifact tag/version');
  const body = record(ctx, unpackRecursiveArtifactGraph(ctx, raw.payload, bounds), ['construction', 'evidence']);
  replayCertifiedTowerSnapshot(ctx, view, body.construction, bounds); return body.evidence;
}
