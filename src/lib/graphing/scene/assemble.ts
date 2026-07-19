import {
  validateGraphViewport,
  validateSampledSceneRuntimeStructure,
} from '../contracts';
import type {
  GraphSceneValidationFailure,
  GraphStopReason,
  SampledSceneRuntime,
} from '../contracts';
import { collectGraphSceneTransferables } from './transfer';
import type {
  GraphSceneAssemblyInput,
  GraphSceneAssemblyResult,
  GraphPointBatchSceneInput,
  GraphRegionSceneInput,
  GraphSampledPathSceneInput,
} from './types';

function failure(
  reason: GraphSceneValidationFailure['reason'],
  message: string,
  path?: string,
): GraphSceneAssemblyResult {
  return { ok: false, failure: { reason, message, ...(path ? { path } : {}) } };
}

function validateSampleInput(entry: GraphSampledPathSceneInput, index: number) {
  const base = `$.paths[${index}]`;
  if (!entry.pathId || entry.pathId.length > 160) {
    return failure('invalid-scene', 'Sampled path identity is invalid.', `${base}.pathId`);
  }
  if (!(entry.sample.coordinates instanceof Float64Array)
    || !(entry.sample.segmentOffsets instanceof Uint32Array)) {
    return failure('invalid-scene', 'Sampled paths require owned typed arrays.', `${base}.sample`);
  }
  if (entry.sample.independentValues !== undefined
    && (!(entry.sample.independentValues instanceof Float64Array)
      || entry.sample.coordinates.length !== entry.sample.independentValues.length * 2)) {
    return failure('invalid-scene', 'Sampled coordinates and independent values are misaligned.', `${base}.sample`);
  }
  if (!['complete', 'budget-exhausted', 'cancelled'].includes(entry.sample.status)) {
    return failure('invalid-scene', 'Sampled path status is invalid.', `${base}.sample.status`);
  }
  if (entry.sample.status !== 'complete' && !entry.sample.stopReason) {
    return failure('invalid-scene', 'Incomplete sampled paths require a stop reason.', `${base}.sample.stopReason`);
  }
  if (entry.sample.status === 'complete' && entry.sample.stopReason) {
    return failure('invalid-scene', 'Complete sampled paths cannot carry a stop reason.', `${base}.sample.stopReason`);
  }
  if (entry.sample.status === 'budget-exhausted'
    && entry.sample.stopReason?.code !== 'sampling-budget-exceeded') {
    return failure('invalid-scene', 'Budget-exhausted paths require a budget stop.', `${base}.sample.stopReason`);
  }
  if (entry.sample.status === 'cancelled'
    && entry.sample.stopReason?.code !== 'sampling-cancelled') {
    return failure('invalid-scene', 'Cancelled paths require a cancellation stop.', `${base}.sample.stopReason`);
  }
  return null;
}

function validateRegionInput(
  entry: GraphRegionSceneInput,
  index: number,
  pathIds: ReadonlySet<string>,
) {
  const base = `$.regions[${index}]`;
  if (!entry.regionId || entry.regionId.length > 160
    || !entry.itemId || entry.itemId.length > 160) {
    return failure('invalid-scene', 'Region identity is invalid.', base);
  }
  if (!(entry.vertices instanceof Float64Array)
    || entry.vertices.length < 6
    || entry.vertices.length % 2 !== 0
    || entry.vertices.some((value) => !Number.isFinite(value))) {
    return failure('invalid-scene', 'Regions require finite owned vertex pairs.', `${base}.vertices`);
  }
  if (!(entry.triangleIndices instanceof Uint32Array)
    || entry.triangleIndices.length < 3
    || entry.triangleIndices.length % 3 !== 0) {
    return failure('invalid-scene', 'Regions require owned triangle triples.', `${base}.triangleIndices`);
  }
  const vertexCount = entry.vertices.length / 2;
  if (entry.triangleIndices.some((value) => value >= vertexCount)) {
    return failure('invalid-scene', 'Region triangle indices exceed their vertex buffer.', `${base}.triangleIndices`);
  }
  if (entry.boundaryPathIds.some((pathId) => !pathIds.has(pathId))) {
    return failure('invalid-scene', 'Region boundaries must reference scene paths.', `${base}.boundaryPathIds`);
  }
  return null;
}

function validatePointBatchInput(entry: GraphPointBatchSceneInput, index: number) {
  const base = `$.pointBatches[${index}]`;
  if (!entry.pointBatchId || entry.pointBatchId.length > 160
    || !entry.itemId || entry.itemId.length > 160) {
    return failure('invalid-scene', 'Point-batch identity is invalid.', base);
  }
  if (!(entry.coordinates instanceof Float64Array)
    || entry.coordinates.length === 0
    || entry.coordinates.length % 2 !== 0
    || entry.coordinates.some((value) => !Number.isFinite(value))) {
    return failure('invalid-scene', 'Point batches require finite owned coordinate pairs.', `${base}.coordinates`);
  }
  return null;
}

const emptyGrid = () => ({
  kind: 'none' as const,
  majorLines: [],
  minorLines: [],
  labels: [],
  hysteresisKey: 'none:v1',
});

export function assembleSampledScene(
  input: GraphSceneAssemblyInput,
): GraphSceneAssemblyResult {
  if (!validateGraphViewport(input.viewport).ok) {
    return failure('invalid-scene', 'Scene viewport is invalid.', '$.viewport');
  }
  const pathIds = new Set<string>();
  for (const [index, entry] of input.paths.entries()) {
    const issue = validateSampleInput(entry, index);
    if (issue) return issue;
    if (pathIds.has(entry.pathId)) {
      return failure('invalid-scene', 'Scene path IDs must be unique.', `$.paths[${index}].pathId`);
    }
    pathIds.add(entry.pathId);
  }
  const pointBatchIds = new Set<string>();
  for (const [index, entry] of (input.pointBatches ?? []).entries()) {
    const issue = validatePointBatchInput(entry, index);
    if (issue) return issue;
    if (pointBatchIds.has(entry.pointBatchId)) {
      return failure('invalid-scene', 'Scene point-batch IDs must be unique.', `$.pointBatches[${index}].pointBatchId`);
    }
    pointBatchIds.add(entry.pointBatchId);
  }
  const regionIds = new Set<string>();
  for (const [index, entry] of (input.regions ?? []).entries()) {
    const issue = validateRegionInput(entry, index, pathIds);
    if (issue) return issue;
    if (regionIds.has(entry.regionId)) {
      return failure('invalid-scene', 'Scene region IDs must be unique.', `$.regions[${index}].regionId`);
    }
    regionIds.add(entry.regionId);
  }
  const orderedPaths = [...input.paths].sort((left, right) => left.pathId.localeCompare(right.pathId));
  const orderedRegions = [...(input.regions ?? [])]
    .sort((left, right) => left.regionId.localeCompare(right.regionId));
  const orderedPointBatches = [...(input.pointBatches ?? [])]
    .sort((left, right) => left.pointBatchId.localeCompare(right.pointBatchId));
  const scene: SampledSceneRuntime = {
    sceneRevision: input.revisions.scene,
    documentRevision: input.revisions.document,
    viewportRevision: input.revisions.viewport,
    parameterRevision: input.revisions.parameter,
    paths: orderedPaths.map((entry) => ({
      pathId: entry.pathId,
      itemId: entry.sample.itemId,
      coordinates: entry.sample.coordinates,
      segmentOffsets: entry.sample.segmentOffsets,
      parameterValues: entry.sample.independentValues,
      closed: entry.closed ?? false,
      style: entry.style,
    })),
    regions: orderedRegions.map((entry) => ({
      regionId: entry.regionId,
      itemId: entry.itemId,
      vertices: entry.vertices,
      triangleIndices: entry.triangleIndices,
      boundaryPathIds: [...entry.boundaryPathIds],
      style: entry.style,
    })),
    pointBatches: orderedPointBatches.map((entry) => ({
      pointBatchId: entry.pointBatchId,
      itemId: entry.itemId,
      coordinates: entry.coordinates,
      ...(entry.marker ? { marker: entry.marker } : {}),
      style: entry.style,
    })),
    labels: [...(input.labels ?? [])].sort((left, right) => left.labelId.localeCompare(right.labelId)),
    grid: input.grid ? {
      ...input.grid,
      majorLines: [...input.grid.majorLines],
      minorLines: [...input.grid.minorLines],
      labels: [...input.grid.labels].sort((left, right) => left.labelId.localeCompare(right.labelId)),
    } : emptyGrid(),
  };
  const validation = validateSampledSceneRuntimeStructure(scene);
  if (!validation.ok) return { ok: false, failure: validation.failure };
  const transfers = collectGraphSceneTransferables(scene);
  if (!transfers.ok) return failure('invalid-scene', transfers.message);
  const stopReasons = orderedPaths
    .map((entry) => entry.sample.stopReason)
    .filter((reason): reason is GraphStopReason => reason !== undefined);
  return {
    ok: true,
    bundle: {
      scene,
      viewport: input.viewport,
      transferList: transfers.transferList,
      stopReasons,
      evidence: {
        sampleCount: orderedPaths.reduce(
          (count, entry) => count + entry.sample.stats.evaluatedSamples,
          0,
        ),
        vertexCount: scene.paths.reduce(
          (count, path) => count + path.coordinates.length / 2,
          0,
        ) + scene.pointBatches.reduce(
          (count, batch) => count + batch.coordinates.length / 2,
          0,
        ) + scene.regions.reduce(
          (count, region) => count + region.vertices.length / 2,
          0,
        ),
        elapsedMs: orderedPaths.reduce(
          (maximum, entry) => Math.max(maximum, entry.sample.stats.elapsedMs),
          0,
        ),
      },
    },
  };
}
