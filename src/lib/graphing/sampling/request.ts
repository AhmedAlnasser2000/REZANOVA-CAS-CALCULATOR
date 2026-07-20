import {
  hashGraphSpatialSceneRuntime,
  validateGraphSampleRequest,
  type GraphSampleRequestV6,
  type GraphSampleResultV6,
  type GraphSurfaceMeshRuntimeV1,
  type GraphSamplingItemEvidenceV1,
  type GraphStopReason,
  type GraphViewportV1,
} from '../contracts';
import { GraphExpressionPlanCache } from '../evaluator';
import {
  assembleSampledScene,
  collectGraphSpatialSceneTransferables,
  type GraphPointBatchSceneInput,
  type GraphRegionSceneInput,
  type GraphSampledPathSceneInput,
} from '../scene';
import { adaptGraphExpressionMathJson } from '../parser';
import { createGraphExpressionEvaluator } from '../evaluator';
import { compileExplicitGraphRelation } from './compile';
import { sampleExplicitGraphRelation } from './explicit';
import { sampleImplicitGraphRelation } from './implicit';
import { sampleGraphPiecewise } from './piecewise';
import { sampleParametricGraphRelation } from './parametric';
import {
  deriveGraphAdaptiveQualityPolicy,
  GRAPH_SCENE_MAX_VERTICES,
  overscannedGraphViewport,
} from './adaptive-policy';
import { GraphSamplingRuntimeCache } from './runtime-cache';
import { sampleRealSurface } from './surface';
import { sampleComplexMapping, sampleComplexTrajectory } from './complex';

export type GraphSampleRequestControl = {
  now?: () => number;
  isCancelled?: () => boolean;
  maximumItemTimeMs?: number;
  yieldBetweenItems?: () => Promise<void>;
};

function effectiveMaximumItemTimeMs(policyMaximum: number, controlMaximum?: number) {
  return controlMaximum === undefined
    ? policyMaximum
    : Math.min(policyMaximum, controlMaximum);
}

export type GraphSampleExecution = {
  result: GraphSampleResultV6;
  transferList: ArrayBuffer[];
};

const defaultNow = () => performance.now();

function runtimeError(message: string): never {
  throw new Error(`Graph sampling runtime failed: ${message}`);
}

function cancelledStop(detailCode: string): GraphStopReason {
  return { code: 'sampling-cancelled', detailCode };
}

function budgetStop(detailCode: string): GraphStopReason {
  return { code: 'sampling-budget-exceeded', detailCode };
}

function achievedQuality(
  quality: GraphSampleRequestV6['quality'],
  status: 'complete' | 'budget-exhausted' | 'cancelled',
  hasGeometry: boolean,
): GraphSamplingItemEvidenceV1['achievedQuality'] {
  if (status === 'budget-exhausted') return hasGeometry ? 'reduced-detail' : 'unresolved';
  if (quality === 'polish') return 'polished';
  if (quality === 'settled') return 'settled';
  return 'coarse';
}

function errorTarget(quality: GraphSampleRequestV6['quality']) {
  return quality === 'preview' ? 1.5 : quality === 'settled' ? 0.35 : 0.2;
}

function graphResult(
  request: GraphSampleRequestV6,
  input: {
    scene: GraphSampleResultV6['scene'];
    status: GraphSampleResultV6['status'];
    stopReasons: GraphStopReason[];
    sampleCount: number;
    vertexCount: number;
    elapsedMs: number;
    itemEvidence: GraphSamplingItemEvidenceV1[];
    schedulerPasses: number;
    cacheBytes: number;
  },
): GraphSampleResultV6 {
  return {
    version: 6,
    requestId: request.requestId,
    workspaceInstanceId: request.workspaceInstanceId,
    documentId: request.documentId,
    revisions: request.revisions,
    viewport: request.viewport,
    quality: request.quality,
    status: input.status,
    scene: input.scene,
    snapshotHash: hashGraphSpatialSceneRuntime(input.scene, request.viewport),
    stopReasons: input.stopReasons,
    itemEvidence: input.itemEvidence,
    evidence: {
      sampleCount: input.sampleCount,
      vertexCount: input.vertexCount,
      elapsedMs: input.elapsedMs,
      cacheBytes: input.cacheBytes,
      schedulerPasses: input.schedulerPasses,
    },
  };
}

function assembleEmptyScene(request: GraphSampleRequestV6) {
  const assembled = assembleSampledScene({
    revisions: request.revisions,
    viewport: request.viewport,
    paths: [],
  });
  if (!assembled.ok) runtimeError(assembled.failure.message);
  return { version: 2 as const, planarScene: assembled.bundle.scene, surfaceMeshes: [], complexTiles: [] };
}

export function buildCancelledGraphSampleExecution(
  request: GraphSampleRequestV6,
  detailCode = 'host-cancellation',
): GraphSampleExecution {
  const scene = assembleEmptyScene(request);
  return {
    result: graphResult(request, {
      scene,
      status: 'cancelled',
      stopReasons: [cancelledStop(detailCode)],
      sampleCount: 0,
      vertexCount: 0,
      elapsedMs: 0,
      itemEvidence: [],
      schedulerPasses: 0,
      cacheBytes: 0,
    }),
    transferList: [],
  };
}

export async function runGraphSampleRequest(
  input: GraphSampleRequestV6,
  planCache = new GraphExpressionPlanCache(100),
  control: GraphSampleRequestControl = {},
  samplingCache = new GraphSamplingRuntimeCache(),
): Promise<GraphSampleExecution> {
  const validation = validateGraphSampleRequest(input);
  if (!validation.ok) runtimeError(validation.failure.message);
  const request = validation.validated.value;
  const now = control.now ?? defaultNow;
  const isCancelled = control.isCancelled ?? (() => false);
  const startedAt = now();
  const paths: GraphSampledPathSceneInput[] = [];
  const regions: GraphRegionSceneInput[] = [];
  const pointBatches: GraphPointBatchSceneInput[] = [];
  const surfaceMeshes: GraphSurfaceMeshRuntimeV1[] = [];
  const complexTiles: GraphSampleResultV6['scene']['complexTiles'] = [];
  const stopReasons: GraphStopReason[] = [];
  const itemEvidence: GraphSamplingItemEvidenceV1[] = [];
  let sampleCount = 0;
  let vertexCount = 0;
  let cancelled = false;
  let partial = false;

  const cacheItem = (input: {
    key: string;
    viewport: GraphViewportV1;
    quality: GraphSampleRequestV6['quality'];
    evidence: GraphSamplingItemEvidenceV1;
    pathStart: number;
    regionStart: number;
    pointStart: number;
  }) => {
    if (input.evidence.achievedQuality === 'reduced-detail'
      || input.evidence.achievedQuality === 'unresolved') return;
    samplingCache.write({
      key: input.key,
      viewport: input.viewport,
      quality: input.quality,
      paths: paths.slice(input.pathStart),
      regions: regions.slice(input.regionStart),
      pointBatches: pointBatches.slice(input.pointStart),
      evidence: input.evidence,
    });
  };

  if (request.overlays.unitCircle) {
    const coordinates: number[] = [];
    const parameterValues: number[] = [];
    for (let index = 0; index <= 96; index += 1) {
      const angle = index / 96 * Math.PI * 2;
      coordinates.push(Math.cos(angle), Math.sin(angle));
      parameterValues.push(angle);
    }
    paths.push({
      pathId: 'graph-overlay.unit-circle:path',
      sample: {
        itemId: 'graph-overlay.unit-circle',
        status: 'complete',
        coordinates: new Float64Array(coordinates),
        independentValues: new Float64Array(parameterValues),
        segmentOffsets: new Uint32Array([0]),
        stats: {
          evaluatedSamples: parameterValues.length,
          emittedVertices: parameterValues.length,
          elapsedMs: 0,
        },
      },
      closed: true,
      strokeRole: 'teaching-overlay',
    });
    sampleCount += parameterValues.length;
    vertexCount += parameterValues.length;
    itemEvidence.push({
      itemId: 'graph-overlay.unit-circle',
      route: 'unit-circle',
      achievedQuality: request.quality === 'polish' ? 'polished' : request.quality === 'settled' ? 'settled' : 'coarse',
      estimatedMaximumErrorPixels: request.quality === 'preview' ? 1.5 : request.quality === 'settled' ? 0.35 : 0.2,
      cache: 'miss',
      refinable: request.quality !== 'polish',
    });
  }

  const priorityItems = new Set(request.priority.dependentItemIds);
  if (request.priority.activeItemId) priorityItems.add(request.priority.activeItemId);
  const scheduledItems = request.items.filter((item) => item.visible).sort((left, right) => {
    const priorityDifference = Number(priorityItems.has(right.itemId)) - Number(priorityItems.has(left.itemId));
    if (priorityDifference !== 0) return priorityDifference;
    return request.items.indexOf(left) - request.items.indexOf(right);
  });

  for (const item of scheduledItems) {
    if (isCancelled()) {
      cancelled = true;
      stopReasons.push(cancelledStop('cooperative-request-cancellation'));
      break;
    }
    const pathStart = paths.length;
    const regionStart = regions.length;
    const pointStart = pointBatches.length;
    const cacheKey = samplingCache.key({
      workspaceInstanceId: request.workspaceInstanceId,
      item,
      parameterEnvironment: request.parameterEnvironment,
    });
    if (item.kind === 'relation' && item.relation.kind === 'complex-mapping') {
      const sampled = sampleComplexMapping({ itemId: item.itemId, relation: item.relation,
        viewport: request.viewport, cssSize: request.cssSize, quality: request.quality,
        parameters: request.parameterEnvironment, isCancelled });
      complexTiles.push(sampled.tile);
      const makeSlice = (coordinates: Float64Array, suffix: string): GraphSampledPathSceneInput | null => {
        if (coordinates.length < 4) return null;
        return { pathId: `${item.itemId}:real-axis-${suffix}`, strokeRole: 'teaching-overlay', sample: {
          itemId: item.itemId, status: 'complete', coordinates,
          independentValues: new Float64Array(Array.from({ length: coordinates.length / 2 }, (_, index) => coordinates[index * 2]!)),
          segmentOffsets: new Uint32Array([0]),
          stats: { evaluatedSamples: coordinates.length / 2, emittedVertices: coordinates.length / 2, elapsedMs: 0 },
        } };
      };
      const realSlice = makeSlice(sampled.sliceRe, 'real'); const imaginarySlice = makeSlice(sampled.sliceIm, 'imaginary');
      if (realSlice) paths.push(realSlice); if (imaginarySlice) paths.push(imaginarySlice);
      sampleCount += sampled.sampleCount; vertexCount += sampled.tile.width * sampled.tile.height;
      if (sampled.invalidCount > 0) stopReasons.push({ code: 'analysis-inconclusive',
        detailCode: `complex-invalid-pixels:${sampled.invalidCount}`, path: item.itemId });
      itemEvidence.push({ itemId: item.itemId, route: 'complex-mapping',
        achievedQuality: sampled.tile.truncated ? 'reduced-detail' : request.quality === 'polish' ? 'polished'
          : request.quality === 'settled' ? 'settled' : 'coarse',
        estimatedMaximumErrorPixels: errorTarget(request.quality), cache: 'miss',
        refinable: !sampled.tile.truncated && request.quality !== 'polish' });
      await control.yieldBetweenItems?.();
      if (sampled.tile.truncated) { cancelled = true; break; }
      continue;
    }
    if (item.kind === 'relation' && item.relation.kind === 'complex-trajectory') {
      const sampled = sampleComplexTrajectory({ itemId: item.itemId, relation: item.relation,
        viewport: request.viewport, quality: request.quality,
        parameters: request.parameterEnvironment, isCancelled });
      if (sampled.coordinates.length >= 4) paths.push({
        pathId: `${item.itemId}:argand-trajectory`, strokeRole: 'default', sample: {
          itemId: item.itemId, status: sampled.truncated ? 'cancelled' : 'complete',
          coordinates: sampled.coordinates, independentValues: sampled.independentValues,
          segmentOffsets: sampled.segmentOffsets,
          stats: { evaluatedSamples: sampled.evaluatedSamples,
            emittedVertices: sampled.coordinates.length / 2, elapsedMs: 0 },
        },
      });
      sampleCount += sampled.evaluatedSamples; vertexCount += sampled.coordinates.length / 2;
      itemEvidence.push({ itemId: item.itemId, route: 'complex-trajectory',
        achievedQuality: sampled.truncated ? 'reduced-detail' : request.quality === 'polish' ? 'polished'
          : request.quality === 'settled' ? 'settled' : 'coarse',
        estimatedMaximumErrorPixels: errorTarget(request.quality), cache: 'miss',
        refinable: !sampled.truncated && request.quality !== 'polish' });
      await control.yieldBetweenItems?.();
      if (sampled.truncated) { cancelled = true; break; }
      continue;
    }
    if (item.kind === 'relation' && item.relation.kind === 'real-surface') {
      const sampled = sampleRealSurface({
        itemId: item.itemId,
        sourceRevision: item.source.sourceRevision,
        relation: item.relation,
        viewport: request.viewport,
        parameterEnvironment: request.parameterEnvironment,
        quality: request.quality,
        cache: planCache,
        control: { isCancelled },
      });
      if (sampled.mesh) surfaceMeshes.push(sampled.mesh);
      sampleCount += sampled.sampleCount;
      vertexCount += sampled.vertexCount;
      if (sampled.stopReason) stopReasons.push({ ...sampled.stopReason, path: item.itemId });
      if (sampled.domainBreakCells > 0) {
        stopReasons.push({
          code: 'analysis-inconclusive',
          detailCode: `surface-domain-breaks:${sampled.domainBreakCells}`,
          path: item.itemId,
        });
      }
      if (sampled.status === 'cancelled') cancelled = true;
      if (sampled.status === 'budget-exhausted') partial = true;
      itemEvidence.push({
        itemId: item.itemId,
        route: 'real-surface',
        achievedQuality: achievedQuality(request.quality, sampled.status, sampled.mesh !== undefined),
        estimatedMaximumErrorPixels: errorTarget(request.quality),
        cache: 'miss',
        refinable: sampled.status !== 'cancelled' && request.quality !== 'polish',
        ...(sampled.stopReason ? { stopReason: { ...sampled.stopReason, path: item.itemId } } : {}),
      });
      await control.yieldBetweenItems?.();
      if (cancelled) break;
      continue;
    }
    const cached = samplingCache.read({ key: cacheKey, viewport: request.viewport, quality: request.quality });
    if (cached) {
      paths.push(...cached.paths);
      regions.push(...cached.regions);
      pointBatches.push(...cached.pointBatches);
      itemEvidence.push(cached.evidence);
      vertexCount += cached.paths.reduce((count, path) => count + path.sample.coordinates.length / 2, 0)
        + cached.regions.reduce((count, region) => count + region.vertices.length / 2, 0)
        + cached.pointBatches.reduce((count, batch) => count + batch.coordinates.length / 2, 0);
      await control.yieldBetweenItems?.();
      continue;
    }
    if (item.kind === 'point-set') {
      const coordinates: number[] = [];
      let itemReduced = false;
      for (let pointIndex = 0; pointIndex < item.points.length; pointIndex += 1) {
        if (isCancelled()) {
          cancelled = true;
          stopReasons.push(cancelledStop('cooperative-point-cancellation'));
          break;
        }
        if (vertexCount + 1 > GRAPH_SCENE_MAX_VERTICES) {
          partial = true;
          itemReduced = true;
          stopReasons.push({ ...budgetStop('point-set-budget-exhausted'), path: item.itemId });
          break;
        }
        const point = item.points[pointIndex];
        const values: number[] = [];
        for (const [coordinate, mathJson] of [['x', point.x], ['y', point.y]] as const) {
          sampleCount += 1;
          const adapted = adaptGraphExpressionMathJson(
            mathJson,
            `$.items.${item.itemId}.points[${pointIndex}].${coordinate}`,
          );
          if (!adapted.ok) {
            stopReasons.push({ ...adapted.stopReason, path: item.itemId });
            values.length = 0;
            break;
          }
          const compiled = planCache.getOrCompile({
            planId: `${item.itemId}:point:${pointIndex}:${coordinate}`,
            sourceRevision: item.source.sourceRevision,
            expression: adapted.expression,
          });
          if (!compiled.ok) {
            stopReasons.push({ ...compiled.stopReason, path: item.itemId });
            values.length = 0;
            break;
          }
          const evaluated = createGraphExpressionEvaluator(compiled.plan)
            .evaluate(request.parameterEnvironment);
          if (evaluated.status !== 'finite') {
            stopReasons.push({
              code: evaluated.reason === 'missing-symbol' ? 'invalid-parameter' : 'unsafe-expression',
              detailCode: `point-${coordinate}-${evaluated.reason}`,
              path: item.itemId,
            });
            values.length = 0;
            break;
          }
          values.push(evaluated.value);
        }
        if (values.length === 2) {
          coordinates.push(values[0], values[1]);
          vertexCount += 1;
        }
      }
      if (coordinates.length > 0) {
        pointBatches.push({
          pointBatchId: `${item.itemId}:points:0`,
          itemId: item.itemId,
          coordinates: new Float64Array(coordinates),
        });
      }
      const pointEvidence: GraphSamplingItemEvidenceV1 = {
        itemId: item.itemId,
        route: 'point-set',
        achievedQuality: itemReduced ? 'reduced-detail' : request.quality === 'polish' ? 'polished' : request.quality === 'settled' ? 'settled' : 'coarse',
        estimatedMaximumErrorPixels: 0,
        cache: 'miss',
        refinable: false,
        ...(itemReduced ? { stopReason: { ...budgetStop('scene-vertex-safety'), path: item.itemId } } : {}),
      };
      itemEvidence.push(pointEvidence);
      cacheItem({
        key: cacheKey,
        viewport: request.viewport,
        quality: request.quality,
        evidence: pointEvidence,
        pathStart,
        regionStart,
        pointStart,
      });
      await control.yieldBetweenItems?.();
      if (cancelled) break;
      continue;
    }
    if (item.kind === 'piecewise') {
      const policy = deriveGraphAdaptiveQualityPolicy({
        quality: request.quality,
        cssSize: request.cssSize,
        movement: request.movement,
        route: 'piecewise',
      });
      const sampled = sampleGraphPiecewise({
        itemId: item.itemId,
        sourceRevision: item.source.sourceRevision,
        piecewise: item.piecewise,
        viewport: request.viewport,
        cssSize: request.cssSize,
        parameterEnvironment: request.parameterEnvironment,
        quality: request.quality,
        limits: {
          ...policy.limits,
          maximumTimeMs: effectiveMaximumItemTimeMs(policy.limits.maximumTimeMs, control.maximumItemTimeMs),
        },
        policy,
        cache: planCache,
        control: { now, isCancelled },
      });
      paths.push(...sampled.paths);
      pointBatches.push(...sampled.endpointBatches);
      sampleCount += sampled.stats.evaluatedSamples;
      vertexCount += sampled.stats.emittedVertices
        + sampled.endpointBatches.reduce((count, batch) => count + batch.coordinates.length / 2, 0);
      sampled.stopReasons.forEach((reason) => stopReasons.push({ ...reason, path: item.itemId }));
      if (sampled.status === 'cancelled') cancelled = true;
      if (sampled.status === 'budget-exhausted') partial = true;
      const piecewiseReason = sampled.stopReasons.find((reason) => reason.code === 'sampling-budget-exceeded');
      const piecewiseEvidence: GraphSamplingItemEvidenceV1 = {
        itemId: item.itemId,
        route: 'piecewise',
        achievedQuality: achievedQuality(request.quality, sampled.status, sampled.paths.length > 0),
        estimatedMaximumErrorPixels: errorTarget(request.quality),
        cache: 'miss',
        refinable: sampled.status !== 'cancelled' && request.quality !== 'polish',
        piecewiseCondition: sampled.conditionEvidence,
        ...(piecewiseReason ? { stopReason: { ...piecewiseReason, path: item.itemId } } : {}),
      };
      itemEvidence.push(piecewiseEvidence);
      cacheItem({
        key: cacheKey,
        viewport: overscannedGraphViewport(request.viewport, request.movement),
        quality: request.quality,
        evidence: piecewiseEvidence,
        pathStart,
        regionStart,
        pointStart,
      });
      await control.yieldBetweenItems?.();
      if (cancelled) break;
      continue;
    }
    if (item.relation.kind === 'implicit-equality'
      || item.relation.kind === 'inequality'
      || item.relation.kind === 'chained-inequality') {
      const policy = deriveGraphAdaptiveQualityPolicy({
        quality: request.quality,
        cssSize: request.cssSize,
        movement: request.movement,
        route: 'implicit',
      });
      const sampled = sampleImplicitGraphRelation({
        itemId: item.itemId,
        sourceRevision: item.source.sourceRevision,
        relation: item.relation,
        viewport: overscannedGraphViewport(request.viewport, request.movement, true),
        cssSize: request.cssSize,
        parameterEnvironment: request.parameterEnvironment,
        quality: request.quality,
        limits: {
          ...policy.limits,
          maximumTimeMs: effectiveMaximumItemTimeMs(policy.limits.maximumTimeMs, control.maximumItemTimeMs),
        },
        policy,
        cache: planCache,
        control: { now, isCancelled },
      });
      sampleCount += sampled.stats.evaluatedSamples;
      vertexCount += sampled.stats.emittedVertices;
      sampled.stopReasons.forEach((reason) => {
        stopReasons.push({ ...reason, path: item.itemId });
      });
      if (sampled.status === 'cancelled') cancelled = true;
      if (sampled.status === 'budget-exhausted') partial = true;
      const boundaryPathIds: string[] = [];
      for (const boundary of sampled.boundaries) {
        const pathId = `${item.itemId}:${boundary.pathIdSuffix}`;
        boundaryPathIds.push(pathId);
        paths.push({
          pathId,
          sample: {
            itemId: item.itemId,
            status: sampled.status,
            coordinates: boundary.coordinates,
            segmentOffsets: boundary.segmentOffsets,
            ...(sampled.status === 'cancelled'
              ? { stopReason: cancelledStop('cooperative-implicit-cancellation') }
              : sampled.status === 'budget-exhausted'
                ? { stopReason: budgetStop('implicit-sampling-budget') }
                : {}),
            stats: {
              evaluatedSamples: 0,
              emittedVertices: boundary.coordinates.length / 2,
              elapsedMs: sampled.stats.elapsedMs,
            },
          },
          ...(boundary.strict ? { strokeRole: 'strict-boundary' as const } : {}),
        });
      }
      if (sampled.region) {
        regions.push({
          regionId: `${item.itemId}:region:0`,
          itemId: item.itemId,
          vertices: sampled.region.vertices,
          triangleIndices: sampled.region.triangleIndices,
          boundaryPathIds,
        });
      }
      const implicitReason = sampled.stopReasons.find((reason) => (
        reason.code === 'sampling-budget-exceeded' || reason.code === 'region-topology-inconclusive'
      ));
      if (implicitReason?.code === 'region-topology-inconclusive') partial = true;
      const implicitEvidence: GraphSamplingItemEvidenceV1 = {
        itemId: item.itemId,
        route: item.relation.kind,
        achievedQuality: achievedQuality(
          request.quality,
          implicitReason?.code === 'region-topology-inconclusive' ? 'budget-exhausted' : sampled.status,
          sampled.boundaries.length > 0 || sampled.region !== undefined,
        ),
        estimatedMaximumErrorPixels: policy.midpointTolerancePixels,
        cache: 'miss',
        refinable: sampled.status !== 'cancelled' && request.quality !== 'polish',
        ...(implicitReason ? { stopReason: { ...implicitReason, path: item.itemId } } : {}),
      };
      itemEvidence.push(implicitEvidence);
      cacheItem({
        key: cacheKey,
        viewport: overscannedGraphViewport(request.viewport, request.movement, true),
        quality: request.quality,
        evidence: implicitEvidence,
        pathStart,
        regionStart,
        pointStart,
      });
      await control.yieldBetweenItems?.();
      if (cancelled) break;
      continue;
    }
    if (item.relation.kind === 'polar-radius' || item.relation.kind === 'parametric-curve') {
      const policy = deriveGraphAdaptiveQualityPolicy({
        quality: request.quality,
        cssSize: request.cssSize,
        movement: request.movement,
        route: 'parametric',
      });
      const sampled = sampleParametricGraphRelation({
        itemId: item.itemId,
        sourceRevision: item.source.sourceRevision,
        relation: item.relation,
        viewport: request.viewport,
        cssSize: request.cssSize,
        parameterEnvironment: request.parameterEnvironment,
        quality: request.quality,
        limits: {
          ...policy.limits,
          maximumTimeMs: effectiveMaximumItemTimeMs(policy.limits.maximumTimeMs, control.maximumItemTimeMs),
        },
        policy,
        cache: planCache,
        control: { now, isCancelled },
      });
      if (sampled.path) paths.push(sampled.path);
      sampleCount += sampled.sampleCount;
      vertexCount += sampled.vertexCount;
      if (sampled.stopReason) stopReasons.push({ ...sampled.stopReason, path: item.itemId });
      if (sampled.status === 'cancelled') cancelled = true;
      if (sampled.status === 'budget-exhausted') partial = true;
      const parametricEvidence: GraphSamplingItemEvidenceV1 = {
        itemId: item.itemId,
        route: item.relation.kind,
        achievedQuality: achievedQuality(request.quality, sampled.status, sampled.path !== undefined),
        estimatedMaximumErrorPixels: errorTarget(request.quality),
        cache: 'miss',
        refinable: sampled.status !== 'cancelled' && request.quality !== 'polish',
        ...(sampled.stopReason ? { stopReason: { ...sampled.stopReason, path: item.itemId } } : {}),
      };
      itemEvidence.push(parametricEvidence);
      cacheItem({
        key: cacheKey,
        viewport: request.viewport,
        quality: request.quality,
        evidence: parametricEvidence,
        pathStart,
        regionStart,
        pointStart,
      });
      await control.yieldBetweenItems?.();
      if (cancelled) break;
      continue;
    }
    const compiled = compileExplicitGraphRelation({
      itemId: item.itemId,
      sourceRevision: item.source.sourceRevision,
      relation: item.relation,
      cache: planCache,
    });
    if (!compiled.ok) {
      stopReasons.push({ ...compiled.stopReason, path: item.itemId });
      itemEvidence.push({
        itemId: item.itemId,
        route: item.relation.kind,
        achievedQuality: 'unresolved',
        estimatedMaximumErrorPixels: Number.MAX_SAFE_INTEGER,
        cache: 'miss',
        refinable: false,
        stopReason: { ...compiled.stopReason, path: item.itemId },
      });
      partial = true;
      await control.yieldBetweenItems?.();
      continue;
    }
    const policy = deriveGraphAdaptiveQualityPolicy({
      quality: request.quality,
      cssSize: request.cssSize,
      movement: request.movement,
      route: 'explicit',
    });
    const sampled = sampleExplicitGraphRelation({
      plan: compiled.plan,
      viewport: request.viewport,
      cssSize: request.cssSize,
      parameterEnvironment: request.parameterEnvironment,
      quality: request.quality,
      limits: {
        ...policy.limits,
        maximumTimeMs: effectiveMaximumItemTimeMs(policy.limits.maximumTimeMs, control.maximumItemTimeMs),
      },
      policy,
      control: { now, isCancelled },
    });
    sampleCount += sampled.stats.evaluatedSamples;
    vertexCount += sampled.stats.emittedVertices;
    if (sampled.stopReason) {
      stopReasons.push({ ...sampled.stopReason, path: item.itemId });
    }
    if (sampled.status === 'cancelled') cancelled = true;
    if (sampled.status === 'budget-exhausted') partial = true;
    if (sampled.coordinates.length >= 4 && sampled.segmentOffsets.length >= 1) {
      paths.push({
        pathId: `${item.itemId}:path:0`,
        sample: sampled,
      });
    }
    const explicitEvidence: GraphSamplingItemEvidenceV1 = {
      itemId: item.itemId,
      route: item.relation.kind,
      achievedQuality: achievedQuality(request.quality, sampled.status, sampled.coordinates.length >= 4),
      estimatedMaximumErrorPixels: errorTarget(request.quality),
      cache: 'miss',
      refinable: sampled.status !== 'cancelled' && request.quality !== 'polish',
      ...(sampled.stopReason ? { stopReason: { ...sampled.stopReason, path: item.itemId } } : {}),
    };
    itemEvidence.push(explicitEvidence);
    cacheItem({
      key: cacheKey,
      viewport: overscannedGraphViewport(request.viewport, request.movement),
      quality: request.quality,
      evidence: explicitEvidence,
      pathStart,
      regionStart,
      pointStart,
    });
    await control.yieldBetweenItems?.();
    if (cancelled) break;
  }

  const assembled = assembleSampledScene({
    revisions: request.revisions,
    viewport: request.viewport,
    paths,
    regions,
    pointBatches,
  });
  if (!assembled.ok) runtimeError(assembled.failure.message);
  const status = cancelled
    ? 'cancelled'
    : partial
      ? 'partial'
      : 'complete';
  const spatialScene = { version: 2 as const, planarScene: assembled.bundle.scene, surfaceMeshes, complexTiles };
  const transfers = collectGraphSpatialSceneTransferables(spatialScene);
  if (!transfers.ok) runtimeError(transfers.message);
  const result = graphResult(request, {
    scene: spatialScene,
    status,
    stopReasons,
    sampleCount,
    vertexCount,
    elapsedMs: Math.max(0, now() - startedAt),
    itemEvidence,
    schedulerPasses: request.quality === 'preview' ? 1 : request.quality === 'settled' ? 2 : 3,
    cacheBytes: samplingCache.bytes,
  });
  return { result, transferList: transfers.transferList };
}

export function releaseGraphSampleResultBuffers(result: GraphSampleResultV6) {
  const transfers = collectGraphSpatialSceneTransferables(result.scene);
  if (!transfers.ok || transfers.transferList.length === 0) return 0;
  const releasedBytes = transfers.transferList.reduce(
    (count, buffer) => count + buffer.byteLength,
    0,
  );
  structuredClone(null, { transfer: transfers.transferList });
  return releasedBytes;
}
