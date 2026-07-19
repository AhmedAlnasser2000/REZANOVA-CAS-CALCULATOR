import { validateSerializableMathJson } from '../../display/printer/math-json';
import type {
  GraphGridSceneV1,
  GraphItemPresentationV1,
  GraphSceneLabelV1,
  SampledSceneRuntime,
  SampledSceneSnapshotV1,
  GraphSampleResultV1,
} from './types';
import { validateGraphStopReason, validateGraphViewport } from './validation';

const MAX_SCENE_PATHS = 512;
const MAX_SCENE_REGIONS = 256;
const MAX_SCENE_POINT_BATCHES = 256;
const MAX_SCENE_LABELS = 1_000;
const MAX_SCENE_NUMBERS = 4_000_000;

export type GraphSceneValidationFailure = {
  reason: 'invalid-scene' | 'non-finite-number' | 'scene-budget-exceeded' | 'invalid-index';
  message: string;
  path?: string;
};

export type GraphSceneValidationResult<T> =
  | { ok: true; value: T; hash: string }
  | { ok: false; failure: GraphSceneValidationFailure };

function fail(reason: GraphSceneValidationFailure['reason'], message: string, path?: string) {
  return { ok: false as const, failure: { reason, message, ...(path ? { path } : {}) } };
}

function hasOnlyKeys(value: unknown, keys: readonly string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const allowed = new Set(keys);
  return Reflect.ownKeys(value).every((key) => typeof key === 'string' && allowed.has(key));
}

function validPresentation(value: GraphItemPresentationV1) {
  return Boolean(value)
    && hasOnlyKeys(value, ['version', 'colorToken', 'stroke', 'strokeWidth', 'fillOpacity', 'label'])
    && value.version === 1
    && value.colorToken.length > 0
    && ['solid', 'dashed'].includes(value.stroke)
    && ['thin', 'normal', 'strong'].includes(value.strokeWidth)
    && Number.isFinite(value.fillOpacity)
    && value.fillOpacity >= 0
    && value.fillOpacity <= 1
    && ['auto', 'always', 'never'].includes(value.label);
}

function validateNumbers(values: ArrayLike<number>, path: string, even = false) {
  if (even && values.length % 2 !== 0) return fail('invalid-scene', `${path} must contain x/y pairs.`, path);
  if (values.length > MAX_SCENE_NUMBERS) return fail('scene-budget-exceeded', `${path} exceeds the numeric budget.`, path);
  for (let index = 0; index < values.length; index += 1) {
    if (!Number.isFinite(values[index])) return fail('non-finite-number', `${path} contains a non-finite value.`, `${path}[${index}]`);
  }
  return null;
}

function validateLabel(label: GraphSceneLabelV1, path: string) {
  if (!hasOnlyKeys(label, ['labelId', 'itemId', 'role', 'anchor', 'priority', 'mathJson', 'plainText'])
    || !hasOnlyKeys(label.anchor, ['x', 'y'])
    || !label.labelId || !['axis', 'tick', 'relation', 'feature', 'trace'].includes(label.role)) {
    return fail('invalid-scene', 'Scene label identity or role is invalid.', path);
  }
  if (!Number.isFinite(label.anchor.x) || !Number.isFinite(label.anchor.y) || !Number.isFinite(label.priority)) {
    return fail('non-finite-number', 'Scene label coordinates and priority must be finite.', path);
  }
  if (label.mathJson === undefined && label.plainText === undefined) {
    return fail('invalid-scene', 'Scene labels require MathJSON or plain text.', path);
  }
  if (label.mathJson !== undefined && !validateSerializableMathJson(label.mathJson).ok) {
    return fail('invalid-scene', 'Scene label MathJSON is invalid.', `${path}.mathJson`);
  }
  return null;
}

function validateGrid(grid: GraphGridSceneV1, path: string) {
  if (!hasOnlyKeys(grid, ['kind', 'majorLines', 'minorLines', 'labels', 'hysteresisKey'])
    || !['cartesian', 'polar', 'argand', 'none'].includes(grid.kind) || !grid.hysteresisKey) {
    return fail('invalid-scene', 'Scene grid identity is invalid.', path);
  }
  return validateNumbers(grid.majorLines, `${path}.majorLines`)
    ?? validateNumbers(grid.minorLines, `${path}.minorLines`)
    ?? (grid.labels.length > MAX_SCENE_LABELS
      ? fail('scene-budget-exceeded', 'Scene grid label budget exceeded.', `${path}.labels`)
      : grid.labels.map((label, index) => validateLabel(label, `${path}.labels[${index}]`)).find(Boolean) ?? null);
}

function stableSort<T>(values: T[], key: (value: T) => string) {
  return [...values].sort((left, right) => key(left).localeCompare(key(right)));
}

export function normalizeGraphSceneSnapshot(snapshot: SampledSceneSnapshotV1): SampledSceneSnapshotV1 {
  return {
    ...snapshot,
    paths: stableSort(snapshot.paths, (path) => path.pathId).map((path) => ({
      ...path,
      coordinates: [...path.coordinates],
      segmentOffsets: [...path.segmentOffsets],
      ...(path.parameterValues ? { parameterValues: [...path.parameterValues] } : {}),
    })),
    regions: stableSort(snapshot.regions, (region) => region.regionId).map((region) => ({
      ...region,
      vertices: [...region.vertices],
      triangleIndices: [...region.triangleIndices],
      boundaryPathIds: [...region.boundaryPathIds].sort(),
    })),
    pointBatches: stableSort(snapshot.pointBatches, (batch) => batch.pointBatchId).map((batch) => ({
      ...batch,
      coordinates: [...batch.coordinates],
    })),
    labels: stableSort(snapshot.labels, (label) => label.labelId),
    grid: {
      ...snapshot.grid,
      majorLines: [...snapshot.grid.majorLines],
      minorLines: [...snapshot.grid.minorLines],
      labels: stableSort(snapshot.grid.labels, (label) => label.labelId),
    },
  };
}

export function hashGraphSceneSnapshot(snapshot: SampledSceneSnapshotV1) {
  const serialized = serializeGraphSceneSnapshot(snapshot);
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(serialized)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalizeJson((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

export function serializeGraphSceneSnapshot(snapshot: SampledSceneSnapshotV1) {
  return JSON.stringify(canonicalizeJson(normalizeGraphSceneSnapshot(snapshot)));
}

export function validateSampledSceneSnapshot(input: unknown): GraphSceneValidationResult<SampledSceneSnapshotV1> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('invalid-scene', 'Scene snapshot must be an object.');
  const scene = input as SampledSceneSnapshotV1;
  if (!hasOnlyKeys(scene, ['version', 'revisions', 'viewport', 'paths', 'regions', 'pointBatches', 'labels', 'grid'])
    || scene.version !== 1 || !scene.revisions
    || !hasOnlyKeys(scene.revisions, ['scene', 'document', 'viewport', 'parameter'])
    || Object.values(scene.revisions).some((value) => !Number.isSafeInteger(value) || value < 0)) return fail('invalid-scene', 'Scene snapshot version or revisions are invalid.');
  if (!validateGraphViewport(scene.viewport).ok) return fail('invalid-scene', 'Scene viewport is invalid.', '$.viewport');
  if (!Array.isArray(scene.paths) || scene.paths.length > MAX_SCENE_PATHS) return fail('scene-budget-exceeded', 'Scene path budget exceeded.', '$.paths');
  if (!Array.isArray(scene.regions) || scene.regions.length > MAX_SCENE_REGIONS) return fail('scene-budget-exceeded', 'Scene region budget exceeded.', '$.regions');
  if (!Array.isArray(scene.pointBatches) || scene.pointBatches.length > MAX_SCENE_POINT_BATCHES) return fail('scene-budget-exceeded', 'Scene point-batch budget exceeded.', '$.pointBatches');
  if (!Array.isArray(scene.labels) || scene.labels.length > MAX_SCENE_LABELS) return fail('scene-budget-exceeded', 'Scene label budget exceeded.', '$.labels');
  const pathIds = new Set<string>();
  for (const [index, path] of scene.paths.entries()) {
    const base = `$.paths[${index}]`;
    if (!hasOnlyKeys(path, ['pathId', 'itemId', 'coordinates', 'segmentOffsets', 'parameterValues', 'closed', 'style'])
      || !path.pathId || !path.itemId || pathIds.has(path.pathId) || !validPresentation(path.style)) return fail('invalid-scene', 'Scene path identity or style is invalid.', base);
    pathIds.add(path.pathId);
    const numbers = validateNumbers(path.coordinates, `${base}.coordinates`, true)
      ?? validateNumbers(path.segmentOffsets, `${base}.segmentOffsets`)
      ?? (path.parameterValues ? validateNumbers(path.parameterValues, `${base}.parameterValues`) : null);
    if (numbers) return numbers;
    if (path.parameterValues && path.parameterValues.length !== path.coordinates.length / 2) return fail('invalid-scene', 'Path parameter values must align with vertices.', `${base}.parameterValues`);
    if (path.segmentOffsets.some((offset) => !Number.isInteger(offset) || offset > path.coordinates.length / 2)) return fail('invalid-index', 'Path segment offset is invalid.', `${base}.segmentOffsets`);
  }
  const regionIds = new Set<string>();
  for (const [index, region] of scene.regions.entries()) {
    const base = `$.regions[${index}]`;
    if (!hasOnlyKeys(region, ['regionId', 'itemId', 'vertices', 'triangleIndices', 'boundaryPathIds', 'style'])
      || !region.regionId || !region.itemId || regionIds.has(region.regionId) || !validPresentation(region.style)) return fail('invalid-scene', 'Scene region identity or style is invalid.', base);
    regionIds.add(region.regionId);
    const numbers = validateNumbers(region.vertices, `${base}.vertices`, true)
      ?? validateNumbers(region.triangleIndices, `${base}.triangleIndices`);
    if (numbers) return numbers;
    if (region.triangleIndices.length % 3 !== 0 || region.triangleIndices.some((value) => !Number.isInteger(value) || value >= region.vertices.length / 2)) return fail('invalid-index', 'Region triangle index is invalid.', `${base}.triangleIndices`);
    if (region.boundaryPathIds.some((pathId) => !pathIds.has(pathId))) return fail('invalid-index', 'Region references a missing boundary path.', `${base}.boundaryPathIds`);
  }
  const pointBatchIds = new Set<string>();
  for (const [index, batch] of scene.pointBatches.entries()) {
    const base = `$.pointBatches[${index}]`;
    if (!hasOnlyKeys(batch, ['pointBatchId', 'itemId', 'coordinates', 'style'])
      || !batch.pointBatchId || !batch.itemId || pointBatchIds.has(batch.pointBatchId) || !validPresentation(batch.style)) return fail('invalid-scene', 'Point batch identity or style is invalid.', base);
    pointBatchIds.add(batch.pointBatchId);
    const numbers = validateNumbers(batch.coordinates, `${base}.coordinates`, true);
    if (numbers) return numbers;
  }
  for (const [index, label] of scene.labels.entries()) {
    const issue = validateLabel(label, `$.labels[${index}]`);
    if (issue) return issue;
  }
  const gridIssue = validateGrid(scene.grid, '$.grid');
  if (gridIssue) return gridIssue;
  const normalized = normalizeGraphSceneSnapshot(scene);
  return { ok: true, value: normalized, hash: hashGraphSceneSnapshot(normalized) };
}

export function validateSampledSceneRuntime(input: unknown): GraphSceneValidationResult<SampledSceneRuntime> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('invalid-scene', 'Runtime scene must be an object.');
  const scene = input as SampledSceneRuntime;
  if (!hasOnlyKeys(scene, ['sceneRevision', 'documentRevision', 'viewportRevision', 'parameterRevision', 'paths', 'regions', 'pointBatches', 'labels', 'grid'])) return fail('invalid-scene', 'Runtime scene contains unsupported state.');
  const revisions = [scene.sceneRevision, scene.documentRevision, scene.viewportRevision, scene.parameterRevision];
  if (revisions.some((value) => !Number.isSafeInteger(value) || value < 0)) return fail('invalid-scene', 'Runtime scene revisions are invalid.');
  if (!Array.isArray(scene.paths) || !Array.isArray(scene.regions) || !Array.isArray(scene.pointBatches) || !Array.isArray(scene.labels)) return fail('invalid-scene', 'Runtime scene collections are invalid.');
  if (scene.paths.some((path) => !(path.coordinates instanceof Float64Array)
    || !(path.segmentOffsets instanceof Uint32Array)
    || (path.parameterValues !== undefined && !(path.parameterValues instanceof Float64Array)))) {
    return fail('invalid-scene', 'Runtime paths require transferable typed arrays.', '$.paths');
  }
  if (scene.regions.some((region) => !(region.vertices instanceof Float64Array)
    || !(region.triangleIndices instanceof Uint32Array))) {
    return fail('invalid-scene', 'Runtime regions require transferable typed arrays.', '$.regions');
  }
  if (scene.pointBatches.some((batch) => !(batch.coordinates instanceof Float64Array))) {
    return fail('invalid-scene', 'Runtime point batches require transferable typed arrays.', '$.pointBatches');
  }
  const snapshot = snapshotSampledSceneRuntime(scene, {
    coordinateSystem: scene.grid.kind === 'polar' ? 'polar' : scene.grid.kind === 'argand' ? 'argand' : 'cartesian',
    xMin: -1,
    xMax: 1,
    yMin: -1,
    yMax: 1,
  });
  const validation = validateSampledSceneSnapshot(snapshot);
  return validation.ok
    ? { ok: true, value: scene, hash: validation.hash }
    : validation;
}

export function validateGraphSampleResult(input: unknown): GraphSceneValidationResult<GraphSampleResultV1> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('invalid-scene', 'Graph sample result must be an object.');
  const result = input as GraphSampleResultV1;
  if (!hasOnlyKeys(result, ['version', 'requestId', 'workspaceInstanceId', 'documentId', 'revisions', 'viewport', 'quality', 'status', 'scene', 'snapshotHash', 'stopReasons', 'evidence'])
    || result.version !== 1 || !result.requestId || !result.workspaceInstanceId || !result.documentId) return fail('invalid-scene', 'Graph sample result identity is invalid.');
  if (!['preview', 'settled'].includes(result.quality) || !['complete', 'budget-exhausted', 'cancelled'].includes(result.status)) return fail('invalid-scene', 'Graph sample result status is invalid.');
  if (!result.revisions || Object.values(result.revisions).some((value) => !Number.isSafeInteger(value) || value < 0)) return fail('invalid-scene', 'Graph sample result revisions are invalid.');
  if (!validateGraphViewport(result.viewport).ok) return fail('invalid-scene', 'Graph sample result viewport is invalid.');
  if (!result.snapshotHash.startsWith('fnv1a64:') || !Array.isArray(result.stopReasons)
    || result.stopReasons.some((reason) => !validateGraphStopReason(reason).ok)) return fail('invalid-scene', 'Graph sample result evidence is invalid.');
  if (!result.evidence || Object.values(result.evidence).some((value) => !Number.isFinite(value) || value < 0)) return fail('invalid-scene', 'Graph sample result counters are invalid.');
  const sceneValidation = validateSampledSceneRuntime(result.scene);
  if (!sceneValidation.ok) return sceneValidation;
  if (result.revisions.scene !== result.scene.sceneRevision
    || result.revisions.document !== result.scene.documentRevision
    || result.revisions.viewport !== result.scene.viewportRevision
    || result.revisions.parameter !== result.scene.parameterRevision) {
    return fail('invalid-scene', 'Graph sample result revisions do not match its scene.');
  }
  if (result.status === 'budget-exhausted'
    && !result.stopReasons.some((reason) => reason.code === 'sampling-budget-exceeded')) {
    return fail('invalid-scene', 'Budget-exhausted results require a sampling budget stop reason.');
  }
  if (result.status === 'cancelled'
    && !result.stopReasons.some((reason) => reason.code === 'sampling-cancelled')) {
    return fail('invalid-scene', 'Cancelled results require a sampling cancellation stop reason.');
  }
  const snapshotHash = hashGraphSceneSnapshot(snapshotSampledSceneRuntime(result.scene, result.viewport));
  if (result.snapshotHash !== snapshotHash) return fail('invalid-scene', 'Graph sample result snapshot hash does not match its scene.');
  return { ok: true, value: result, hash: snapshotHash };
}

export function snapshotSampledSceneRuntime(scene: SampledSceneRuntime, viewport: SampledSceneSnapshotV1['viewport']): SampledSceneSnapshotV1 {
  return normalizeGraphSceneSnapshot({
    version: 1,
    revisions: {
      scene: scene.sceneRevision,
      document: scene.documentRevision,
      viewport: scene.viewportRevision,
      parameter: scene.parameterRevision,
    },
    viewport,
    paths: scene.paths.map(({ coordinates, segmentOffsets, parameterValues, ...path }) => ({
      ...path,
      coordinates: [...coordinates],
      segmentOffsets: [...segmentOffsets],
      ...(parameterValues ? { parameterValues: [...parameterValues] } : {}),
    })),
    regions: scene.regions.map((region) => ({ ...region, vertices: [...region.vertices], triangleIndices: [...region.triangleIndices] })),
    pointBatches: scene.pointBatches.map((batch) => ({ ...batch, coordinates: [...batch.coordinates] })),
    labels: scene.labels,
    grid: scene.grid,
  });
}
