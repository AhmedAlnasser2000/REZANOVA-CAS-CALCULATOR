import type {
  GraphHitResult,
  GraphScenePathRuntime,
  GraphViewportV1,
  SampledSceneRuntime,
} from '../../lib/graphing';

export type GraphTraceTarget = GraphHitResult & {
  kind: 'path' | 'point';
  pathId?: string;
  pointBatchId?: string;
  vertexIndex?: number;
  screen: { x: number; y: number };
};

type ViewportSize = { width: number; height: number };

type TraceIndexSegment = {
  pathIndex: number;
  vertexIndex: number;
  previous: { x: number; y: number };
  next: { x: number; y: number };
};

type TraceIndexPoint = { batchIndex: number; pointIndex: number; screen: { x: number; y: number } };

export type GraphTraceIndex = {
  sceneRevision: number;
  cellSize: number;
  segments: TraceIndexSegment[];
  points: TraceIndexPoint[];
  cells: ReadonlyMap<string, { segments: number[]; points: number[] }>;
};

function screenPoint(
  x: number,
  y: number,
  viewport: GraphViewportV1,
  size: ViewportSize,
) {
  return {
    x: (x - viewport.xMin) / (viewport.xMax - viewport.xMin) * size.width,
    y: (viewport.yMax - y) / (viewport.yMax - viewport.yMin) * size.height,
  };
}

function distance(leftX: number, leftY: number, rightX: number, rightY: number) {
  return Math.hypot(leftX - rightX, leftY - rightY);
}

function pathTarget(
  path: GraphScenePathRuntime,
  pathIndex: number,
  vertexIndex: number,
  world: { x: number; y: number },
  parameterValue: number | undefined,
  screen: { x: number; y: number },
  distancePixels: number,
): GraphTraceTarget {
  return {
    kind: 'path',
    itemId: path.itemId,
    sceneRevision: 0,
    pathId: path.pathId,
    pathIndex,
    vertexIndex,
    ...(parameterValue === undefined ? {} : { parameterValue }),
    world,
    screen,
    distancePixels,
  };
}

function pointTarget(input: {
  scene: SampledSceneRuntime;
  pointBatchIndex: number;
  pointIndex: number;
  world: { x: number; y: number };
  screen: { x: number; y: number };
  distancePixels: number;
}): GraphTraceTarget {
  const batch = input.scene.pointBatches[input.pointBatchIndex];
  return {
    kind: 'point',
    itemId: batch.itemId,
    sceneRevision: input.scene.sceneRevision,
    pointBatchId: batch.pointBatchId,
    pointIndex: input.pointIndex,
    world: input.world,
    screen: input.screen,
    distancePixels: input.distancePixels,
  };
}

function cellKey(x: number, y: number, cellSize: number) {
  return `${Math.floor(x / cellSize)}:${Math.floor(y / cellSize)}`;
}

export function buildGraphTraceIndex(
  scene: SampledSceneRuntime,
  viewport: GraphViewportV1,
  size: ViewportSize,
): GraphTraceIndex {
  const cellSize = 32;
  const segments: TraceIndexSegment[] = [];
  const points: TraceIndexPoint[] = [];
  const cells = new Map<string, { segments: number[]; points: number[] }>();
  const cell = (key: string) => {
    const existing = cells.get(key);
    if (existing) return existing;
    const created = { segments: [] as number[], points: [] as number[] };
    cells.set(key, created);
    return created;
  };
  scene.pointBatches.forEach((batch, batchIndex) => {
    for (let pointIndex = 0; pointIndex * 2 + 1 < batch.coordinates.length; pointIndex += 1) {
      const screen = screenPoint(batch.coordinates[pointIndex * 2]!, batch.coordinates[pointIndex * 2 + 1]!, viewport, size);
      const index = points.push({ batchIndex, pointIndex, screen }) - 1;
      const minX = Math.floor((screen.x - 30) / cellSize);
      const maxX = Math.floor((screen.x + 30) / cellSize);
      const minY = Math.floor((screen.y - 30) / cellSize);
      const maxY = Math.floor((screen.y + 30) / cellSize);
      for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) {
        cell(`${x}:${y}`).points.push(index);
      }
    }
  });
  scene.paths.forEach((path, pathIndex) => {
    if (path.itemId.startsWith('graph-overlay.')) return;
    const starts = new Set(path.segmentOffsets);
    for (let vertexIndex = 1; vertexIndex * 2 + 1 < path.coordinates.length; vertexIndex += 1) {
      if (starts.has(vertexIndex)) continue;
      const previous = screenPoint(path.coordinates[(vertexIndex - 1) * 2]!, path.coordinates[(vertexIndex - 1) * 2 + 1]!, viewport, size);
      const next = screenPoint(path.coordinates[vertexIndex * 2]!, path.coordinates[vertexIndex * 2 + 1]!, viewport, size);
      const index = segments.push({ pathIndex, vertexIndex, previous, next }) - 1;
      const minX = Math.floor((Math.min(previous.x, next.x) - 30) / cellSize);
      const maxX = Math.floor((Math.max(previous.x, next.x) + 30) / cellSize);
      const minY = Math.floor((Math.min(previous.y, next.y) - 30) / cellSize);
      const maxY = Math.floor((Math.max(previous.y, next.y) + 30) / cellSize);
      for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) {
        cell(`${x}:${y}`).segments.push(index);
      }
    }
  });
  return { sceneRevision: scene.sceneRevision, cellSize, segments, points, cells };
}

export function hitTestGraphTraceIndex(input: {
  index: GraphTraceIndex;
  scene: SampledSceneRuntime;
  screen: { x: number; y: number };
  maximumDistancePixels: number;
  itemId?: string;
  pathId?: string;
  pointBatchId?: string;
}): GraphTraceTarget | null {
  const candidates = input.index.cells.get(cellKey(input.screen.x, input.screen.y, input.index.cellSize));
  if (!candidates) return null;
  let best: GraphTraceTarget | null = null;
  for (const pointCandidate of candidates.points) {
    const indexed = input.index.points[pointCandidate]!;
    const batch = input.scene.pointBatches[indexed.batchIndex]!;
    if (input.itemId && batch.itemId !== input.itemId) continue;
    if (input.pointBatchId && batch.pointBatchId !== input.pointBatchId) continue;
    const candidateDistance = distance(indexed.screen.x, indexed.screen.y, input.screen.x, input.screen.y);
    if (candidateDistance > input.maximumDistancePixels || (best && candidateDistance >= best.distancePixels)) continue;
    const world = { x: batch.coordinates[indexed.pointIndex * 2]!, y: batch.coordinates[indexed.pointIndex * 2 + 1]! };
    best = pointTarget({ scene: input.scene, pointBatchIndex: indexed.batchIndex, pointIndex: indexed.pointIndex, world, screen: indexed.screen, distancePixels: candidateDistance });
  }
  for (const segmentCandidate of new Set(candidates.segments)) {
    const indexed = input.index.segments[segmentCandidate]!;
    const path = input.scene.paths[indexed.pathIndex]!;
    if (input.itemId && path.itemId !== input.itemId) continue;
    if (input.pathId && path.pathId !== input.pathId) continue;
    const dx = indexed.next.x - indexed.previous.x; const dy = indexed.next.y - indexed.previous.y;
    const denominator = dx * dx + dy * dy;
    const ratio = denominator === 0 ? 0 : Math.max(0, Math.min(1, ((input.screen.x - indexed.previous.x) * dx + (input.screen.y - indexed.previous.y) * dy) / denominator));
    const projected = { x: indexed.previous.x + dx * ratio, y: indexed.previous.y + dy * ratio };
    const candidateDistance = distance(projected.x, projected.y, input.screen.x, input.screen.y);
    if (candidateDistance > input.maximumDistancePixels || (best && candidateDistance >= best.distancePixels)) continue;
    const previousIndex = indexed.vertexIndex - 1;
    const world = {
      x: path.coordinates[previousIndex * 2]! + (path.coordinates[indexed.vertexIndex * 2]! - path.coordinates[previousIndex * 2]!) * ratio,
      y: path.coordinates[previousIndex * 2 + 1]! + (path.coordinates[indexed.vertexIndex * 2 + 1]! - path.coordinates[previousIndex * 2 + 1]!) * ratio,
    };
    const leftParameter = path.parameterValues?.[previousIndex]; const rightParameter = path.parameterValues?.[indexed.vertexIndex];
    const parameter = leftParameter === undefined || rightParameter === undefined ? undefined : leftParameter + (rightParameter - leftParameter) * ratio;
    best = pathTarget(path, indexed.pathIndex, ratio < 0.5 ? previousIndex : indexed.vertexIndex, world, parameter, projected, candidateDistance);
    best.sceneRevision = input.scene.sceneRevision;
  }
  return best;
}

export function hitTestGraphScene(input: {
  scene: SampledSceneRuntime;
  viewport: GraphViewportV1;
  size: ViewportSize;
  screen: { x: number; y: number };
  maximumDistancePixels?: number;
  itemId?: string;
}): GraphTraceTarget | null {
  const maximumDistance = input.maximumDistancePixels ?? 12;
  let best: GraphTraceTarget | null = null;
  for (let batchIndex = 0; batchIndex < input.scene.pointBatches.length; batchIndex += 1) {
    const batch = input.scene.pointBatches[batchIndex];
    if (input.itemId && batch.itemId !== input.itemId) continue;
    for (let pointIndex = 0; pointIndex * 2 + 1 < batch.coordinates.length; pointIndex += 1) {
      const world = {
        x: batch.coordinates[pointIndex * 2],
        y: batch.coordinates[pointIndex * 2 + 1],
      };
      const projected = screenPoint(world.x, world.y, input.viewport, input.size);
      const candidateDistance = distance(projected.x, projected.y, input.screen.x, input.screen.y);
      if (candidateDistance <= maximumDistance
        && (!best || candidateDistance < best.distancePixels)) {
        best = pointTarget({
          scene: input.scene,
          pointBatchIndex: batchIndex,
          pointIndex,
          world,
          screen: projected,
          distancePixels: candidateDistance,
        });
      }
    }
  }

  for (let pathIndex = 0; pathIndex < input.scene.paths.length; pathIndex += 1) {
    const path = input.scene.paths[pathIndex];
    if (path.itemId.startsWith('graph-overlay.')) continue;
    if (input.itemId && path.itemId !== input.itemId) continue;
    const segmentStarts = new Set(path.segmentOffsets);
    for (let vertexIndex = 1; vertexIndex * 2 + 1 < path.coordinates.length; vertexIndex += 1) {
      if (segmentStarts.has(vertexIndex)) continue;
      const previousWorld = {
        x: path.coordinates[(vertexIndex - 1) * 2],
        y: path.coordinates[(vertexIndex - 1) * 2 + 1],
      };
      const nextWorld = {
        x: path.coordinates[vertexIndex * 2],
        y: path.coordinates[vertexIndex * 2 + 1],
      };
      const previous = screenPoint(previousWorld.x, previousWorld.y, input.viewport, input.size);
      const next = screenPoint(nextWorld.x, nextWorld.y, input.viewport, input.size);
      const dx = next.x - previous.x;
      const dy = next.y - previous.y;
      const denominator = dx * dx + dy * dy;
      const ratio = denominator === 0 ? 0 : Math.max(0, Math.min(1,
        ((input.screen.x - previous.x) * dx + (input.screen.y - previous.y) * dy) / denominator,
      ));
      const projected = { x: previous.x + dx * ratio, y: previous.y + dy * ratio };
      const candidateDistance = distance(projected.x, projected.y, input.screen.x, input.screen.y);
      if (candidateDistance > maximumDistance
        || (best && candidateDistance >= best.distancePixels)) continue;
      const world = {
        x: previousWorld.x + (nextWorld.x - previousWorld.x) * ratio,
        y: previousWorld.y + (nextWorld.y - previousWorld.y) * ratio,
      };
      const previousParameter = path.parameterValues?.[vertexIndex - 1];
      const nextParameter = path.parameterValues?.[vertexIndex];
      const parameterValue = previousParameter === undefined || nextParameter === undefined
        ? undefined
        : previousParameter + (nextParameter - previousParameter) * ratio;
      best = pathTarget(
        path,
        pathIndex,
        ratio < 0.5 ? vertexIndex - 1 : vertexIndex,
        world,
        parameterValue,
        projected,
        candidateDistance,
      );
      best.sceneRevision = input.scene.sceneRevision;
    }
  }
  return best;
}

function targetAtPathVertex(
  scene: SampledSceneRuntime,
  viewport: GraphViewportV1,
  size: ViewportSize,
  pathIndex: number,
  vertexIndex: number,
) {
  const path = scene.paths[pathIndex];
  if (!path || vertexIndex < 0 || vertexIndex * 2 + 1 >= path.coordinates.length) return null;
  const world = {
    x: path.coordinates[vertexIndex * 2],
    y: path.coordinates[vertexIndex * 2 + 1],
  };
  const result = pathTarget(
    path,
    pathIndex,
    vertexIndex,
    world,
    path.parameterValues?.[vertexIndex],
    screenPoint(world.x, world.y, viewport, size),
    0,
  );
  result.sceneRevision = scene.sceneRevision;
  return result;
}

export function traceGraphPathAtPointer(input: {
  scene: SampledSceneRuntime;
  viewport: GraphViewportV1;
  size: ViewportSize;
  itemId: string;
  relationKind: 'explicit-y' | 'explicit-x';
  screen: { x: number; y: number };
  maximumDistancePixels?: number;
  pathId?: string;
}): GraphTraceTarget | null {
  const pathIndex = input.scene.paths.findIndex((path) => (
    path.itemId === input.itemId && (!input.pathId || path.pathId === input.pathId)
  ));
  const path = input.scene.paths[pathIndex];
  const parameters = path?.parameterValues;
  if (!path || !parameters || parameters.length === 0) return null;
  const targetParameter = input.relationKind === 'explicit-y'
    ? input.viewport.xMin + input.screen.x / input.size.width
      * (input.viewport.xMax - input.viewport.xMin)
    : input.viewport.yMax - input.screen.y / input.size.height
      * (input.viewport.yMax - input.viewport.yMin);
  let lower = 0;
  let upper = parameters.length - 1;
  while (lower < upper) {
    const middle = Math.floor((lower + upper) / 2);
    if (parameters[middle] < targetParameter) lower = middle + 1;
    else upper = middle;
  }
  const right = lower;
  const left = Math.max(0, right - 1);
  if (left === right) {
    const result = targetAtPathVertex(input.scene, input.viewport, input.size, pathIndex, right);
    if (result && input.maximumDistancePixels !== undefined
      && distance(result.screen.x, result.screen.y, input.screen.x, input.screen.y) > input.maximumDistancePixels) return null;
    return result;
  }
  const segmentStarts = new Set(path.segmentOffsets);
  if (segmentStarts.has(right)) {
    const index = Math.abs(parameters[left] - targetParameter)
      <= Math.abs(parameters[right] - targetParameter) ? left : right;
    const result = targetAtPathVertex(input.scene, input.viewport, input.size, pathIndex, index);
    if (result && input.maximumDistancePixels !== undefined
      && distance(result.screen.x, result.screen.y, input.screen.x, input.screen.y) > input.maximumDistancePixels) return null;
    return result;
  }
  const span = parameters[right] - parameters[left];
  const ratio = span === 0 ? 0 : Math.max(0, Math.min(1,
    (targetParameter - parameters[left]) / span,
  ));
  const world = {
    x: path.coordinates[left * 2]
      + (path.coordinates[right * 2] - path.coordinates[left * 2]) * ratio,
    y: path.coordinates[left * 2 + 1]
      + (path.coordinates[right * 2 + 1] - path.coordinates[left * 2 + 1]) * ratio,
  };
  const result = pathTarget(
    path,
    pathIndex,
    ratio < 0.5 ? left : right,
    world,
    targetParameter,
    screenPoint(world.x, world.y, input.viewport, input.size),
    0,
  );
  result.sceneRevision = input.scene.sceneRevision;
  result.distancePixels = distance(result.screen.x, result.screen.y, input.screen.x, input.screen.y);
  if (input.maximumDistancePixels !== undefined
    && result.distancePixels > input.maximumDistancePixels) return null;
  return result;
}

export function firstGraphTraceTarget(
  scene: SampledSceneRuntime,
  viewport: GraphViewportV1,
  size: ViewportSize,
) {
  const batch = scene.pointBatches[0];
  if (batch && batch.coordinates.length >= 2) {
    const world = { x: batch.coordinates[0], y: batch.coordinates[1] };
    return pointTarget({
      scene,
      pointBatchIndex: 0,
      pointIndex: 0,
      world,
      screen: screenPoint(world.x, world.y, viewport, size),
      distancePixels: 0,
    });
  }
  const pathIndex = scene.paths.findIndex((path) => !path.itemId.startsWith('graph-overlay.'));
  return targetAtPathVertex(scene, viewport, size, pathIndex, 0);
}

export function stepGraphTraceTarget(input: {
  scene: SampledSceneRuntime;
  viewport: GraphViewportV1;
  size: ViewportSize;
  current: GraphTraceTarget;
  delta: number;
}) {
  if (input.current.kind === 'point') {
    const batchIndex = input.scene.pointBatches.findIndex(
      (batch) => batch.pointBatchId === input.current.pointBatchId,
    );
    const batch = input.scene.pointBatches[batchIndex];
    if (!batch) return null;
    const count = batch.coordinates.length / 2;
    const pointIndex = Math.max(0, Math.min(count - 1, (input.current.pointIndex ?? 0) + input.delta));
    const world = {
      x: batch.coordinates[pointIndex * 2],
      y: batch.coordinates[pointIndex * 2 + 1],
    };
    return pointTarget({
      scene: input.scene,
      pointBatchIndex: batchIndex,
      pointIndex,
      world,
      screen: screenPoint(world.x, world.y, input.viewport, input.size),
      distancePixels: 0,
    });
  }
  const pathIndex = input.scene.paths.findIndex((path) => path.pathId === input.current.pathId);
  const path = input.scene.paths[pathIndex];
  if (!path) return null;
  const count = path.coordinates.length / 2;
  const vertexIndex = Math.max(0, Math.min(count - 1, (input.current.vertexIndex ?? 0) + input.delta));
  return targetAtPathVertex(input.scene, input.viewport, input.size, pathIndex, vertexIndex);
}
