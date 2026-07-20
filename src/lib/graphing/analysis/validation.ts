import { inspectJsonCompatibleStructuredValue } from '../../result-contract/structured-value';
import { validateCanonicalResultDocumentV2 } from '../../result-contract';
import {
  GRAPH_ANALYSIS_FEATURES,
  validateGraphSampleRequest,
  validateGraphViewport,
  type GraphAnalysisRequestV1,
  type GraphAnalysisResultV1,
} from '../contracts';

const featureSet = new Set<string>(GRAPH_ANALYSIS_FEATURES);
const levelSet = new Set([
  'exact-proved', 'conditional', 'numeric-validated', 'sampled-estimate',
  'suspected', 'inconclusive', 'unsupported',
]);
const limits = { maxNodes: 80_000, maxDepth: 128, maxBytes: 4_000_000 };

type Validation<T> = { ok: true; value: T } | { ok: false; message: string };

function cloneable<T>(input: unknown, label: string): Validation<T> {
  const inspected = inspectJsonCompatibleStructuredValue(input, { label, ...limits });
  return inspected.ok
    ? { ok: true, value: JSON.parse(inspected.serialized) as T }
    : { ok: false, message: inspected.failure.message };
}

function finiteRevisionSet(value: unknown) {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return ['mathematics', 'viewport', 'parameter'].every((key) =>
    Number.isSafeInteger(record[key]) && Number(record[key]) >= 0);
}

export function validateGraphAnalysisRequest(input: unknown): Validation<GraphAnalysisRequestV1> {
  const cloned = cloneable<GraphAnalysisRequestV1>(input, 'Graph analysis request');
  if (!cloned.ok) return cloned;
  const value = cloned.value;
  if (value.version !== 1 || !value.requestId || !value.workspaceInstanceId || !value.documentId
    || !finiteRevisionSet(value.revisions)
    || !Array.isArray(value.features) || value.features.some((feature) => !featureSet.has(feature))
    || !Number.isFinite(value.maximumTimeMs) || value.maximumTimeMs <= 0 || value.maximumTimeMs > 30_000) {
    return { ok: false, message: 'Graph analysis request identity, revisions, features, or budget are invalid.' };
  }
  if (value.numericWindow && !validateGraphViewport(value.numericWindow).ok) {
    return { ok: false, message: 'Graph analysis numeric window is invalid.' };
  }
  const itemCheck = validateGraphSampleRequest({
    version: 4,
    requestId: value.requestId,
    workspaceInstanceId: value.workspaceInstanceId,
    documentId: value.documentId,
    revisions: { scene: 0, ...value.revisions },
    items: value.items,
    parameterEnvironment: value.parameterEnvironment,
    viewport: value.numericWindow ?? { coordinateSystem: 'cartesian', xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
    cssSize: { width: 1, height: 1 }, overlays: { unitCircle: false }, quality: 'settled',
    priority: { dependentItemIds: [] }, movement: { panVelocityX: 0, panVelocityY: 0, zoomRatio: 1 },
  });
  return itemCheck.ok ? cloned : { ok: false, message: itemCheck.failure.message };
}

export function validateGraphAnalysisResult(input: unknown): Validation<GraphAnalysisResultV1> {
  const cloned = cloneable<GraphAnalysisResultV1>(input, 'Graph analysis result');
  if (!cloned.ok) return cloned;
  const value = cloned.value;
  if (value.version !== 1 || !value.requestId || !value.workspaceInstanceId || !value.documentId
    || !finiteRevisionSet(value.revisions) || !['complete', 'partial', 'cancelled'].includes(value.status)
    || !Array.isArray(value.evidence) || !Array.isArray(value.stopReasons)) {
    return { ok: false, message: 'Graph analysis result identity or structure is invalid.' };
  }
  for (const entry of value.evidence) {
    if (entry.version !== 1 || !entry.evidenceId || entry.documentId !== value.documentId
      || !featureSet.has(entry.feature) || !levelSet.has(entry.level)
      || !Array.isArray(entry.itemIds) || !Array.isArray(entry.conditions)) {
      return { ok: false, message: 'Graph analysis evidence is invalid.' };
    }
  }
  const canonical = validateCanonicalResultDocumentV2(value.canonicalResult);
  return canonical.ok ? cloned : { ok: false, message: canonical.failure.message };
}
