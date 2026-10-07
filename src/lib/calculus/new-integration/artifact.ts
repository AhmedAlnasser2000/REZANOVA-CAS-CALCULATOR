import { demand, type ExecutionContext } from '../../symbolic-engine/integration/core/execution';
import { inspectExactArtifact, optionalArtifactExport, ArtifactExportTooLarge } from '../../symbolic-engine/integration/core/artifact-bounds';
import { decodeDifferentialArtifactOverBase } from '../../symbolic-engine/integration/core/differential-wire';
import { decodeExponentialRationalDecision, encodeExponentialRationalDecision } from '../../symbolic-engine/integration/core/exponential-rational-wire';
import { decodeRationalDecision, encodeRationalDecision } from '../../symbolic-engine/integration/core/rational-decision-wire';
import { fromRationalPrimitiveInput } from '../../symbolic-engine/integration/core/exponential-sum-bridge';
import { fraction, scalar, record } from '../../symbolic-engine/integration/core/decision-wire-algebra';
import { decodeExponentialNormalization, encodeExponentialNormalization } from '../../symbolic-engine/integration/core/exponential-normalization-wire';
import type { RationalDecision } from '../../symbolic-engine/integration/core/rational-decision';
import type { ExponentialRationalDecision } from '../../symbolic-engine/integration/core/exponential-rational-decision';
import type { IntegrationSourceProof } from './normalization-result';
import { lowerExponentialIntegral, INTEGRATION_BOUNDS } from './exponential-lowering';
import { produceCorrespondence, replayCorrespondence } from './correspondence';
import { MAX_INTEGRATION_ARTIFACT_BYTES, boundedSource, validIntegrationLimits, type IntegrationRequest } from './types';
import type { constructExecutionInput } from './execution-input';
import { UnsupportedIntegral } from './lowering';

export type ExecutionDecision =
  | {kind: 'rational'; execution: Extract<ReturnType<typeof constructExecutionInput>, {kind: 'rational'}>; decision: RationalDecision}
  | {kind: 'exponential'; execution: Extract<ReturnType<typeof constructExecutionInput>, {kind: 'exponential'}>; decision: ExponentialRationalDecision};
export function readEnvelope(ctx: ExecutionContext, text: string) {
  demand(text.length <= MAX_INTEGRATION_ARTIFACT_BYTES && new TextEncoder().encode(text).length <= MAX_INTEGRATION_ARTIFACT_BYTES, 'resource-limit', 'artifact exceeds 16 MiB');
  ctx.allocate(text.length * 3); ctx.tick(text.length);
  const data: unknown = JSON.parse(text); inspectExactArtifact(ctx, INTEGRATION_BOUNDS, data);
  if (data && typeof data === 'object' && 'version' in data && data.version !== 2) throw new UnsupportedIntegral('Unsupported saved-problem format. This workspace accepts version 2 only.');
  const raw = record(ctx, data, ['kind', 'version', 'request', 'normalization', 'decision', 'correspondence']);
  demand(raw.kind === 'new-integration' && raw.version === 2, 'invalid-input', 'invalid artifact envelope');
  const request = record(ctx, raw.request, ['source', 'limits']);
  demand(boundedSource(request.source) && validIntegrationLimits(request.limits), 'invalid-input', 'invalid saved request');
  return {raw, request: request as unknown as IntegrationRequest};
}
export function replaySaved(ctx: ExecutionContext, saved: ReturnType<typeof readEnvelope>, base: IntegrationSourceProof['owner']) {
  const original = lowerExponentialIntegral(ctx, saved.request.source, base);
  const normalization = decodeExponentialNormalization(ctx, base, original.input, saved.raw.normalization, INTEGRATION_BOUNDS);
  const tag = record(ctx, saved.raw.decision, ['kind', 'evidence']);
  let result: ExecutionDecision;
  if (tag.kind === 'rational') {
    demand(tag.evidence !== null && typeof tag.evidence === 'object' && 'input' in tag.evidence, 'invalid-input', 'saved rational input');
    const input = fraction(ctx, original.native.fractions, scalar(ctx)).decode(tag.evidence.input);
    const decision = decodeRationalDecision(ctx, original.native, input, tag.evidence);
    result = {kind: 'rational', execution: {kind: 'rational', owner: original.native, input}, decision};
  } else {
    demand(tag.kind === 'exponential' && tag.evidence !== null && typeof tag.evidence === 'object' && 'construction' in tag.evidence, 'invalid-input', 'saved exponential construction');
    const replay = decodeDifferentialArtifactOverBase(ctx, base, tag.evidence.construction, INTEGRATION_BOUNDS);
    demand(replay.elements.length === 1 && replay.derivatives.length === 0, 'invalid-input', 'saved input coverage');
    const input = replay.elements[0], owner = replay.owner;
    const decision = decodeExponentialRationalDecision(ctx, owner, input, tag.evidence, INTEGRATION_BOUNDS);
    result = {kind: 'exponential', execution: {kind: 'exponential', owner, input}, decision};
  }
  const target = result.kind === 'rational' ? fromRationalPrimitiveInput(ctx, base, result.execution.owner, result.execution.input) : result.execution.input;
  replayCorrespondence(ctx, base, normalization.classification, target, saved.raw.correspondence);
  return {result, original, normalization, target};
}
/** Only byte overflow is optional. All other validation/resource failures propagate. */
export function exportSaved(ctx: ExecutionContext, request: IntegrationRequest, source: IntegrationSourceProof, result: ExecutionDecision,
  retained?: {decision: unknown; correspondence: unknown}) {
  try {
    return optionalArtifactExport(ctx, () => {
      const normalization = encodeExponentialNormalization(ctx, source.owner, source.input, source.normalization, source.bounds);
      const decision = retained?.decision ?? {kind: result.kind, evidence: result.kind === 'rational'
        ? encodeRationalDecision(ctx, result.execution.owner, result.decision)
        : encodeExponentialRationalDecision(ctx, result.execution.owner, result.execution.input, result.decision, INTEGRATION_BOUNDS)};
      const target = result.kind === 'rational' ? fromRationalPrimitiveInput(ctx, source.owner, result.execution.owner, result.execution.input) : result.execution.input;
      const correspondence = retained?.correspondence ?? produceCorrespondence(ctx, source.owner, source.normalization.classification, target);
      const wire = {kind: 'new-integration', version: 2, request, normalization, decision, correspondence};
      const bytes = inspectExactArtifact(ctx, INTEGRATION_BOUNDS, wire); ctx.allocate(bytes);
      return {artifact: JSON.stringify(wire)};
    });
  } catch (error) {
    if (error instanceof ArtifactExportTooLarge) return {exportUnavailable: error.message};
    throw error;
  }
}
