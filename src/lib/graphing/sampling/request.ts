import {
  hashSampledSceneRuntime,
  validateGraphSampleRequest,
  type GraphSampleRequestV2,
  type GraphSampleResultV2,
  type GraphStopReason,
} from '../contracts';
import { GraphExpressionPlanCache } from '../evaluator';
import {
  assembleSampledScene,
  collectGraphSceneTransferables,
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

export type GraphSampleRequestControl = {
  now?: () => number;
  isCancelled?: () => boolean;
  maximumItemTimeMs?: number;
  yieldBetweenItems?: () => Promise<void>;
};

export type GraphSampleExecution = {
  result: GraphSampleResultV2;
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

function graphResult(
  request: GraphSampleRequestV2,
  input: {
    scene: GraphSampleResultV2['scene'];
    status: GraphSampleResultV2['status'];
    stopReasons: GraphStopReason[];
    sampleCount: number;
    vertexCount: number;
    elapsedMs: number;
  },
): GraphSampleResultV2 {
  return {
    version: 2,
    requestId: request.requestId,
    workspaceInstanceId: request.workspaceInstanceId,
    documentId: request.documentId,
    revisions: request.revisions,
    viewport: request.viewport,
    quality: request.quality,
    status: input.status,
    scene: input.scene,
    snapshotHash: hashSampledSceneRuntime(input.scene, request.viewport),
    stopReasons: input.stopReasons,
    evidence: {
      sampleCount: input.sampleCount,
      vertexCount: input.vertexCount,
      elapsedMs: input.elapsedMs,
    },
  };
}

function assembleEmptyScene(request: GraphSampleRequestV2) {
  const assembled = assembleSampledScene({
    revisions: request.revisions,
    viewport: request.viewport,
    paths: [],
  });
  if (!assembled.ok) runtimeError(assembled.failure.message);
  return assembled.bundle.scene;
}

export function buildCancelledGraphSampleExecution(
  request: GraphSampleRequestV2,
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
    }),
    transferList: [],
  };
}

export async function runGraphSampleRequest(
  input: GraphSampleRequestV2,
  planCache = new GraphExpressionPlanCache(100),
  control: GraphSampleRequestControl = {},
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
  const stopReasons: GraphStopReason[] = [];
  let sampleCount = 0;
  let vertexCount = 0;
  let cancelled = false;
  let budgetExhausted = false;
  const visibleItemCount = Math.max(1, request.items.filter((item) => item.visible).length);
  const fairBudgets = {
    maximumSamples: Math.max(16, Math.floor(request.budgets.maximumSamples / visibleItemCount)),
    maximumTimeMs: Math.max(4, Math.floor(request.budgets.maximumTimeMs / visibleItemCount)),
    maximumVertices: Math.max(16, Math.floor(request.budgets.maximumVertices / visibleItemCount)),
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
      style: {
        version: 1,
        colorToken: 'graph-violet',
        stroke: 'dashed',
        strokeWidth: 'thin',
        fillOpacity: 0,
        label: 'never',
      },
    });
    sampleCount += parameterValues.length;
    vertexCount += parameterValues.length;
  }

  for (const item of request.items) {
    if (!item.visible) continue;
    if (isCancelled()) {
      cancelled = true;
      stopReasons.push(cancelledStop('cooperative-request-cancellation'));
      break;
    }
    if (item.kind === 'point-set') {
      const coordinates: number[] = [];
      for (let pointIndex = 0; pointIndex < item.points.length; pointIndex += 1) {
        if (isCancelled()) {
          cancelled = true;
          stopReasons.push(cancelledStop('cooperative-point-cancellation'));
          break;
        }
        if (sampleCount + 2 > request.budgets.maximumSamples
          || vertexCount + 1 > request.budgets.maximumVertices
          || now() - startedAt >= request.budgets.maximumTimeMs) {
          budgetExhausted = true;
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
          style: item.presentation,
        });
      }
      await control.yieldBetweenItems?.();
      if (cancelled || budgetExhausted) break;
      continue;
    }
    if (item.kind === 'piecewise') {
      const sampled = sampleGraphPiecewise({
        itemId: item.itemId,
        sourceRevision: item.source.sourceRevision,
        piecewise: item.piecewise,
        presentation: item.presentation,
        viewport: request.viewport,
        cssSize: request.cssSize,
        parameterEnvironment: request.parameterEnvironment,
        quality: request.quality,
        budgets: {
          maximumSamples: fairBudgets.maximumSamples,
          maximumTimeMs: Math.max(1, Math.floor(Math.min(
            fairBudgets.maximumTimeMs,
            control.maximumItemTimeMs ?? fairBudgets.maximumTimeMs,
          ))),
          maximumVertices: fairBudgets.maximumVertices,
        },
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
      if (sampled.status === 'budget-exhausted') budgetExhausted = true;
      await control.yieldBetweenItems?.();
      if (cancelled) break;
      continue;
    }
    if (item.relation.kind === 'implicit-equality'
      || item.relation.kind === 'inequality'
      || item.relation.kind === 'chained-inequality') {
      const sampled = sampleImplicitGraphRelation({
        itemId: item.itemId,
        sourceRevision: item.source.sourceRevision,
        relation: item.relation,
        viewport: request.viewport,
        cssSize: request.cssSize,
        parameterEnvironment: request.parameterEnvironment,
        quality: request.quality,
        budgets: {
          maximumSamples: fairBudgets.maximumSamples,
          maximumTimeMs: Math.max(1, Math.floor(Math.min(
            fairBudgets.maximumTimeMs,
            control.maximumItemTimeMs ?? fairBudgets.maximumTimeMs,
          ))),
          maximumVertices: fairBudgets.maximumVertices,
        },
        cache: planCache,
        control: { now, isCancelled },
      });
      sampleCount += sampled.stats.evaluatedSamples;
      vertexCount += sampled.stats.emittedVertices;
      sampled.stopReasons.forEach((reason) => {
        stopReasons.push({ ...reason, path: item.itemId });
      });
      if (sampled.status === 'cancelled') cancelled = true;
      if (sampled.status === 'budget-exhausted') budgetExhausted = true;
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
          style: {
            ...item.presentation,
            stroke: boundary.strict ? 'dashed' : 'solid',
          },
        });
      }
      if (sampled.region) {
        regions.push({
          regionId: `${item.itemId}:region:0`,
          itemId: item.itemId,
          vertices: sampled.region.vertices,
          triangleIndices: sampled.region.triangleIndices,
          boundaryPathIds,
          style: item.presentation,
        });
      }
      await control.yieldBetweenItems?.();
      if (cancelled) break;
      continue;
    }
    if (item.relation.kind === 'polar-radius' || item.relation.kind === 'parametric-curve') {
      const sampled = sampleParametricGraphRelation({
        itemId: item.itemId,
        sourceRevision: item.source.sourceRevision,
        relation: item.relation,
        presentation: item.presentation,
        viewport: request.viewport,
        cssSize: request.cssSize,
        parameterEnvironment: request.parameterEnvironment,
        quality: request.quality,
        budgets: {
          maximumSamples: fairBudgets.maximumSamples,
          maximumTimeMs: Math.max(1, Math.floor(Math.min(
            fairBudgets.maximumTimeMs,
            control.maximumItemTimeMs ?? fairBudgets.maximumTimeMs,
          ))),
          maximumVertices: fairBudgets.maximumVertices,
        },
        cache: planCache,
        control: { now, isCancelled },
      });
      if (sampled.path) paths.push(sampled.path);
      sampleCount += sampled.sampleCount;
      vertexCount += sampled.vertexCount;
      if (sampled.stopReason) stopReasons.push({ ...sampled.stopReason, path: item.itemId });
      if (sampled.status === 'cancelled') cancelled = true;
      if (sampled.status === 'budget-exhausted') budgetExhausted = true;
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
      await control.yieldBetweenItems?.();
      continue;
    }
    const sampled = sampleExplicitGraphRelation({
      plan: compiled.plan,
      viewport: request.viewport,
      cssSize: request.cssSize,
      parameterEnvironment: request.parameterEnvironment,
      quality: request.quality,
      budgets: {
        maximumSamples: fairBudgets.maximumSamples,
        maximumTimeMs: Math.max(1, Math.floor(Math.min(
          fairBudgets.maximumTimeMs,
          control.maximumItemTimeMs ?? fairBudgets.maximumTimeMs,
        ))),
        maximumVertices: fairBudgets.maximumVertices,
      },
      control: { now, isCancelled },
    });
    sampleCount += sampled.stats.evaluatedSamples;
    vertexCount += sampled.stats.emittedVertices;
    if (sampled.stopReason) {
      stopReasons.push({ ...sampled.stopReason, path: item.itemId });
    }
    if (sampled.status === 'cancelled') cancelled = true;
    if (sampled.status === 'budget-exhausted') budgetExhausted = true;
    if (sampled.coordinates.length >= 4 && sampled.segmentOffsets.length >= 1) {
      paths.push({
        pathId: `${item.itemId}:path:0`,
        sample: sampled,
        style: item.presentation,
      });
    }
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
  const previewRefinementExhausted = request.quality === 'preview' && budgetExhausted;
  const resultStopReasons = previewRefinementExhausted
    ? stopReasons.filter((reason) => reason.code !== 'sampling-budget-exceeded')
    : stopReasons;
  const status = cancelled
    ? 'cancelled'
    : budgetExhausted && !previewRefinementExhausted
      ? 'budget-exhausted'
      : 'complete';
  const result = graphResult(request, {
    scene: assembled.bundle.scene,
    status,
    stopReasons: resultStopReasons,
    sampleCount,
    vertexCount,
    elapsedMs: Math.max(0, now() - startedAt),
  });
  return { result, transferList: assembled.bundle.transferList };
}

export function releaseGraphSampleResultBuffers(result: GraphSampleResultV2) {
  const transfers = collectGraphSceneTransferables(result.scene);
  if (!transfers.ok || transfers.transferList.length === 0) return 0;
  const releasedBytes = transfers.transferList.reduce(
    (count, buffer) => count + buffer.byteLength,
    0,
  );
  structuredClone(null, { transfer: transfers.transferList });
  return releasedBytes;
}
