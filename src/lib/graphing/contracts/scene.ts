import { validateSerializableMathJson } from '../../display/printer/math-json';
import type {
  GraphSceneLabelV1,
  SampledSceneRuntimeV2,
  SampledSceneSnapshotV2,
  GraphSampleResultV5,
  GraphSpatialSceneRuntimeV1,
} from './types';
import { validateGraphStopReason, validateGraphViewport } from './validation';

const MAX_SCENE_PATHS = 512;
const MAX_SCENE_REGIONS = 256;
const MAX_SCENE_POINT_BATCHES = 256;
const MAX_SCENE_LABELS = 1_000;
const MAX_SCENE_NUMBERS = 4_000_000;
const MAX_SCENE_ID_LENGTH = 160;
const MAX_SCENE_LABEL_TEXT_LENGTH = 500;
const MAX_SCENE_SNAPSHOT_BYTES = 64 * 1024 * 1024;

export type GraphSceneValidationFailure = {
  reason: 'invalid-scene' | 'non-finite-number' | 'scene-budget-exceeded' | 'invalid-index';
  message: string;
  path?: string;
};

export type GraphSceneValidationResult<T> =
  | { ok: true; value: T; hash: string }
  | { ok: false; failure: GraphSceneValidationFailure };

export type GraphSceneStructureValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; failure: GraphSceneValidationFailure };

function fail(reason: GraphSceneValidationFailure['reason'], message: string, path?: string) {
  return { ok: false as const, failure: { reason, message, ...(path ? { path } : {}) } };
}

function hasOnlyKeys(value: unknown, keys: readonly string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const allowed = new Set(keys);
  return Reflect.ownKeys(value).every((key) => typeof key === 'string' && allowed.has(key));
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
    || !label.labelId || label.labelId.length > MAX_SCENE_ID_LENGTH
    || (label.itemId !== undefined && (!label.itemId || label.itemId.length > MAX_SCENE_ID_LENGTH))
    || !['axis', 'tick', 'relation', 'feature', 'trace'].includes(label.role)) {
    return fail('invalid-scene', 'Scene label identity or role is invalid.', path);
  }
  if (!Number.isFinite(label.anchor.x) || !Number.isFinite(label.anchor.y) || !Number.isFinite(label.priority)) {
    return fail('non-finite-number', 'Scene label coordinates and priority must be finite.', path);
  }
  if (label.mathJson === undefined && label.plainText === undefined) {
    return fail('invalid-scene', 'Scene labels require MathJSON or plain text.', path);
  }
  if (label.plainText !== undefined && label.plainText.length > MAX_SCENE_LABEL_TEXT_LENGTH) {
    return fail('scene-budget-exceeded', 'Scene label text exceeds its budget.', `${path}.plainText`);
  }
  if (label.mathJson !== undefined && !validateSerializableMathJson(label.mathJson).ok) {
    return fail('invalid-scene', 'Scene label MathJSON is invalid.', `${path}.mathJson`);
  }
  return null;
}

function stableSort<T>(values: T[], key: (value: T) => string) {
  return [...values].sort((left, right) => key(left).localeCompare(key(right)));
}

type GraphSceneCollections = Pick<
  SampledSceneSnapshotV2 | SampledSceneRuntimeV2,
  'paths' | 'regions' | 'pointBatches' | 'labels'
>;

function sceneNumberCount(scene: GraphSceneCollections) {
  return scene.paths.reduce((count, path) => count
    + path.coordinates.length
    + path.segmentOffsets.length
    + (path.parameterValues?.length ?? 0), 0)
    + scene.regions.reduce((count, region) => count
      + region.vertices.length
      + region.triangleIndices.length, 0)
    + scene.pointBatches.reduce((count, batch) => count + batch.coordinates.length, 0);
}

function validateSegmentOffsets(
  offsets: ArrayLike<number>,
  vertexCount: number,
  path: string,
) {
  if (vertexCount === 0) {
    return offsets.length === 0
      ? null
      : fail('invalid-index', 'Empty paths cannot declare segment offsets.', path);
  }
  if (offsets.length === 0 || offsets[0] !== 0) {
    return fail('invalid-index', 'Non-empty paths must begin with segment offset zero.', path);
  }
  for (let index = 0; index < offsets.length; index += 1) {
    const offset = offsets[index];
    if (!Number.isInteger(offset) || offset < 0 || offset >= vertexCount) {
      return fail('invalid-index', 'Path segment offset is invalid.', `${path}[${index}]`);
    }
    if (index > 0 && offset <= offsets[index - 1]) {
      return fail('invalid-index', 'Path segment offsets must be strictly increasing.', `${path}[${index}]`);
    }
    const end = offsets[index + 1] ?? vertexCount;
    if (end - offset < 2) {
      return fail('invalid-index', 'Every path segment requires at least two vertices.', `${path}[${index}]`);
    }
  }
  return null;
}

function validateSceneCollections(scene: GraphSceneCollections) {
  if (!Array.isArray(scene.paths) || scene.paths.length > MAX_SCENE_PATHS) return fail('scene-budget-exceeded', 'Scene path budget exceeded.', '$.paths');
  if (!Array.isArray(scene.regions) || scene.regions.length > MAX_SCENE_REGIONS) return fail('scene-budget-exceeded', 'Scene region budget exceeded.', '$.regions');
  if (!Array.isArray(scene.pointBatches) || scene.pointBatches.length > MAX_SCENE_POINT_BATCHES) return fail('scene-budget-exceeded', 'Scene point-batch budget exceeded.', '$.pointBatches');
  if (!Array.isArray(scene.labels) || scene.labels.length > MAX_SCENE_LABELS) return fail('scene-budget-exceeded', 'Scene label budget exceeded.', '$.labels');
  if (sceneNumberCount(scene) > MAX_SCENE_NUMBERS) return fail('scene-budget-exceeded', 'Scene exceeds the total numeric budget.');
  const pathIds = new Set<string>();
  for (const [index, path] of scene.paths.entries()) {
    const base = `$.paths[${index}]`;
    if (!hasOnlyKeys(path, ['pathId', 'itemId', 'coordinates', 'segmentOffsets', 'parameterValues', 'closed', 'strokeRole'])
      || !path.pathId || path.pathId.length > MAX_SCENE_ID_LENGTH
      || !path.itemId || path.itemId.length > MAX_SCENE_ID_LENGTH
      || (path.strokeRole !== undefined && !['default', 'strict-boundary', 'teaching-overlay'].includes(path.strokeRole))
      || pathIds.has(path.pathId)) return fail('invalid-scene', 'Scene path identity or role is invalid.', base);
    pathIds.add(path.pathId);
    const numbers = validateNumbers(path.coordinates, `${base}.coordinates`, true)
      ?? validateNumbers(path.segmentOffsets, `${base}.segmentOffsets`)
      ?? (path.parameterValues ? validateNumbers(path.parameterValues, `${base}.parameterValues`) : null);
    if (numbers) return numbers;
    if (path.parameterValues && path.parameterValues.length !== path.coordinates.length / 2) return fail('invalid-scene', 'Path parameter values must align with vertices.', `${base}.parameterValues`);
    const segmentIssue = validateSegmentOffsets(
      path.segmentOffsets,
      path.coordinates.length / 2,
      `${base}.segmentOffsets`,
    );
    if (segmentIssue) return segmentIssue;
  }
  const regionIds = new Set<string>();
  for (const [index, region] of scene.regions.entries()) {
    const base = `$.regions[${index}]`;
    if (!hasOnlyKeys(region, ['regionId', 'itemId', 'vertices', 'triangleIndices', 'boundaryPathIds'])
      || !region.regionId || region.regionId.length > MAX_SCENE_ID_LENGTH
      || !region.itemId || region.itemId.length > MAX_SCENE_ID_LENGTH
      || regionIds.has(region.regionId)) return fail('invalid-scene', 'Scene region identity is invalid.', base);
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
    if (!hasOnlyKeys(batch, ['pointBatchId', 'itemId', 'coordinates', 'marker'])
      || !batch.pointBatchId || batch.pointBatchId.length > MAX_SCENE_ID_LENGTH
      || !batch.itemId || batch.itemId.length > MAX_SCENE_ID_LENGTH
      || (batch.marker !== undefined && !['filled', 'open'].includes(batch.marker))
      || pointBatchIds.has(batch.pointBatchId)) return fail('invalid-scene', 'Point batch identity is invalid.', base);
    pointBatchIds.add(batch.pointBatchId);
    const numbers = validateNumbers(batch.coordinates, `${base}.coordinates`, true);
    if (numbers) return numbers;
  }
  for (const [index, label] of scene.labels.entries()) {
    const issue = validateLabel(label, `$.labels[${index}]`);
    if (issue) return issue;
  }
  const labelIds = new Set<string>();
  for (const label of scene.labels) {
    if (labelIds.has(label.labelId)) {
      return fail('invalid-scene', 'Scene label IDs must be globally unique.', '$.labels');
    }
    labelIds.add(label.labelId);
  }
  return null;
}

export function normalizeGraphSceneSnapshot(snapshot: SampledSceneSnapshotV2): SampledSceneSnapshotV2 {
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
  };
}

export function hashGraphSceneSnapshot(snapshot: SampledSceneSnapshotV2) {
  const encoder = new TextEncoder();
  const encoded = new Uint8Array(256);
  const numberView = new DataView(new ArrayBuffer(8));
  let laneA = 0x811c9dc5;
  let laneB = 0x9e3779b9;
  let tokenCount = 0;
  const appendWord = (word: number) => {
    laneA = Math.imul(laneA ^ word, 0x01000193) >>> 0;
    laneB = Math.imul(
      laneB ^ ((word + 0x9e3779b9 + (tokenCount << 6) + (tokenCount >>> 2)) >>> 0),
      0x85ebca6b,
    ) >>> 0;
    tokenCount = (tokenCount + 1) >>> 0;
  };
  const appendByte = (byte: number) => {
    appendWord(byte | 0x100);
  };
  const append = (text: string) => {
    let remaining = text;
    while (remaining.length > 0) {
      const result = encoder.encodeInto(remaining, encoded);
      for (let index = 0; index < result.written; index += 1) {
        appendByte(encoded[index]!);
      }
      remaining = remaining.slice(result.read);
    }
  };
  const appendNumber = (value: number) => {
    append('n');
    numberView.setFloat64(0, Object.is(value, -0) ? 0 : value, true);
    appendWord(numberView.getUint32(0, true));
    appendWord(numberView.getUint32(4, true));
  };
  hashCanonicalSceneValue(orderedGraphSceneSnapshotView(snapshot), append, appendNumber);
  laneA ^= laneA >>> 16;
  laneA = Math.imul(laneA, 0x85ebca6b) >>> 0;
  laneA ^= laneA >>> 13;
  laneA = Math.imul(laneA, 0xc2b2ae35) >>> 0;
  laneA = (laneA ^ (laneA >>> 16)) >>> 0;
  laneB = (laneB ^ (laneB >>> 16)) >>> 0;
  laneB = Math.imul(laneB, 0x27d4eb2d) >>> 0;
  laneB = (laneB ^ (laneB >>> 15)) >>> 0;
  return `graph64:${laneA.toString(16).padStart(8, '0')}${laneB.toString(16).padStart(8, '0')}`;
}

function hashCanonicalSceneValue(
  value: unknown,
  append: (text: string) => void,
  appendNumber: (value: number) => void,
): void {
  if (Array.isArray(value) || (ArrayBuffer.isView(value) && !(value instanceof DataView))) {
    const values = value as ArrayLike<unknown>;
    append('[');
    for (let index = 0; index < values.length; index += 1) {
      if (index > 0) append(',');
      hashCanonicalSceneValue(values[index], append, appendNumber);
    }
    append(']');
    return;
  }
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    const keys = Object.keys(object)
      .filter((key) => object[key] !== undefined)
      .sort();
    append('{');
    keys.forEach((key, index) => {
      if (index > 0) append(',');
      append(JSON.stringify(key));
      append(':');
      hashCanonicalSceneValue(object[key], append, appendNumber);
    });
    append('}');
    return;
  }
  if (typeof value === 'number') {
    appendNumber(value);
    return;
  }
  append(JSON.stringify(value) ?? 'null');
}

function orderedGraphSceneSnapshotView(snapshot: SampledSceneSnapshotV2) {
  return {
    ...snapshot,
    paths: stableSort(snapshot.paths, (path) => path.pathId),
    regions: stableSort(snapshot.regions, (region) => region.regionId).map((region) => ({
      ...region,
      boundaryPathIds: [...region.boundaryPathIds].sort(),
    })),
    pointBatches: stableSort(snapshot.pointBatches, (batch) => batch.pointBatchId),
    labels: stableSort(snapshot.labels, (label) => label.labelId),
  };
}

export function hashSampledSceneRuntime(
  scene: SampledSceneRuntimeV2,
  viewport: SampledSceneSnapshotV2['viewport'],
) {
  return hashGraphSceneSnapshot({
    version: 2,
    revisions: {
      scene: scene.sceneRevision,
      mathematics: scene.mathematicsRevision,
      viewport: scene.viewportRevision,
      parameter: scene.parameterRevision,
    },
    viewport,
    paths: scene.paths as unknown as SampledSceneSnapshotV2['paths'],
    regions: scene.regions as unknown as SampledSceneSnapshotV2['regions'],
    pointBatches: scene.pointBatches as unknown as SampledSceneSnapshotV2['pointBatches'],
    labels: scene.labels,
  });
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

export function serializeGraphSceneSnapshot(snapshot: SampledSceneSnapshotV2) {
  return JSON.stringify(canonicalizeJson(normalizeGraphSceneSnapshot(snapshot)));
}

export function validateSampledSceneSnapshot(input: unknown): GraphSceneValidationResult<SampledSceneSnapshotV2> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('invalid-scene', 'Scene snapshot must be an object.');
  const scene = input as SampledSceneSnapshotV2;
  if (!hasOnlyKeys(scene, ['version', 'revisions', 'viewport', 'paths', 'regions', 'pointBatches', 'labels'])
    || scene.version !== 2 || !scene.revisions
    || !hasOnlyKeys(scene.revisions, ['scene', 'mathematics', 'viewport', 'parameter'])
    || Object.values(scene.revisions).some((value) => !Number.isSafeInteger(value) || value < 0)) return fail('invalid-scene', 'Scene snapshot version or revisions are invalid.');
  if (!validateGraphViewport(scene.viewport).ok) return fail('invalid-scene', 'Scene viewport is invalid.', '$.viewport');
  const collectionIssue = validateSceneCollections(scene);
  if (collectionIssue) return collectionIssue;
  const normalized = normalizeGraphSceneSnapshot(scene);
  if (new TextEncoder().encode(serializeGraphSceneSnapshot(normalized)).byteLength
    > MAX_SCENE_SNAPSHOT_BYTES) {
    return fail('scene-budget-exceeded', 'Serialized scene snapshot exceeds its byte budget.');
  }
  return { ok: true, value: normalized, hash: hashGraphSceneSnapshot(normalized) };
}

export function validateSampledSceneRuntime(input: unknown): GraphSceneValidationResult<SampledSceneRuntimeV2> {
  const structure = validateSampledSceneRuntimeStructure(input);
  if (!structure.ok) return structure;
  const scene = structure.value;
  const viewport = {
    coordinateSystem: 'cartesian',
    xMin: -1,
    xMax: 1,
    yMin: -1,
    yMax: 1,
  } as const;
  return { ok: true, value: scene, hash: hashSampledSceneRuntime(scene, viewport) };
}

export function validateSampledSceneRuntimeStructure(
  input: unknown,
): GraphSceneStructureValidationResult<SampledSceneRuntimeV2> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('invalid-scene', 'Runtime scene must be an object.');
  const scene = input as SampledSceneRuntimeV2;
  if (!hasOnlyKeys(scene, ['sceneRevision', 'mathematicsRevision', 'viewportRevision', 'parameterRevision', 'paths', 'regions', 'pointBatches', 'labels'])) return fail('invalid-scene', 'Runtime scene contains unsupported state.');
  const revisions = [scene.sceneRevision, scene.mathematicsRevision, scene.viewportRevision, scene.parameterRevision];
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
  const collectionIssue = validateSceneCollections(scene);
  return collectionIssue ?? { ok: true, value: scene };
}

function validPiecewiseConditionEvidence(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const evidence = input as GraphSampleResultV5['itemEvidence'][number]['piecewiseCondition'];
  if (!evidence || evidence.version !== 1
    || !['x', 'y'].includes(evidence.independentSymbol)
    || !['exact-global', 'adaptive-current-viewport', 'mixed', 'unresolved'].includes(evidence.basis)
    || !Number.isFinite(evidence.validatedInterval?.minimum)
    || !Number.isFinite(evidence.validatedInterval?.maximum)
    || !Number.isFinite(evidence.validatedInterval?.tolerancePixels)
    || evidence.validatedInterval.minimum >= evidence.validatedInterval.maximum
    || evidence.validatedInterval.tolerancePixels < 0
    || !Number.isSafeInteger(evidence.unresolvedBoundaryCount)
    || evidence.unresolvedBoundaryCount < 0) return false;
  return Array.isArray(evidence.branchApplicability)
    && Array.isArray(evidence.overlapBranchPairs)
    && Array.isArray(evidence.uncoveredGaps)
    && Array.isArray(evidence.boundaries)
    && evidence.uncoveredGaps.every((gap) => Number.isFinite(gap.minimum)
      && Number.isFinite(gap.maximum) && gap.minimum <= gap.maximum)
    && evidence.boundaries.every((boundary) => Number.isFinite(boundary.value)
      && Array.isArray(boundary.includedBranchIds) && Array.isArray(boundary.excludedBranchIds));
}

function validateGraphSampleResultEnvelope(
  input: unknown,
  verifySnapshotHash: boolean,
): GraphSceneValidationResult<GraphSampleResultV5> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('invalid-scene', 'Graph sample result must be an object.');
  const result = input as GraphSampleResultV5;
  if (!hasOnlyKeys(result, ['version', 'requestId', 'workspaceInstanceId', 'documentId', 'revisions', 'viewport', 'quality', 'status', 'scene', 'snapshotHash', 'stopReasons', 'itemEvidence', 'evidence'])
    || result.version !== 5 || !result.requestId || !result.workspaceInstanceId || !result.documentId) return fail('invalid-scene', 'Graph sample result identity is invalid.');
  if (!['preview', 'settled', 'polish'].includes(result.quality) || !['complete', 'partial', 'cancelled'].includes(result.status)) return fail('invalid-scene', 'Graph sample result status is invalid.');
  if (!result.revisions || Object.values(result.revisions).some((value) => !Number.isSafeInteger(value) || value < 0)) return fail('invalid-scene', 'Graph sample result revisions are invalid.');
  if (!validateGraphViewport(result.viewport).ok) return fail('invalid-scene', 'Graph sample result viewport is invalid.');
  if (!/^graph64:[0-9a-f]{16}$/u.test(result.snapshotHash) || !Array.isArray(result.stopReasons)
    || result.stopReasons.some((reason) => !validateGraphStopReason(reason).ok)) return fail('invalid-scene', 'Graph sample result evidence is invalid.');
  if (!Array.isArray(result.itemEvidence) || result.itemEvidence.some((item) => (
    !item || typeof item !== 'object' || !item.itemId
    || !['coarse', 'settled', 'polished', 'reduced-detail', 'unresolved'].includes(item.achievedQuality)
    || !['miss', 'reused', 'extended'].includes(item.cache)
    || !Number.isFinite(item.estimatedMaximumErrorPixels)
    || item.estimatedMaximumErrorPixels < 0
    || typeof item.refinable !== 'boolean'
    || (item.stopReason !== undefined && !validateGraphStopReason(item.stopReason).ok)
    || (item.piecewiseCondition !== undefined && !validPiecewiseConditionEvidence(item.piecewiseCondition))
  ))) return fail('invalid-scene', 'Graph sample result item evidence is invalid.');
  if (!result.evidence || Object.values(result.evidence).some((value) => !Number.isFinite(value) || value < 0)) return fail('invalid-scene', 'Graph sample result counters are invalid.');
  const sceneValidation = validateGraphSpatialSceneRuntime(result.scene);
  if (!sceneValidation.ok) return sceneValidation;
  const planar = result.scene.planarScene;
  if (result.revisions.scene !== planar.sceneRevision
    || result.revisions.mathematics !== planar.mathematicsRevision
    || result.revisions.viewport !== planar.viewportRevision
    || result.revisions.parameter !== planar.parameterRevision) {
    return fail('invalid-scene', 'Graph sample result revisions do not match its scene.');
  }
  if (result.status === 'partial'
    && !result.itemEvidence.some((item) => ['reduced-detail', 'unresolved'].includes(item.achievedQuality))) {
    return fail('invalid-scene', 'Partial results require reduced-detail or unresolved item evidence.');
  }
  if (result.status === 'cancelled'
    && !result.stopReasons.some((reason) => reason.code === 'sampling-cancelled')) {
    return fail('invalid-scene', 'Cancelled results require a sampling cancellation stop reason.');
  }
  if (!verifySnapshotHash) {
    return { ok: true, value: result, hash: result.snapshotHash };
  }
  const verifiedHash = hashGraphSpatialSceneRuntime(result.scene, result.viewport);
  if (result.snapshotHash !== verifiedHash) return fail('invalid-scene', 'Graph sample result snapshot hash does not match its scene.');
  return { ok: true, value: result, hash: verifiedHash };
}

export function validateGraphSpatialSceneRuntime(
  input: unknown,
): GraphSceneStructureValidationResult<GraphSpatialSceneRuntimeV1> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return fail('invalid-scene', 'Spatial scene must be an object.');
  }
  const scene = input as GraphSpatialSceneRuntimeV1;
  if (!hasOnlyKeys(scene, ['version', 'planarScene', 'surfaceMeshes'])
    || scene.version !== 1 || !Array.isArray(scene.surfaceMeshes) || scene.surfaceMeshes.length > 100) {
    return fail('invalid-scene', 'Spatial scene structure is invalid.');
  }
  const planar = validateSampledSceneRuntimeStructure(scene.planarScene);
  if (!planar.ok) return planar;
  let numericCount = sceneNumberCount(scene.planarScene);
  for (const [index, mesh] of scene.surfaceMeshes.entries()) {
    const base = `$.surfaceMeshes[${index}]`;
    if (!hasOnlyKeys(mesh, ['meshId', 'itemId', 'positions', 'triangleIndices', 'normals', 'contourCoordinates', 'contourOffsets', 'truncated'])
      || !mesh.meshId || mesh.meshId.length > MAX_SCENE_ID_LENGTH
      || !mesh.itemId || mesh.itemId.length > MAX_SCENE_ID_LENGTH
      || !(mesh.positions instanceof Float64Array)
      || !(mesh.triangleIndices instanceof Uint32Array)
      || !(mesh.normals instanceof Float32Array)
      || !(mesh.contourCoordinates instanceof Float64Array)
      || !(mesh.contourOffsets instanceof Uint32Array)
      || typeof mesh.truncated !== 'boolean') return fail('invalid-scene', 'Surface mesh structure is invalid.', base);
    const vertexCount = mesh.positions.length / 3;
    numericCount += mesh.positions.length + mesh.triangleIndices.length + mesh.normals.length
      + mesh.contourCoordinates.length + mesh.contourOffsets.length;
    if (mesh.positions.length % 3 !== 0 || mesh.normals.length !== mesh.positions.length
      || mesh.triangleIndices.length % 3 !== 0 || mesh.contourCoordinates.length % 3 !== 0
      || mesh.triangleIndices.some((value) => value >= vertexCount)
      || mesh.contourOffsets.some((value) => value >= mesh.contourCoordinates.length / 3)) {
      return fail('invalid-index', 'Surface mesh indices or dimensions are invalid.', base);
    }
    const numbers = validateNumbers(mesh.positions, `${base}.positions`)
      ?? validateNumbers(mesh.normals, `${base}.normals`)
      ?? validateNumbers(mesh.triangleIndices, `${base}.triangleIndices`)
      ?? validateNumbers(mesh.contourCoordinates, `${base}.contourCoordinates`)
      ?? validateNumbers(mesh.contourOffsets, `${base}.contourOffsets`);
    if (numbers) return numbers;
  }
  if (numericCount > MAX_SCENE_NUMBERS) return fail('scene-budget-exceeded', 'Spatial scene exceeds the numeric budget.');
  return { ok: true, value: scene };
}

export function hashGraphSpatialSceneRuntime(
  scene: GraphSpatialSceneRuntimeV1,
  viewport: SampledSceneSnapshotV2['viewport'],
) {
  let lane = 0x811c9dc5;
  const appendByte = (value: number) => { lane = Math.imul(lane ^ value, 0x01000193) >>> 0; };
  const appendText = (value: string) => {
    for (const byte of new TextEncoder().encode(value)) appendByte(byte);
  };
  appendText(hashSampledSceneRuntime(scene.planarScene, viewport));
  for (const mesh of [...scene.surfaceMeshes].sort((left, right) => left.meshId.localeCompare(right.meshId))) {
    appendText(mesh.meshId); appendText(mesh.itemId); appendByte(mesh.truncated ? 1 : 0);
    for (const view of [mesh.positions, mesh.triangleIndices, mesh.normals, mesh.contourCoordinates, mesh.contourOffsets]) {
      const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
      for (const byte of bytes) appendByte(byte);
    }
  }
  return `graph64:${lane.toString(16).padStart(8, '0')}${((lane ^ 0x9e3779b9) >>> 0).toString(16).padStart(8, '0')}`;
}

export function validateGraphSampleResult(input: unknown) {
  return validateGraphSampleResultEnvelope(input, true);
}

/** Use only at the receiving side of the Graph worker after that worker ran full hash validation. */
export function validateTransferredGraphSampleResult(input: unknown) {
  return validateGraphSampleResultEnvelope(input, false);
}

export function snapshotSampledSceneRuntime(scene: SampledSceneRuntimeV2, viewport: SampledSceneSnapshotV2['viewport']): SampledSceneSnapshotV2 {
  return normalizeGraphSceneSnapshot({
    version: 2,
    revisions: {
      scene: scene.sceneRevision,
      mathematics: scene.mathematicsRevision,
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
  });
}
